import { describe, it, expect } from 'vitest'

/**
 * Policy model tests for the Firestore session document update rule.
 *
 * These tests model the intended access-control semantics in TypeScript,
 * verifying the logic of the rule independently of the Firestore DSL.
 *
 * The rule in firestore.rules:
 *
 *   allow update: if isAuthed() && (
 *     isModerator(sessionId)
 *     || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['moderatorId'])
 *   );
 *
 * For emulator-backed integration tests against the live rules, run:
 *   firebase emulators:start
 * and use @firebase/rules-unit-testing in a separate test suite.
 */

interface SessionData {
  moderatorId: string
  cardOptions: string[]
  state: string
  [key: string]: unknown
}

/** Returns the set of top-level keys whose value differs between existing and incoming. */
function affectedKeys(existing: SessionData, incoming: SessionData): Set<string> {
  const keys = new Set<string>()
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(incoming)])
  for (const k of allKeys) {
    if (JSON.stringify(existing[k]) !== JSON.stringify(incoming[k])) {
      keys.add(k)
    }
  }
  return keys
}

/**
 * Models:
 *   isAuthed() && (isModerator(sessionId) || affectedKeys.hasOnly(['moderatorId']))
 */
function canUpdateSession(
  uid: string | null,
  existing: SessionData,
  incoming: SessionData,
): boolean {
  if (uid === null) return false                          // isAuthed()

  const isMod = existing.moderatorId === uid
  const changed = affectedKeys(existing, incoming)
  const onlyModeratorId = changed.size > 0 && changed.size === 1 && changed.has('moderatorId')

  return isMod || onlyModeratorId
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const existing: SessionData = {
  moderatorId: 'mod-uid',
  cardOptions: ['1', '2', '3', '5', '8'],
  state: 'open',
}

// ---------------------------------------------------------------------------
// Moderator permissions (full access)
// ---------------------------------------------------------------------------
describe('moderator can update session fields', () => {
  it('can transfer the moderator role to another user', () => {
    expect(canUpdateSession('mod-uid', existing, { ...existing, moderatorId: 'new-mod' })).toBe(true)
  })

  it('can reveal votes (state change)', () => {
    expect(canUpdateSession('mod-uid', existing, { ...existing, state: 'closed' })).toBe(true)
  })

  it('can change card options', () => {
    expect(canUpdateSession('mod-uid', existing, { ...existing, cardOptions: ['1', '2', '?'] })).toBe(true)
  })

  it('can change multiple fields at once', () => {
    expect(
      canUpdateSession('mod-uid', existing, {
        ...existing,
        moderatorId: 'new-mod',
        state: 'closed',
      }),
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Non-moderator: allowed to update ONLY moderatorId (role steal / transfer)
// ---------------------------------------------------------------------------
describe('non-moderator can update only moderatorId', () => {
  it('can claim the moderator role for themselves (steal)', () => {
    expect(
      canUpdateSession('other-uid', existing, { ...existing, moderatorId: 'other-uid' }),
    ).toBe(true)
  })

  it('can transfer the moderator role to a third user', () => {
    expect(
      canUpdateSession('other-uid', existing, { ...existing, moderatorId: 'third-uid' }),
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Non-moderator: blocked from updating any other field
// ---------------------------------------------------------------------------
describe('non-moderator cannot update other session fields', () => {
  it('cannot change cardOptions', () => {
    expect(
      canUpdateSession('other-uid', existing, { ...existing, cardOptions: ['?'] }),
    ).toBe(false)
  })

  it('cannot change state', () => {
    expect(
      canUpdateSession('other-uid', existing, { ...existing, state: 'closed' }),
    ).toBe(false)
  })

  it('cannot change moderatorId AND another field together', () => {
    expect(
      canUpdateSession('other-uid', existing, {
        ...existing,
        moderatorId: 'other-uid',
        state: 'closed',
      }),
    ).toBe(false)
  })

  it('cannot change moderatorId AND cardOptions together', () => {
    expect(
      canUpdateSession('other-uid', existing, {
        ...existing,
        moderatorId: 'other-uid',
        cardOptions: ['?'],
      }),
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Unauthenticated: blocked entirely
// ---------------------------------------------------------------------------
describe('unauthenticated user cannot update the session', () => {
  it('cannot steal the moderator role', () => {
    expect(
      canUpdateSession(null, existing, { ...existing, moderatorId: 'attacker' }),
    ).toBe(false)
  })

  it('cannot change any other field', () => {
    expect(
      canUpdateSession(null, existing, { ...existing, state: 'closed' }),
    ).toBe(false)
  })
})
