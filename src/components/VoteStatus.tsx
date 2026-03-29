import { useState } from 'react'
import { useSession } from '@/context/SessionContext'
import { revealVotes, startNewRound } from '@/lib/firestore'
import EditCardSetModal from '@/components/EditCardSetModal'

export default function VoteStatus() {
  const { session, currentRound, myVote, isModerator, votes, participants } = useSession()
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!session || !currentRound) return null

  const isRevealed = currentRound.revealed
  const votedCount = votes.filter((v) => v.value !== null).length
  const totalCount = participants.length

  async function handleReveal() {
    if (!session || !currentRound) return
    setLoading(true)
    try {
      await revealVotes(session.sessionId, currentRound.roundId)
    } finally {
      setLoading(false)
    }
  }

  async function handleNewRound() {
    if (!session) return
    setLoading(true)
    try {
      await startNewRound(session.sessionId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4">
        {/* Vote status for everyone */}
        <div className="flex items-center gap-3">
          {myVote?.value !== null && myVote?.value !== undefined ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Your vote:</span>
              <span className="text-lg font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1">
                {myVote.value}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">
              {isRevealed ? 'You did not vote' : 'No vote cast yet'}
            </span>
          )}

          <span className="text-sm text-gray-400">
            {votedCount}/{totalCount} voted
          </span>
        </div>

        {/* Moderator controls */}
        {isModerator && (
          <div className="flex items-center gap-2">
            {!isRevealed && (
              <button
                onClick={handleReveal}
                disabled={loading || votedCount === 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Reveal Votes
              </button>
            )}
            {isRevealed && (
              <button
                onClick={handleNewRound}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                New Round
              </button>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Edit Cards
            </button>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditCardSetModal onClose={() => setShowEditModal(false)} />
      )}
    </>
  )
}
