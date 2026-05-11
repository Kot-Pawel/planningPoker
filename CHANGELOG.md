# Changelog

## [Unreleased]

### Added

#### Kick participants (moderator only)
- Moderator now sees a `✕` button next to every participant who is not themselves and not another moderator in the participant list.
- Clicking the button removes the participant's Firestore document, immediately ejecting them from the session.
- Ejected users are detected client-side in `SessionView` (presence was confirmed, then lost) and redirected to `/?error=kicked`.
- `HomeScreen` reads the `?error` query param and displays a red banner: *"You were removed from the session by the moderator."*
- A `not_found` error banner was also added to `HomeScreen` for the existing `/?error=not_found` redirect.

**Files changed:** `firestore.rules`, `src/lib/firestore.ts`, `src/components/ParticipantList.tsx`, `src/pages/SessionView.tsx`, `src/pages/HomeScreen.tsx`

---

#### User avatars via `boring-avatars`
- Installed `boring-avatars@2.0.4` — generates deterministic inline SVG avatars entirely client-side, no storage or external CDN required.
- Each participant row in the sidebar now displays a 28 px `beam`-style avatar using the app's indigo/violet colour palette.
- Initial seed is the user's Firebase `userId`, so avatars are stable across sessions by default.

**Files changed:** `src/components/ParticipantList.tsx`

---

#### Avatar regeneration
- Added `avatarSeed?: string` field to the `Participant` Firestore type.
- Added `updateAvatarSeed(sessionId, userId, seed)` helper that persists a new UUID to the participant document.
- A `↺` button appears on a user's own row. Clicking it generates a fresh UUID seed, writes it to Firestore, and updates the avatar in real time for all participants.
- Avatar seed resolution: `avatarSeed ?? userId` — falls back to `userId` for existing participants who have no stored seed.

**Files changed:** `src/types/firestore.ts`, `src/lib/firestore.ts`, `src/components/ParticipantList.tsx`

---

### Tests

- Added `src/test/avatar.test.ts` covering avatar seed resolution logic:
  - Uses `avatarSeed` when present.
  - Falls back to `userId` when `avatarSeed` is `undefined`.
  - Different users without a stored seed receive different seeds.
  - The same user always receives the same fallback seed.
  - A regenerated seed correctly overrides the `userId` fallback.
