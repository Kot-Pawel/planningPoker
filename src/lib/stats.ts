import type { Vote } from '@/types/firestore'

export interface StatsResult {
  average: number | null
  median: number | null
  distribution: Record<string, number>
  totalVotes: number
  numericVotes: number
  excludedCards: string[]
}

export function computeStats(
  votes: Vote[],
  cardValueMap: Record<string, number | null>,
): StatsResult {
  const distribution: Record<string, number> = {}
  const numericValues: number[] = []
  const excludedCards: string[] = []

  for (const vote of votes) {
    if (vote.value === null) continue // abstain — not included anywhere

    distribution[vote.value] = (distribution[vote.value] ?? 0) + 1

    const mapped = cardValueMap[vote.value]
    if (mapped !== null && mapped !== undefined) {
      numericValues.push(mapped)
    } else if (!excludedCards.includes(vote.value)) {
      excludedCards.push(vote.value)
    }
  }

  const totalVotes = votes.filter((v) => v.value !== null).length
  const numericVotes = numericValues.length

  const average =
    numericVotes > 0
      ? Math.round((numericValues.reduce((a, b) => a + b, 0) / numericVotes) * 10) / 10
      : null

  let median: number | null = null
  if (numericVotes > 0) {
    const sorted = [...numericValues].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    median =
      sorted.length % 2 === 0
        ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
        : sorted[mid]
  }

  return { average, median, distribution, totalVotes, numericVotes, excludedCards }
}
