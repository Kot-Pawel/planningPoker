import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Session, Participant, Round, Vote } from '@/types/firestore'

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

const sessionsCol = () => collection(db, 'sessions')
const sessionDoc = (sessionId: string) => doc(db, 'sessions', sessionId)
const participantsCol = (sessionId: string) =>
  collection(db, 'sessions', sessionId, 'participants')
const participantDoc = (sessionId: string, userId: string) =>
  doc(db, 'sessions', sessionId, 'participants', userId)
const roundsCol = (sessionId: string) =>
  collection(db, 'sessions', sessionId, 'rounds')
const roundDoc = (sessionId: string, roundId: string) =>
  doc(db, 'sessions', sessionId, 'rounds', roundId)
const votesCol = (sessionId: string, roundId: string) =>
  collection(db, 'sessions', sessionId, 'rounds', roundId, 'votes')
const voteDoc = (sessionId: string, roundId: string, userId: string) =>
  doc(db, 'sessions', sessionId, 'rounds', roundId, 'votes', userId)

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function createSession(
  sessionName: string,
  cardOptions: string[],
  cardValueMap: Record<string, number | null>,
  moderatorId: string,
): Promise<string> {
  const sessionRef = doc(sessionsCol()) // auto ID
  const roundRef = doc(roundsCol(sessionRef.id)) // auto ID

  // Step 1: Write session doc first so isModerator() can resolve it in rules
  await setDoc(sessionRef, {
    sessionName,
    createdAt: serverTimestamp(),
    state: 'open',
    cardOptions,
    cardValueMap,
    moderatorId,
    currentRoundId: roundRef.id,
  })

  // Step 2: Create first round (session now exists — isModerator check passes)
  await setDoc(roundRef, {
    roundNumber: 1,
    startedAt: serverTimestamp(),
    revealed: false,
  })

  // Participant is created by the caller via joinSession (with the real display name)
  return sessionRef.id
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const snap = await getDoc(sessionDoc(sessionId))
  if (!snap.exists()) return null
  return { sessionId: snap.id, ...(snap.data() as Omit<Session, 'sessionId'>) }
}

export async function closeSession(sessionId: string): Promise<void> {
  await updateDoc(sessionDoc(sessionId), { state: 'closed' })
}

export async function updateCardSet(
  sessionId: string,
  cardOptions: string[],
  cardValueMap: Record<string, number | null>,
): Promise<void> {
  await updateDoc(sessionDoc(sessionId), { cardOptions, cardValueMap })
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

/**
 * Joins (or rejoins) a session. Returns the display name actually used
 * (may have a suffix appended to avoid collisions).
 */
export async function joinSession(
  sessionId: string,
  userId: string,
  desiredName: string,
  isModerator = false,
): Promise<string> {
  // Check for existing participant by this userId first — rejoin, keep name
  const existingSnap = await getDoc(participantDoc(sessionId, userId))
  if (existingSnap.exists()) {
    await updateDoc(participantDoc(sessionId, userId), {
      lastSeen: serverTimestamp(),
    })
    const data = existingSnap.data() as Omit<Participant, 'userId'>
    return data.name
  }

  // Check for name collisions
  const allSnap = await getDocs(participantsCol(sessionId))
  const existingNames = allSnap.docs.map(
    (d) => (d.data() as Omit<Participant, 'userId'>).name,
  )

  let finalName = desiredName
  if (existingNames.includes(desiredName)) {
    const suffix = Math.random().toString(36).slice(2, 4)
    finalName = `${desiredName}-${suffix}`
  }

  await setDoc(participantDoc(sessionId, userId), {
    name: finalName,
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    isModerator,
  })

  return finalName
}

// ---------------------------------------------------------------------------
// Rounds
// ---------------------------------------------------------------------------

export async function startNewRound(sessionId: string): Promise<void> {
  // Get current round number from rounds collection
  const roundsSnap = await getDocs(roundsCol(sessionId))
  const nextNumber = roundsSnap.size + 1

  const newRoundRef = doc(roundsCol(sessionId))
  const batch = writeBatch(db)

  batch.set(newRoundRef, {
    roundNumber: nextNumber,
    startedAt: serverTimestamp(),
    revealed: false,
  })

  batch.update(sessionDoc(sessionId), {
    currentRoundId: newRoundRef.id,
    state: 'open',
  })

  await batch.commit()
}

export async function revealVotes(
  sessionId: string,
  roundId: string,
): Promise<void> {
  await updateDoc(roundDoc(sessionId, roundId), {
    revealed: true,
    endedAt: serverTimestamp(),
  })
}

export async function getRounds(sessionId: string): Promise<Round[]> {
  const q = query(roundsCol(sessionId), orderBy('startedAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    roundId: d.id,
    ...(d.data() as Omit<Round, 'roundId'>),
  }))
}

export async function getVotesForRound(
  sessionId: string,
  roundId: string,
): Promise<Vote[]> {
  const snap = await getDocs(votesCol(sessionId, roundId))
  return snap.docs.map((d) => ({
    userId: d.id,
    ...(d.data() as Omit<Vote, 'userId'>),
  }))
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

export async function castVote(
  sessionId: string,
  roundId: string,
  userId: string,
  value: string | null,
): Promise<void> {
  const batch = writeBatch(db)
  batch.set(voteDoc(sessionId, roundId, userId), {
    value,
    votedAt: serverTimestamp(),
  })
  batch.update(participantDoc(sessionId, userId), {
    lastSeen: serverTimestamp(),
  })
  await batch.commit()
}

// ---------------------------------------------------------------------------
// Real-time listeners
// ---------------------------------------------------------------------------

export function subscribeToSession(
  sessionId: string,
  onData: (session: Session) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    sessionDoc(sessionId),
    (snap) => {
      if (snap.exists()) {
        onData({ sessionId: snap.id, ...(snap.data() as Omit<Session, 'sessionId'>) })
      }
    },
    onError,
  )
}

export function subscribeToParticipants(
  sessionId: string,
  onData: (participants: Participant[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    participantsCol(sessionId),
    (snap) => {
      const participants = snap.docs.map((d) => ({
        userId: d.id,
        ...(d.data() as Omit<Participant, 'userId'>),
      }))
      onData(participants)
    },
    onError,
  )
}

export function subscribeToVotes(
  sessionId: string,
  roundId: string,
  onData: (votes: Vote[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    votesCol(sessionId, roundId),
    (snap) => {
      const votes = snap.docs.map((d) => ({
        userId: d.id,
        ...(d.data() as Omit<Vote, 'userId'>),
      }))
      onData(votes)
    },
    onError,
  )
}

export function subscribeToRound(
  sessionId: string,
  roundId: string,
  onData: (round: Round) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    roundDoc(sessionId, roundId),
    (snap) => {
      if (snap.exists()) {
        onData({ roundId: snap.id, ...(snap.data() as Omit<Round, 'roundId'>) })
      }
    },
    onError,
  )
}

// Suppress unused import warning — Timestamp used as a type in helpers
const _ts: typeof Timestamp = Timestamp
void _ts
