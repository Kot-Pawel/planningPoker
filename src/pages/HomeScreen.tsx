import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureAnonymousUser } from '@/lib/auth'
import { createSession, joinSession, getSession } from '@/lib/firestore'
import CardSetEditor from '@/components/CardSetEditor'

const FIBONACCI_OPTIONS = ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?']
const FIBONACCI_VALUE_MAP: Record<string, number | null> = {
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

const PAPARAZZI_OPTIONS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '🚀']
const PAPARAZZI_VALUE_MAP: Record<string, number | null> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  '🚀': null,
}

type CardPreset = 'fibonacci' | 'paparazzi' | 'custom'

export default function HomeScreen() {
  const navigate = useNavigate()

  // Create form state
  const [createName, setCreateName] = useState('')
  const [displayNameCreate, setDisplayNameCreate] = useState('')
  const [cardOptions, setCardOptions] = useState<string[]>(FIBONACCI_OPTIONS)
  const [cardValueMap, setCardValueMap] = useState<Record<string, number | null>>(
    FIBONACCI_VALUE_MAP,
  )
  const [showCustomEditor, setShowCustomEditor] = useState(false)
  const [cardPreset, setCardPreset] = useState<CardPreset>('fibonacci')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // Join form state
  const [joinCode, setJoinCode] = useState('')
  const [displayNameJoin, setDisplayNameJoin] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim() || !displayNameCreate.trim()) return
    setCreateLoading(true)
    setCreateError('')
    try {
      const user = await ensureAnonymousUser()
      const sessionId = await createSession(
        createName.trim(),
        cardOptions,
        cardValueMap,
        user.uid,
      )
      // Set display name for moderator
      await joinSession(sessionId, user.uid, displayNameCreate.trim(), true)
      navigate(`/session/${sessionId}`)
    } catch (err) {
      setCreateError('Failed to create session. Please try again.')
      console.error(err)
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim()
    if (!code || !displayNameJoin.trim()) return
    setJoinLoading(true)
    setJoinError('')
    try {
      const user = await ensureAnonymousUser()
      const session = await getSession(code)
      if (!session) {
        setJoinError('Session not found. Check the code and try again.')
        return
      }
      if (session.state === 'closed') {
        setJoinError('This session has been closed.')
        return
      }
      await joinSession(code, user.uid, displayNameJoin.trim(), false)
      navigate(`/session/${code}`)
    } catch (err) {
      setJoinError('Failed to join session. Please try again.')
      console.error(err)
    } finally {
      setJoinLoading(false)
    }
  }

  function handleUseCustom() {
    setCardPreset('custom')
    setShowCustomEditor(true)
  }

  function handleUseFibonacci() {
    setCardOptions(FIBONACCI_OPTIONS)
    setCardValueMap(FIBONACCI_VALUE_MAP)
    setCardPreset('fibonacci')
    setShowCustomEditor(false)
  }

  function handleUsePaparazzi() {
    setCardOptions(PAPARAZZI_OPTIONS)
    setCardValueMap(PAPARAZZI_VALUE_MAP)
    setCardPreset('paparazzi')
    setShowCustomEditor(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Header */}
        <div className="md:col-span-2 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Planning Poker</h1>
          <p className="mt-2 text-gray-500">
            Cookies make a person strong.
          </p>
        </div>

        {/* Create Session */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Session</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Name
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Sprint 42 planning"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={displayNameCreate}
                onChange={(e) => setDisplayNameCreate(e.target.value)}
                placeholder="Moderator name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Set
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleUseFibonacci}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    cardPreset === 'fibonacci'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Fibonacci
                </button>
                <button
                  type="button"
                  onClick={handleUsePaparazzi}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    cardPreset === 'paparazzi'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  pAPARazzi
                </button>
                <button
                  type="button"
                  onClick={handleUseCustom}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    cardPreset === 'custom'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom
                </button>
              </div>
              {cardPreset === 'fibonacci' && (
                <p className="text-xs text-gray-400">
                  {FIBONACCI_OPTIONS.join(', ')}
                </p>
              )}
              {cardPreset === 'paparazzi' && (
                <p className="text-xs text-gray-400">
                  {PAPARAZZI_OPTIONS.join(', ')}
                </p>
              )}
              {showCustomEditor && (
                <CardSetEditor
                  cardOptions={cardOptions}
                  cardValueMap={cardValueMap}
                  onChange={(opts, map) => {
                    setCardOptions(opts)
                    setCardValueMap(map)
                  }}
                />
              )}
            </div>

            {createError && (
              <p className="text-sm text-red-600">{createError}</p>
            )}
            <button
              type="submit"
              disabled={createLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              {createLoading ? 'Creating…' : 'Create Session'}
            </button>
          </form>
        </div>

        {/* Join Session */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Join Session</h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Paste session code or ID"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={displayNameJoin}
                onChange={(e) => setDisplayNameJoin(e.target.value)}
                placeholder="Display name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {joinError && (
              <p className="text-sm text-red-600">{joinError}</p>
            )}
            <button
              type="submit"
              disabled={joinLoading}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              {joinLoading ? 'Joining…' : 'Join Session'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
