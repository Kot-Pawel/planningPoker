import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/context/SessionContext'
import { computeStats } from '@/lib/stats'

const UNANIMOUS_MESSAGES = [
  'Unanimous! You all think alike 🤝',
  'Telepathy unlocked 🧠',
  'Hive mind activated. Resistance is futile.',
  'One card to rule them all 👍',
  "That's what she said. Wait, no — that's what EVERYONE said.",
]

const TALK_MESSAGES = [
  'We need to talk. 👀',
  'Interesting... care to explain yourselves?',
  'The estimates have entered the chat. So has chaos.',
  'Well, someone is wrong. Politely discuss who.',
  'Plot twist: you were all thinking of different stories.',
  'This meeting could have been a longer meeting.',
]

interface Flash {
  msg: string
  variant: 'unanimous' | 'talk'
}

export default function ResultsDisplay() {
  const { currentRound, votes, session, participants } = useSession()
  const [flash, setFlash] = useState<Flash | null>(null)
  const shownForRoundRef = useRef<string | null>(null)

  const { average, median, distribution, numericVotes, excludedCards } = computeStats(
    votes,
    session?.cardValueMap ?? {},
  )

  useEffect(() => {
    if (!currentRound?.revealed || !session) return
    if (shownForRoundRef.current === currentRound.roundId) return

    const actualVotes = votes.filter((v) => v.value !== null)
    const uniqueValues = new Set(actualVotes.map((v) => v.value))
    const allVoted = participants.length > 0 && actualVotes.length === participants.length

    if (allVoted && uniqueValues.size === 1) {
      shownForRoundRef.current = currentRound.roundId
      const msg = UNANIMOUS_MESSAGES[Math.floor(Math.random() * UNANIMOUS_MESSAGES.length)]
      setFlash({ msg, variant: 'unanimous' })
      const timer = setTimeout(() => setFlash(null), 5000)
      return () => clearTimeout(timer)
    }

    // Detect spread > 2 card positions among numeric votes
    const numericActual = actualVotes.filter(
      (v) => v.value !== null && session.cardValueMap[v.value!] !== null,
    )
    const positions = numericActual
      .map((v) => session.cardOptions.indexOf(v.value!))
      .filter((i) => i !== -1)

    if (positions.length >= 2) {
      const spread = Math.max(...positions) - Math.min(...positions)
      if (spread > 2) {
        shownForRoundRef.current = currentRound.roundId
        const msg = TALK_MESSAGES[Math.floor(Math.random() * TALK_MESSAGES.length)]
        setFlash({ msg, variant: 'talk' })
        const timer = setTimeout(() => setFlash(null), 5000)
        return () => clearTimeout(timer)
      }
    }
  }, [currentRound?.revealed, currentRound?.roundId, votes, participants, session])

  if (!currentRound?.revealed || !session) return null

  const abstainedIds = new Set(
    votes.filter((v) => v.value === null).map((v) => v.userId),
  )
  const didNotVoteIds = new Set(
    participants.filter((p) => !votes.some((v) => v.userId === p.userId)).map((p) => p.userId),
  )
  const abstainedOrMissing = participants.filter(
    (p) => abstainedIds.has(p.userId) || didNotVoteIds.has(p.userId),
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Results</h3>

      {/* Flash banner: unanimous or needs-talk */}
      {flash && (
        <div
          className={`animate-pulse text-center text-sm font-semibold rounded-lg px-4 py-2 ${
            flash.variant === 'unanimous'
              ? 'text-indigo-700 bg-indigo-50 border border-indigo-200'
              : 'text-amber-700 bg-amber-50 border border-amber-200'
          }`}
        >
          {flash.msg}
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-6">
        <Stat label="Average" value={average !== null ? average.toFixed(1) : '—'} />
        <Stat label="Median" value={median !== null ? String(median) : '—'} />
        <Stat label="Numeric Votes" value={String(numericVotes)} />
      </div>

      {/* Distribution */}
      {Object.keys(distribution).length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Distribution</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(distribution)
              .sort(([a], [b]) => {
                const an = session.cardValueMap[a]
                const bn = session.cardValueMap[b]
                if (an !== null && an !== undefined && bn !== null && bn !== undefined) return an - bn
                return 0
              })
              .map(([card, count]) => (
                <div
                  key={card}
                  className="flex flex-col items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-w-[3rem]"
                >
                  <span className="text-base font-bold text-gray-800">{card}</span>
                  <span className="text-xs text-gray-500 mt-0.5">×{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Excluded cards note */}
      {excludedCards.length > 0 && (
        <p className="text-xs text-gray-400">
          Excluded from stats: {excludedCards.join(', ')} (non-numeric)
        </p>
      )}

      {/* Did not vote */}
      {abstainedOrMissing.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Did not vote</p>
          <div className="flex flex-wrap gap-1.5">
            {abstainedOrMissing.map((p) => (
              <span
                key={p.userId}
                className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
