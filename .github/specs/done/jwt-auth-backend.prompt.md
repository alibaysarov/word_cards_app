---
agent: Spec Executor
model: Claude Sonnet 4.5 (copilot)
description: "JWT access/refresh token authentication with protected routes for Express backend"
---

# JWT Authentication & Authorization — Backend

## 1. Overview

Реализовать полноценную JWT-аутентификацию на сервере:
- Эндпоинт `POST /api/auth/login` (вход по логину + паролю), возвращает `accessToken` + `refreshToken`
- Существующий `POST /api/auth/register` дополняется возвратом токенов (уже частично готово)
- `POST /api/auth/refresh` — обменивает `refreshToken` на новую пару токенов (stateless, верификация только по JWT-подписи)
- `POST /api/auth/logout` — no-op на бэкенде (клиент просто удаляет токены локально), возвращает `204`
- `GET /api/auth/me` — возвращает профиль текущего авторизованного пользователя
- Middleware `auth` переписывается: реально верифицирует `accessToken` из заголовка `Authorization: Bearer <token>`, записывает `userId` в `req.userId`
- Маршруты `/api/collections/**` и `/api/cards/**` защищаются реальным middleware (сейчас он стаб)
- `accessToken` живёт **15 минут**, `refreshToken` — **7 дней** (оба stateless JWT, без хранения в БД)
- `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` — **два разных секрета**

## 2. Architecture / Flow

```
┌─────────────┐   POST /api/auth/login    ┌──────────────────┐   findUnique   ┌──────────┐
│   Client    │ ──────────────────────────▶  AuthController  │ ─────────────▶  Prisma   │
│  (Browser)  │                            │                  │◀─────────────  │  (DB)   │
│             │◀─────────────────────────── │  AuthService     │                └──────────┘
│  stores     │  { accessToken,            └──────────────────┘
│  tokens     │    refreshToken }                   │ generateTokenPair()
│             │                            ┌────────▼─────────┐
│             │   Authorization:           │   JwtService     │ (signs with ACCESS_SECRET / REFRESH_SECRET)
│             │   Bearer <accessToken>     └──────────────────┘
│             │
│             │   POST /api/auth/refresh   ┌──────────────────┐
│             │ ──────────────────────────▶  AuthController  │  verify JWT signature
│             │◀─────────────────────────── │  AuthService     │  (stateless, no DB)
│  new tokens │  { accessToken,            └──────────────────┘
│             │    refreshToken }
│             │
│             │   GET /api/collections     ┌─────────────┐  verify   ┌────────────────────┐
│             │ ──────────────────────────▶ auth.ts      │ ─────────▶  JwtService         │
│             │                            │ middleware  │           │ .validateAccessToken│
│             │◀── 401 if invalid/expired  └─────────────┘           └────────────────────┘
└─────────────┘
```

## 3. File Structure

```
backend/
  prisma/
    schema.prisma                     ← NO CHANGE (RefreshToken не нужен)

  src/
    controllers/
      AuthController.ts               ← UPDATED  (добавить login, refresh, logout, me)
      CollectionController.ts         ← no change
      WordCardController.ts           ← no change

    services/
      AuthService.ts                  ← UPDATED  (добавить login, refresh, logout, getMe)
      JwtService.ts                   ← UPDATED  (разделить секреты, раздельные методы verify)

    dto/
      auth.ts                         ← UPDATED  (добавить LoginDto, RefreshDto, UserProfileDto)

    routes/
      auth.ts                         ← UPDATED  (добавить /login, /refresh, /logout, /me)
      collections.ts                  ← UPDATED  (убедиться что auth middleware реальный)
      cards.ts                        ← UPDATED  (убедиться что auth middleware реальный)

    middlewares/
      auth.ts                         ← UPDATED  (реальная верификация accessToken)

    validators/
      auth.validator.ts               ← UPDATED  (добавить loginValidation, refreshValidation)

    types/
      express.d.ts                    ← no change (userId уже объявлен)

    exceptions/
      AuthError.ts                    ← no change
```

## 4. Step-by-step Specification

### 4.1 Prisma Schema

Никаких изменений в схеме не требуется. Модель `RefreshToken` **не создаётся** — refresh-токены stateless (валидация только по JWT-подписи и `exp`).

Если модель `RefreshToken` уже существует в схеме — **удалить её** и связь `refreshTokens` из модели `User`, затем выполнить миграцию:
```bash
docker compose -f docker-compose.local.yml exec backend npx prisma migrate dev --name remove_refresh_tokens
```

