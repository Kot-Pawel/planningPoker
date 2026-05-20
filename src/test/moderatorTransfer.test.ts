import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock firebase/firestore and the Firebase app instance before any imports
// that transitively pull them in. vi.hoisted() runs before module resolution.
// ---------------------------------------------------------------------------
const { mockUpdateDoc, mockDoc } = vi.hoisted(() => ({
  mockUpdateDoc: vi.fn(),
  mockDoc: vi.fn((_db: unknown, ...segments: string[]) => ({
    path: segments.join('/'),
  })),
}))

vi.mock('firebase/firestore', () => ({
  updateDoc: mockUpdateDoc,
  doc: mockDoc,
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: { now: vi.fn() },
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({ db: 'mock-db' }))

import { transferModerator } from '@/lib/firestore'

// ---------------------------------------------------------------------------
// transferModerator — Firestore write behaviour
// ---------------------------------------------------------------------------
describe('transferModerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateDoc on the session document with the new moderatorId', async () => {
    await transferModerator('session-abc', 'user-xyz')

    // doc() should have been called with db + the sessions path
    expect(mockDoc).toHaveBeenCalledWith('mock-db', 'sessions', 'session-abc')

    // updateDoc should carry exactly { moderatorId: 'user-xyz' }
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'sessions/session-abc' },
      { moderatorId: 'user-xyz' },
    )
  })

  it('issues exactly one Firestore write (does not touch participant docs)', async () => {
    await transferModerator('session-abc', 'user-xyz')
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
  })

  it('uses the provided newModeratorId verbatim', async () => {
    const newMod = 'completely-different-uid'
    await transferModerator('session-xyz', newMod)
    const [, payload] = mockUpdateDoc.mock.calls[0]
    expect(payload).toEqual({ moderatorId: newMod })
  })
})

// ---------------------------------------------------------------------------
// isModerator derivation — reactive recalculation logic
//
// In SessionContext, isModerator is derived as:
//   session?.moderatorId === userId
// These tests verify the transition semantics after a transfer.
// ---------------------------------------------------------------------------
describe('isModerator derivation', () => {
  function isModerator(session: { moderatorId: string } | null, userId: string | null): boolean {
    return session?.moderatorId === userId
  }

  it('is true when session.moderatorId matches userId', () => {
    expect(isModerator({ moderatorId: 'user-a' }, 'user-a')).toBe(true)
  })

  it('is false when session.moderatorId does not match userId', () => {
    expect(isModerator({ moderatorId: 'user-a' }, 'user-b')).toBe(false)
  })

  it('becomes false for the old moderator after a transfer', () => {
    const before = { moderatorId: 'user-a' }
    const after = { moderatorId: 'user-b' }
    expect(isModerator(before, 'user-a')).toBe(true)
    expect(isModerator(after, 'user-a')).toBe(false)
  })

  it('becomes true for the new moderator after a transfer', () => {
    const before = { moderatorId: 'user-a' }
    const after = { moderatorId: 'user-b' }
    expect(isModerator(before, 'user-b')).toBe(false)
    expect(isModerator(after, 'user-b')).toBe(true)
  })

  it('supports self-claim: non-mod user claims the role', () => {
    const before = { moderatorId: 'user-a' }
    const after = { moderatorId: 'user-b' }  // user-b stole the role
    expect(isModerator(before, 'user-b')).toBe(false)
    expect(isModerator(after, 'user-b')).toBe(true)
  })

  it('is false when session is null', () => {
    expect(isModerator(null, 'user-a')).toBe(false)
  })

  it('is false when userId is null (unauthenticated)', () => {
    expect(isModerator({ moderatorId: 'user-a' }, null)).toBe(false)
  })
})
