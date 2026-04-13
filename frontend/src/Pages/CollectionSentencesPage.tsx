import {
  Box,
  Button,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useNavigate, useParams } from 'react-router'
import { HighlightedText } from '../components/ui/HighlightedText'
import { useCollectionSentences } from '../hooks/useCollectionSentences'

export function CollectionSentencesPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const collectionId = id ?? ''
  const state = useCollectionSentences(collectionId)

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <VStack minH="60vh" justify="center">
        <Spinner size="xl" color="brand.solid" />
      </VStack>
    )
  }

  if (state.status === 'error') {
    return (
      <VStack minH="60vh" justify="center" gap={5}>
        <Heading size="md" color="fg.default">
          Ошибка
        </Heading>
        <Text color="fg.muted" textAlign="center" maxW="520px">
          {state.message}
        </Text>
        <Button colorPalette="brand" variant="solid" onClick={() => navigate(`/collections/${collectionId}`)}>
          К коллекции
        </Button>
      </VStack>
    )
  }

  if (state.status === 'empty') {
    return (
      <VStack minH="60vh" justify="center" gap={5}>
        <Heading size="lg" color="fg.default">
          Предложения
        </Heading>
        <Text color="fg.muted" textAlign="center" maxW="520px">
          Для этой коллекции ещё нет примеров предложений.
        </Text>
        <Button colorPalette="brand" variant="solid" onClick={() => void state.generate()}>
          Сгенерировать примеры
        </Button>
      </VStack>
    )
  }

  const sentences = state.sentences

  return (
    <VStack gap={8} py={8} px={4} align="center" w="full">
      <Heading size="lg" color="fg.default">
        Предложения
      </Heading>

      <VStack gap={6} w="full" maxW="860px">
        {sentences.map((sentence) => (
          <Box
            key={sentence.id}
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="modal"
            shadow="card.default"
            w="full"
            p={8}
            textAlign="center"
          >
            <HighlightedText text={sentence.text} word={sentence.highLighted} translate={sentence.translate} />
          </Box>
        ))}
      </VStack>

      <Button variant="ghost" color="fg.muted" onClick={() => navigate(`/collections/${collectionId}`)}>
        К коллекции
      </Button>
    </VStack>
  )
}
