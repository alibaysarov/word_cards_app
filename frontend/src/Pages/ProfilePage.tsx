import { Avatar, Box, Heading, Text, VStack } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <VStack align="start" gap={6} w="full" maxW="480px">
      <Heading size="lg" color="fg.default">Профиль</Heading>

      <Box bg="bg.surface" p={6} borderRadius="card" boxShadow="card.default" w="full">
        <VStack gap={4} align="start">
          <Avatar.Root size="lg">
            <Avatar.Fallback name={user?.login ?? '?'} />
          </Avatar.Root>

          <Box>
            <Text fontSize="sm" color="fg.muted">Логин</Text>
            <Text fontWeight="semibold" color="fg.default">{user?.login}</Text>
          </Box>

          <Box>
            <Text fontSize="sm" color="fg.muted">ID</Text>
            <Text fontSize="xs" color="fg.muted" fontFamily="mono">{user?.id}</Text>
          </Box>
        </VStack>
      </Box>

    </VStack>
  );
}