### 4.2 JwtService — два секрета, два метода верификации

Файл: `backend/src/services/JwtService.ts`

```ts
import * as jwt from 'jsonwebtoken';
import { TokenDto } from '../dto/auth';

const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = process.env;
if (!JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is required');
if (!JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET is required');

interface JwtPayload {
  userId: string;
}

class JwtService {
  generateTokenPair(userId: string): TokenDto {
    const payload: JwtPayload = { userId };
    const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET!, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  // Возвращает userId или бросает ошибку
  validateAccessToken(token: string): string {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET!) as JwtPayload;
    return payload.userId;
  }

  // Возвращает userId или бросает ошибку
  validateRefreshToken(token: string): string {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET!) as JwtPayload;
    return payload.userId;
  }
}

export default new JwtService();
```

**Важно:** payload должен содержать `userId` (UUID), **не** `login`. Это позволяет middleware не делать лишний запрос в БД.

### 4.3 DTO — dto/auth.ts

```ts
// dto/auth.ts

export interface RegisterDto {
  login: string;
  password: string;
}

export interface LoginDto {
  login: string;
  password: string;
}

export interface RefreshDto {
  refreshToken: string;
}

export interface TokenDto {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfileDto {
  id: string;
  login: string;
}
```

### 4.4 Validators — добавить loginValidation и refreshValidation

Файл: `backend/src/validators/auth.validator.ts`

Разделить на несколько named exports:

```ts
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const loginSchema = Joi.object({
  login: Joi.string().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const registerValidation = (req: Request, res: Response, next: NextFunction) => {
  const { error } = loginSchema.validate(req.body);  // same shape as login
  if (error) { res.status(400).json({ message: error.details[0].message }); return; }
  next();
};

export const loginValidation = (req: Request, res: Response, next: NextFunction) => {
  const { error } = loginSchema.validate(req.body);
  if (error) { res.status(400).json({ message: error.details[0].message }); return; }
  next();
};

export const refreshValidation = (req: Request, res: Response, next: NextFunction) => {
  const { error } = refreshSchema.validate(req.body);
  if (error) { res.status(400).json({ message: error.details[0].message }); return; }
  next();
};

export default registerValidation;  // backward-compat default export
```

### 4.5 AuthService — добавить login, refresh, logout, getMe

Файл: `backend/src/services/AuthService.ts`

```ts
import { prisma } from '../database/prisma';
import { LoginDto, RegisterDto, TokenDto, UserProfileDto } from '../dto/auth';
import AuthError from '../exceptions/AuthError';
import NotFoundError from '../exceptions/NotFoundError';
import passwordHelper from '../utilities/password';
import JwtService from './JwtService';

class AuthService {
  // Регистрация — создаёт пользователя, возвращает пару токенов
  async register(dto: RegisterDto): Promise<TokenDto> {
    const { login, password } = dto;

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) throw new AuthError('Такой пользователь уже есть!');

    const hashedPass = await passwordHelper.passwordHash(password);
    const created = await prisma.user.create({
      data: { login, password: hashedPass },
    });

    return JwtService.generateTokenPair(created.id);
  }

  // Вход — проверяет пароль, выдаёт пару токенов
  async login(dto: LoginDto): Promise<TokenDto> {
    const { login, password } = dto;

    const user = await prisma.user.findUnique({ where: { login } });
    if (!user) throw new AuthError('Неверный логин или пароль');

    const passwordMatch = await passwordHelper.passwordCompare(password, user.password);
    if (!passwordMatch) throw new AuthError('Неверный логин или пароль');

    return JwtService.generateTokenPair(user.id);
  }

  // Обмен refreshToken → новая пара (stateless, проверка только по JWT-подписи)
  async refresh(refreshToken: string): Promise<TokenDto> {
    let userId: string;
    try {
      userId = JwtService.validateRefreshToken(refreshToken);
    } catch {
      throw new AuthError('Невалидный или истёкший refresh token');
    }

    return JwtService.generateTokenPair(userId);
  }

  // Выход — на бэкенде no-op (клиент удаляет токены локально)
  async logout(): Promise<void> {
    // Stateless: серверу нечего инвалидировать
  }

  // Профиль текущего пользователя
  async getMe(userId: string): Promise<UserProfileDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, login: true },
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }
}

export default new AuthService();
```

