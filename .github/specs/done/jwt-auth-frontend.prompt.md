---
agent: Spec Executor
model: Claude Sonnet 4.5 (copilot)
description: "JWT authentication on React frontend: login/register forms, token storage, protected routes, profile page, auto-refresh"
---

# JWT Authentication & Authorization — Frontend

## 1. Overview

Реализовать на клиенте полный цикл JWT-аутентификации:
- Страницы `/login` и `/register` с формами (react-hook-form)
- Хранение `accessToken` + `refreshToken` в `localStorage`
- `useAuth` контекст/хук — единая точка доступа к состоянию авторизации
- Interceptor в `httpClient` автоматически подставляет `accessToken` и, при 401, пробует обновить токен через `POST /api/auth/refresh`, затем повторяет запрос
- `ProtectedRoute` компонент — редиректит неавторизованных на `/login`
- Защищённые роуты: `/collections/**` и страницы тестирования
- Страница `/profile` — отображает логин пользователя и кнопку «Выйти»
- Ссылка на профиль в Sidebar
- При logout: удалить токены из `localStorage`, вызвать `POST /api/auth/logout`, перенаправить на `/login`

## 2. Architecture / Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        React App (Router)                        │
│                                                                  │
│  /login, /register ──▶ PublicLayout (только для гостей)         │
│  /, /collections/**, /profile ──▶ ProtectedRoute wrapper        │
│                              │                                   │
│                        AuthContext                               │
│                     { user, isLoading,                          │
│                       login(), logout(),                         │
│                       register() }                               │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────┐
│   useAuth (hook)     │◀── AuthContext.Provider в App.tsx
│   reads context      │
└──────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                        httpClient (axios)                        │
│  Request interceptor:                                            │
│    → читает accessToken из localStorage                          │
│    → добавляет Authorization: Bearer <token>                     │
│                                                                  │
│  Response interceptor:                                           │
│    → 401 → POST /api/auth/refresh { refreshToken }              │
│          → сохранить новые токены                                │
│          → повторить оригинальный запрос                         │
│    → если refresh тоже 401 → logout() → redirect /login         │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────┐
│  Express Backend API │
│  /api/auth/**        │
│  /api/collections/** │
│  /api/cards/**       │
└──────────────────────┘
```

## 3. New File Structure

```
frontend/src/
  env.ts                                     ← NEW  (валидация VITE_API_URL)

  api/
    httpClient.ts                            ← UPDATED (interceptor с refresh-логикой)
    auth.api.ts                              ← NEW  (login, register, refresh, logout, getMe)
    collections.api.ts                       ← no change
    cards.api.ts                             ← no change

  contexts/
    AuthContext.tsx                          ← NEW  (React Context + Provider)

  hooks/
    useAuth.ts                               ← NEW  (читает AuthContext)
    useCollections.ts                        ← no change
    useCollectionCards.ts                    ← no change
    useCollection.ts                         ← no change

  types/
    auth.ts                                  ← NEW  (User, TokenPair, LoginFormData, RegisterFormData)
    collection.ts                            ← no change
    wordCard.ts                              ← no change

  components/
    app/
      Sidebar/
        index.tsx                            ← UPDATED (добавить ссылку на профиль, UserAvatar)
      ProtectedRoute/
        index.tsx                            ← NEW  (HOC/wrapper для защищённых маршрутов)

  pages/                                     # Переименованы для единообразия — используй Pages/ как есть
  Pages/
    LoginPage.tsx                            ← NEW
    RegisterPage.tsx                         ← NEW
    ProfilePage.tsx                          ← NEW
    CollectionsPage.tsx                      ← no change
    SingleCollectionPage.tsx                 ← no change
    CollectionTestPage.tsx                   ← no change
    CollectionMatchPage.tsx                  ← no change
    HomePage.tsx                             ← no change

  router/
    index.tsx                                ← UPDATED (добавить /login, /register, /profile, ProtectedRoute)

  App.tsx                                    ← UPDATED (обернуть в AuthProvider)
```

## 3.1 New Dependencies

Установить в контейнере frontend:

```bash
npm install zod react-hook-form
```

| Пакет | Назначение |
|-------|-----------|
| `zod` | Валидация переменных окружения (`env.ts`) |
| `react-hook-form` | Формы авторизации с валидацией |

## 4. Step-by-step Specification

### 4.1 env.ts — валидация переменных окружения

Файл: `frontend/src/env.ts`

```ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL'),
});

export const env = envSchema.parse(import.meta.env);
```

Использовать `env.VITE_API_URL` в `httpClient.ts` вместо прямого `import.meta.env.VITE_API_URL`.

### 4.2 Типы — types/auth.ts

```ts
export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type User = {
  id: string;
  login: string;
};

export type LoginFormData = {
  login: string;
  password: string;
};

export type RegisterFormData = {
  login: string;
  password: string;
};
```

### 4.3 API — api/auth.api.ts

```ts
import httpClient from './httpClient';
import { authAxios } from './httpClient';
import type { TokenPair, User } from '../types/auth';

export async function apiLogin(login: string, password: string): Promise<TokenPair> {
  const res = await httpClient.post<TokenPair>('/auth/login', { login, password });
  return res.data;
}

export async function apiRegister(login: string, password: string): Promise<TokenPair> {
  const res = await httpClient.post<TokenPair>('/auth/register', { login, password });
  return res.data;
}

export async function apiRefresh(refreshToken: string): Promise<TokenPair> {
  const res = await authAxios.post<TokenPair>('/auth/refresh', { refreshToken });
  return res.data;
}

export async function apiLogout(): Promise<void> {
  await authAxios.post('/auth/logout');
}

export async function apiGetMe(): Promise<User> {
  const res = await httpClient.get<User>('/auth/me');
  return res.data;
}
```

**Важно:**
- `apiRefresh` и `apiLogout` используют `authAxios` (без response-interceptor), чтобы избежать бесконечного цикла обновления токенов
- `apiLogout` не отправляет тело — бэкенд возвращает `204 No Content` без обработки тела запроса (logout stateless, token revocation не реализован)
- `apiRegister` получает ответ со статусом `201` (Created)

### 4.4 httpClient — обновить interceptors

Файл: `frontend/src/api/httpClient.ts`

```ts
import axios from 'axios';
import { env } from '../env';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  save: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Чистый клиент для auth-запросов (без response interceptor, чтобы не зациклиться)
export const authAxios = axios.create({
  baseURL: env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const httpClient = axios.create({
  baseURL: env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request: добавляем токен
httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: при 401 пробуем refresh
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) {
      tokenStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Ставим запрос в очередь, пока идёт refresh
      return new Promise((resolve) => {
        refreshQueue.push((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(httpClient(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await authAxios.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken }
      );
      tokenStorage.save(data.accessToken, data.refreshToken);

      // Сбрасываем очередь с новым токеном
      refreshQueue.forEach((cb) => cb(data.accessToken));
      refreshQueue = [];

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return httpClient(originalRequest);
    } catch {
      tokenStorage.clear();
      refreshQueue = [];
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export default httpClient;
```

**Ключевые паттерны:**
- `isRefreshing` + `refreshQueue` — предотвращает параллельный вызов `/refresh` несколькими запросами одновременно
- `authAxios` без interceptor — для вызова `/auth/refresh` без риска рекурсии
- `originalRequest._retry` — флаг предотвращения повторной попытки

### 4.5 AuthContext — contexts/AuthContext.tsx

```tsx
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiGetMe, apiLogin, apiLogout, apiRegister } from '../api/auth.api';
import { tokenStorage } from '../api/httpClient';
import type { User } from '../types/auth';

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true до первой проверки

  // При первом рендере пытаемся восстановить сессию из localStorage
  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiGetMe()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (loginStr: string, password: string) => {
    const tokens = await apiLogin(loginStr, password);
    tokenStorage.save(tokens.accessToken, tokens.refreshToken);
    const me = await apiGetMe();
    setUser(me);
  }, []);

  const register = useCallback(async (loginStr: string, password: string) => {
    const tokens = await apiRegister(loginStr, password);
    tokenStorage.save(tokens.accessToken, tokens.refreshToken);
    const me = await apiGetMe();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch { /* игнорируем ошибку сервера */ }
    tokenStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

