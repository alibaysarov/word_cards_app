import { useEffect, useState } from 'react'
import { fetchCollectionById } from '../api/collections.api'
import type { Collection } from '../types/collection'
import type { WordCard } from '../types/wordCard'

type CollectionWithCards = Collection & { wordCards: WordCard[] }

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; collection: CollectionWithCards }
  | { status: 'error'; message: string }

export function useCollection(collectionId: string): {
  state: State
  refetch: () => void
} {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!collectionId) return
    setState({ status: 'loading' })
    fetchCollectionById(collectionId)
      .then((collection) => setState({ status: 'success', collection }))
      .catch(() => setState({ status: 'error', message: 'Не удалось загрузить коллекцию' }))
  }, [collectionId, tick])

  return { state, refetch: () => setTick((t) => t + 1) }
}