**Важно:** `passwordHelper` должен иметь метод `passwordCompare`. Если его нет — добавить в `utilities/password.ts`:
```ts
// добавить если отсутствует
async passwordCompare(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
```

### 4.6 AuthController — добавить login, refresh, logout, me

Файл: `backend/src/controllers/AuthController.ts`

```ts
import { Request, Response } from 'express';
import { LoginDto, RegisterDto, RefreshDto } from '../dto/auth';
import AuthService from '../services/AuthService';

class AuthController {
  async register(req: Request, res: Response) {
    const body: RegisterDto = req.body;
    const result = await AuthService.register(body);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response) {
    const body: LoginDto = req.body;
    const result = await AuthService.login(body);
    res.status(200).json(result);
  }

  async refresh(req: Request, res: Response) {
    const { refreshToken }: RefreshDto = req.body;
    const result = await AuthService.refresh(refreshToken);
    res.status(200).json(result);
  }

  async logout(req: Request, res: Response) {
    await AuthService.logout();
    res.status(204).send();
  }

  async me(req: Request, res: Response) {
    const userId = req.userId!;
    const result = await AuthService.getMe(userId);
    res.status(200).json(result);
  }
}

export default new AuthController();
```

### 4.7 Auth Middleware — реальная верификация

Файл: `backend/src/middlewares/auth.ts`

```ts
import { NextFunction, Request, Response } from 'express';
import AuthError from '../exceptions/AuthError';
import JwtService from '../services/JwtService';

export default function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AuthError('Токен отсутствует'));
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "
  try {
    const userId = JwtService.validateAccessToken(token);
    req.userId = userId;
    next();
  } catch {
    next(new AuthError('Недействительный или истёкший access token'));
  }
}
```

### 4.8 Routes — auth.ts

Файл: `backend/src/routes/auth.ts`

```ts
import express from 'express';
import {
  registerValidation,
  loginValidation,
  refreshValidation,
} from '../validators/auth.validator';
import AuthController from '../controllers/AuthController';
import authMiddleware from '../middlewares/auth';

const router = express.Router();

router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh', refreshValidation, AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);

export default router;
```

### 4.9 Environment Variables

Добавить в `docker-compose.local.yml` (и в `.env.example`):
```
JWT_ACCESS_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<different-long-random-string>
```

Удалить старый `JWT_SECRET`.

## 5. Security Considerations

| Риск | Митигация |
|------|-----------|
| Access token долго живёт | Срок жизни ограничен **15 минутами** |
| Refresh token украден | Короткий срок жизни (7 дней), подписан отдельным секретом `JWT_REFRESH_SECRET` |
| Один секрет для обоих токенов | Используются **два разных секрета**: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` |
| Брутфорс пароля | Пароли хешируются через bcrypt (уже есть в `password.ts`) |
| Stack trace в ответе | `errorHandler` не отдаёт `err.stack` клиенту |
| SQL injection | Все запросы через Prisma ORM (parameterized queries) |
| `userId` не проверяется на вхождение в ресурс | В `CollectionController` / `WordCardController` ресурс фильтруется по `userId` из токена, не из body |

## 6. Acceptance Criteria

- [ ] `POST /api/auth/register` создаёт пользователя и возвращает `{ accessToken, refreshToken }`
- [ ] `POST /api/auth/login` с верными данными возвращает `{ accessToken, refreshToken }`
- [ ] `POST /api/auth/login` с неверным паролем возвращает `401`
- [ ] `POST /api/auth/refresh` с валидным `refreshToken` возвращает новую пару токенов
- [ ] `POST /api/auth/refresh` с невалидным или истёкшим `refreshToken` возвращает `401`
- [ ] `POST /api/auth/logout` возвращает `204`
- [ ] `GET /api/auth/me` с валидным `Authorization: Bearer <accessToken>` возвращает `{ id, login }`
- [ ] `GET /api/auth/me` без токена возвращает `401`
- [ ] `GET /api/collections` без токена возвращает `401`
- [ ] `GET /api/collections` с валидным токеном возвращает коллекции только текущего пользователя
- [ ] `POST /api/cards` без токена возвращает `401`
- [ ] `accessToken` истекает через 15 минут (JWT `exp`)
- [ ] `refreshToken` — stateless JWT, валидируется только по подписи и `exp`
- [ ] В `req.userId` присваивается реальный UUID пользователя из токена
- [ ] `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` валидируются при старте, сервер падает если они не заданы
