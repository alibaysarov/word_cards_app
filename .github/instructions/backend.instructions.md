---
description: "Use when creating or editing Express routes, middleware, controllers, or server-side code in backend/. Covers API design, request validation, error handling, authentication middleware, and environment config."
applyTo: "backend/**"
---

# Express Backend Conventions

## Project Structure

```
backend/src/
  routes/           # One file per resource (kebab-case): auth.ts, collections.ts, cards.ts
                    # index.ts registers all routes
  controllers/      # PascalCase class files: AuthController.ts, CollectionController.ts
  services/         # Business logic classes: AuthService.ts, JwtService.ts
  validators/       # Validation middleware: auth.validator.ts, cardCreate.validator.ts
  dto/              # Data transfer objects: auth.ts, collection.ts
  middlewares/      # Shared middleware: auth.ts, errorHandler.ts
  exceptions/       # Custom error classes: BaseError.ts, AuthError.ts, NotFoundError.ts
  database/         # Prisma client: prisma.ts
  utilities/        # Helper functions: password.ts
  types/            # Type extensions: express.d.ts
  index.ts          # Entry point: app setup and listen()
```

- **Controllers** handle HTTP concerns (req/res), call services, and may call Prisma directly
- **Services** contain business logic and transactions
- **Routers** chain middleware: auth → validation → controller method
- All routes mount under `/api` prefix (no versioning currently)

## Request Validation

- Validate **all** incoming data (body, params, query) using **Joi** schemas
- Create separate validator files in `validators/` directory with naming pattern: `{resource}{Action}.validator.ts`
- Validators are middleware functions that check `req.body` and return 400 with error message on failure

```ts
// validators/auth.validator.ts
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const schema = Joi.object({
    login: Joi.string().required(),
    password: Joi.string().required(),
});

const registerValidation = (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
    }
    next();
};

export default registerValidation;
```

- For reusable validation logic, use a helper function:

```ts
// validators/dtoValidation.ts
import Joi from "joi";
import { Request, Response, NextFunction } from 'express';

const dtoValidation = (
    req: Request, 
    res: Response, 
    next: NextFunction, 
    schema: Joi.ObjectSchema<any>, 
    status: number = 400
) => {
    const { error } = schema.validate(req.body);
    if (error) {
        res.status(status).json({ message: error.details[0].message });
        return;
    }
    next();
};

export default dtoValidation;
```

## Error Handling

- One centralized `errorHandler` middleware registered **last** in `index.ts`
- All custom errors extend `BaseError` class with `statusCode` and `isOperational` fields
- **Throw errors directly** in controllers and services — the error handler will catch them

### BaseError Class

```ts
// exceptions/BaseError.ts
interface BaseErrorInterface {
    statusCode: number
    isOperational: boolean
}

class BaseError extends Error implements BaseErrorInterface {
    isOperational: boolean;
    statusCode: number;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
export default BaseError;
```

### Specific Error Classes

```ts
// exceptions/AuthError.ts
class AuthError extends BaseError {
    constructor(message: string = "Не авторизованы") {
        super(message, 401);
    }
}

// exceptions/NotFoundError.ts  
class NotFoundError extends BaseError {
    constructor(resource: string = "Ресурс") {
        super(`${resource} не найден`, 404);
    }
}

// exceptions/ServerError.ts
class ServerError extends BaseError {
    constructor(message: string = "Внутренняя ошибка сервера") {
        super(message, 500);
    }
}
```

### Error Handler Middleware

```ts
// middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import BaseError from '../exceptions/BaseError';

interface ErrorResponse {
  success: false;
  error: string;
}

function errorHandler(
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
): void {
  const isOperational = err instanceof BaseError && err.isOperational;

  console[isOperational ? 'warn' : 'error'](`[${err.name}]`, err.message, err.stack);

  if (!isOperational) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
    return;
  }

  res.status((err as BaseError).statusCode).json({
    success: false,
    error: err.message,
  });
}

export default errorHandler;
```

### Usage in Controllers

