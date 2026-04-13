import { useEffect, useState, useCallback } from 'react'
import {
  fetchCollectionTest,
  submitTestAnswer,
  resetTestSession,
} from '../api/collections.api'
import type { TestQuestion, SubmitAnswerResponse } from '../types/collectionTest'

type SuccessState = {
  status: 'success'
  questions: TestQuestion[]
  testSessionId: string
  answeredCardIds: string[]
  correctCount: number
  totalCount: number
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | SuccessState
  | { status: 'error'; message: string }

type Actions = {
  submitAnswer: (wordCardId: string) => Promise<SubmitAnswerResponse | null>
  resetSession: () => Promise<void>
}

export function useCollectionTest(collectionId: string): State & Actions {
  const [state, setState] = useState<State>({ status: 'idle' })

  const load = useCallback(async () => {
    if (!collectionId) return

    setState({ status: 'loading' })
    try {
      const data = await fetchCollectionTest(collectionId)
      setState({
        status: 'success',
        questions: data.questions,
        testSessionId: data.testSessionId,
        answeredCardIds: data.answeredCardIds,
        correctCount: data.answeredCardIds.length,
        totalCount: data.questions.length,
      })
    } catch {
      setState({ status: 'error', message: 'Не удалось загрузить тест' })
    }
  }, [collectionId])

  useEffect(() => {
    void load()
  }, [load])

  const submitAnswer = useCallback(
    async (wordCardId: string): Promise<SubmitAnswerResponse | null> => {
      if (state.status !== 'success') return null

      try {
        const result = await submitTestAnswer(
          collectionId,
          state.testSessionId,
          wordCardId
        )

        setState((prev) =>
          prev.status === 'success'
            ? {
                ...prev,
                correctCount: result.correctCount,
                answeredCardIds: [...prev.answeredCardIds, wordCardId],
              }
            : prev
        )

        return result
      } catch {
        return null
      }
    },
    [collectionId, state]
  )

  const resetSession = useCallback(async (): Promise<void> => {
    try {
      await resetTestSession(collectionId)
      await load()
    } catch {
      setState({ status: 'error', message: 'Не удалось сбросить тест' })
    }
  }, [collectionId, load])

  return { ...state, submitAnswer, resetSession } as State & Actions
}