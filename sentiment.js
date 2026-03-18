/* ═══════════════════════════════════════════
   SENTIMENT ANALYSIS ENGINE
   Mood-Based Music Recommender · Day 6/35
   Pure JavaScript — No libraries
   ═══════════════════════════════════════════ */

const SentimentEngine = (() => {

  // ── POSITIVE WORD LEXICON ──
  const POSITIVE_WORDS = {
    // Score +3 — very positive
    amazing: 3, excellent: 3, fantastic: 3, wonderful: 3,
    brilliant: 3, outstanding: 3, superb: 3, incredible: 3,
    love: 3, ecstatic: 3, thrilled: 3, overjoyed: 3,
    euphoric: 3, elated: 3, jubilant: 3, exhilarated: 3,
    awesome: 3, magnificent: 3, extraordinary: 3, phenomenal: 3,
    blissful: 3, glorious: 3, spectacular: 3, marvelous: 3,
    // Score +2 — positive
    good: 2, great: 2, happy: 2, joy: 2, excited: 2, enjoy: 2,
    pleasant: 2, nice: 2, glad: 2, pleased: 2, cheerful: 2,
    delighted: 2, content: 2, satisfied: 2, optimistic: 2,
    motivated: 2, inspired: 2, energetic: 2, pumped: 2,
    ready: 2, confident: 2, strong: 2, powerful: 2,
    beautiful: 2, lovely: 2, grateful: 2, blessed: 2,
    wonderful: 2, perfect: 2, positive: 2, alive: 2,
    vibrant: 2, passionate: 2, joyful: 2, lively: 2,
    terrific: 2, thriving: 2, successful: 2, proud: 2,
    // Score +1 — mildly positive
    okay: 1, fine: 1, alright: 1, decent: 1, fair: 1,
    calm: 1, peaceful: 1, relaxed: 1, comfortable: 1,
    hopeful: 1, curious: 1, interested: 1, engaged: 1,
    chill: 1, mellow: 1, steady: 1, balanced: 1,
    refreshed: 1, rested: 1, stable: 1, easy: 1,
    gentle: 1, warm: 1, cozy: 1, safe: 1,
    free: 1, light: 1, smooth: 1, cool: 1
  };

  // ── NEGATIVE WORD LEXICON ──
  const NEGATIVE_WORDS = {
    // Score -3 — very negative
    terrible: -3, horrible: -3, awful: -3, devastating: -3,
    miserable: -3, depressed: -3, hopeless: -3, desperate: -3,
    heartbroken: -3, destroyed: -3, crushed: -3, shattered: -3,
    agonizing: -3, excruciating: -3, unbearable: -3, tormented: -3,
    wretched: -3, catastrophic: -3, dreadful: -3, nightmarish: -3,
    suicidal: -3, worthless: -3, pathetic: -3, disgusting: -3,
    // Score -2 — negative
    sad: -2, unhappy: -2, upset: -2, angry: -2, frustrated: -2,
    anxious: -2, stressed: -2, worried: -2, nervous: -2,
    tired: -2, exhausted: -2, lonely: -2, lost: -2, scared: -2,
    afraid: -2, disappointed: -2, hurt: -2, pain: -2, hate: -2,
    crying: -2, depressing: -2, gloomy: -2, misery: -2,
    suffering: -2, broken: -2, empty: -2, helpless: -2,
    overwhelmed: -2, panicked: -2, furious: -2, enraged: -2,
    bitter: -2, resentful: -2, jealous: -2, grief: -2,
    mourning: -2, regret: -2, ashamed: -2, guilty: -2,
    // Score -1 — mildly negative
    bored: -1, meh: -1, blah: -1, sluggish: -1, dull: -1,
    restless: -1, uneasy: -1, unsure: -1, confused: -1,
    distracted: -1, indifferent: -1, numb: -1, flat: -1,
    irritated: -1, annoyed: -1, impatient: -1, tense: -1,
    moody: -1, grumpy: -1, cranky: -1, down: -1,
    low: -1, heavy: -1, stuck: -1, drained: -1
  };

  // ── INTENSITY MODIFIERS ──
  const INTENSITY_MODIFIERS = {
    very: 1.5, extremely: 2.0, super: 1.8, really: 1.4,
    so: 1.3, too: 1.2, quite: 1.1, incredibly: 1.9,
    absolutely: 2.0, totally: 1.6, completely: 1.7,
    utterly: 1.8, deeply: 1.6, highly: 1.4, truly: 1.3,
    immensely: 1.7, exceptionally: 1.8, remarkably: 1.5,
    little: 0.5, bit: 0.6, slightly: 0.7, somewhat: 0.8,
    barely: 0.4, hardly: 0.3, mildly: 0.6, kind: 0.7,
    kinda: 0.7, sorta: 0.7
  };

  // ── NEGATION WORDS ──
  const NEGATIONS = new Set([
    'not', 'never', 'no', 'dont', "don't", 'cannot', "can't",
    'wont', "won't", 'isnt', "isn't", "wasn't", "aren't",
    'neither', 'nor', 'without', 'hardly', 'barely',
    'doesnt', "doesn't", 'didnt', "didn't", 'aint', "ain't",
    'none', 'nobody', 'nothing', 'nowhere'
  ]);

  // ── EMOTION KEYWORD MAPS ──
  const EMOTION_KEYWORDS = {
    happy: ['happy', 'joy', 'excited', 'great', 'wonderful', 'amazing',
            'love', 'celebrate', 'fantastic', 'cheerful', 'delighted',
            'thrilled', 'ecstatic', 'pumped', 'awesome', 'brilliant',
            'glad', 'pleased', 'joyful', 'elated', 'blissful', 'party',
            'fun', 'laugh', 'smile', 'grin', 'dancing', 'celebrating'],
    sad: ['sad', 'cry', 'tears', 'miss', 'lonely', 'lost',
          'heartbreak', 'grief', 'sorrow', 'depressed', 'crying',
          'heartbroken', 'mourning', 'unhappy', 'miserable', 'gloomy',
          'down', 'blue', 'empty', 'pain', 'ache', 'weeping'],
    angry: ['angry', 'mad', 'furious', 'rage', 'hate',
            'annoyed', 'frustrated', 'irritated', 'enraged',
            'pissed', 'livid', 'seething', 'hostile', 'aggressive',
            'outraged', 'infuriated', 'bitter', 'resentful', 'fury'],
    calm: ['calm', 'peaceful', 'relax', 'serene', 'quiet',
           'meditation', 'breathe', 'gentle', 'soft', 'tranquil',
           'zen', 'mindful', 'soothing', 'stillness', 'harmony',
           'balanced', 'centered', 'resting', 'ease', 'comfortable'],
    energetic: ['energy', 'pumped', 'motivated', 'ready',
                'workout', 'run', 'gym', 'power', 'strong',
                'energetic', 'active', 'dynamic', 'hyped',
                'adrenaline', 'intense', 'sprint', 'training',
                'exercise', 'beast', 'unstoppable', 'fired'],
    romantic: ['love', 'miss', 'romantic', 'heart', 'crush',
               'beautiful', 'partner', 'relationship', 'kiss',
               'cuddle', 'date', 'sweetheart', 'darling', 'babe',
               'passion', 'desire', 'affection', 'attract', 'soulmate'],
    focused: ['focus', 'study', 'work', 'concentrate',
              'productive', 'goal', 'achieve', 'deadline',
              'exam', 'assignment', 'project', 'code', 'coding',
              'learning', 'reading', 'working', 'building',
              'hustle', 'grind', 'discipline', 'determination'],
    melancholy: ['melancholy', 'nostalgic', 'memories',
                 'reminisce', 'bittersweet', 'wistful',
                 'longing', 'yearning', 'pensive', 'reflective',
                 'thoughtful', 'sentimental', 'remember',
                 'past', 'old times', 'used to', 'once']
  };

  // ── MOOD TO MUSIC PARAMETER MAP ──
  const EMOTION_MUSIC_MAP = {
    happy: {
      valence: 0.85, energy: 0.8, tempo: 128, acoustic: 0.1,
      searchTerms: ['pop upbeat happy', 'feel good hits', 'happy pop songs', 'dance pop party']
    },
    sad: {
      valence: 0.2, energy: 0.3, tempo: 70, acoustic: 0.7,
      searchTerms: ['sad songs', 'heartbreak ballad', 'emotional piano', 'sad indie acoustic']
    },
    angry: {
      valence: 0.4, energy: 0.95, tempo: 150, acoustic: 0.05,
      searchTerms: ['rock intense', 'metal power', 'aggressive hip hop', 'hard rock anthems']
    },
    calm: {
      valence: 0.6, energy: 0.25, tempo: 70, acoustic: 0.8,
      searchTerms: ['ambient chill', 'meditation music', 'lo-fi study beats', 'calm acoustic relaxing']
    },
    energetic: {
      valence: 0.75, energy: 0.95, tempo: 145, acoustic: 0.05,
      searchTerms: ['workout music', 'gym beats power', 'high energy pop', 'electronic dance']
    },
    romantic: {
      valence: 0.7, energy: 0.4, tempo: 90, acoustic: 0.6,
      searchTerms: ['romantic songs love', 'love ballads', 'slow dance romantic', 'romantic R&B']
    },
    focused: {
      valence: 0.55, energy: 0.5, tempo: 100, acoustic: 0.4,
      searchTerms: ['focus music instrumental', 'study beats', 'concentration music', 'lo-fi hip hop study']
    },
    melancholy: {
      valence: 0.3, energy: 0.35, tempo: 80, acoustic: 0.65,
      searchTerms: ['melancholy indie', 'bittersweet songs', 'nostalgic music', 'alternative indie sad']
    }
  };

  const MOOD_EMOJIS = {
    happy: '😊', sad: '😢', angry: '😤', calm: '😌',
    energetic: '💪', romantic: '😍', focused: '🎯', melancholy: '🥀'
  };

  const MOOD_COLORS = {
    happy: '#ffd700', sad: '#6366f1', angry: '#ef4444', calm: '#10b981',
    energetic: '#f97316', romantic: '#ec4899', focused: '#3b82f6', melancholy: '#8b5cf6'
  };

  // ── TOKENISER ──
  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  // ── MAIN SENTIMENT ANALYSIS ──
  function analyzeSentiment(text) {
    const tokens = tokenize(text);
    let totalScore = 0;
    const wordScores = [];
    let positiveCount = 0;
    let negativeCount = 0;
    let maxScore = 0;

    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];
      let score = 0;

      if (POSITIVE_WORDS[word] !== undefined) {
        score = POSITIVE_WORDS[word];
      } else if (NEGATIVE_WORDS[word] !== undefined) {
        score = NEGATIVE_WORDS[word];
      } else {
        continue;
      }

      // Check for intensity modifier (1 or 2 words back)
      let intensityApplied = false;
      for (let back = 1; back <= 2 && i - back >= 0; back++) {
        const prev = tokens[i - back];
        if (INTENSITY_MODIFIERS[prev] !== undefined) {
          score = Math.round(score * INTENSITY_MODIFIERS[prev] * 100) / 100;
          intensityApplied = true;
          break;
        }
      }

      // Check for negation (1 or 2 words back, but not beyond an intensity modifier)
      for (let back = 1; back <= 3 && i - back >= 0; back++) {
        const prev = tokens[i - back];
        if (NEGATIONS.has(prev)) {
          score *= -1;
          break;
        }
        // stop looking if we hit a scored word
        if (POSITIVE_WORDS[prev] !== undefined || NEGATIVE_WORDS[prev] !== undefined) {
          break;
        }
      }

      totalScore += score;
      maxScore = Math.max(maxScore, Math.abs(score));

      if (score > 0) positiveCount++;
      if (score < 0) negativeCount++;

      wordScores.push({ word, score });
    }

    // Normalise score to -1..+1
    const rawMagnitude = Math.abs(totalScore);
    const divisor = Math.max(wordScores.length, 1);
    const normalizedScore = Math.max(-1, Math.min(1, totalScore / (divisor * 1.5)));

    return {
      score: Math.round(normalizedScore * 100) / 100,
      magnitude: rawMagnitude,
      positiveWords: positiveCount,
      negativeWords: negativeCount,
      intensity: rawMagnitude > 6 ? 'Very High' : rawMagnitude > 4 ? 'High' : rawMagnitude > 2 ? 'Medium' : 'Low',
      wordScores,
      tokens
    };
  }

  // ── EMOTION DETECTION ──
  function detectEmotion(text, sentimentResult) {
    const lower = text.toLowerCase();
    const emotionScores = {};

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      let count = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) count++;
      }
      emotionScores[emotion] = count;
    }

    // Sort by score
    const sorted = Object.entries(emotionScores)
      .sort((a, b) => b[1] - a[1]);

    const top = sorted[0];
    const second = sorted[1];

    // If no keywords matched, fall back to sentiment score
    if (top[1] === 0) {
      const s = sentimentResult.score;
      if (s > 0.5) return { primary: 'happy', secondary: 'energetic', scores: emotionScores };
      if (s > 0.2) return { primary: 'calm', secondary: 'happy', scores: emotionScores };
      if (s > 0)   return { primary: 'calm', secondary: 'focused', scores: emotionScores };
      if (s > -0.3) return { primary: 'melancholy', secondary: 'calm', scores: emotionScores };
      if (s > -0.5) return { primary: 'sad', secondary: 'melancholy', scores: emotionScores };
      return { primary: 'sad', secondary: 'angry', scores: emotionScores };
    }

    return {
      primary: top[0],
      secondary: second[1] > 0 ? second[0] : top[0],
      scores: emotionScores
    };
  }

  // ── MAP EMOTION TO MUSIC PARAMS ──
  function mapToMusicParams(emotion) {
    return EMOTION_MUSIC_MAP[emotion] || EMOTION_MUSIC_MAP.calm;
  }

  // ── CONFIDENCE CALCULATION ──
  function getConfidence(sentimentResult, emotionResult) {
    const magnitude = sentimentResult.magnitude;
    const topScore = emotionResult.scores[emotionResult.primary] || 0;
    const totalWords = sentimentResult.positiveWords + sentimentResult.negativeWords;

    let confidence = 40; // Base confidence
    confidence += Math.min(topScore * 8, 30);     // Keyword matches (max +30)
    confidence += Math.min(magnitude * 3, 20);    // Sentiment magnitude (max +20)
    confidence += Math.min(totalWords * 2, 10);   // Word count bonus (max +10)

    return Math.min(Math.round(confidence), 98);
  }

  // ── PUBLIC API ──
  return {
    analyzeSentiment,
    detectEmotion,
    mapToMusicParams,
    getConfidence,
    MOOD_EMOJIS,
    MOOD_COLORS,
    EMOTION_MUSIC_MAP,
    EMOTION_KEYWORDS
  };

})();
