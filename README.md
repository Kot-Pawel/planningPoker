# Planning Poker

A real-time planning poker app for agile estimation sessions. Free, self-hosted, no session limits.

## What it does

- **Moderator** creates a session, picks a card set (Fibonacci, pAPARazzi, or custom), and shares the link
- **Participants** join via the link or by entering the session code + their display name
- Everyone picks a card privately — others only see who has voted, not what they picked
- Moderator reveals all votes at once, triggering average and median calculation
- Moderator can start a new round or edit the card set mid-session
- Past rounds are visible in a collapsible history panel

## Stack

- **Frontend** — React + Vite + TypeScript + Tailwind CSS, hosted on GitHub Pages
- **Backend** — Firebase Firestore (real-time listeners) + Firebase Anonymous Auth
- **Cloud Functions** — vote aggregation (average, median, distribution) computed server-side on each vote write

## Running locally

1. Copy `.env.example` to `.env` and fill in your Firebase project credentials
2. Enable **Anonymous Authentication** in Firebase Console → Authentication → Sign-in method
3. Deploy Firestore security rules: `firebase deploy --only firestore:rules`

```bash
npm install --legacy-peer-deps
npm run dev
```

## Deploying

Pushes to `main` automatically build and deploy to GitHub Pages via GitHub Actions.

Add your Firebase credentials as repository secrets (Settings → Secrets → Actions):
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

Then enable GitHub Pages: Settings → Pages → Source → **GitHub Actions**.

## How identity works

Users are identified via Firebase Anonymous Auth. The credential is persisted in `localStorage`, so the same browser automatically rejoins as the same user after a refresh. Clearing site data or switching browsers creates a new identity.

## Tests

```bash
npm test
```
