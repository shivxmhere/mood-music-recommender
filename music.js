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
    // 1. Search for songs
    const searchUrl = `https://jiosaavn-api.vercel.app/search?query=${encodeURIComponent(searchTerm)}`;
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`Saavn Search failed: ${searchResponse.status}`);
    }
    const searchJson = await searchResponse.json();
    const rawResults = searchJson.results || [];
    
    // We only need top results for performance
    const topTracks = rawResults.slice(0, limit);
    
    // 2. We need to fetch stream URL for each in parallel (since search doesn't include it in this specific API)
    const tracksWithMedia = await Promise.all(topTracks.map(async (raw) => {
      try {
        const detailUrl = `https://jiosaavn-api.vercel.app/song?id=${raw.id}`;
        const detailRes = await fetch(detailUrl);
        if (!detailRes.ok) return null;
        const detailJson = await detailRes.json();
        
        // Grab the direct high-quality media link
        const mediaUrl = detailJson.media_url;
        if (!mediaUrl) return null;

        return {
          id: raw.id,
          title: raw.title,
          artist: raw.artist || 'Bollywood Artist',
          genre: raw.language ? raw.language.charAt(0).toUpperCase() + raw.language.slice(1) : 'Bollywood',
          artwork: raw.image ? raw.image.replace('150x150', '500x500') : '',
          duration: detailJson.duration ? detailJson.duration * 1000 : 180000,
          preview: mediaUrl,
          itunesUrl: detailJson.perma_url || '#',
          source: 'saavn'
        };
      } catch (err) {
        return null;
      }
    }));

    return tracksWithMedia.filter(t => t !== null);
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