```ts
async create(req: Request, res: Response) {
    const { userId } = req;
    
    if (!userId) {
        throw new AuthError("Не авторизованы");
    }
    
    const existing = await prisma.user.findFirst({ where: { id: userId } });
    if (!existing) {
        throw new NotFoundError("Пользователь");
    }
    
    try {
        const created = await prisma.collection.create({ data: { userId } });
        return res.status(201).json(created);
    } catch (err) {
        throw new ServerError();
    }
}
```

- **No `next(err)` calls needed** — async errors are automatically caught by Express 5+ or you can wrap routes with an async handler
- Never expose internal error details (stack traces, DB errors) to the client
- Log operational errors as warnings, unexpected errors as errors

## Creating a New Endpoint

Follow these steps to create a new endpoint following project conventions:

### 1. Define DTO (Data Transfer Object)

```ts
// dto/collection.ts
export interface CollectionCreateDto {
    name: string;
}

export interface CollectionUpdateDto {
    name?: string;
}
```

### 2. Create Validation Schema

```ts
// validators/collectionCreate.validator.ts
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const schema = Joi.object({
    name: Joi.string().min(1).max(100).required(),
});

const createCollectionValidation = (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
    }
    next();
};

export default createCollectionValidation;
```

### 3. Create Controller

```ts
// controllers/CollectionController.ts
import { Request, Response } from "express";
import { prisma } from "../database/prisma";
import { CollectionCreateDto } from "../dto/collection";
import AuthError from "../exceptions/AuthError";
import NotFoundError from "../exceptions/NotFoundError";
import ServerError from "../exceptions/ServerError";

class CollectionController {

    async create(req: Request, res: Response) {
        const { userId } = req;

        if (!userId) {
            throw new AuthError("Не авторизованы");
        }

        const body: CollectionCreateDto = req.body;

        try {
            const created = await prisma.collection.create({
                data: {
                    userId,
                    name: body.name
                }
            });
            return res.status(201).json(created);
        } catch (err) {
            throw new ServerError();
        }
    }

    async getById(req: Request, res: Response) {
        const { userId } = req;

        if (!userId) {
            throw new AuthError("Не авторизованы");
        }

        const collectionId = String(req.params.collectionId);

        const collection = await prisma.collection.findFirst({
            where: { id: collectionId },
            include: { wordCards: true }
        });
        
        if (collection == null) {
            throw new NotFoundError("Коллекция");
        }

        return res.status(200).json(collection);
    }

    async getByUser(req: Request, res: Response) {
        const { userId } = req;

        if (!userId) {
            throw new AuthError("Не авторизованы");
        }

        const collections = await prisma.collection.findMany({
            where: { userId }
        });

        return res.status(200).json(collections);
    }

}

export default new CollectionController();
```

### 4. Create Route File

```ts
// routes/collections.ts
import express from "express";
import auth from "../middlewares/auth";
import CollectionController from "../controllers/CollectionController";
import createCollectionValidation from "../validators/collectionCreate.validator";

const router = express.Router();

router.get('/', auth, CollectionController.getByUser);
router.get('/:collectionId', auth, CollectionController.getById);
router.post('/', auth, createCollectionValidation, CollectionController.create);

export default router;
```

### 5. Register Route in Main Router

```ts
// routes/index.ts
import express from "express";
import auth from "./auth";
import collections from "./collections";

const router = express.Router();

router.use('/auth', auth);
router.use('/collections', collections);

export default router;
```
### 6. Add docs
- Add docs for controller methods in comments
- Add docs for service methods
- Add docs for swagger
## Controller Conventions

- **Class-based** with singleton exports: `export default new ControllerName()`
- Methods are **async** and return typed responses
- Type DTOs explicitly: `const body: CreateDto = req.body`
- Access `userId` from `req.userId` (set by auth middleware)
- **Always validate** `userId` exists for protected routes
- Use appropriate HTTP status codes:
  - `200` — OK (read/update operations)
  - `201` — Created (create operations)
  - `204` — No Content (delete operations)
  - `400` — Bad Request (validation errors)
  - `401` — Unauthorized (auth errors)
  - `404` — Not Found (resource not found)
  - `500` — Internal Server Error (unexpected errors)
- **Controllers may call Prisma directly** for simple CRUD operations
- Extract complex business logic into **services**

## Authentication

