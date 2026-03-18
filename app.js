/* ═══════════════════════════════════════════
   MAIN APPLICATION CONTROLLER
   Mood-Based Music Recommender · Day 6/35
   Shivam Singh · IIT Patna
   ═══════════════════════════════════════════ */

(() => {
  'use strict';

  // ── APPLICATION STATE ──
  const state = {
    currentMood: null,
    currentEmotion: null,
    currentPlaylist: [],
    currentTrack: null,
    currentTrackIndex: -1,
    audioPlayer: null,
    isPlaying: false,
    favourites: JSON.parse(localStorage.getItem('mt_favourites') || '[]'),
    savedPlaylists: JSON.parse(localStorage.getItem('mt_playlists') || '[]'),
    moodHistory: JSON.parse(localStorage.getItem('mt_history') || '[]'),
    playbackProgress: 0,
    progressInterval: null,
    currentWaveform: null,
    currentMusicParams: null,
    language: 'both' // english, hindi, or both
  };

  // ── DOM REFERENCES ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    moodInput: $('#moodInput'),
    charCount: $('#charCount'),
    btnAnalyse: $('#btnAnalyse'),
    quickMoods: $('#quickMoods'),
    floatingNotes: $('#floatingNotes'),
    langPills: $$('.lang-pill'),
    // Banner
    moodBanner: $('#moodBanner'),
    bannerEmoji: $('#bannerEmoji'),
    bannerLabel: $('#bannerLabel'),
    bannerConfidence: $('#bannerConfidence'),
    bannerParams: $('#bannerParams'),
    bannerBreakdown: $('#bannerBreakdown'),
    // Emotion wheel
    emotionWheelSection: $('#emotionWheelSection'),
    emotionWheel: $('#emotionWheel'),
    emotionLegend: $('#emotionLegend'),
    // Main content
    mainContent: $('#mainContent'),
    playlistTracks: $('#playlistTracks'),
    playlistSubtitle: $('#playlistSubtitle'),
    btnSavePlaylist: $('#btnSavePlaylist'),
    btnShuffle: $('#btnShuffle'),
    // Sidebar
    analyticsBars: $('#analyticsBars'),
    progressRings: $('#progressRings'),
    moodHistory: $('#moodHistory'),
    genreBars: $('#genreBars'),
    // Now playing
    nowPlaying: $('#nowPlaying'),
    npArtwork: $('#npArtwork'),
    npTitle: $('#npTitle'),
    npArtist: $('#npArtist'),
    npProgress: $('#npProgress'),
    npProgressWrap: $('#npProgressWrap'),
    npTimeElapsed: $('#npTimeElapsed'),
    npTimeTotal: $('#npTimeTotal'),
    npVolume: $('#npVolume'),
    npClose: $('#npClose'),
    npBtnPrev: $('#npBtnPrev'),
    npBtnPlay: $('#npBtnPlay'),
    npBtnNext: $('#npBtnNext'),
    // Modal
    playlistModal: $('#playlistModal'),
    modalBody: $('#modalBody'),
    btnMyPlaylists: $('#btnMyPlaylists'),
    modalClose: $('#modalClose'),
    // Toast
    toastContainer: $('#toastContainer')
  };

  // ══════════════════════════════════════════
  // 1. INIT
  // ══════════════════════════════════════════
  function init() {
    // Init floating notes
    Visualiser.initFloatingNotes(dom.floatingNotes);

    // Init Lucide icons
    if (window.lucide) lucide.createIcons();

    // Bind events
    bindEvents();

    // Render mood history if present
    renderMoodHistoryCard();

    // Auto-focus textarea
    setTimeout(() => {
      dom.moodInput.focus();
    }, 500);

    // Pulse border after 2 seconds
    setTimeout(() => {
      if (!dom.moodInput.value) {
        dom.moodInput.classList.add('pulse-border');
      }
    }, 2000);

    // Welcome toast after 1 second
    setTimeout(() => {
      showToast('🎵 Describe your mood and get your perfect playlist instantly!', 'info');
    }, 1000);

    // Initialize Media Session API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        if (state.audioPlayer && !state.isPlaying) {
          state.audioPlayer.play();
          state.isPlaying = true;
          updateNowPlayingPlayBtn(true);
          const currentCard = $$('.track-card')[state.currentTrackIndex];
          if (currentCard) {
            currentCard.classList.add('playing');
            updatePlayButtonIcon(currentCard, true);
            startWaveformOnCard(currentCard);
          }
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (state.audioPlayer && state.isPlaying) {
          state.audioPlayer.pause();
          state.isPlaying = false;
          updateNowPlayingPlayBtn(false);
          const currentCard = $$('.track-card')[state.currentTrackIndex];
          if (currentCard) {
            currentCard.classList.remove('playing');
            updatePlayButtonIcon(currentCard, false);
            stopWaveformOnCard(currentCard);
          }
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', playPrevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
    }
  }

  // ══════════════════════════════════════════
  // EVENT BINDING
  // ══════════════════════════════════════════
  function bindEvents() {
    // Character counter
    dom.moodInput.addEventListener('input', () => {
      const len = dom.moodInput.value.length;
      dom.charCount.textContent = `${len}/300 characters`;
      dom.moodInput.classList.remove('pulse-border');
    });

    // Analyse button
    dom.btnAnalyse.addEventListener('click', handleMoodSubmit);

    // Enter key (Ctrl+Enter to submit)
    dom.moodInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleMoodSubmit();
      }
    });

    // Quick mood chips
    dom.quickMoods.addEventListener('click', (e) => {
      const chip = e.target.closest('.mood-chip');
      if (!chip) return;
      const mood = chip.dataset.mood;
      handleQuickMood(mood);
    });

    // Language Toggle
    dom.langPills.forEach(pill => {
      pill.addEventListener('click', () => {
        dom.langPills.forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        state.language = pill.dataset.lang;
      });
    });

    // Save playlist
    dom.btnSavePlaylist.addEventListener('click', savePlaylist);

    // Shuffle
    dom.btnShuffle.addEventListener('click', shufflePlaylist);

    // My Playlists modal
    dom.btnMyPlaylists.addEventListener('click', openPlaylistModal);
    dom.modalClose.addEventListener('click', closePlaylistModal);
    dom.playlistModal.addEventListener('click', (e) => {
      if (e.target === dom.playlistModal) closePlaylistModal();
    });

    // Now Playing controls
    dom.npClose.addEventListener('click', () => stopPlayback(true));
    dom.npVolume.addEventListener('input', (e) => {
      if (state.audioPlayer) {
        state.audioPlayer.volume = e.target.value / 100;
      }
    });

    if (dom.npBtnPrev) dom.npBtnPrev.addEventListener('click', playPrevTrack);
    if (dom.npBtnNext) dom.npBtnNext.addEventListener('click', playNextTrack);
    if (dom.npBtnPlay) dom.npBtnPlay.addEventListener('click', () => {
      if (!state.currentTrack) return;
      if (state.isPlaying) {
        state.audioPlayer.pause();
        state.isPlaying = false;
        const currentCard = $$('.track-card')[state.currentTrackIndex];
        if (currentCard) {
          currentCard.classList.remove('playing');
          updatePlayButtonIcon(currentCard, false);
          stopWaveformOnCard(currentCard);
        }
        updateNowPlayingPlayBtn(false);
      } else {
        state.audioPlayer.play();
        state.isPlaying = true;
        const currentCard = $$('.track-card')[state.currentTrackIndex];
        if (currentCard) {
          currentCard.classList.add('playing');
          updatePlayButtonIcon(currentCard, true);
          startWaveformOnCard(currentCard);
        }
        updateNowPlayingPlayBtn(true);
      }
    });

    // Seek bar
    dom.npProgressWrap.addEventListener('click', (e) => {
      if (!state.audioPlayer) return;
      const rect = dom.npProgressWrap.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      state.audioPlayer.currentTime = pct * state.audioPlayer.duration;
    });
  }

  // ══════════════════════════════════════════
  // 2. HANDLE MOOD SUBMIT
  // ══════════════════════════════════════════
  async function handleMoodSubmit() {
    const text = dom.moodInput.value.trim();
    if (text.length < 10) {
      showToast('Please describe your mood in at least 10 characters ✍️', 'error');
      dom.moodInput.focus();
      return;
    }

    // Show loading
    setLoading(true);

    try {
      // 1. Sentiment analysis
      const sentiment = SentimentEngine.analyzeSentiment(text);

      // 2. Emotion detection
      const emotion = SentimentEngine.detectEmotion(text, sentiment);

      // 3. Music params
      const musicParams = SentimentEngine.mapToMusicParams(emotion.primary);
      state.currentMusicParams = musicParams;

      // 4. Confidence
      const confidence = SentimentEngine.getConfidence(sentiment, emotion);

      // Store state
      state.currentMood = sentiment;
      state.currentEmotion = emotion;

      // 5. Render mood banner
      renderMoodBanner(emotion, sentiment, musicParams, confidence);

      // 6. Render emotion wheel
      renderEmotionWheelSection(emotion.primary);

      // 7. Apply mood theme
      applyMoodTheme(emotion.primary);

      // 8. Fetch playlist from iTunes
      const tracks = await MusicAPI.getPlaylist(musicParams, state.language, 10);

      if (tracks.length === 0) {
        showToast('Could not find tracks. Try describing your mood differently! 🎵', 'error');
        setLoading(false);
        return;
      }

      state.currentPlaylist = tracks;

      // 9. Render playlist
      renderPlaylist(tracks);

      // 10. Render sidebar
      renderSidebar(emotion, sentiment, musicParams, tracks);

      // 11. Add to history
      addToMoodHistory(emotion, tracks);

      // 12. Show main content
      dom.mainContent.style.display = 'block';
      requestAnimationFrame(() => {
        dom.mainContent.classList.add('visible');
      });

      // 13. Scroll to results
      setTimeout(() => {
        dom.moodBanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

      // Re-init icons
      if (window.lucide) lucide.createIcons();

      showToast(`🎵 Found ${tracks.length} tracks for your "${emotion.primary}" mood!`, 'success');

    } catch (err) {
      console.error('Analysis error:', err);
      showToast('Something went wrong. Please try again! 😕', 'error');
    }

    setLoading(false);
  }

  function setLoading(loading) {
    dom.btnAnalyse.disabled = loading;
    dom.btnAnalyse.querySelector('.btn-text').style.display = loading ? 'none' : '';
    dom.btnAnalyse.querySelector('.btn-loading').style.display = loading ? 'flex' : 'none';
  }

  // ══════════════════════════════════════════
  // 3. RENDER MOOD BANNER
  // ══════════════════════════════════════════
  function renderMoodBanner(emotion, sentiment, params, confidence) {
    const emoji = SentimentEngine.MOOD_EMOJIS[emotion.primary] || '🎵';
    const label = emotion.primary.charAt(0).toUpperCase() + emotion.primary.slice(1);

    dom.bannerEmoji.textContent = emoji;
    dom.bannerLabel.textContent = label;
    dom.bannerConfidence.textContent = `${confidence}% confident`;

    // Params bars
    const paramData = [
      { label: 'Valence', value: params.valence, display: params.valence.toFixed(2) },
      { label: 'Energy', value: params.energy, display: params.energy.toFixed(2) },
      { label: 'Tempo', value: params.tempo / 200, display: params.tempo + ' BPM' },
      { label: 'Acoustic', value: params.acoustic, display: params.acoustic.toFixed(2) }
    ];

    dom.bannerParams.innerHTML = paramData.map(p => `
      <div class="param-row">
        <span class="param-label">${p.label}</span>
        <div class="param-bar-bg">
          <div class="param-bar-fill" data-width="${p.value * 100}%"></div>
        </div>
        <span class="param-value">${p.display}</span>
      </div>
    `).join('');

    // Breakdown
    dom.bannerBreakdown.innerHTML = `
      <div class="breakdown-grid">
        <div class="breakdown-item">
          <span>Positive words</span>
          <span class="breakdown-val">${sentiment.positiveWords}</span>
        </div>
        <div class="breakdown-item">
          <span>Negative words</span>
          <span class="breakdown-val">${sentiment.negativeWords}</span>
        </div>
        <div class="breakdown-item">
          <span>Intensity</span>
          <span class="breakdown-val">${sentiment.intensity}</span>
        </div>
        <div class="breakdown-item">
          <span>Dominant emotion</span>
          <span class="breakdown-val">${label}</span>
        </div>
      </div>
    `;

    // Show + animate
    dom.moodBanner.style.display = 'block';
    requestAnimationFrame(() => {
      dom.moodBanner.classList.add('visible');
      // Animate bars
      setTimeout(() => {
        dom.bannerParams.querySelectorAll('.param-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.width;
        });
      }, 200);
    });
  }

  // ══════════════════════════════════════════
  // 4. RENDER EMOTION WHEEL
  // ══════════════════════════════════════════
  function renderEmotionWheelSection(emotion) {
    Visualiser.renderEmotionWheel(dom.emotionWheel, emotion);
    Visualiser.renderEmotionLegend(dom.emotionLegend, emotion);

    dom.emotionWheelSection.style.display = 'block';
    requestAnimationFrame(() => {
      dom.emotionWheelSection.classList.add('visible');
    });
  }

  // ══════════════════════════════════════════
  // 5. RENDER PLAYLIST
  // ══════════════════════════════════════════
  function renderPlaylist(tracks) {
    dom.playlistTracks.innerHTML = '';
    dom.playlistSubtitle.textContent = `${tracks.length} tracks matched to your vibe`;

    tracks.forEach((track, idx) => {
      const card = renderTrackCard(track, idx);
      dom.playlistTracks.appendChild(card);

      // Stagger animation
      setTimeout(() => {
        card.classList.add('visible');
      }, 80 * idx);
    });
  }

  // ══════════════════════════════════════════
  // 6. RENDER TRACK CARD
  // ══════════════════════════════════════════
  function renderTrackCard(track, index) {
    const card = document.createElement('div');
    card.className = 'track-card';
    card.dataset.trackId = track.id;

    const isFav = state.favourites.includes(track.id);
    const duration = MusicAPI.formatDuration(track.duration);

    const lang = detectLanguage(track.artist);
    const isHindi = lang === 'hindi';
    const badgeText = isHindi ? '🇮🇳 Bollywood' : '🌍 English';
    const badgeColor = isHindi ? '#f97316' : '#3b82f6';

    // Added a quick style inject here to handle badges without modifying style.css
    card.innerHTML = `
      <div class="track-num">
        <span>${index + 1}</span>
        <div class="equaliser">
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
        </div>
      </div>
      <div class="track-art-wrap">
        <img class="track-art" src="${track.artwork}" alt="${track.title}" 
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23fef3e8%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2248%22>🎵</text></svg>'">
        <div class="vinyl-overlay"></div>
      </div>
      <div class="track-info">
        <span class="track-title">${escapeHtml(track.title)}</span>
        <span class="track-artist">${escapeHtml(track.artist)}</span>
        <div class="track-meta">
          <span style="font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,0.1);color:${badgeColor}">${badgeText}</span>
          <span class="genre-tag" style="font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,0.1);color:#fff">${track.genre}</span>
          <span class="track-duration">${duration}</span>
        </div>
      </div>
      <div class="track-controls">
        <button class="btn-play" title="${track.preview ? 'Play preview' : 'No preview available'}">
          <i data-lucide="play"></i>
        </button>
        <button class="btn-fav ${isFav ? 'active' : ''}" title="Favourite">
          <i data-lucide="heart"></i>
        </button>
        <a href="${track.itunesUrl}" target="_blank" class="btn-itunes" title="Open in iTunes">
          <i data-lucide="external-link"></i>
        </a>
      </div>
      <div class="track-waveform"></div>
    `;

    // Play button
    card.querySelector('.btn-play').addEventListener('click', () => {
      playTrack(track, card, index);
    });

    // Favourite button
    card.querySelector('.btn-fav').addEventListener('click', (e) => {
      toggleFavourite(track.id, e.currentTarget);
    });

    // Create waveform
    const moodColor = state.currentEmotion
      ? SentimentEngine.MOOD_COLORS[state.currentEmotion.primary]
      : '#ff6b35';
    Visualiser.createWaveform(card.querySelector('.track-waveform'), moodColor);

    return card;
  }

  function detectLanguage(artistName) {
    const lower = artistName.toLowerCase();
    const hindiArtists = ["arijit","atif","jubin","badshah","divine","raftaar","honey singh","diljit","ap dhillon","shreya","lata","kumar sanu","udit","sonu","shankar","ar rahman","pritam","vishal","shekhar","neha","sunidhi","alka","asha"];
    const isHindi = hindiArtists.some(a => lower.includes(a));
    return isHindi ? "hindi" : "english";
  }

  // ══════════════════════════════════════════
  // 7. PLAY TRACK
  // ══════════════════════════════════════════
  function playTrack(track, cardElement, index) {
    // No preview available
    if (!track.preview) {
      showToast('No preview available — open in iTunes to listen 🎵', 'info');
      return;
    }

    // If same track, toggle pause/play
    if (state.currentTrack && state.currentTrack.id === track.id) {
      if (state.isPlaying) {
        state.audioPlayer.pause();
        state.isPlaying = false;
        cardElement.classList.remove('playing');
        updatePlayButtonIcon(cardElement, false);
        stopWaveformOnCard(cardElement);
        return;
      } else {
        state.audioPlayer.play();
        state.isPlaying = true;
        cardElement.classList.add('playing');
        updatePlayButtonIcon(cardElement, true);
        startWaveformOnCard(cardElement);
        return;
      }
    }

    // Stop previous
    stopPlayback(false);

    // Create new audio
    state.audioPlayer = new Audio(track.preview);
    state.audioPlayer.volume = dom.npVolume.value / 100;
    state.currentTrack = track;
    state.currentTrackIndex = index;

    // Mark card as playing
    $$('.track-card').forEach(c => c.classList.remove('playing'));
    cardElement.classList.add('playing');
    updatePlayButtonIcon(cardElement, true);
    startWaveformOnCard(cardElement);

    // Reset all other play button icons
    $$('.track-card').forEach(c => {
      if (c !== cardElement) {
        updatePlayButtonIcon(c, false);
        stopWaveformOnCard(c);
      }
    });

    // Show now-playing bar
    updateNowPlayingBar(track);
    updateNowPlayingPlayBtn(true);

    // Setup Media Session API for background/lock-screen controls
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: "MoodTunes Playlist 🎵",
        artwork: [
          { src: track.artwork || '', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => dom.npBtnPlay.click());
      navigator.mediaSession.setActionHandler('pause', () => dom.npBtnPlay.click());
      navigator.mediaSession.setActionHandler('previoustrack', playPrevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
    }

    // Play
    state.audioPlayer.play().then(() => {
      _consecutiveErrors = 0; // Reset error counter on successful play
    }).catch(() => {
      showToast('Could not play preview 😕', 'error');
    });
    state.isPlaying = true;

    // Progress
    clearInterval(state.progressInterval);
    state.progressInterval = setInterval(updateProgress, 250);

    // On end - Auto play next track
    state.audioPlayer.addEventListener('ended', () => {
      playNextTrack();
    });

    // Error
    state.audioPlayer.addEventListener('error', () => {
      showToast('Preview unavailable for this track 😕', 'error');
      playNextTrack(); // Skip to next automatically
    });
  }

  let _consecutiveErrors = 0;
  let _lastSkipTime = 0;

  function playNextTrack() {
    const now = Date.now();
    const cards = Array.from(document.querySelectorAll('.track-card'));
    const nextIndex = state.currentTrackIndex + 1;

    // Guard: if we're skipping too fast (< 500ms apart), it's an error cascade
    if (now - _lastSkipTime < 500) {
      _consecutiveErrors++;
    } else {
      _consecutiveErrors = 0; // Reset if normal playback ended
    }
    _lastSkipTime = now;

    // If 3+ rapid errors in a row, stop — don't cascade
    if (_consecutiveErrors >= 3) {
      console.warn('Stopped auto-skip: too many consecutive playback errors.');
      showToast('Some tracks could not play. Try a different mood! 🎵', 'info');
      _consecutiveErrors = 0;
      stopPlayback(true);
      return;
    }

    if (nextIndex < cards.length) {
      // Small delay to avoid instant cascade
      setTimeout(() => {
        const nextBtn = cards[nextIndex].querySelector('.btn-play');
        if (nextBtn) nextBtn.click();
      }, 300);
    } else {
      stopPlayback(true);
      showToast('Playlist finished! 🎶', 'info');
    }
  }

  function playPrevTrack() {
    const cards = Array.from(document.querySelectorAll('.track-card'));
    const prevIndex = state.currentTrackIndex - 1;
    
    // If we're more than 3 seconds into the song, restart current
    if (state.audioPlayer && state.audioPlayer.currentTime > 3) {
      state.audioPlayer.currentTime = 0;
      return;
    }

    if (prevIndex >= 0) {
      const prevBtn = cards[prevIndex].querySelector('.btn-play');
      if (prevBtn) prevBtn.click();
    }
  }

  function updatePlayButtonIcon(card, isPlaying) {
    const btn = card.querySelector('.btn-play i');
    if (btn) {
      btn.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
      if (window.lucide) lucide.createIcons();
    }
  }

  function startWaveformOnCard(card) {
    const wf = card.querySelector('.waveform-bars');
    if (wf) Visualiser.startWaveform(wf);
  }

  function stopWaveformOnCard(card) {
    const wf = card.querySelector('.waveform-bars');
    if (wf) Visualiser.stopWaveform(wf);
  }

  function stopPlayback(hideBar = true) {
    if (state.audioPlayer) {
      state.audioPlayer.pause();
      state.audioPlayer.src = '';
      state.audioPlayer = null;
    }
    state.isPlaying = false;
    state.currentTrack = null;
    state.currentTrackIndex = -1;
    clearInterval(state.progressInterval);

    // Reset cards
    $$('.track-card').forEach(c => {
      c.classList.remove('playing');
      updatePlayButtonIcon(c, false);
      stopWaveformOnCard(c);
    });

    if (hideBar || hideBar === true) {
      dom.nowPlaying.classList.remove('visible');
      setTimeout(() => { dom.nowPlaying.style.display = 'none'; }, 400);
    }
  }

  // ══════════════════════════════════════════
  // 8. NOW PLAYING BAR
  // ══════════════════════════════════════════
  function updateNowPlayingBar(track) {
    dom.npArtwork.src = track.artwork || '';
    dom.npTitle.textContent = track.title;
    dom.npArtist.textContent = track.artist;
    dom.npTimeTotal.textContent = '0:30';
    dom.npProgress.style.width = '0%';
    dom.npTimeElapsed.textContent = '0:00';

    dom.nowPlaying.style.display = 'block';
    requestAnimationFrame(() => {
      dom.nowPlaying.classList.add('visible');
    });
  }

  function updateNowPlayingPlayBtn(isPlaying) {
    if (dom.npBtnPlay) {
      dom.npBtnPlay.innerHTML = isPlaying 
        ? '<i data-lucide="pause"></i>' 
        : '<i data-lucide="play"></i>';
      if (window.lucide) lucide.createIcons();
    }
  }

  function updateProgress() {
    if (!state.audioPlayer || !state.isPlaying) return;
    const current = state.audioPlayer.currentTime || 0;
    const duration = state.audioPlayer.duration || 30;
    const pct = (current / duration) * 100;

    dom.npProgress.style.width = pct + '%';
    dom.npTimeElapsed.textContent = formatTime(current);
    dom.npTimeTotal.textContent = formatTime(duration);
  }

  function formatTime(s) {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ══════════════════════════════════════════
  // 9. TOGGLE FAVOURITE
  // ══════════════════════════════════════════
  function toggleFavourite(trackId, btn) {
    const idx = state.favourites.indexOf(trackId);
    if (idx > -1) {
      state.favourites.splice(idx, 1);
      btn.classList.remove('active');
      showToast('Removed from favourites 💔', 'info');
    } else {
      state.favourites.push(trackId);
      btn.classList.add('active');
      // Little bounce animation
      btn.style.transform = 'scale(1.3)';
      setTimeout(() => { btn.style.transform = ''; }, 200);
      showToast('Added to favourites ❤️', 'success');
    }
    localStorage.setItem('mt_favourites', JSON.stringify(state.favourites));

    // Update icon fill
    const icon = btn.querySelector('i');
    if (icon) {
      if (window.lucide) lucide.createIcons();
    }
  }

  // ══════════════════════════════════════════
  // 10. SAVE PLAYLIST
  // ══════════════════════════════════════════
  function savePlaylist() {
    if (!state.currentPlaylist.length || !state.currentEmotion) {
      showToast('No playlist to save! Analyse your mood first 🎵', 'error');
      return;
    }

    const entry = {
      id: Date.now(),
      emotion: state.currentEmotion.primary,
      emoji: SentimentEngine.MOOD_EMOJIS[state.currentEmotion.primary],
      date: new Date().toISOString(),
      tracks: state.currentPlaylist
    };

    state.savedPlaylists.unshift(entry);
    if (state.savedPlaylists.length > 20) state.savedPlaylists.pop();
    localStorage.setItem('mt_playlists', JSON.stringify(state.savedPlaylists));

    showToast('Playlist saved! 💾', 'success');
  }

  // ══════════════════════════════════════════
  // 11. SHUFFLE PLAYLIST
  // ══════════════════════════════════════════
  function shufflePlaylist() {
    if (!state.currentPlaylist.length) return;

    const arr = [...state.currentPlaylist];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    state.currentPlaylist = arr;
    renderPlaylist(arr);
    if (window.lucide) lucide.createIcons();
    showToast('Playlist shuffled! 🔀', 'info');
  }

  // ══════════════════════════════════════════
  // 12. RENDER SIDEBAR
  // ══════════════════════════════════════════
  function renderSidebar(emotion, sentiment, params, tracks) {
    const moodColor = SentimentEngine.MOOD_COLORS[emotion.primary] || '#ff6b35';

    // Mood analytics
    Visualiser.renderMoodAnalytics(dom.analyticsBars, emotion.scores, moodColor);

    // Audio features (progress rings)
    Visualiser.renderProgressRings(dom.progressRings, params, moodColor);

    // Mood history
    renderMoodHistoryCard();

    // Genre breakdown
    Visualiser.renderGenreBreakdown(dom.genreBars, tracks, moodColor);
  }

  // ══════════════════════════════════════════
  // 13. MOOD HISTORY
  // ══════════════════════════════════════════
  function addToMoodHistory(emotion, tracks) {
    const genres = [...new Set(tracks.map(t => t.genre))].slice(0, 3);

    const entry = {
      emotion: emotion.primary,
      emoji: SentimentEngine.MOOD_EMOJIS[emotion.primary],
      timestamp: Date.now(),
      genres
    };

    state.moodHistory.unshift(entry);
    if (state.moodHistory.length > 6) state.moodHistory.pop();
    localStorage.setItem('mt_history', JSON.stringify(state.moodHistory));
    renderMoodHistoryCard();
  }

  function renderMoodHistoryCard() {
    if (!state.moodHistory.length) {
      dom.moodHistory.innerHTML = '<p class="empty-state">No mood history yet. Analyse your first mood!</p>';
      return;
    }

    dom.moodHistory.innerHTML = state.moodHistory.map(h => {
      const timeAgo = getTimeAgo(h.timestamp);
      const label = h.emotion.charAt(0).toUpperCase() + h.emotion.slice(1);
      return `
        <div class="history-item" data-emotion="${h.emotion}">
          <span class="history-emoji">${h.emoji}</span>
          <div class="history-info">
            <span class="history-mood">${label}</span>
            <span class="history-time">${timeAgo}</span>
            <div class="history-genres">
              ${h.genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Click to re-analyse
    dom.moodHistory.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const em = item.dataset.emotion;
        handleQuickMood(em);
      });
    });
  }

  // ══════════════════════════════════════════
  // 14. APPLY MOOD THEME
  // ══════════════════════════════════════════
  function applyMoodTheme(emotion) {
    const color = SentimentEngine.MOOD_COLORS[emotion] || '#ff6b35';
    document.documentElement.style.setProperty('--mood-color', color);
  }

  // ══════════════════════════════════════════
  // 15. QUICK MOOD HANDLER
  // ══════════════════════════════════════════
  function handleQuickMood(mood) {
    const sampleTexts = {
      happy: [
        "I'm feeling amazing and super happy today, everything is going great and I just want to celebrate!",
        "Aaj bahut acha feel ho raha hai, bilkul mast mood hai!"
      ],
      sad: [
        "Feeling really sad and down today, missing someone and feeling lonely and heartbroken",
        "Bahut udaas hun aaj, dil nahi lag raha kuch karne mein"
      ],
      stressed: [
        "Super stressed about my exams, need something to calm me down and help me relax",
        "Exams ke liye bahut tension ho rahi hai, kuch calm chahiye"
      ],
      sleepy: [
        "Feeling really tired and sleepy, need gentle relaxing calm music to unwind",
        "Bahut neend aa rahi hai aaj, kuch relaxing aur peaceful music sunna hai"
      ],
      energetic: [
        "Feeling super pumped and energetic, ready to crush my workout and push hard!",
        "Aaj gym mein full josh hai, kuch energetic chahiye!"
      ],
      romantic: [
        "Feeling romantic and loving, thinking about someone special and my heart is full",
        "Aaj dil mein pyaar waali feeling hai, kuch romantic sunna hai"
      ],
      focused: [
        "Need to focus and concentrate, have a lot of work and study to finish today",
        "Bahut kaam bacha hai, bina distraction ke study karni hai"
      ],
      angry: [
        "Feeling really frustrated and angry about everything, need to let off some steam",
        "Bohot gussa aa raha hai, kuch heavy vibe sunni hai"
      ]
    };

    const options = sampleTexts[mood] || sampleTexts.happy;
    const isHindi = Math.random() > 0.5;
    dom.moodInput.value = isHindi ? options[1] : options[0];
    dom.charCount.textContent = `${dom.moodInput.value.length}/300 characters`;

    // Highlight chip
    $$('.mood-chip').forEach(c => c.classList.remove('active'));
    const chip = $$(`.mood-chip[data-mood="${mood}"]`);
    if (chip.length) chip[0].classList.add('active');

    // Auto-submit after 500ms
    setTimeout(() => {
      handleMoodSubmit();
    }, 500);
  }

  // ══════════════════════════════════════════
  // 16. SAVED PLAYLISTS MODAL
  // ══════════════════════════════════════════
  function openPlaylistModal() {
    renderSavedPlaylists();
    dom.playlistModal.style.display = 'flex';
    requestAnimationFrame(() => {
      dom.playlistModal.classList.add('visible');
    });
  }

  function closePlaylistModal() {
    dom.playlistModal.classList.remove('visible');
    setTimeout(() => { dom.playlistModal.style.display = 'none'; }, 300);
  }

  function renderSavedPlaylists() {
    if (!state.savedPlaylists.length) {
      dom.modalBody.innerHTML = '<p class="empty-state">No saved playlists yet.<br>Analyse your mood and save your first playlist!</p>';
      return;
    }

    dom.modalBody.innerHTML = state.savedPlaylists.map((pl, i) => {
      const label = pl.emotion.charAt(0).toUpperCase() + pl.emotion.slice(1);
      const date = new Date(pl.date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      const arts = pl.tracks.slice(0, 3).map(t =>
        `<img src="${t.artwork}" alt="${t.title}" onerror="this.style.display='none'">`
      ).join('');

      return `
        <div class="saved-playlist" data-index="${i}">
          <span class="sp-emoji">${pl.emoji}</span>
          <div class="sp-info">
            <span class="sp-mood">${label}</span>
            <span class="sp-date">${date} · ${pl.tracks.length} tracks</span>
            <div class="sp-arts">${arts}</div>
          </div>
          <div class="sp-actions">
            <button class="sp-btn sp-btn-play" data-action="play" data-index="${i}">Play</button>
            <button class="sp-btn sp-btn-del" data-action="delete" data-index="${i}">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind events
    dom.modalBody.querySelectorAll('.sp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        const action = e.target.dataset.action;
        if (action === 'play') {
          loadSavedPlaylist(idx);
        } else if (action === 'delete') {
          deleteSavedPlaylist(idx);
        }
      });
    });
  }

  function loadSavedPlaylist(index) {
    const pl = state.savedPlaylists[index];
    if (!pl) return;

    state.currentPlaylist = pl.tracks;
    state.currentEmotion = { primary: pl.emotion, secondary: pl.emotion, scores: {} };

    applyMoodTheme(pl.emotion);
    renderPlaylist(pl.tracks);
    dom.mainContent.style.display = 'block';
    dom.mainContent.classList.add('visible');

    closePlaylistModal();
    if (window.lucide) lucide.createIcons();
    showToast(`Playing ${pl.emotion} playlist! 🎵`, 'success');

    setTimeout(() => {
      dom.playlistTracks.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }

  function deleteSavedPlaylist(index) {
    state.savedPlaylists.splice(index, 1);
    localStorage.setItem('mt_playlists', JSON.stringify(state.savedPlaylists));
    renderSavedPlaylists();
    showToast('Playlist deleted 🗑️', 'info');
  }

  // ══════════════════════════════════════════
  // 17. TOAST NOTIFICATIONS
  // ══════════════════════════════════════════
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // ══════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function getTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // ── BOOT ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
