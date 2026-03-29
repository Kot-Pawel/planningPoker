import { useState } from 'react'

interface Props {
  cardOptions: string[]
  cardValueMap: Record<string, number | null>
  onChange: (cardOptions: string[], cardValueMap: Record<string, number | null>) => void
}

export default function CardSetEditor({ cardOptions, cardValueMap, onChange }: Props) {
  const [newCard, setNewCard] = useState('')

  function updateValue(card: string, raw: string) {
    const next = { ...cardValueMap }
    next[card] = raw === '' || raw === '-' ? null : Number(raw)
    onChange(cardOptions, next)
  }

  function removeCard(card: string) {
    const nextOptions = cardOptions.filter((c) => c !== card)
    const nextMap = { ...cardValueMap }
    delete nextMap[card]
    onChange(nextOptions, nextMap)
  }

  function addCard() {
    const trimmed = newCard.trim()
    if (!trimmed || cardOptions.includes(trimmed)) return
    const nextOptions = [...cardOptions, trimmed]
    const nextMap = { ...cardValueMap, [trimmed]: null }
    onChange(nextOptions, nextMap)
    setNewCard('')
  }

  return (
    <div className="space-y-2">
      <div className="max-h-48 overflow-y-auto space-y-1.5 border border-gray-200 rounded-lg p-2">
        {cardOptions.map((card) => (
          <div key={card} className="flex items-center gap-2">
            <span className="w-12 text-sm font-mono text-center bg-gray-100 rounded px-1 py-0.5 flex-shrink-0">
              {card}
            </span>
            <input
              type="number"
              step="0.5"
              value={cardValueMap[card] ?? ''}
              onChange={(e) => updateValue(card, e.target.value)}
              placeholder="null"
              className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => removeCard(card)}
              className="text-gray-400 hover:text-red-500 text-xs px-1"
              aria-label={`Remove card ${card}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newCard}
          onChange={(e) => setNewCard(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCard())}
          placeholder="New card label (e.g. ☕)"
          className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          type="button"
          onClick={addCard}
          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg px-3 py-1 text-xs font-medium"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Leave numeric value blank to exclude card from average/median.
      </p>
    </div>
  )
}
