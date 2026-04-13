import { useState, useRef } from 'react'
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { LuMic, LuSquare, LuLoader } from 'react-icons/lu'
import { uploadVoiceMessage } from '../../../api/voiceTests.api'

interface UploadResponse {
  text: string
}

type RecordStatus = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

export function AudioRecorder() {
  const [recordStatus, setRecordStatus] = useState<RecordStatus>('idle')
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('')
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  const start = async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.current = new MediaRecorder(stream)
    chunks.current = []

    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data)
    }

    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' })
      setAudioURL(URL.createObjectURL(blob))
      await upload(blob)
    }

    mediaRecorder.current.start()
    setRecordStatus('recording')
    setStatusText('Идёт запись...')
  }

  const stop = (): void => {
    mediaRecorder.current?.stop()
    mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop())
    setRecordStatus('uploading')
    setStatusText('Загружаю...')
  }

  const upload = async (blob: Blob): Promise<void> => {
    const form = new FormData()
    form.append('audio', blob, 'recording.webm')

    try {
      const data:UploadResponse = await uploadVoiceMessage(form);
      
      setRecordStatus('done')
      setStatusText(`Готово: ${data.text}`)
    } catch {
      setRecordStatus('error')
      setStatusText('Ошибка загрузки')
    }
  }

  const isRecording = recordStatus === 'recording'
  const isUploading = recordStatus === 'uploading'

  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="card"
      shadow="card.default"
      p={6}
      w="full"
      maxW="520px"
    >
      <VStack gap={5}>
        <HStack gap={3}>
          <Button
            colorPalette={isRecording ? 'red' : 'brand'}
            variant="solid"
            size="md"
            disabled={isUploading}
            onClick={isRecording ? stop : start}
          >
            {isRecording ? <LuSquare /> : <LuMic />}
            {isRecording ? 'Стоп' : 'Запись'}
          </Button>

          {isUploading && (
            <Box animation="spin 1s linear infinite" color="brand.fg">
              <LuLoader />
            </Box>
          )}
        </HStack>

        {audioURL && (
          <Box w="full" borderRadius="button" overflow="hidden">
            <audio src={audioURL} controls style={{ width: '100%' }} />
          </Box>
        )}

        {statusText && (
          <Text
            fontSize="sm"
            color={recordStatus === 'error' ? 'danger.fg' : recordStatus === 'done' ? 'success.fg' : 'fg.muted'}
          >
            {statusText}
          </Text>
        )}
      </VStack>
    </Box>
  )
}