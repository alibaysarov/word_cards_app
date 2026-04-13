import {
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    IconButton,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react'
import { useNavigate, useParams } from 'react-router'
import {
    LuPlay,
    LuPause,
    LuSkipBack,
    LuSkipForward,
    LuRepeat,
    LuVolume2,
} from 'react-icons/lu'
import { useCollectionCards } from '../hooks/useCollectionCards'
import { useAudioLesson } from '../hooks/useAudioLesson'

export function AudioLessonPage() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const collectionId = id ?? ''
    const cardsState = useCollectionCards(collectionId)
    const cards = cardsState.status === 'success' ? cardsState.cards : []

    const lesson = useAudioLesson(cards)

    if (cardsState.status === 'idle' || cardsState.status === 'loading') {
        return (
            <VStack minH="60vh" justify="center">
                <Spinner size="xl" color="brand.solid" />
            </VStack>
        )
    }

    if (cardsState.status === 'error') {
        return (
            <VStack minH="60vh" justify="center" gap={5}>
                <Heading size="md" color="fg.default">Ошибка</Heading>
                <Text color="fg.muted">{cardsState.message}</Text>
                <Button colorPalette="brand" variant="solid" onClick={() => navigate(`/collections/${collectionId}`)}>
                    К коллекции
                </Button>
            </VStack>
        )
    }

    if (cards.length === 0) {
        return (
            <VStack minH="60vh" justify="center" gap={5}>
                <Heading size="lg" color="fg.default">Произношение</Heading>
                <Text color="fg.muted" textAlign="center" maxW="520px">
                    В коллекции пока нет карточек. Добавьте слова, чтобы начать урок.
                </Text>
                <Button colorPalette="brand" variant="solid" onClick={() => navigate(`/collections/${collectionId}`)}>
                    К коллекции
                </Button>
            </VStack>
        )
    }

    const currentCard = cards[lesson.currentIndex]

    return (
        <VStack gap={8} py={8} px={4} align="center" w="full">
            <Heading size="lg" color="fg.default">Произношение</Heading>

            <Text color="fg.muted" fontSize="sm">
                {lesson.currentIndex + 1} / {cards.length}
            </Text>

            <Box
                bg="bg.surface"
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="modal"
                shadow="card.default"
                w="full"
                maxW="520px"
                p={10}
                textAlign="center"
                transition="all 0.2s"
                _hover={{ shadow: 'card.hover' }}
            >
                <VStack gap={6}>
                    <HStack gap={3} justify="center">
                        <Heading size="2xl" color="fg.default">
                            {currentCard.frontText}
                        </Heading>
                        <IconButton
                            aria-label="Произнести слово"
                            variant="ghost"
                            color="brand.fg"
                            size="sm"
                            onClick={() => lesson.speakWord(currentCard.frontText)}
                        >
                            <LuVolume2 />
                        </IconButton>
                    </HStack>

                    <Text fontSize="lg" color="fg.muted">
                        {currentCard.RearText}
                    </Text>
                </VStack>
            </Box>

            <HStack gap={3}>
                <IconButton
                    aria-label="Предыдущее"
                    variant="outline"
                    size="lg"
                    disabled={lesson.currentIndex === 0}
                    onClick={lesson.prev}
                >
                    <LuSkipBack />
                </IconButton>

                {lesson.status === 'playing' ? (
                    <IconButton
                        aria-label="Пауза"
                        colorPalette="brand"
                        variant="solid"
                        size="lg"
                        onClick={lesson.pause}
                    >
                        <LuPause />
                    </IconButton>
                ) : (
                    <IconButton
                        aria-label="Воспроизвести"
                        colorPalette="brand"
                        variant="solid"
                        size="lg"
                        onClick={lesson.play}
                    >
                        <LuPlay />
                    </IconButton>
                )}

                <IconButton
                    aria-label="Следующее"
                    variant="outline"
                    size="lg"
                    disabled={lesson.currentIndex === cards.length - 1}
                    onClick={lesson.next}
                >
                    <LuSkipForward />
                </IconButton>
            </HStack>

            <Button
                variant={lesson.isAutoPlay ? 'solid' : 'outline'}
                colorPalette={lesson.isAutoPlay ? 'brand' : undefined}
                size="sm"
                onClick={lesson.toggleAutoPlay}
            >
                <LuRepeat />
                {lesson.isAutoPlay ? 'Автовоспроизведение вкл.' : 'Автовоспроизведение'}
            </Button>


            <Flex gap={3} flexWrap="wrap" justify="center" maxW="520px">
                {cards.map((card, index) => (
                    <Box
                        key={card.id}
                        w="10px"
                        h="10px"
                        borderRadius="pill"
                        bg={index === lesson.currentIndex ? 'brand.solid' : 'bg.muted'}
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{ bg: index === lesson.currentIndex ? 'brand.emphasized' : 'border.default' }}
                        onClick={() => lesson.goTo(index)}
                    />
                ))}
            </Flex>

            <Button variant="ghost" color="fg.muted" onClick={() => navigate(`/collections/${collectionId}`)}>
                К коллекции
            </Button>
        </VStack>
    )
}
