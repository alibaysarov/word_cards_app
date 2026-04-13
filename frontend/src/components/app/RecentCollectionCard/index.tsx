import { Box, Flex, Heading, Text } from "@chakra-ui/react"
import { Link } from "react-router"
import type { RecentCollection } from "../../../types/collection"

type RecentCollectionCardProps = {
  collection: RecentCollection
}

export function RecentCollectionCard({ collection }: RecentCollectionCardProps) {
  return (
    <Link to={`/collections/${collection.id}`}>
      <Box
        minW="200px"
        maxW="240px"
        p={4}
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="card"
        boxShadow="card.default"
        _hover={{
          borderColor: "brand.emphasized",
          boxShadow: "card.hover",
          transform: "translateY(-2px)",
        }}
        transition="all 0.2s"
        cursor="pointer"
        flexShrink={0}
      >
        <Flex direction="column" gap={3} h="full" justify="space-between">
          <Text
            fontSize="xs"
            color="fg.subtle"
            textTransform="uppercase"
            fontWeight="medium"
          >
            {collection.cardCount} карточек
          </Text>

          <Heading size="sm" color="fg.default" lineClamp={2}>
            {collection.name}
          </Heading>
        </Flex>
      </Box>
    </Link>
  )
}