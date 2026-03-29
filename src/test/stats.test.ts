import { describe, it, expect } from 'vitest'
import { computeStats } from '@/lib/stats'
import type { Vote } from '@/types/firestore'
import { Timestamp } from 'firebase/firestore'

const cardValueMap: Record<string, number | null> = {
  '0': 0,
  '½': 0.5,
  '1': 1,
  '2': 2,
  '3': 3,
  '5': 5,
  '8': 8,
  '13': 13,
  '20': 20,
  '40': 40,
  '100': 100,
  '?': null,
}

function makeVote(userId: string, value: string | null): Vote {
  return { userId, value, votedAt: Timestamp.now() }
}

describe('computeStats', () => {
  it('computes average and median for numeric votes', () => {
    const votes: Vote[] = [
      makeVote('u1', '3'),
      makeVote('u2', '5'),
      makeVote('u3', '5'),
      makeVote('u4', '8'),
    ]
    const result = computeStats(votes, cardValueMap)
    expect(result.average).toBe(5.3) // (3+5+5+8)/4 = 21/4 = 5.25 → rounded to 5.3
    expect(result.median).toBe(5)    // sorted [3,5,5,8] → (5+5)/2 = 5
    expect(result.numericVotes).toBe(4)
    expect(result.totalVotes).toBe(4)
  })

  it('excludes non-numeric cards from stats', () => {
    const votes: Vote[] = [
      makeVote('u1', '5'),
      makeVote('u2', '?'),
      makeVote('u3', '8'),
    ]
    const result = computeStats(votes, cardValueMap)
    expect(result.numericVotes).toBe(2)
    expect(result.average).toBe(6.5)
    expect(result.excludedCards).toContain('?')
  })

  it('excludes null (abstain) votes from all calculations', () => {
    const votes: Vote[] = [
      makeVote('u1', '5'),
      makeVote('u2', null),
    ]
    const result = computeStats(votes, cardValueMap)
    expect(result.totalVotes).toBe(1) // null vote not counted
    expect(result.numericVotes).toBe(1)
    expect(result.average).toBe(5)
  })

  it('returns null average and median when no numeric votes', () => {
    const votes: Vote[] = [
      makeVote('u1', '?'),
    ]
    const result = computeStats(votes, cardValueMap)
    expect(result.average).toBeNull()
    expect(result.median).toBeNull()
  })

  it('builds distribution correctly', () => {
    const votes: Vote[] = [
      makeVote('u1', '5'),
      makeVote('u2', '5'),
      makeVote('u3', '8'),
    ]
    const result = computeStats(votes, cardValueMap)
    expect(result.distribution['5']).toBe(2)
    expect(result.distribution['8']).toBe(1)
  })

  it('handles ½ card correctly', () => {
    const votes: Vote[] = [makeVote('u1', '½')]
    const result = computeStats(votes, cardValueMap)
    expect(result.average).toBe(0.5)
    expect(result.median).toBe(0.5)
  })

  it('computes correct median for even number of votes', () => {
    const votes: Vote[] = [
      makeVote('u1', '2'),
      makeVote('u2', '8'),
    ]
    const result = computeStats(votes, cardValueMap)
    expect(result.median).toBe(5) // (2+8)/2 = 5
  })

  it('computes correct median for odd number of votes', () => {
    const votes: Vote[] = [
      makeVote('u1', '1'),
      makeVote('u2', '5'),
      makeVote('u3', '13'),
    ]
    const result = computeStats(votes, cardValueMap)
    expect(result.median).toBe(5)
  })

  it('returns empty stats for no votes', () => {
    const result = computeStats([], cardValueMap)
    expect(result.average).toBeNull()
    expect(result.median).toBeNull()
    expect(result.totalVotes).toBe(0)
    expect(result.distribution).toEqual({})
  })
})
