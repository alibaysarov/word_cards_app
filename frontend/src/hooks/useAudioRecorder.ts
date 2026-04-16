import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderStatus =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'done'
  | 'error'

export interface UseAudioRecorderReturn {
  status: RecorderStatus
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

export function useAudioRecorder(
  onRecordingComplete: (blob: Blob) => Promise<void>
): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const lastBlobRef = useRef<Blob | null>(null)

  const stopTracks = useCallback((stream: MediaStream | null): void => {
    if (!stream) {
      return
    }

    stream.getTracks().forEach((track) => track.stop())
  }, [])

  const start = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event: BlobEvent): void => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async (): Promise<void> => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        lastBlobRef.current = blob
        setStatus('uploading')

        try {
          await onRecordingComplete(blob)
          setStatus('done')
        } catch {
          setStatus('error')
        } finally {
          stopTracks(mediaStreamRef.current)
          mediaStreamRef.current = null
          mediaRecorderRef.current = null
        }
      }

      recorder.start()
      setStatus('recording')
    } catch {
      setStatus('error')
    }
  }, [onRecordingComplete, stopTracks])

  const stop = useCallback((): void => {
    const recorder = mediaRecorderRef.current

    if (!recorder) {
      return
    }

    if (recorder.state !== 'inactive') {
      recorder.stop()
      return
    }

    stopTracks(mediaStreamRef.current)
    mediaStreamRef.current = null
    mediaRecorderRef.current = null
  }, [stopTracks])

  const reset = useCallback((): void => {
    setStatus('idle')
    chunksRef.current = []
    lastBlobRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current

      if (recorder && recorder.state !== 'inactive') {
        recorder.stop()
      }

      stopTracks(mediaStreamRef.current)
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      chunksRef.current = []
      lastBlobRef.current = null
    }
  }, [stopTracks])

  return {
    status,
    start,
    stop,
    reset,
  }
}
