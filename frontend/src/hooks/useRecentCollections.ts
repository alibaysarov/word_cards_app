import { useEffect, useState } from 'react'
import { fetchRecentCollections } from '../api/collections.api'
import type { RecentCollection } from '../types/collection'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; collections: RecentCollection[] }
  | { status: 'error'; message: string }

export function useRecentCollections(limit = 5): State {
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    setState({ status: 'loading' })
    fetchRecentCollections(limit)
      .then((collections) => setState({ status: 'success', collections }))
      .catch(() =>
        setState({ status: 'error', message: 'Не удалось загрузить коллекции' })
      )
  }, [limit])

  return state
}
