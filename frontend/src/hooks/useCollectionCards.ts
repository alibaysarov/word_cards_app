import { useEffect, useState } from 'react'
import { fetchCollectionCards } from '../api/collections.api'
import type { WordCard } from '../types/wordCard'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; cards: WordCard[] }
  | { status: 'error'; message: string }

export function useCollectionCards(collectionId: string): State {
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    if (!collectionId) return
    setState({ status: 'loading' })
    fetchCollectionCards(collectionId)
      .then(({ cards }) => setState({ status: 'success', cards }))
      .catch(() =>
        setState({ status: 'error', message: 'Не удалось загрузить карточки' })
      )
  }, [collectionId])

  return state
}
