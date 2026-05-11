import { useSession } from '@/context/SessionContext'
import { kickParticipant } from '@/lib/firestore'

export default function ParticipantList() {
  const { participants, votes, currentRound, userId, session, isModerator } = useSession()

  const votedUserIds = new Set(votes.filter((v) => v.value !== null).map((v) => v.userId))

  async function handleKick(targetUserId: string) {
    if (!session) return
    await kickParticipant(session.sessionId, targetUserId)
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Participants ({participants.length})
      </h3>
      <ul className="space-y-2">
        {participants.map((p) => {
          const isYou = p.userId === userId
          const isMod = p.userId === session?.moderatorId
          const hasVoted = votedUserIds.has(p.userId)
          const isRevealed = currentRound?.revealed ?? false

          // Find vote value for display after reveal
          const vote = votes.find((v) => v.userId === p.userId)

          return (
            <li
              key={p.userId}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                isYou ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-sm font-medium text-gray-800">
                  {p.name}
                </span>
                {isYou && (
                  <span className="text-xs text-indigo-500 font-medium flex-shrink-0">
                    (you)
                  </span>
                )}
                {isMod && (
                  <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-medium flex-shrink-0">
                    mod
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {isRevealed ? (
                  <span className="text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded px-2 py-0.5">
                    {vote?.value ?? '–'}
                  </span>
                ) : hasVoted ? (
                  <span className="text-green-600 text-base" title="Voted">✓</span>
                ) : (
                  <span className="text-gray-300 text-base" title="Waiting">○</span>
                )}
                {isModerator && !isYou && !isMod && (
                  <button
                    onClick={() => handleKick(p.userId)}
                    title={`Kick ${p.name}`}
                    className="text-gray-300 hover:text-red-500 transition-colors text-sm leading-none"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
