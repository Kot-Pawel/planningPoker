import { useSession } from '@/context/SessionContext'
import { castVote } from '@/lib/firestore'

export default function CardGrid() {
  const { session, currentRound, myVote, userId, isModerator } = useSession()

  if (!session || !currentRound || !userId) return null

  const isRevealed = currentRound.revealed
  const selectedValue = myVote?.value ?? null

  async function handleCardClick(card: string) {
    if (isRevealed || !session || !currentRound) return
    const newValue = selectedValue === card ? null : card
    await castVote(session.sessionId, currentRound.roundId, userId!, newValue)
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
        {isRevealed ? 'Voting complete' : isModerator ? 'Cast your vote (optional)' : 'Pick your estimate'}
      </h3>
      <div className="flex flex-wrap gap-3">
        {session.cardOptions.map((card) => {
          const isSelected = selectedValue === card
          return (
            <button
              key={card}
              onClick={() => handleCardClick(card)}
              disabled={isRevealed}
              aria-pressed={isSelected}
              className={`
                w-14 h-20 rounded-xl border-2 text-lg font-bold transition-all duration-150
                flex items-center justify-center
                ${isRevealed
                  ? 'cursor-default opacity-50 border-gray-200 bg-gray-50 text-gray-400'
                  : isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md scale-105'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 hover:scale-105 cursor-pointer shadow-sm'
                }
              `}
            >
              {card}
            </button>
          )
        })}
      </div>
    </div>
  )
}
