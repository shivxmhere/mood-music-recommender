/* ═══════════════════════════════════════════
   MUSIC API MODULE — iTunes Search API
   Mood-Based Music Recommender · Day 6/35
   ═══════════════════════════════════════════ */

const MusicAPI = (() => {

  const BASE_URL = 'https://itunes.apple.com/search';

  // ── Parse iTunes result to standard track object ──
  function parseTrack(item) {
    return {
      id: item.trackId,
      title: item.trackName || 'Unknown Title',
      artist: item.artistName || 'Unknown Artist',
      album: item.collectionName || 'Unknown Album',
      artwork: item.artworkUrl100
        ? item.artworkUrl100.replace('100x100', '200x200')
        : '',
      artworkSmall: item.artworkUrl60 || item.artworkUrl100 || '',
      preview: item.previewUrl || null,
      duration: item.trackTimeMillis || 30000,
      genre: item.primaryGenreName || 'Music',
      itunesUrl: item.trackViewUrl || '#',
      releaseYear: item.releaseDate
        ? item.releaseDate.split('-')[0]
        : ''
    };
  }

  // ── Format duration from ms to "3:42" ──
  function formatDuration(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ── Fetch tracks from iTunes (Fallback: 30s) ──
  async function fetchTracks(searchTerm, limit = 12) {
    const url = `${BASE_URL}?term=${encodeURIComponent(searchTerm)}&media=music&entity=song&limit=${limit}&country=IN&explicit=No`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iTunes Search failed: ${response.status}`);
    }
    const data = await response.json();
    return data.results.map(track => ({
      id: track.trackId,
      title: track.trackName,
      artist: track.artistName,
      genre: track.primaryGenreName,
      artwork: track.artworkUrl100,
      duration: track.trackTimeMillis,
      preview: track.previewUrl,
      itunesUrl: track.trackViewUrl,
      source: 'itunes'
    }));
  }

  // ── Fetch tracks from JioSaavn (Primary: Full Free Songs) ──
  async function fetchSaavnTracks(searchTerm, limit = 10) {
    // We use the most reputable open source JioSaavn API
    const url = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchTerm)}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Saavn Search failed: ${response.status}`);
    }
    const json = await response.json();
    const results = json?.data?.results || [];

    return results.map(track => {
      // Find highest quality download URL
      const streamUrl = track.downloadUrl && track.downloadUrl.length > 0
        ? track.downloadUrl[track.downloadUrl.length - 1].url
        : track.url;
        
      const artwork = track.image && track.image.length > 0
        ? track.image[track.image.length - 1].url
        : '';
        
      // Ensure we have a valid streamable media link
      if (!streamUrl) return null;

      return {
        id: track.id,
        title: track.name,
        // Saavn returns arrays or string for primaryArtists. Handle both:
        artist: typeof track.primaryArtists === 'string' ? track.primaryArtists : (track.primaryArtists?.[0]?.name || 'Unknown Artist'),
        genre: track.language ? track.language.charAt(0).toUpperCase() + track.language.slice(1) : 'Bollywood',
        artwork: artwork,
        duration: track.duration ? track.duration * 1000 : 180000,
        preview: streamUrl,
        itunesUrl: track.url || '#',
        source: 'saavn'
      };
    }).filter(t => t !== null);
  }  

  // ── Get a complete playlist by trying multiple search terms ──
  async function getPlaylist(musicParams, language, targetCount = 10) {
    const allTracks = [];
    const seenIds = new Set();
    
    let searchTermsToUse = [];
    if (language === "english") {
      searchTermsToUse = [...musicParams.searchTerms];
    } else if (language === "hindi") {
      searchTermsToUse = [...musicParams.hindiSearchTerms];
    } else {
      // "both" — mix English and Hindi
      const englishPick = musicParams.searchTerms.slice(0, 2);
      const hindiPick = musicParams.hindiSearchTerms.slice(0, 3);
      searchTermsToUse = [...englishPick, ...hindiPick];
    }

    const terms = searchTermsToUse;

    // Shuffle search terms for variety
    for (let i = terms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [terms[i], terms[j]] = [terms[j], terms[i]];
    }

    // Attempt to use Saavn API for FULL length songs first
    let fetchFn = fetchSaavnTracks;
    let usingFallback = false;

    // We'll iterate terms, keeping only those we haven't seen.
    for (const term of terms) {
      if (allTracks.length >= targetCount) break;
      try {
        const tracks = await fetchFn(term, 8);
        for (const track of tracks) {
          if (allTracks.length >= targetCount) break;
          // De-duplicate by title + artist to be safe across APIs
          const uniqueKey = track.title + track.artist;
          if (seenIds.has(uniqueKey)) continue;
          seenIds.add(uniqueKey);
          allTracks.push(track);
        }
      } catch (e) {
        console.warn(`Saavn error for "${term}":`, e.message);
        // If Saavn fails (blocked/down), gracefully switch to iTunes API permanently for this request
        usingFallback = true;
        fetchFn = fetchTracks;
        try {
          // Retry immediately with iTunes
          const fallbackTracks = await fetchFn(term, 8);
          for (const track of fallbackTracks) {
            if (allTracks.length >= targetCount) break;
            const uniqueKey = track.title + track.artist;
            if (seenIds.has(uniqueKey)) continue;
            seenIds.add(uniqueKey);
            allTracks.push(track);
          }
        } catch (err) {
          console.warn(`iTunes fallback also failed for "${term}":`, err.message);
        }
      }
    }

    // If still short, generic fallback fetch
    if (allTracks.length < targetCount) {
      try {
        const fallback = await fetchFn('popular hits 2024', 15);
        for (const track of fallback) {
          if (allTracks.length >= targetCount) break;
          const uniqueKey = track.title + track.artist;
          if (seenIds.has(uniqueKey)) continue;
          seenIds.add(uniqueKey);
          allTracks.push(track);
        }
      } catch (e) {
        console.warn('Fallback fetch failed:', e.message);
      }
    }

    let unique = allTracks;
    
    // If "both": sort so Hindi and English alternate
    if (language === "both") {
      unique = interleaveHindiEnglish(unique);
    }
    
    return unique.slice(0, targetCount);
  }

  function interleaveHindiEnglish(tracks) {
    // Simple interleave — every other track from different search origins
    // Since iTunes doesn't tag language, just shuffle the combined results
    return tracks.sort(() => Math.random() - 0.5);
  }

  // ── PUBLIC API ──
  return {
    fetchTracks,
    getPlaylist,
    parseTrack,
    formatDuration
  };

})();
