/* ═══════════════════════════════════════════
   VISUALISER MODULE
   Mood-Based Music Recommender · Day 6/35
   Emotion Wheel · Waveform · Progress Rings
   ═══════════════════════════════════════════ */

const Visualiser = (() => {

  const EMOTIONS = [
    { key: 'happy',      label: 'Happy',      color: '#ffd700' },
    { key: 'energetic',  label: 'Energetic',  color: '#f97316' },
    { key: 'angry',      label: 'Angry',      color: '#ef4444' },
    { key: 'romantic',   label: 'Romantic',    color: '#ec4899' },
    { key: 'melancholy', label: 'Melancholy', color: '#8b5cf6' },
    { key: 'sad',        label: 'Sad',        color: '#6366f1' },
    { key: 'focused',    label: 'Focused',    color: '#3b82f6' },
    { key: 'calm',       label: 'Calm',       color: '#10b981' }
  ];

  // ══════════════════════════════════════════
  // EMOTION WHEEL (SVG-based pie chart)
  // ══════════════════════════════════════════
  function renderEmotionWheel(container, detectedEmotion) {
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 130;
    const innerR = 55;
    const count = EMOTIONS.length;
    const angleStep = (2 * Math.PI) / count;

    let svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;

    // Draw segments
    EMOTIONS.forEach((em, i) => {
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = startAngle + angleStep;
      const isActive = em.key === detectedEmotion;

      const x1Outer = cx + outerR * Math.cos(startAngle);
      const y1Outer = cy + outerR * Math.sin(startAngle);
      const x2Outer = cx + outerR * Math.cos(endAngle);
      const y2Outer = cy + outerR * Math.sin(endAngle);
      const x1Inner = cx + innerR * Math.cos(endAngle);
      const y1Inner = cy + innerR * Math.sin(endAngle);
      const x2Inner = cx + innerR * Math.cos(startAngle);
      const y2Inner = cy + innerR * Math.sin(startAngle);

      const largeArc = angleStep > Math.PI ? 1 : 0;

      const path = [
        `M ${x1Outer} ${y1Outer}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
        `L ${x1Inner} ${y1Inner}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
        'Z'
      ].join(' ');

      const opacity = isActive ? 1 : 0.35;
      const scale = isActive ? 'scale(1.06)' : 'scale(1)';
      const midAngle = startAngle + angleStep / 2;
      const labelR = outerR + 18;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);

      svg += `<g style="transform-origin: ${cx}px ${cy}px; transform: ${scale}; transition: transform 0.5s ease;">`;
      svg += `<path d="${path}" fill="${em.color}" opacity="${opacity}" stroke="#fff" stroke-width="2" style="transition: opacity 0.5s ease;"/>`;
      svg += `</g>`;

      // Label outside
      const anchor = Math.cos(midAngle) > 0.1 ? 'start' : Math.cos(midAngle) < -0.1 ? 'end' : 'middle';
      svg += `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="central" 
               font-size="10" font-family="Satoshi, sans-serif" font-weight="600" 
               fill="${isActive ? em.color : '#9898b0'}"
               style="transition: fill 0.5s ease;">${em.label}</text>`;
    });

    // Center text
    svg += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" dominant-baseline="central" 
             font-size="14" font-family="Clash Display, sans-serif" font-weight="700" 
             fill="${SentimentEngine.MOOD_COLORS[detectedEmotion] || '#1a1a2e'}">${SentimentEngine.MOOD_EMOJIS[detectedEmotion] || '🎵'}</text>`;
    svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" dominant-baseline="central" 
             font-size="12" font-family="Clash Display, sans-serif" font-weight="600" 
             fill="#1a1a2e">${detectedEmotion.charAt(0).toUpperCase() + detectedEmotion.slice(1)}</text>`;

    svg += '</svg>';
    container.innerHTML = svg;

    // Animate in
    container.style.transform = 'scale(0)';
    container.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    requestAnimationFrame(() => {
      container.style.transform = 'scale(1)';
    });
  }

  // ── Emotion Wheel Legend ──
  function renderEmotionLegend(container, detectedEmotion) {
    container.innerHTML = '';
    EMOTIONS.forEach(em => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      const isActive = em.key === detectedEmotion;
      item.innerHTML = `
        <span class="legend-dot" style="background:${em.color}; opacity:${isActive ? 1 : 0.4}"></span>
        <span style="font-weight:${isActive ? '700' : '400'}; color:${isActive ? em.color : '#9898b0'}">${em.label}</span>
      `;
      container.appendChild(item);
    });
  }

  // ══════════════════════════════════════════
  // WAVEFORM VISUALISER
  // ══════════════════════════════════════════
  function createWaveform(container, moodColor, barCount = 20) {
    const wrap = document.createElement('div');
    wrap.className = 'waveform-bars';

    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'wave-bar';
      const h = Math.floor(Math.random() * 28) + 6;
      bar.style.setProperty('--wave-h', h + 'px');
      bar.style.background = moodColor;
      bar.style.animationDelay = (i * 0.05) + 's';
      bar.style.animationDuration = (0.3 + Math.random() * 0.4) + 's';
      wrap.appendChild(bar);
    }

    container.innerHTML = '';
    container.appendChild(wrap);
    return wrap;
  }

  function startWaveform(waveformEl) {
    if (waveformEl) waveformEl.classList.add('playing');
  }

  function stopWaveform(waveformEl) {
    if (waveformEl) waveformEl.classList.remove('playing');
  }

  // ══════════════════════════════════════════
  // CIRCULAR PROGRESS RINGS (SVG)
  // ══════════════════════════════════════════
  function renderProgressRings(container, params, moodColor) {
    const items = [
      { label: 'Valence', value: params.valence },
      { label: 'Energy', value: params.energy },
      { label: 'Danceability', value: Math.min(1, (params.valence + params.energy) / 2) },
      { label: 'Acousticness', value: params.acoustic }
    ];

    container.innerHTML = '';

    items.forEach((item, idx) => {
      const pct = Math.round(item.value * 100);
      const radius = 32;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (item.value * circumference);

      const div = document.createElement('div');
      div.className = 'ring-item';
      div.innerHTML = `
        <div style="position:relative; width:80px; height:80px;">
          <svg class="ring-svg" viewBox="0 0 80 80">
            <circle class="ring-bg" cx="40" cy="40" r="${radius}"/>
            <circle class="ring-fill" cx="40" cy="40" r="${radius}" 
              stroke="${moodColor}"
              stroke-dasharray="${circumference}" 
              stroke-dashoffset="${circumference}"
              data-target-offset="${offset}"/>
          </svg>
          <span class="ring-value" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; transform:none;">${pct}%</span>
        </div>
        <span class="ring-label">${item.label}</span>
      `;
      container.appendChild(div);

      // Animate after render
      setTimeout(() => {
        const circle = div.querySelector('.ring-fill');
        if (circle) circle.style.strokeDashoffset = offset;
      }, 100 + idx * 150);
    });
  }

  // ══════════════════════════════════════════
  // MOOD ANALYTICS BARS
  // ══════════════════════════════════════════
  function renderMoodAnalytics(container, emotionScores, moodColor) {
    const dims = [
      { key: 'happy', label: 'Joy' },
      { key: 'sad', label: 'Sadness' },
      { key: 'angry', label: 'Anger' },
      { key: 'calm', label: 'Calm' },
      { key: 'energetic', label: 'Surprise' },
      { key: 'focused', label: 'Focus' }
    ];

    const maxVal = Math.max(...Object.values(emotionScores), 1);
    container.innerHTML = '';

    dims.forEach((dim, idx) => {
      const val = emotionScores[dim.key] || 0;
      const pct = Math.round((val / maxVal) * 100);
      const color = SentimentEngine.MOOD_COLORS[dim.key] || moodColor;

      const row = document.createElement('div');
      row.className = 'analytics-row';
      row.innerHTML = `
        <span class="analytics-label">${dim.label}</span>
        <div class="analytics-bar-bg">
          <div class="analytics-bar-fill" style="background:${color}; width:0"></div>
        </div>
        <span class="analytics-val">${pct}%</span>
      `;
      container.appendChild(row);

      setTimeout(() => {
        row.querySelector('.analytics-bar-fill').style.width = pct + '%';
      }, 100 + idx * 100);
    });
  }

  // ══════════════════════════════════════════
  // GENRE BREAKDOWN BARS
  // ══════════════════════════════════════════
  function renderGenreBreakdown(container, tracks, moodColor) {
    const genreCount = {};
    tracks.forEach(t => {
      const g = t.genre || 'Other';
      genreCount[g] = (genreCount[g] || 0) + 1;
    });

    const sorted = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const total = tracks.length;
    container.innerHTML = '';

    sorted.forEach(([genre, count], idx) => {
      const pct = Math.round((count / total) * 100);
      const row = document.createElement('div');
      row.className = 'genre-row';
      row.innerHTML = `
        <span class="genre-label">${genre}</span>
        <div class="genre-bar-bg">
          <div class="genre-bar-fill" style="background:${moodColor}; width:0"></div>
        </div>
        <span class="genre-pct">${pct}%</span>
      `;
      container.appendChild(row);

      setTimeout(() => {
        row.querySelector('.genre-bar-fill').style.width = pct + '%';
      }, 100 + idx * 100);
    });
  }

  // ══════════════════════════════════════════
  // FLOATING MUSIC NOTES
  // ══════════════════════════════════════════
  function initFloatingNotes(container) {
    const notes = ['♪', '♫', '🎵', '🎶', '♬', '🎼', '🎤', '🎸'];
    const count = 10;

    for (let i = 0; i < count; i++) {
      const note = document.createElement('div');
      note.className = 'floating-note';
      note.textContent = notes[Math.floor(Math.random() * notes.length)];

      const size = (0.8 + Math.random() * 1.2).toFixed(2);
      const left = Math.floor(Math.random() * 95);
      const dur = (8 + Math.random() * 7).toFixed(1);
      const delay = (Math.random() * 10).toFixed(1);
      const opacity = (0.15 + Math.random() * 0.15).toFixed(2);

      note.style.cssText = `
        left: ${left}%;
        font-size: ${size}rem;
        animation-duration: ${dur}s;
        animation-delay: ${delay}s;
        --note-opacity: ${opacity};
      `;

      container.appendChild(note);
    }
  }

  // ── PUBLIC API ──
  return {
    renderEmotionWheel,
    renderEmotionLegend,
    createWaveform,
    startWaveform,
    stopWaveform,
    renderProgressRings,
    renderMoodAnalytics,
    renderGenreBreakdown,
    initFloatingNotes,
    EMOTIONS
  };

})();
