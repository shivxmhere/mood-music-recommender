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

  // ── Fetch tracks from iTunes ──
  async function fetchTracks(searchTerm, limit = 12) {
    const url = `${BASE_URL}?term=${encodeURIComponent(searchTerm)}&media=music&entity=song&limit=${limit}&explicit=No`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.results || []).map(parseTrack);
  }

  // ── Get a complete playlist by trying multiple search terms ──
  async function getPlaylist(musicParams, targetCount = 10) {
    const allTracks = [];
    const seenIds = new Set();
    const terms = [...musicParams.searchTerms];

    // Shuffle search terms for variety
    for (let i = terms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [terms[i], terms[j]] = [terms[j], terms[i]];
    }

    for (const term of terms) {
      if (allTracks.length >= targetCount) break;

      try {
        const tracks = await fetchTracks(term, 15);

        for (const track of tracks) {
          if (allTracks.length >= targetCount) break;
          if (seenIds.has(track.id)) continue;
          if (!track.title || track.title === 'Unknown Title') continue;

          seenIds.add(track.id);
          allTracks.push(track);
        }
      } catch (err) {
        console.warn(`Failed to fetch for "${term}":`, err.message);
        continue;
      }
    }

    // If we still don't have enough, try a generic search
    if (allTracks.length < targetCount) {
      try {
        const fallback = await fetchTracks('popular music hits', 15);
        for (const track of fallback) {
          if (allTracks.length >= targetCount) break;
          if (seenIds.has(track.id)) continue;
          seenIds.add(track.id);
          allTracks.push(track);
        }
      } catch (e) {
        console.warn('Fallback fetch failed:', e.message);
      }
    }

    return allTracks.slice(0, targetCount);
  }

  // ── PUBLIC API ──
  return {
    fetchTracks,
    getPlaylist,
    parseTrack,
    formatDuration
  };

})();