### 4.6 useAuth hook — hooks/useAuth.ts

```ts
import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
```

### 4.7 ProtectedRoute компонент

Файл: `frontend/src/components/app/ProtectedRoute/index.tsx`

```tsx
import { Navigate } from 'react-router';
import { useAuth } from '../../../hooks/useAuth';
import { Flex, Spinner } from '@chakra-ui/react';
import type { ReactNode } from 'react';

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Flex h="100vh" align="center" justify="center">
        <Spinner size="xl" color="brand.solid" />
      </Flex>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### 4.8 LoginPage

Файл: `frontend/src/Pages/LoginPage.tsx`

```tsx
import { Box, Button, Flex, Heading, Input, Text, VStack, Link as ChakraLink } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import type { LoginFormData } from '../types/auth';
import { useState } from 'react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data.login, data.password);
      navigate('/collections', { replace: true });
    } catch {
      setServerError('Неверный логин или пароль');
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
            Войти
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
                Войти
              </Button>
            </VStack>
          </form>

          <Text textAlign="center" color="fg.muted" fontSize="sm">
            Нет аккаунта?{' '}
            <ChakraLink as={Link} to="/register" color="brand.fg">
              Зарегистрироваться
            </ChakraLink>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
}
```

### 4.9 RegisterPage

Файл: `frontend/src/Pages/RegisterPage.tsx`

Аналогична `LoginPage`, но:
- Заголовок: «Создать аккаунт»
- Кнопка: «Создать аккаунт»
- Ссылка: «Уже есть аккаунт? Войти» → `/login`
- `onSubmit` вызывает `register()` из контекста
- После успеха → `navigate('/collections', { replace: true })`
- При ошибке извлекать сообщение из ответа бэкенда:

```ts
} catch (err: unknown) {
  if (axios.isAxiosError(err)) {
    setServerError(err.response?.data?.error ?? 'Ошибка регистрации');
  } else {
    setServerError('Ошибка регистрации');
  }
}
```

**Формат ошибок бэкенда:** `{ success: false, error: string }`. Бэкенд возвращает `'Такой пользователь уже есть!'` (401) при дублирующемся логине.

### 4.10 ProfilePage

Файл: `frontend/src/Pages/ProfilePage.tsx`

```tsx
import { Avatar, Box, Button, Heading, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

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

      <Button
        colorPalette="red"
        variant="outline"
        onClick={handleLogout}
      >
        Выйти из аккаунта
      </Button>
    </VStack>
  );
}
```

### 4.11 Router — обновить маршруты

Файл: `frontend/src/router/index.tsx`

```tsx
import { createBrowserRouter, Navigate } from 'react-router';
import App from '../App';
import { ProtectedRoute } from '../components/app/ProtectedRoute';
import { LoginPage } from '../Pages/LoginPage';
import { RegisterPage } from '../Pages/RegisterPage';
import { ProfilePage } from '../Pages/ProfilePage';
import HomePage from '../Pages/HomePage';
import CollectionsPage from '../Pages/CollectionsPage';
import SingleCollectionPage from '../Pages/SingleCollectionPage';
import CollectionTestPage from '../Pages/CollectionTestPage';
import CollectionMatchPage from '../Pages/CollectionMatchPage';

