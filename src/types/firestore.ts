import type { Timestamp } from 'firebase/firestore'

export type SessionState = 'open' | 'closed'

export interface Session {
  sessionId: string
  sessionName: string
  createdAt: Timestamp
  state: SessionState
  /** Ordered list of card face values, e.g. ["0","½","1","2","3","5","8","13","20","40","100","?"] */
  cardOptions: string[]
  /** Maps each card string to a numeric value, or null if the card should be excluded from averages */
  cardValueMap: Record<string, number | null>
  moderatorId: string
  currentRoundId: string
}

export interface Participant {
  userId: string
  name: string
  joinedAt: Timestamp
  lastSeen: Timestamp
  isModerator: boolean
}

export interface RoundStats {
  average: number | null
  median: number | null
  distribution: Record<string, number>
  totalVotes: number
  numericVotes: number
}

export interface Round {
  roundId: string
  roundNumber: number
  startedAt: Timestamp
  endedAt?: Timestamp
  revealed: boolean
  stats?: RoundStats
}

export interface Vote {
  userId: string
  value: string | null
  votedAt: Timestamp
}
