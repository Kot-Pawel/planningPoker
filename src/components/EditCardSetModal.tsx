import { useState } from 'react'
import { useSession } from '@/context/SessionContext'
import { updateCardSet } from '@/lib/firestore'
import CardSetEditor from '@/components/CardSetEditor'

interface Props {
  onClose: () => void
}

export default function EditCardSetModal({ onClose }: Props) {
  const { session } = useSession()
  const [cardOptions, setCardOptions] = useState<string[]>(session?.cardOptions ?? [])
  const [cardValueMap, setCardValueMap] = useState<Record<string, number | null>>(
    session?.cardValueMap ?? {},
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!session || cardOptions.length === 0) return
    setSaving(true)
    setError('')
    try {
      await updateCardSet(session.sessionId, cardOptions, cardValueMap)
      onClose()
    } catch (err) {
      setError('Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Edit Card Set</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <CardSetEditor
          cardOptions={cardOptions}
          cardValueMap={cardValueMap}
          onChange={(opts, map) => {
            setCardOptions(opts)
            setCardValueMap(map)
          }}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || cardOptions.length === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
