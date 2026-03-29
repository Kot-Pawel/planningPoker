import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { auth } from '@/lib/firebase'
import {
  subscribeToSession,
  subscribeToParticipants,
  subscribeToVotes,
  subscribeToRound,
} from '@/lib/firestore'
import type { Session, Participant, Round, Vote } from '@/types/firestore'

interface SessionContextValue {
  userId: string | null
  session: Session | null
  participants: Participant[]
  currentRound: Round | null
  votes: Vote[]
  myVote: Vote | null
  isModerator: boolean
  loading: boolean
  error: string | null
}

const SessionContext = createContext<SessionContextValue>({
  userId: null,
  session: null,
  participants: [],
  currentRound: null,
  votes: [],
  myVote: null,
  isModerator: false,
  loading: true,
  error: null,
})

export function useSession() {
  return useContext(SessionContext)
}

interface Props {
  sessionId: string
  children: ReactNode
}

export function SessionProvider({ sessionId, children }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track current roundId to know when to re-subscribe votes/round listener
  const currentRoundIdRef = useRef<string | null>(null)

  function handleError(err: Error) {
    console.error(err)
    setError('Connection error. Retrying…')
  }

  // Resolve userId from Firebase auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null)
    })
    return unsub
  }, [])

  // Session listener — wait for auth before attaching (rules require isAuthed())
  useEffect(() => {
    if (!userId) return
    const unsub = subscribeToSession(
      sessionId,
      (s) => {
        setSession(s)
        setLoading(false)
      },
      (err) => {
        handleError(err)
        setLoading(false)
      },
    )
    return unsub
  }, [sessionId, userId])

  // Participants listener
  useEffect(() => {
    if (!userId) return
    const unsub = subscribeToParticipants(sessionId, setParticipants, handleError)
    return unsub
  }, [sessionId, userId])

  // Round + votes listener — re-subscribes whenever currentRoundId changes
  useEffect(() => {
    const roundId = session?.currentRoundId
    if (!roundId) return
    if (roundId === currentRoundIdRef.current) return

    currentRoundIdRef.current = roundId
    setVotes([]) // Clear stale votes immediately on round change

    const unsubRound = subscribeToRound(sessionId, roundId, setCurrentRound, handleError)
    const unsubVotes = subscribeToVotes(sessionId, roundId, setVotes, handleError)

    return () => {
      unsubRound()
      unsubVotes()
    }
  }, [sessionId, session?.currentRoundId])

  const myVote = votes.find((v) => v.userId === userId) ?? null
  const isModerator = session?.moderatorId === userId

  const value: SessionContextValue = {
    userId,
    session,
    participants,
    currentRound,
    votes,
    myVote,
    isModerator,
    loading,
    error,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
