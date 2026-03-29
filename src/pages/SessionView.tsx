import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SessionProvider, useSession } from '@/context/SessionContext'
import { ensureAnonymousUser } from '@/lib/auth'
import { joinSession } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import CardGrid from '@/components/CardGrid'
import ParticipantList from '@/components/ParticipantList'
import VoteStatus from '@/components/VoteStatus'
import ResultsDisplay from '@/components/ResultsDisplay'
import RoundHistory from '@/components/RoundHistory'

export default function SessionView() {
  const { sessionId } = useParams<{ sessionId: string }>()
  if (!sessionId) return null

  return (
    <SessionProvider sessionId={sessionId}>
      <SessionViewInner sessionId={sessionId} />
    </SessionProvider>
  )
}

function SessionViewInner({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate()
  const { session, loading, error, userId, participants } = useSession()

  // Join-via-URL state
  const [needsName, setNeedsName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  // Shareable link state
  const [copied, setCopied] = useState(false)

  // Track whether we've received the first participants snapshot to avoid a
  // false-positive flash before Firestore delivers participant data.
  const participantsLoadedRef = useRef(false)

  // Check if current user is already a participant; if not, prompt for name
  useEffect(() => {
    if (!userId || loading || !session) return
    // Mark participants as loaded once we see the session is ready
    // The participants listener fires nearly simultaneously; give it one tick.
    const timer = setTimeout(() => {
      if (participantsLoadedRef.current) return
      participantsLoadedRef.current = true
      const isParticipant = participants.some((p) => p.userId === userId)
      if (!isParticipant) {
        setNeedsName(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [userId, loading, session]) // intentionally excludes participants — check once after session loads

  // Once we're in participants list, hide the modal
  useEffect(() => {
    if (participants.some((p) => p.userId === userId)) {
      setNeedsName(false)
    }
  }, [participants, userId])

  // Redirect when session not found or closed
  useEffect(() => {
    if (!loading && !session && !error) {
      navigate('/?error=not_found')
    }
  }, [loading, session, error, navigate])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const name = displayName.trim()
    if (!name) return
    setJoining(true)
    setJoinError('')
    try {
      const user = await ensureAnonymousUser()
      await joinSession(sessionId, user.uid, name, false)
      setNeedsName(false)
    } catch (err) {
      setJoinError('Failed to join. Please try again.')
      console.error(err)
    } finally {
      setJoining(false)
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Auth state for logout/sign-in edge cases
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        await ensureAnonymousUser()
      }
    })
    return unsub
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading session…
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-indigo-600 hover:underline"
          >
            ← Back to home
          </button>
        </div>
      </div>
    )
  }

  if (!session) return null

  // Join-via-URL modal
  if (needsName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            Joining: {session.sessionName}
          </h2>
          <p className="text-sm text-gray-500 mb-5">Enter your display name to join.</p>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            {joinError && <p className="text-sm text-red-600">{joinError}</p>}
            <button
              type="submit"
              disabled={joining}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold"
            >
              {joining ? 'Joining…' : 'Join Session'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const isClosed = session.state === 'closed'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{session.sessionName}</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{sessionId}</p>
        </div>
        <div className="flex items-center gap-3">
          {isClosed && (
            <span className="text-xs bg-red-100 text-red-700 rounded-full px-3 py-1 font-medium">
              Session Closed
            </span>
          )}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {copied ? '✓ Copied!' : '⎘ Copy Link'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Home
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto hidden md:block">
          <ParticipantList />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isClosed && (
            <>
              <VoteStatus />
              <CardGrid />
              <ResultsDisplay />
            </>
          )}
          {isClosed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800 text-sm">
              This session has been closed by the moderator.
            </div>
          )}
          <RoundHistory />

          {/* Mobile participant list */}
          <div className="md:hidden">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <ParticipantList />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