const router = createBrowserRouter([
  // Публичные маршруты (без layout sidebar)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  // Защищённые маршруты (с App layout + sidebar)
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'collections', element: <CollectionsPage /> },
      { path: 'collections/:id', element: <SingleCollectionPage /> },
      { path: 'collections/:id/tests', element: <CollectionTestPage /> },
      { path: 'collections/:id/match', element: <CollectionMatchPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;
```

### 4.12 App.tsx — обернуть в AuthProvider

Файл: `frontend/src/App.tsx`

```tsx
import { AuthProvider } from './contexts/AuthContext';
// ... остальные импорты
```

Обернуть содержимое `main.tsx` или `App.tsx` в `<AuthProvider>`.

**Рекомендуется** поместить `<AuthProvider>` в `main.tsx` вокруг `<RouterProvider>`:

```tsx
// main.tsx
import { AuthProvider } from './contexts/AuthContext';
import { RouterProvider } from 'react-router';
import router from './router';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider> {/* Chakra UI */}
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </Provider>
);
```

### 4.13 Sidebar — добавить профиль

Файл: `frontend/src/components/app/Sidebar/index.tsx`

Добавить в `navItems` пункт профиля:
```ts
{ icon: LuUser, label: 'Профиль', to: '/profile' },
```

Добавить кнопку «Выйти» внизу sidebar:
```tsx
import { LuUser } from 'react-icons/lu';
// В JSX sidebar footer:
<SidebarItem
  icon={LuLogOut}
  label="Выйти"
  onClick={async () => { await logout(); navigate('/login'); }}
/>
```

Использовать `useAuth()` для получения `logout` и `user.login` (отображать логин).

## 4.14 Backend API Reference

Актуальные эндпоинты бэкенда (проверены по коду):

| Endpoint | Method | Auth | Request Body | Response | Status |
|----------|--------|------|-------------|----------|--------|
| `/api/auth/register` | POST | ❌ | `{ login, password }` | `{ accessToken, refreshToken }` | **201** |
| `/api/auth/login` | POST | ❌ | `{ login, password }` | `{ accessToken, refreshToken }` | **200** |
| `/api/auth/refresh` | POST | ❌ | `{ refreshToken }` | `{ accessToken, refreshToken }` | **200** |
| `/api/auth/logout` | POST | ❌ | — (пустое тело) | — (пустой ответ) | **204** |
| `/api/auth/me` | GET | ✅ | — | `{ id: string, login: string }` | **200** |

**Формат ошибок:**
- Auth ошибки: `{ success: false, error: string }` (401)
- Валидация (Joi): `{ message: string }` (400)
- Не найдено: `{ success: false, error: string }` (404)

**Защищённые эндпоинты** (требуют `Authorization: Bearer <accessToken>`):
- `GET /api/auth/me`
- `GET/POST /api/collections`, `GET /api/collections/:id`, `GET /api/collections/:id/cards`
- `POST /api/cards`, `PUT /api/cards/:id`, `DELETE /api/cards/:id`

## 5. Security Considerations

| Риск | Митигация |
|------|-----------|
| `accessToken` в `localStorage` уязвим к XSS | Следить за отсутствием XSS в других частях приложения; альтернатива — `httpOnly` cookie (требует серверных изменений) |
| Бесконечная цепочка refresh при сбое | Флаги `isRefreshing` + `_retry` предотвращают рекурсию |
| Параллельные запросы при истёкшем токене заспамят `/refresh` | `refreshQueue` сериализует все запросы в один вызов refresh |
| Прямой переход на `/collections` без токена | `ProtectedRoute` проверяет `isAuthenticated` и редиректит |
| Отображение UI до завершения проверки токена | `isLoading: true` до завершения `apiGetMe()`, `ProtectedRoute` показывает спиннер |
| `refreshToken` без ротации | Сервер реализует ротацию: каждый `/auth/refresh` возвращает новую пару токенов (stateless, без revocation в БД) |
| Ошибка logout на сервере блокирует выход клиента | Блок `try/catch` в `logout()` — ошибка сервера не мешает очистке localStorage. Logout на бэкенде — no-op (204), token revocation не реализован |
| Токены остаются после истечения сессии | `logout()` всегда вызывает `tokenStorage.clear()` |

## 6. Acceptance Criteria

- [ ] `/login` отображает форму; при неверных данных показывает сообщение «Неверный логин или пароль»
- [ ] `/register` создаёт аккаунт и автоматически авторизует, редирект → `/collections`
- [ ] После входа `accessToken` и `refreshToken` хранятся в `localStorage`
- [ ] При обновлении страницы (F5) сессия восстанавливается — пользователь остаётся авторизованным
- [ ] Переход на `/collections` без авторизации редиректит на `/login`
- [ ] При истёкшем `accessToken` interceptor автоматически обновляет токены и повторяет запрос
- [ ] При истёкших обоих токенах пользователь редиректируется на `/login`
- [ ] Страница `/profile` показывает `login` и `id` пользователя
- [ ] Кнопка «Выйти» (на профиле и в sidebar) вызывает `POST /api/auth/logout`, очищает токены, редиректирует на `/login`
- [ ] В sidebar есть пункт «Профиль» с иконкой и ссылкой на `/profile`
- [ ] Страницы тестов (`/collections/:id/tests`, `/collections/:id/match`) недоступны без авторизации
- [ ] Параллельные запросы при протухшем `accessToken` не производят несколько `/refresh`-запросов
- [ ] `VITE_API_URL` валидируется при старте; если отсутствует — `env.ts` бросает ошибку
- [ ] Нет `any` в TypeScript; `strict: true` не нарушен
- [ ] Использованы семантические токены дизайн-системы (`bg.surface`, `brand.solid`, `fg.default`, etc.)
