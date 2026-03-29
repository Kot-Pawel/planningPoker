import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const USER_ID_KEY = 'planningpoker_uid'

/**
 * Returns the anonymous Firebase user. Signs in if not already authenticated.
 * Persists the UID in localStorage so the user can rejoin sessions after a refresh.
 */
export async function ensureAnonymousUser(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        unsubscribe()
        if (user) {
          localStorage.setItem(USER_ID_KEY, user.uid)
          resolve(user)
        } else {
          try {
            const credential = await signInAnonymously(auth)
            localStorage.setItem(USER_ID_KEY, credential.user.uid)
            resolve(credential.user)
          } catch (err) {
            reject(err)
          }
        }
      },
      reject,
    )
  })
}

/** Returns the persisted UID from localStorage (may be stale; always prefer auth.currentUser). */
export function getStoredUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY)
}
