import * as functions from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

// ---------------------------------------------------------------------------
// Shared stats helpers (mirrors src/lib/stats.ts — kept separate to avoid
// bundling the Vite front-end into the Cloud Function runtime)
// ---------------------------------------------------------------------------

interface StatsResult {
  average: number | null
  median: number | null
  distribution: Record<string, number>
  totalVotes: number
  numericVotes: number
}

function computeStats(
  votes: Array<{ value: string | null }>,
  cardValueMap: Record<string, number | null>,
): StatsResult {
  const distribution: Record<string, number> = {}
  const numericValues: number[] = []

  for (const vote of votes) {
    if (vote.value === null) continue
    distribution[vote.value] = (distribution[vote.value] ?? 0) + 1
    const mapped = cardValueMap[vote.value]
    if (mapped !== null && mapped !== undefined) {
      numericValues.push(mapped)
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

  return { average, median, distribution, totalVotes, numericVotes }
}

// ---------------------------------------------------------------------------
// Aggregation: triggered on any vote write
// Computes stats and writes them to the round doc
// ---------------------------------------------------------------------------

export const onVoteWrite = functions.firestore.onDocumentWritten(
  'sessions/{sessionId}/rounds/{roundId}/votes/{userId}',
  async (event) => {
    const { sessionId, roundId } = event.params

    const sessionSnap = await db.doc(`sessions/${sessionId}`).get()
    if (!sessionSnap.exists) return

    const sessionData = sessionSnap.data() as {
      cardValueMap: Record<string, number | null>
    }
    const cardValueMap = sessionData.cardValueMap ?? {}

    const votesSnap = await db
      .collection(`sessions/${sessionId}/rounds/${roundId}/votes`)
      .get()

    const votes = votesSnap.docs.map((d) => ({
      value: (d.data().value as string | null) ?? null,
    }))

    const stats = computeStats(votes, cardValueMap)

    await db.doc(`sessions/${sessionId}/rounds/${roundId}`).update({ stats })
  },
)

// ---------------------------------------------------------------------------
// Cleanup: triggered when session is closed
// Marks the session with a closedAt timestamp for bookkeeping
// ---------------------------------------------------------------------------

export const onSessionClose = functions.firestore.onDocumentUpdated(
  'sessions/{sessionId}',
  async (event) => {
    const before = event.data?.before.data() as { state?: string } | undefined
    const after = event.data?.after.data() as { state?: string } | undefined

    if (before?.state !== 'closed' && after?.state === 'closed') {
      await event.data!.after.ref.update({
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  },
)
