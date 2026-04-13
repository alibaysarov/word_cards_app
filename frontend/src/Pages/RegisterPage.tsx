import { Box, Button, Flex, Heading, Input, Text, VStack, Link as ChakraLink } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import type { RegisterFormData } from '../types/auth';
import { useState } from 'react';
import axios from 'axios';

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>();

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser(data.login, data.password);
      navigate('/collections', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Ошибка регистрации');
      } else {
        setServerError('Ошибка регистрации');
      }
    }
  };

  return (
    <Flex h="100vh" align="center" justify="center" bg="bg.app">
      <Box
        bg="bg.surface"
        p={8}
        borderRadius="card"
        boxShadow="card.default"
        w="full"
        maxW="400px"
      >
        <VStack gap={6} align="stretch">
          <Heading size="lg" color="fg.default" textAlign="center">
            Создать аккаунт
          </Heading>

          <form onSubmit={handleSubmit(onSubmit)}>
            <VStack gap={4}>
              <Box w="full">
                <Input
                  placeholder="Логин"
                  {...register('login', { required: 'Введите логин' })}
                  borderColor={errors.login ? 'red.400' : 'border.default'}
                />
                {errors.login && <Text fontSize="sm" color="red.400">{errors.login.message}</Text>}
              </Box>

              <Box w="full">
                <Input
                  type="password"
                  placeholder="Пароль"
                  {...register('password', { required: 'Введите пароль' })}
                  borderColor={errors.password ? 'red.400' : 'border.default'}
                />
                {errors.password && <Text fontSize="sm" color="red.400">{errors.password.message}</Text>}
              </Box>

              {serverError && <Text color="red.400" fontSize="sm">{serverError}</Text>}

              <Button
                type="submit"
                colorPalette="brand"
                variant="solid"
                w="full"
                loading={isSubmitting}
              >
                Создать аккаунт
              </Button>
            </VStack>
          </form>

          <Text textAlign="center" color="fg.muted" fontSize="sm">
            Уже есть аккаунт?{' '}
            <ChakraLink asChild color="brand.fg">
              <Link to="/login">Войти</Link>
            </ChakraLink>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}
