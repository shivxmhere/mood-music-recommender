# 🎵 MoodTunes

> Day 6/35 — #35DaysOfProjects by **Shivam Singh** | IIT Patna

Describe your mood in plain English. Get a perfect playlist instantly.

## 🔗 Live Demo

[https://moodmusic-day6-iitpatna.vercel.app](https://moodmusic-day6-iitpatna.vercel.app)

## ✨ Features

- 🗣️ Natural language mood input
- 🧠 Custom sentiment analysis engine (500+ word lexicon)
- 🎯 8 emotion categories with music parameter mapping
- 🎵 Real JioSaavn API integration (Full 320kbps High Quality Songs)
- 🎧 Inline audio playback with waveform visualiser
- 🎡 Emotion wheel visualisation (SVG-based)
- 📊 Mood history tracking with localStorage
- 💾 Save & reload playlists
- 🌅 Spotify-inspired Dark Theme UI
- 📱 Fully responsive design

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| HTML | Structure & semantics |
| CSS | Sunset light theme, animations, glassmorphism |
| Vanilla JavaScript | Core logic, no frameworks |
| iTunes Search API | Free music search, no auth needed |
| HTML5 Audio API | In-browser 30-sec previews |
| SVG | Emotion wheel, progress rings |
| localStorage | Playlist & mood history persistence |

## 📊 What I Learned

- Building sentiment analysis from scratch without any NLP library
- Lexicon-based text scoring with negation handling and intensity modifiers
- iTunes Search API (free, no authentication required)
- HTML5 Audio API for in-browser music playback
- Mapping NLP output to music parameters (valence, energy, tempo, acousticness)
- SVG-based emotion wheel visualisation with pure JavaScript
- CSS animated waveform visualiser
- Animated gradient backgrounds with `background-size: 400% 400%`

## 🚀 Run Locally

```bash
# No setup needed! Just open in browser:
open index.html
```

Or use a local server:
```bash
npx serve .
```

## 📁 Project Structure

```
mood-music-recommender/
├── index.html       # Main HTML structure
├── style.css        # Sunset gradient light theme
├── app.js           # Main application controller
├── sentiment.js     # Sentiment analysis engine
├── music.js         # iTunes API integration
├── visualiser.js    # Emotion wheel + animations
├── vercel.json      # Deployment config
├── README.md        # Documentation
└── .gitignore       # Git ignore rules
```

## 🎨 Design Theme

**Spotify-inspired Dark Theme** — Redesigned for a sleek, premium music experience.
Dark surfaces, vivid green accents, mood-reactive hero gradients, glassmorphism modals, and smooth playback visualisers all combined to feel native and immersive.

## 📦 Deploy

```bash
vercel --name moodmusic-day6-iitpatna --prod
```

---

Built with 🎵 as part of [#35DaysOfProjects](https://github.com/shivxmhere)
