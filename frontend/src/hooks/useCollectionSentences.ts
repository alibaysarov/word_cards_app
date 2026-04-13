import { useEffect, useState, useCallback } from 'react'
import { fetchSentences, generateSentences } from '../api/sentences.api'
import type { Sentence } from '../types/sentence'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; sentences: Sentence[] }
  | { status: 'error'; message: string }

type Actions = {
  generate: () => Promise<void>
}

export function useCollectionSentences(collectionId: string): State & Actions {
  const [state, setState] = useState<State>({ status: 'idle' })

  const load = useCallback(async () => {
    if (!collectionId) return
    setState({ status: 'loading' })
    try {
      const sentences = await fetchSentences(collectionId)
      setState(
        sentences.length === 0
          ? { status: 'empty' }
          : { status: 'success', sentences }
      )
    } catch {
      setState({ status: 'error', message: 'Не удалось загрузить предложения' })
    }
  }, [collectionId])

  useEffect(() => {
    void load()
  }, [load])

  const generate = useCallback(async () => {
    if (!collectionId) return
    setState({ status: 'loading' })
    try {
      const sentences = await generateSentences(collectionId)
      setState(
        sentences.length === 0
          ? { status: 'empty' }
          : { status: 'success', sentences }
      )
    } catch {
      setState({
        status: 'error',
        message: 'Не удалось сгенерировать предложения',
      })
    }
  }, [collectionId])

  return { ...state, generate }
}
