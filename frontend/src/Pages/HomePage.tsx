import {
  Box,
  Button,
  Heading,
  HStack,
  Link as ChakraLink,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { LuArrowRight, LuPlus } from 'react-icons/lu'
import { createCollection } from '../api/collections.api'
import { RecentCollectionCard } from '../components/app/RecentCollectionCard'
import { useAuth } from '../hooks/useAuth'
import { useCollections } from '../hooks/useCollections'
import { useRecentCollections } from '../hooks/useRecentCollections'
import AddCollectionModal from '../modals/AddCollectionModal'

function getGreeting(): string {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Доброе утро'
  }

  if (hour < 18) {
    return 'Добрый день'
  }

  return 'Добрый вечер'
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state: collectionsState } = useCollections()
  const recentCollectionsState = useRecentCollections(5)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSaveCollection = async (name: string): Promise<void> => {
    await createCollection(name)
    navigate('/collections')
  }

  const greeting = getGreeting()

  return (
    <>
      <VStack align="start" gap={8} w="full">
        <VStack align="start" gap={2} w="full">
          <Heading size="xl" color="fg.default">
            {greeting}, {user?.login}!
          </Heading>
          <Text color="fg.muted">Готовы повторить карточки сегодня?</Text>
        </VStack>

        <VStack align="start" gap={3} w="full">
          <Heading size="md" color="fg.default">
            Статистика
          </Heading>
          <Box
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="card"
            boxShadow="card.default"
            p={5}
            minW={{ base: 'full', sm: '220px' }}
          >
            <VStack align="start" gap={1}>
              {collectionsState.status === 'loading' ||
              collectionsState.status === 'idle' ? (
                <Skeleton height="32px" width="56px" />
              ) : (
                <Text fontSize="2xl" fontWeight="bold" color="brand.fg">
                  {collectionsState.status === 'success'
                    ? collectionsState.collections.length
                    : 0}
                </Text>
              )}
              <Text color="fg.muted">Коллекций</Text>
            </VStack>
          </Box>
        </VStack>

        <VStack align="start" gap={4} w="full">
          <HStack justify="space-between" w="full" align="center">
            <Heading size="md" color="fg.default">
              Недавние коллекции
            </Heading>
            <ChakraLink asChild color="brand.fg">
              <Link to="/collections">
                <HStack as="span" gap={1}>
                  <Text>Все коллекции</Text>
                  <LuArrowRight />
                </HStack>
              </Link>
            </ChakraLink>
          </HStack>

          {recentCollectionsState.status === 'loading' ||
          recentCollectionsState.status === 'idle' ? (
            <HStack w="full" gap={4} align="stretch">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  height="128px"
                  minW="200px"
                  borderRadius="card"
                />
              ))}
            </HStack>
          ) : null}

          {recentCollectionsState.status === 'error' ? (
            <Text color="fg.muted">{recentCollectionsState.message}</Text>
          ) : null}

          {recentCollectionsState.status === 'success' &&
          recentCollectionsState.collections.length === 0 ? (
            <Box
              w="full"
              p={6}
              borderWidth="2px"
              borderStyle="dashed"
              borderColor="brand.solid"
              bg="brand.subtle"
              borderRadius="card"
            >
              <Text color="fg.default">
                Коллекций пока нет. Создайте первую!
              </Text>
            </Box>
          ) : null}

          {recentCollectionsState.status === 'success' &&
          recentCollectionsState.collections.length > 0 ? (
            <HStack
              w="full"
              gap={4}
              overflowX="auto"
              pb={2}
              align="stretch"
            >
              {recentCollectionsState.collections.map((collection) => (
                <RecentCollectionCard key={collection.id} collection={collection} />
              ))}
            </HStack>
          ) : null}
        </VStack>

        <VStack align="start" gap={3} w="full">
          <Heading size="md" color="fg.default">
            Быстрые действия
          </Heading>
          <HStack gap={3} wrap="wrap">
            <Button
              colorPalette="brand"
              variant="solid"
              onClick={() => setIsModalOpen(true)}
            >
              <LuPlus />
              Создать коллекцию
            </Button>

            <Button asChild variant="outline">
              <Link to="/collections">Мои коллекции</Link>
            </Button>
          </HStack>
        </VStack>
      </VStack>

      <AddCollectionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCollection}
      />
    </>
  )
}
