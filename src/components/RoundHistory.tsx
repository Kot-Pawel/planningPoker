import { useEffect, useState } from 'react'
import { useSession } from '@/context/SessionContext'
import { getRounds, getVotesForRound } from '@/lib/firestore'
import { computeStats } from '@/lib/stats'
import type { Round, Vote } from '@/types/firestore'

interface RoundSummary {
  round: Round
  votes: Vote[] | null // null = not yet loaded
}

export default function RoundHistory() {
  const { session } = useSession()
  const [rounds, setRounds] = useState<RoundSummary[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!session || !open) return
    getRounds(session.sessionId).then((rs) => {
      // Exclude current round
      const past = rs.filter(
        (r) => r.roundId !== session.currentRoundId && r.revealed,
      )
      setRounds(past.map((r) => ({ round: r, votes: null })))
    })
  }, [session, open])

  async function toggleExpand(roundId: string) {
    const next = new Set(expanded)
    if (next.has(roundId)) {
      next.delete(roundId)
    } else {
      next.add(roundId)
      // Lazy-load votes
      const idx = rounds.findIndex((r) => r.round.roundId === roundId)
      if (idx !== -1 && rounds[idx].votes === null && session) {
        const votes = await getVotesForRound(session.sessionId, roundId)
        setRounds((prev) => {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], votes }
          return updated
        })
      }
    }
    setExpanded(next)
  }

  if (!session) return null

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
      >
        <span>Round History</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {rounds.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400 italic">No completed rounds yet.</p>
          )}
          {rounds.map(({ round, votes }) => {
            const isExpanded = expanded.has(round.roundId)
            const stats =
              votes && session
                ? computeStats(votes, session.cardValueMap)
                : null

            return (
              <div key={round.roundId} className="bg-white">
                <button
                  onClick={() => toggleExpand(round.roundId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      Round {round.roundNumber}
                    </span>
                    {stats && (
                      <span className="text-xs text-gray-400">
                        avg {stats.average ?? '—'} · median {stats.median ?? '—'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {votes === null && (
                      <p className="text-xs text-gray-400">Loading…</p>
                    )}
                    {stats && (
                      <>
                        <div className="flex gap-4">
                          <span className="text-xs text-gray-500">
                            Average: <strong>{stats.average ?? '—'}</strong>
                          </span>
                          <span className="text-xs text-gray-500">
                            Median: <strong>{stats.median ?? '—'}</strong>
                          </span>
                          <span className="text-xs text-gray-500">
                            Votes: <strong>{stats.totalVotes}</strong>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(stats.distribution).map(([card, count]) => (
                            <span
                              key={card}
                              className="text-xs bg-gray-100 rounded px-2 py-0.5 font-mono"
                            >
                              {card} ×{count}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
