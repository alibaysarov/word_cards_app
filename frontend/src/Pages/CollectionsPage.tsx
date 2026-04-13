import { Box, Heading, Text, VStack, Flex, Button, Grid, Spinner } from '@chakra-ui/react'
import { Link } from 'react-router'
import { LuPlus } from 'react-icons/lu'
import { useState } from 'react'
import AddCollectionModal from '../modals/AddCollectionModal'
import { useCollections } from '../hooks/useCollections'
import { createCollection } from '../api/collections.api'

export default function CollectionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { state, refetch } = useCollections()

  const handleSaveCollection = async (name: string): Promise<void> => {
    try {
      await createCollection(name)
      refetch()
    } catch {
      // API error handled by hook on refetch
    }
  }
  return (
    <>
      <VStack align="start" gap={6} w="full">
        <Flex justify="space-between" align="center" w="full">
          <Heading size="lg" color="fg.default">Collections</Heading>
          <Button
            colorPalette="brand"
            variant="solid"
            size="md"
            onClick={() => setIsModalOpen(true)}
          >
            <LuPlus />
            Добавить коллекцию
          </Button>
        </Flex>

        {(state.status === 'loading' || state.status === 'idle') && (
          <Flex justify="center" align="center" w="full" minH="240px">
            <Spinner size="xl" color="brand.solid" />
          </Flex>
        )}

        {state.status === 'error' && (
          <Text color="fg.muted">{state.message}</Text>
        )}

        {state.status === 'success' && (
          <Grid
            templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
            gap={4}
            w="full"
          >
            {state.collections.map((collection) => (
              <Link
                key={collection.id}
                to={`/collections/${collection.id}`}
                style={{ textDecoration: 'none' }}
              >
                <Box
                  p={5}
                  borderWidth="1px"
                  borderRadius="card"
                  borderColor="border.default"
                  bg="bg.surface"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{
                    borderColor: 'brand.emphasized',
                    boxShadow: 'card.hover',
                    transform: 'translateY(-2px)',
                  }}
                >
                  <VStack align="start" gap={3}>
                    <Text fontSize="sm" color="fg.subtle" fontWeight="medium">
                      Коллекция
                    </Text>
                    <Heading size="md" color="fg.default">
                      {collection.name}
                    </Heading>
                  </VStack>
                </Box>
              </Link>
            ))}
          </Grid>
        )}
    </VStack>

    <AddCollectionModal
      open={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onSave={handleSaveCollection}
    />
  </>
  )
}