- Validate authentication with `auth` middleware imported from `middlewares/auth.ts`
- Middleware sets `req.userId` (typed in `types/express.d.ts`)
- **Always check** `if (!userId)` and throw `AuthError` in protected controller methods
- Never let unauthenticated requests access protected resources

### Auth Middleware Extension

```ts
// types/express.d.ts
import 'express';

declare module 'express' {
  interface Request {
    userId?: string;
  }
}
```

```ts
// middlewares/auth.ts
import { NextFunction, Request, Response } from "express";
import AuthError from "../exceptions/AuthError";

export default function auth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    // TODO: Implement JWT validation
    // Currently mock implementation
    req.userId = "019ce9bb-03ec-701d-bf2c-0660af63f41d";
    next();
}
```

## Service Layer

- Services contain **business logic and transaction handling**
- Class-based with singleton exports: `export default new ServiceName()`
- Services **may call Prisma directly** (no separate repository layer currently)
- Use Prisma transactions (`$transaction`) for multi-step operations
- Return domain objects or throw typed errors

```ts
// services/AuthService.ts
import { prisma } from "../database/prisma";
import { RegisterDto, TokenDto } from "../dto/auth";
import AuthError from "../exceptions/AuthError";
import passwordHelper from "../utilities/password";
import JwtService from "./JwtService";

class AuthService {
    async register(dto: RegisterDto): Promise<TokenDto> {
        const { login, password } = dto;

        return await prisma.$transaction(async (tx) => {
            const existing = await tx.user.findUnique({
                where: { login }
            });

            if (existing) {
                throw new AuthError('Такой пользователь уже есть!');
            }

            const hashedPass = await passwordHelper.passwordHash(password);

            const created = await tx.user.create({
                data: { login, password: hashedPass }
            });

            return JwtService.generateTokenPair(created.login);
        });
    }
}

export default new AuthService();
```

### When to Use Services vs Controllers

- **Controllers**: Simple CRUD operations, direct Prisma calls acceptable
- **Services**: Complex business logic, multi-step transactions, reusable operations

### Service Best Practices

- Extract reusable helper functions into `utilities/` directory
- Apply **SOLID** principles:
  - **S** — one service, one responsibility (e.g., `AuthService` handles auth flow only)
  - **O** — extend behaviour via composition, not by modifying existing services
  - **D** — depend on abstractions when possible (e.g., inject dependencies in constructor)
- Never return Express `Request`/`Response` types from services
- Throw typed errors; let controller/middleware handle HTTP responses

## Environment Variables

- Use `dotenv` to load environment variables from `.env` file
- Import at the top of entry file: `import 'dotenv/config'`
- Access variables via `process.env.VAR_NAME`
- **Always provide defaults** for optional variables
- **Never commit** `.env` file — maintain `.env.example` with dummy values

```ts
// Example usage in index.ts
import 'dotenv/config';

const { APP_PORT = 3010 } = process.env;

app.listen(APP_PORT, () => {
    console.log(`Server running on http://localhost:${APP_PORT}`);
});
```

### Required Environment Variables

```env
# .env.example
APP_PORT=3010
DATABASE_URL=
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
```

- Always duplicate new variables to `.env.example`
- Use env vars for secrets and configuration values
- Never hardcode sensitive data in source code

## Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| Route files | kebab-case | `auth.ts`, `collections.ts`, `cards.ts` |
| Controllers | PascalCase + "Controller" suffix | `AuthController`, `CollectionController` |
| Services | PascalCase + "Service" suffix | `AuthService`, `JwtService` |
| Validators | camelCase + ".validator.ts" suffix | `auth.validator.ts`, `cardCreate.validator.ts` |
| DTOs | camelCase interface + "Dto" suffix | `RegisterDto`, `CollectionCreateDto` |
| Exceptions | PascalCase + "Error" suffix | `AuthError`, `NotFoundError`, `ServerError` |
| Middlewares | camelCase | `auth.ts`, `errorHandler.ts` |
| Utilities | camelCase | `password.ts` |

## Routing Patterns

### Middleware Order

Routes follow a consistent middleware chain:
1. **Authentication** (`auth` middleware) — if route is protected
2. **Validation** (Joi validator) — if route accepts input
3. **Controller method** — handles business logic

```ts
router.post('/', auth, createValidation, Controller.create);
router.get('/:id', auth, Controller.getById);
router.put('/:id', auth, updateValidation, Controller.update);
router.delete('/:id', auth, Controller.delete);
```

### RESTful Resource Patterns

| HTTP Method | Route | Middleware | Purpose |
|-------------|-------|-----------|---------|
| `GET` | `/` | auth | List all resources for user |
| `GET` | `/:id` | auth | Get single resource by ID |
| `POST` | `/` | auth, validation | Create new resource |
| `PUT` | `/:id` | auth, validation | Update existing resource |
| `DELETE` | `/:id` | auth | Delete resource |

### Route Registration

```ts
// routes/index.ts
import express from "express";
import auth from "./auth";
import collections from "./collections";
import cards from "./cards";

