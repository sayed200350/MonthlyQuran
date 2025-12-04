# Monthly Quran - Memorization Tracker

A Progressive Web App (PWA) for tracking Quran memorization using a scientifically-backed 7-station spaced repetition algorithm.

## Features

- **7-Station Spaced Repetition System**: Based on the forgetting curve and spaced repetition principles
- **Daily Schedule**: Automatically generates daily tasks for new memorization, yesterday's review, and spaced reviews
- **Bilingual Support**: English and Arabic interface with RTL support
- **Light/Dark Mode**: System-aware theme switching
- **Offline Support**: Works offline with service worker caching
- **Mobile-First Design**: Optimized for mobile devices with responsive layout
- **Local Storage**: All data stored locally on your device

## Memorization Plan

The app implements a 7-station review system:

1. **Station 1**: Same day morning (initial memorization)
2. **Station 2**: Same day evening
3. **Station 3**: Next day (24-hour review)
4. **Station 4**: Day 4 (3 days after previous)
5. **Station 5**: Day 11 (1 week after previous)
6. **Station 6**: Day 25 (2 weeks after previous)
7. **Station 7**: Day 55 (1 month after previous)

## Setup

1. Clone the repository
2. Open `index.html` in a web browser or serve using a local server
3. Configure your memorization plan (unit type, daily amount, start date)
4. Start tracking your progress

## Deployment to GitHub Pages

### Option 1: Using GitHub Actions (Recommended)

1. Push your code to a GitHub repository
2. Go to Settings > Pages
3. Under "Source", select "GitHub Actions"
4. The workflow will automatically deploy on push to main/master branch

### Option 2: Manual Deployment

1. Push your code to a GitHub repository
2. Go to Settings > Pages
3. Under "Source", select the branch (main/master) and folder (root)
4. Click Save

### Important Notes for GitHub Pages

- All paths in the code use relative paths (e.g., `./js/app.js` instead of `/js/app.js`)
- The `.nojekyll` file is included to prevent Jekyll processing
- Service worker is configured to work with GitHub Pages URL structure

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 11.3+)
- Any browser with Service Worker support

## Technologies

- Vanilla JavaScript
- CSS3 with CSS Variables
- LocalStorage API
- Service Workers (PWA)
- Scheherazade New font for Arabic text

## License

MIT License

