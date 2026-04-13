import { Box, Heading, Text, VStack, Flex, Grid, IconButton, Button, ProgressRoot, Progress, ProgressLabel, Spinner } from '@chakra-ui/react'
import { useParams, Link, useNavigate } from 'react-router'
import { LuPlus, LuTrash2 } from 'react-icons/lu'
import React, { useState } from 'react'
import AddCardModal from '../modals/AddCardModal'
import CardModal from '../modals/CardModal'
import { useCollection } from '../hooks/useCollection'
import { createCard, deleteCard } from '../api/cards.api'
import { Tooltip } from '../components/ui/tooltip'

interface CardModalData {
  frontText: string
  rearText: string
}

export default function SingleCollectionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, refetch } = useCollection(id ?? '')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false)

  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [cardData, setCardData] = useState<CardModalData>({
    frontText: '',
    rearText: ''
  })

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <VStack minH="60vh" justify="center">
        <Spinner size="xl" color="brand.solid" />
      </VStack>
    )
  }

  if (state.status === 'error') {
    return (
      <VStack minH="60vh" justify="center" gap={5}>
        <Heading size="md" color="fg.default">Ошибка</Heading>
        <Text color="fg.muted">{state.message}</Text>
        <Link to="/collections" style={{ textDecoration: 'none' }}>
          <Button colorPalette="brand" variant="solid">К коллекциям</Button>
        </Link>
      </VStack>
    )
  }

  const { collection } = state
  const cards = collection.wordCards
  const canTest = cards.length >= 4
  const totalWords = cards.length
  const learnedWords = 0 // No backend support yet
  const progress = totalWords > 0 ? (learnedWords / totalWords) * 100 : 0

  const handleSaveCard = async (frontText: string, rearText: string): Promise<void> => {
    try {
      await createCard({ frontText, rearText, collectionId: id! })
      refetch()
    } catch {
      // Error will show on refetch
    }
  }

  return (
    <VStack align="start" gap={6} w="full">
      <Flex justify="space-between" align="center" w="full">
        <VStack align="start" gap={2}>
          <Link to="/collections" style={{ textDecoration: 'none' }}>
            <Text color="brand.fg" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
              ← Назад к коллекциям
            </Text>
          </Link>
          <Heading size="lg" color="fg.default">{collection.name}</Heading>
        </VStack>
      </Flex>

      <VStack align="start" gap={2} w="full">
        <Flex justify="space-between" w="full">
          <Text fontSize="lg" fontWeight="bold" color="fg.default">
            Заучено слов
          </Text>
          <Text fontSize="md" fontWeight="semibold" color="fg.muted">
            {learnedWords} / {totalWords}
          </Text>
        </Flex>
        <ProgressRoot value={progress} w="full" size="md">
          <ProgressLabel color="brand.fg">{Math.round(progress)}%</ProgressLabel>
          <Progress.Track bg="bg.muted">
            <Progress.Range bg="brand.solid" />
          </Progress.Track>
        </ProgressRoot>
      </VStack>

      <Flex gap={3} flexWrap="wrap">
        <Tooltip
          content="Для теста нужно минимум 4 карточки"
          disabled={canTest}
        >
          <Button
            colorPalette="brand"
            variant="solid"
            size="md"
            disabled={!canTest}
            onClick={() => navigate(`/collections/${id}/tests`)}
          >
            Тест
          </Button>
        </Tooltip>
        <Button
          colorPalette="accent"
          variant="solid"
          size="md"
          onClick={() => navigate(`/collections/${id}/match`)}
        >
          Подбор
        </Button>

        <Button
          colorPalette="accent"
          variant="solid"
          size="md"
          onClick={() => navigate(`/collections/${id}/sentences`)}
        >
          Предложения
        </Button>

        <Button
          colorPalette="accent"
          variant="solid"
          size="md"
          onClick={() => navigate(`/collections/${id}/audio_lesson`)}
        >
          Произношение
        </Button>
      </Flex>

      <Grid
        templateColumns={{ base: "repeat(auto-fill, minmax(150px, 1fr))", md: "repeat(auto-fill, minmax(200px, 1fr))" }}
        gap={4}
        w="full"
      >
        <Box
          aspectRatio="1"
          borderWidth="2px"
          borderRadius="lg"
          borderColor="brand.solid"
          borderStyle="dashed"
          bg="brand.subtle"
          cursor="pointer"
          transition="all 0.2s"
          display="flex"
          justifyContent="center"
          alignItems="center"
          _hover={{
            bg: 'brand.muted',
            borderColor: 'brand.emphasized',
          }}
          onClick={() => setIsAddCardModalOpen(true)}
        >
          <VStack gap={2}>
            <Box
              w={12}
              h={12}
              borderRadius="full"
              bg="brand.solid"
              color="brand.contrast"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <LuPlus size={24} />
            </Box>
            <Text fontSize="sm" color="brand.fg" fontWeight="medium">
              Добавить карточку
            </Text>
          </VStack>
        </Box>

        {cards.map((card) => (
          <Box
            onClick={() => {
              setCardData({
                frontText: card.frontText,
                rearText: card.RearText
              })
              setIsCardModalOpen(true)
            }}
            key={card.id}
            position="relative"
            aspectRatio="1"
            borderWidth="1px"
            borderRadius="card"
            borderColor="border.default"
            bg="bg.surface"
            cursor="pointer"
            transition="all 0.2s"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            p={4}
            onMouseEnter={() => setHoveredCard(card.id)}
            onMouseLeave={() => setHoveredCard(null)}
            _hover={{
              borderColor: 'brand.emphasized',
              boxShadow: 'card.hover',
              transform: 'translateY(-2px)',
            }}
          >
            {hoveredCard === card.id && (
              <IconButton
                position="absolute"
                top={2}
                right={2}
                size="sm"
                aria-label="Удалить карточку"
                colorPalette="red"
                variant="solid"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  deleteCard(card.id).then(() => refetch())
                }}
              >
                <LuTrash2 />
              </IconButton>
            )}

            <Text fontSize="xl" fontWeight="bold" color="fg.default" textAlign="center" flex={1} display="flex" alignItems="center">
              {card.frontText}
            </Text>

            <Text fontSize="sm" color="fg.muted" textAlign="center" mt="auto">
              {card.RearText}
            </Text>
          </Box>
        ))}
      </Grid>

      <AddCardModal
        open={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onSave={handleSaveCard}
      />
      <CardModal
        open={isCardModalOpen}
        frontText={cardData.frontText}
        rearText={cardData.rearText}
        onClose={() => {
          setIsCardModalOpen(false)
          setCardData({
            frontText: '',
            rearText: ''
          })
        }}
      />
    </VStack>
  )
}
