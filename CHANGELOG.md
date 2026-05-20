# Changelog

## [1.2]

### Added

#### Moderator role transfer (anyone can claim)
- Any authenticated participant can assign the moderator role to any other participant — including themselves — by clicking the `★` button next to a participant's name.
- This enables both explicit hand-off (current mod promotes someone) and "stealing" (any participant claims the role).
- The `★` button is shown on every participant row that is not already the moderator, including the current user's own row.
- `moderatorId` on the session document is the single source of truth; `isModerator` in `SessionContext` re-evaluates reactively via the existing real-time session subscription.
- Firestore security rule updated: any authenticated user may write to the session document when **only** `moderatorId` is being changed (`.affectedKeys().hasOnly(['moderatorId'])`). All other session fields remain moderator-only.

**Files changed:** `firestore.rules`, `src/lib/firestore.ts`, `src/components/ParticipantList.tsx`

---

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

- Added `src/test/moderatorTransfer.test.ts`:
  - `transferModerator` calls `updateDoc` on the session document with `{ moderatorId: newModeratorId }`.
  - `transferModerator` issues exactly one Firestore write (does not touch participant documents).
  - `isModerator` derivation correctly transitions on transfer: old moderator loses the role, new moderator gains it.
  - `isModerator` derivation supports self-claim (a non-mod steals the role).
  - `isModerator` is `false` for a `null` session or unauthenticated user.
- Added `src/test/moderatorRules.test.ts` — TypeScript policy model covering the Firestore update rule:
  - Moderator can update any session field (state, cardOptions, moderatorId, multiple at once).
  - Non-moderator can update **only** `moderatorId` (single-field change).
  - Non-moderator is blocked from changing `cardOptions`, `state`, or a combination of `moderatorId` + any other field.
  - Unauthenticated user is blocked from all updates.

- Added `src/test/avatar.test.ts` covering avatar seed resolution logic:
  - Uses `avatarSeed` when present.
  - Falls back to `userId` when `avatarSeed` is `undefined`.
  - Different users without a stored seed receive different seeds.
  - The same user always receives the same fallback seed.
  - A regenerated seed correctly overrides the `userId` fallback.
