import { useEffect, useState } from 'react'
import { fetchCollections } from '../api/collections.api'
import type { Collection } from '../types/collection'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; collections: Collection[] }
  | { status: 'error'; message: string }

export function useCollections(): {
  state: State
  refetch: () => void
} {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setState({ status: 'loading' })
    fetchCollections()
      .then((collections) => setState({ status: 'success', collections }))
      .catch(() =>
        setState({ status: 'error', message: 'Не удалось загрузить коллекции' })
      )
  }, [tick])

  return { state, refetch: () => setTick((t) => t + 1) }
}
