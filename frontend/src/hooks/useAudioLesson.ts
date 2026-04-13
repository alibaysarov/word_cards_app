import { useState, useCallback, useRef, useEffect } from 'react'
import type { WordCard } from '../types/wordCard'

type LessonStatus = 'idle' | 'playing' | 'paused'

interface AudioLessonState {
  currentIndex: number
  status: LessonStatus
  isAutoPlay: boolean
}

interface AudioLessonActions {
  play: () => void
  pause: () => void
  next: () => void
  prev: () => void
  goTo: (index: number) => void
  toggleAutoPlay: () => void
  speakWord: (text: string) => void
}

export function useAudioLesson(cards: WordCard[]): AudioLessonState & AudioLessonActions {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [status, setStatus] = useState<LessonStatus>('idle')
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const autoPlayRef = useRef(false)

  useEffect(() => {
    autoPlayRef.current = isAutoPlay
  }, [isAutoPlay])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const speakWord = useCallback((text: string) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.85
    utteranceRef.current = utterance

    utterance.onstart = () => setStatus('playing')
    utterance.onend = () => {
      setStatus('idle')
      if (autoPlayRef.current) {
        setCurrentIndex((prev) => {
          const nextIdx = prev + 1
          if (nextIdx < cards.length) {
            return nextIdx
          }
          setIsAutoPlay(false)
          return prev
        })
      }
    }
    utterance.onerror = () => setStatus('idle')

    window.speechSynthesis.speak(utterance)
  }, [cards.length])

  const play = useCallback(() => {
    if (cards.length === 0) return
    const card = cards[currentIndex]
    if (card) {
      speakWord(card.frontText)
    }
  }, [cards, currentIndex, speakWord])

  const pause = useCallback(() => {
    window.speechSynthesis.cancel()
    setStatus('idle')
  }, [])

  const next = useCallback(() => {
    window.speechSynthesis.cancel()
    setStatus('idle')
    setCurrentIndex((prev) => Math.min(prev + 1, cards.length - 1))
  }, [cards.length])

  const prev = useCallback(() => {
    window.speechSynthesis.cancel()
    setStatus('idle')
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }, [])

  const goTo = useCallback((index: number) => {
    window.speechSynthesis.cancel()
    setStatus('idle')
    setCurrentIndex(index)
  }, [])

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlay((prev) => !prev)
  }, [])

  useEffect(() => {
    if (isAutoPlay && status === 'idle' && cards.length > 0 && cards[currentIndex]) {
      const timeoutId = setTimeout(() => {
        speakWord(cards[currentIndex].frontText)
      }, 600)
      return () => clearTimeout(timeoutId)
    }
  }, [isAutoPlay, currentIndex, status, cards, speakWord])

  return {
    currentIndex,
    status,
    isAutoPlay,
    play,
    pause,
    next,
    prev,
    goTo,
    toggleAutoPlay,
    speakWord,
  }
}
