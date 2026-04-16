import { Box, Button, Separator, Spinner, Text, VStack } from '@chakra-ui/react'
import { HighlightedText } from '../../ui/HighlightedText'
import { PronunciationResult } from '../../ui/PronunciationResult'
import { useSentencePronunciation } from './useSentencePronunciation'
import type { Sentence } from '../../../types/sentence'

interface SentencePronunciationCardProps {
  sentence: Sentence
}

export function SentencePronunciationCard({
  sentence,
}: SentencePronunciationCardProps) {
  const { recorderStatus, results, start, stop, reset } =
    useSentencePronunciation(sentence.text)

  const showStartButton =
    recorderStatus === 'idle' ||
    recorderStatus === 'done' ||
    recorderStatus === 'error'

  return (
    <Box
      bg='bg.surface'
      borderWidth='1px'
      borderColor='border.default'
      borderRadius='modal'
      shadow='card.default'
      w='full'
      p={8}
      textAlign='center'
    >
      <VStack gap={0} align='stretch'>
        <HighlightedText
          text={sentence.text}
          word={sentence.highLighted}
          translate={sentence.translate}
        />

        <Text color='fg.muted' mt={3}>
          {sentence.translate}
        </Text>

        <Separator my={4} borderColor='border.default' />

        {showStartButton ? (
          <Button
            colorPalette='brand'
            variant='outline'
            onClick={() => void start()}
            aria-label='Начать запись произношения'
          >
            <span aria-hidden>🎤</span>
            Произнести
          </Button>
        ) : null}

        {recorderStatus === 'recording' ? (
          <Button
            colorPalette='red'
            variant='solid'
            onClick={stop}
            aria-label='Остановить запись'
          >
            <span aria-hidden>⏹</span>
            Остановить
          </Button>
        ) : null}

        {recorderStatus === 'uploading' ? (
          <VStack gap={2} py={2}>
            <Spinner size='md' color='brand.solid' />
            <Text color='fg.muted'>Распознавание...</Text>
          </VStack>
        ) : null}

        {results ? (
          <Box aria-live='polite' mt={4}>
            <PronunciationResult results={results} />
            <Button variant='ghost' color='fg.muted' mt={2} onClick={reset}>
              Повторить
            </Button>
          </Box>
        ) : null}

        {recorderStatus === 'error' && results === null ? (
          <Text color='danger.fg' mt={4}>
            Не удалось записать или распознать аудио. Проверьте доступ к
            микрофону.
          </Text>
        ) : null}
      </VStack>
    </Box>
  )
}