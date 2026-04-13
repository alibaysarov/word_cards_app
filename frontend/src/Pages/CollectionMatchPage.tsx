import { Box, Button, Grid, Heading, Spinner, Stack, Text, VStack } from '@chakra-ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCollectionCards } from '../hooks/useCollectionCards'
import type { MatchTile, WordCard } from '../types/wordCard'
import MatchTileBox from '../components/app/MatchTileBox'

type GamePhase = 'playing' | 'round-complete' | 'summary'

const ROUND_SIZE = 8

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

function buildTiles(cards: WordCard[]): MatchTile[] {
  const termTiles: MatchTile[] = shuffle(cards).map((card) => ({
    id: card.id,
    text: card.frontText,
    side: 'term',
    matched: false,
    glowing: false,
    shaking: false,
  }))

  const definitionTiles: MatchTile[] = shuffle(cards).map((card) => ({
    id: card.id,
    text: card.RearText,
    side: 'definition',
    matched: false,
    glowing: false,
    shaking: false,
  }))

  return [...termTiles, ...definitionTiles]
}

export default function CollectionMatchPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const collectionId = id ?? ''

  const cardsState = useCollectionCards(collectionId)
  const cards = cardsState.status === 'success' ? cardsState.cards : []

  const [round, setRound] = useState(0)
  const [tiles, setTiles] = useState<MatchTile[]>([])
  const [selectedTile, setSelectedTile] = useState<MatchTile | null>(null)
  const [mismatches, setMismatches] = useState(0)
  const [phase, setPhase] = useState<GamePhase>('playing')

  const roundTimeoutRef = useRef<number | null>(null)
  const shakeTimeoutsRef = useRef<number[]>([])

  const totalRounds = useMemo(() => Math.ceil(cards.length / ROUND_SIZE), [cards.length])

  const currentRoundCards = useMemo(() => {
    return cards.slice(round * ROUND_SIZE, (round + 1) * ROUND_SIZE)
  }, [cards, round])

  useEffect(() => {
    return () => {
      if (roundTimeoutRef.current !== null) {
        clearTimeout(roundTimeoutRef.current)
      }

      shakeTimeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId)
      })
      shakeTimeoutsRef.current = []
    }
  }, [])

  useEffect(() => {
    if (cards.length < 2 || currentRoundCards.length === 0) {
      return
    }

    setTiles(buildTiles(currentRoundCards))
    setSelectedTile(null)
  }, [cards.length, currentRoundCards])

  useEffect(() => {
    if (phase !== 'playing' || tiles.length === 0) {
      return
    }

    const allMatched = tiles.every((tile) => tile.matched)

    if (!allMatched) {
      return
    }

    setPhase('round-complete')

    if (roundTimeoutRef.current !== null) {
      clearTimeout(roundTimeoutRef.current)
    }

    roundTimeoutRef.current = window.setTimeout(() => {
      if (round + 1 >= totalRounds) {
        setPhase('summary')
        return
      }

      setRound((previousRound) => previousRound + 1)
      setPhase('playing')
    }, 1500)
  }, [phase, round, tiles, totalRounds])

  const reset = (): void => {
    if (roundTimeoutRef.current !== null) {
      clearTimeout(roundTimeoutRef.current)
      roundTimeoutRef.current = null
    }

    shakeTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    shakeTimeoutsRef.current = []

    setRound(0)
    setMismatches(0)
    setSelectedTile(null)
    setPhase('playing')

    if (cards.length >= 2) {
      const firstRoundCards = cards.slice(0, ROUND_SIZE)
      setTiles(buildTiles(firstRoundCards))
    } else {
      setTiles([])
    }
  }

  const handleTileClick = (tile: MatchTile): void => {
    if (phase !== 'playing' || tile.matched || tile.glowing || tile.shaking) {
      return
    }

    if (!selectedTile) {
      setSelectedTile(tile)
      return
    }

    if (selectedTile.id === tile.id && selectedTile.side === tile.side) {
      setSelectedTile(null)
      return
    }

    if (selectedTile.side === tile.side) {
      setSelectedTile(tile)
      return
    }

    if (selectedTile.id === tile.id) {
      const matchedKeys = [selectedTile, tile].map(
        (currentTile) => `${currentTile.id}-${currentTile.side}`
      )

      setTiles((previousTiles) =>
        previousTiles.map((currentTile) =>
          matchedKeys.includes(`${currentTile.id}-${currentTile.side}`)
            ? { ...currentTile, glowing: true }
            : currentTile
        )
      )

      const glowTimeout = window.setTimeout(() => {
        setTiles((previousTiles) =>
          previousTiles.map((currentTile) =>
            matchedKeys.includes(`${currentTile.id}-${currentTile.side}`)
              ? { ...currentTile, matched: true, glowing: false }
              : currentTile
          )
        )

        shakeTimeoutsRef.current = shakeTimeoutsRef.current.filter((timeoutId) => timeoutId !== glowTimeout)
      }, 500)

      shakeTimeoutsRef.current.push(glowTimeout)
      setSelectedTile(null)
      return
    }

    const wrongKeys = [selectedTile, tile].map((currentTile) => `${currentTile.id}-${currentTile.side}`)

    setMismatches((count) => count + 1)
    setTiles((previousTiles) =>
      previousTiles.map((currentTile) =>
        wrongKeys.includes(`${currentTile.id}-${currentTile.side}`)
          ? { ...currentTile, shaking: true }
          : currentTile
      )
    )

    const shakeTimeout = window.setTimeout(() => {
      setTiles((previousTiles) =>
        previousTiles.map((currentTile) =>
          wrongKeys.includes(`${currentTile.id}-${currentTile.side}`)
            ? { ...currentTile, shaking: false }
            : currentTile
        )
      )

      shakeTimeoutsRef.current = shakeTimeoutsRef.current.filter((timeoutId) => timeoutId !== shakeTimeout)
    }, 600)

    shakeTimeoutsRef.current.push(shakeTimeout)
    setSelectedTile(null)
  }

  if (cardsState.status === 'loading' || cardsState.status === 'idle') {
    return (
      <VStack minH="60vh" justify="center">
        <Spinner size="xl" color="brand.solid" />
      </VStack>
    )
  }

  if (cardsState.status === 'error') {
    return (
      <VStack minH="60vh" justify="center" gap={5}>
        <Heading size="md" color="fg.default">
          Ошибка
        </Heading>
        <Text color="fg.muted" textAlign="center" maxW="520px">
          {cardsState.message}
        </Text>
        <Button colorPalette="brand" variant="solid" onClick={() => navigate(`/collections/${collectionId}`)}>
          К коллекции
        </Button>
      </VStack>
    )
  }

  if (cards.length < 2) {
    return (
      <VStack minH="60vh" justify="center" gap={5}>
        <Heading size="md" color="fg.default">
          Недостаточно карточек
        </Heading>
        <Text color="fg.muted" textAlign="center" maxW="520px">
          Добавьте минимум две карточки в коллекцию, чтобы начать игру в подбор.
        </Text>
        <Button colorPalette="brand" variant="solid" onClick={() => navigate(`/collections/${collectionId}`)}>
          К коллекции
        </Button>
      </VStack>
    )
  }

  if (phase === 'summary') {
    return (
      <Box minH="70vh" display="flex" alignItems="center" justifyContent="center">
        <VStack
          gap={6}
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="modal"
          boxShadow="card.default"
          p={{ base: 6, md: 8 }}
          w="full"
          maxW="560px"
        >
          <Heading size="xl" color="fg.default">
            Отлично!
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            Ошибок: {mismatches}
          </Text>
          <Stack direction={"column"} w="full" gap={3}>
            <Button colorPalette="brand" variant="solid" w="full" onClick={reset}>
              Сыграть еще раз
            </Button>
            <Button
              variant="outline"
              w="full"
              onClick={() => navigate(`/collections/${collectionId}`)}
            >
              К коллекции
            </Button>
          </Stack>
        </VStack>
      </Box>
    )
  }

  const termTiles = tiles.filter((tile) => tile.side === 'term')
  const definitionTiles = tiles.filter((tile) => tile.side === 'definition')

  return (
    <VStack align="stretch" gap={6} w="full" position="relative">
      <Box
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="card"
        p={{ base: 4, md: 6 }}
      >
        <Stack
          direction={{ base: 'column', sm: 'row' }}
          justify="space-between"
          align={{ base: 'flex-start', sm: 'center' }}
          gap={2}
        >
          <Heading size="md" color="fg.default">
            Раунд {round + 1} / {totalRounds}
          </Heading>
          <Text color="fg.muted" fontWeight="semibold">
            Ошибок: {mismatches}
          </Text>
        </Stack>
      </Box>

      <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={{ base: 2, md: 6 }}>
        <VStack align="stretch" gap={3}>
          <Heading display={{ 'smDown': 'none' }} size="sm" color="fg.muted">
            Термины
          </Heading>
          <VStack align="stretch" gap={3}>
            {termTiles.map((tile) => {
              return (
                <MatchTileBox
                  handleTileClick={handleTileClick}
                  tile={tile}
                  selectedTile={selectedTile}
                  phase={phase}
                />
              )
            })}
          </VStack>
        </VStack>

        <VStack align="stretch" gap={3}>
          <Heading display={{ 'smDown': 'none' }} size="sm" color="fg.muted">
            Определения
          </Heading>
          <VStack align="stretch" gap={3}>
            {definitionTiles.map((tile) => {
              return (
                <MatchTileBox
                  tile={tile}
                  selectedTile={selectedTile}
                  handleTileClick={handleTileClick}
                  phase={phase}
                />
              )
            })}
          </VStack>
        </VStack>
      </Grid>

      {phase === 'round-complete' ? (
        <Box
          position="absolute"
          inset={0}
          bg="bg.app"
          opacity={0.92}
          borderRadius="modal"
          display="flex"
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          <VStack gap={2}>
            <Heading size="lg" color="fg.default">
              Раунд завершен
            </Heading>
            <Text color="fg.muted">Готовим следующий набор карточек...</Text>
          </VStack>
        </Box>
      ) : null}
    </VStack>
  )
}