const router = express.Router();

router.use('/auth', auth);         // /api/auth/*
router.use('/collections', collections);  // /api/collections/*
router.use('/cards', cards);       // /api/cards/*

export default router;
```

All routes are mounted under `/api` prefix in main app:

```ts
// index.ts
app.use("/api", router);
```

## Database & Prisma

- Use **Prisma ORM** for all database operations
- Prisma client is initialized in `database/prisma.ts`
- Import prisma client: `import { prisma } from "../database/prisma"`

```ts
// database/prisma.ts
import { PrismaClient } from '../generated/prisma/client';

export const prisma = new PrismaClient();

export async function checkDatabaseConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}
```

### Prisma Usage Patterns

```ts
// Create
const user = await prisma.user.create({
    data: { login, password }
});

// Find one
const user = await prisma.user.findUnique({
    where: { id: userId }
});

// Find first with condition
const collection = await prisma.collection.findFirst({
    where: { id: collectionId },
    include: { wordCards: true }
});

// Find many
const collections = await prisma.collection.findMany({
    where: { userId }
});

// Update
const updated = await prisma.collection.update({
    where: { id: collectionId },
    data: { name: newName }
});

// Delete
await prisma.wordCard.delete({
    where: { id: cardId }
});

// Transaction
await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { login, password } });
    const collection = await tx.collection.create({ data: { userId: user.id } });
    return collection;
});
```

### Database Best Practices

- Always use transactions for multi-step operations
- Use `include` to fetch relations instead of multiple queries
- Handle Prisma errors with try-catch and throw appropriate custom errors
- Check database connection on app startup with `checkDatabaseConnection()`
- Gracefully disconnect on shutdown:

```ts
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    console.log('🔌 Соединение с БД закрыто');
    process.exit(0);
});
```

## Application Entry Point

```ts
// index.ts
import express from 'express';
import 'dotenv/config';
import router from './routes';
import { checkDatabaseConnection, prisma } from './database/prisma';
import errorHandler from './middlewares/errorHandler';
import NotFoundError from './exceptions/NotFoundError';

async function main() {
    await checkDatabaseConnection();
    
    const app = express();
    const { APP_PORT = 3010 } = process.env;
    
    app.use(express.json());
    app.use("/api", router);
    
    // 404 handler for undefined routes
    app.use((req, res, next) => {
        next(new NotFoundError('Route'));
    });
    
    // Error handler MUST be last (4 arguments)
    app.use(errorHandler);
    
    app.listen(APP_PORT, () => {
        console.log(`Server running on http://localhost:${APP_PORT}`);
    });
}

main();

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    console.log('🔌 Соединение с БД закрыто');
    process.exit(0);
});
```

## npm Commands & Docker

- **Execute all npm commands inside Docker containers**
- Use `docker-compose` for development environment
- Never run `npm` commands directly on host machine

```bash
# Start development environment
docker-compose -f docker-compose.local.yml up

# Install dependencies
docker-compose exec backend npm install

# Run migrations
docker-compose exec backend npx prisma migrate dev

# Generate Prisma client
docker-compose exec backend npx prisma generate
```

## Security Checklist

- Rate-limit all public endpoints with `express-rate-limit`
- Set security headers with `helmet`
- Hash passwords with bcrypt (see `utilities/password.ts`)
- Validate all input with Joi schemas
- Never log raw request bodies that may contain secrets or PII
- Use prepared statements (Prisma does this automatically)
- Implement proper JWT validation in auth middleware
