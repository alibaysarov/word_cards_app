import { useCallback, useState } from 'react'
import { transcribeAudio } from '../../../api/voiceTests.api'
import {
  useAudioRecorder,
  type RecorderStatus,
} from '../../../hooks/useAudioRecorder'
import {
  compareSentence,
  type WordMatch,
} from '../../../utils/compareSentence'

export interface UseSentencePronunciationReturn {
  recorderStatus: RecorderStatus
  results: WordMatch[] | null
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

export function useSentencePronunciation(
  sentenceText: string
): UseSentencePronunciationReturn {
  const [results, setResults] = useState<WordMatch[] | null>(null)

  const handleRecordingComplete = useCallback(
    async (blob: Blob): Promise<void> => {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')

      const response = await transcribeAudio(form)
      const compared = compareSentence(sentenceText, response.text)
      setResults(compared)
    },
    [sentenceText]
  )

  const { status, start, stop, reset: resetRecorder } =
    useAudioRecorder(handleRecordingComplete)

  const reset = useCallback((): void => {
    setResults(null)
    resetRecorder()
  }, [resetRecorder])

  return {
    recorderStatus: status,
    results,
    start,
    stop,
    reset,
  }
}