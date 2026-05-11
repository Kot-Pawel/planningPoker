import { describe, it, expect } from 'vitest'

/**
 * Tests for avatar seed resolution logic, mirroring what ParticipantList uses:
 *   p.avatarSeed ?? p.userId
 */
function resolveAvatarSeed(userId: string, avatarSeed?: string): string {
  return avatarSeed ?? userId
}

describe('avatar seed resolution', () => {
  it('uses avatarSeed when present', () => {
    const seed = 'custom-seed-abc'
    expect(resolveAvatarSeed('user-123', seed)).toBe('custom-seed-abc')
  })

  it('falls back to userId when avatarSeed is undefined', () => {
    expect(resolveAvatarSeed('user-123', undefined)).toBe('user-123')
  })

  it('different users with no avatarSeed get different seeds', () => {
    expect(resolveAvatarSeed('user-aaa')).not.toBe(resolveAvatarSeed('user-bbb'))
  })

  it('same user always gets the same seed when no avatarSeed is set', () => {
    expect(resolveAvatarSeed('user-123')).toBe(resolveAvatarSeed('user-123'))
  })

  it('a regenerated avatarSeed overrides the userId seed', () => {
    const originalSeed = resolveAvatarSeed('user-123')
    const regenerated = 'b3d1e2f4-aaaa-bbbb-cccc-000000000001'
    const newSeed = resolveAvatarSeed('user-123', regenerated)
    expect(newSeed).not.toBe(originalSeed)
    expect(newSeed).toBe(regenerated)
  })
})
