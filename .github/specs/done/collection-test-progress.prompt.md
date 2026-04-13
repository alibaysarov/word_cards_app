---
agent: Spec Executor
model: Claude Sonnet 4.5 (copilot)
description: "Track correct answers during collection tests, persist progress per user/collection, and resume the test from where the user left off"
---

# Collection Test Progress Tracking

## 1. Overview

Currently, the test mode (`/collections/:id/tests`) runs entirely client-side: questions are generated fresh on every page load and no results are stored. This feature adds:

- **Server-side progress persistence** — a `CollectionTest` session record per user+collection, and one `CollectionTestAnswer` record per correct answer submitted.
- **Resume from last position** — when `GET /collections/:id/tests` is called (or a dedicated progress endpoint), the server returns the index of the last answered card so the frontend can skip already-answered questions.
- **Correct-answer counter** — each `POST /collections/:id/tests/answers` call records the answered card and returns updated progress stats.
- **No duplicate answers** — submitting the same card twice in the same active session is idempotent (upsert).

---

## 2. Architecture / Flow

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  CollectionTestPage                                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │ useCollectionTest(id)                           │    │
│  │   GET /api/collections/:id/tests               │    │──► returns questions + lastAnsweredIndex
│  │   POST /api/collections/:id/tests/answers      │    │──► on correct answer
│  │   POST /api/collections/:id/tests/reset        │    │──► on test restart
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      BACKEND                            │
│  routes/collections.ts                                  │
│    GET  /:id/tests          → CollectionController      │
│    POST /:id/tests/answers  → CollectionController      │
│    POST /:id/tests/reset    → CollectionController      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      DATABASE                           │
│  CollectionTest                                         │
│    id, collectionId, userId, createdAt, completedAt     │
│  CollectionTestAnswer                                   │
│    id, testId, wordCardId, answeredAt                   │
└─────────────────────────────────────────────────────────┘
```

**Flow — loading a test:**
1. `GET /api/collections/:id/tests` — existing logic generates questions.
2. Backend finds (or creates) the active `CollectionTest` for `userId + collectionId`.
3. Backend fetches answered `wordCardId` list from `CollectionTestAnswer`.
4. Response includes `questions` array (same as before) **plus** `answeredCardIds: string[]` and `testSessionId: string`.
5. Frontend skips already-answered cards and starts from the first unanswered one.

**Flow — submitting a correct answer:**
1. Frontend calls `POST /api/collections/:id/tests/answers` with `{ testSessionId, wordCardId }`.
2. Backend upserts a `CollectionTestAnswer` row.
3. Backend returns `{ correctCount, totalCount }`.
4. If `correctCount === totalCount`, backend sets `CollectionTest.completedAt`.

**Flow — restarting a test:**
1. Frontend calls `POST /api/collections/:id/tests/reset`.
2. Backend marks the current `CollectionTest` as completed (if not already) and creates a new session.
3. Returns the new `testSessionId`.

---

## 3. New File Structure

```
backend/
  prisma/
    schema.prisma                           ← UPDATED (2 new models)
    migrations/<timestamp>_add_test_progress/ ← NEW
  src/
    controllers/
      CollectionController.ts               ← UPDATED (3 new methods)
    dto/
      collectionTest.ts                     ← NEW
    routes/
      collections.ts                        ← UPDATED (2 new routes)
    validators/
      collectionTestAnswer.validator.ts     ← NEW

frontend/
  src/
    api/
      collections.api.ts                    ← UPDATED (2 new functions)
    hooks/
      useCollectionTest.ts                  ← UPDATED (resume logic + submitAnswer)
    types/
      collectionTest.ts                     ← UPDATED (new fields)
    Pages/
      CollectionTestPage.tsx                ← UPDATED (call submitAnswer on correct, resume index)
```

---

## 4. Step-by-Step Specification

### 4.1 Prisma Schema Changes

Add two new models to `backend/prisma/schema.prisma`:

```prisma
model CollectionTest {
  id            String                 @id @default(uuid(7)) @db.Uuid
  collectionId  String                 @db.Uuid
  userId        String                 @db.Uuid
  createdAt     DateTime               @default(now())
  completedAt   DateTime?
  collection    Collection             @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  user          User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  answers       CollectionTestAnswer[]

  @@index([collectionId, userId])
}

model CollectionTestAnswer {
  id          String          @id @default(uuid(7)) @db.Uuid
  testId      String          @db.Uuid
  wordCardId  String          @db.Uuid
  answeredAt  DateTime        @default(now())
  test        CollectionTest  @relation(fields: [testId], references: [id], onDelete: Cascade)
  wordCard    WordCard        @relation(fields: [wordCardId], references: [id], onDelete: Cascade)

  @@unique([testId, wordCardId])
}
```

Also update back-references in existing models:

```prisma
model Collection {
  // ... existing fields ...
  tests        CollectionTest[]   // ← ADD
}

model User {
  // ... existing fields ...
  collectionTests CollectionTest[]  // ← ADD
}

model WordCard {
  // ... existing fields ...
  testAnswers  CollectionTestAnswer[]  // ← ADD
}
```

**Migration command** (run inside the backend Docker container):
```bash
docker compose -f docker-compose.local.yml exec backend npx prisma migrate dev --name add_test_progress
```

---

### 4.2 DTOs

**`backend/src/dto/collectionTest.ts`** — NEW file:

```ts
export interface SubmitTestAnswerDto {
  testSessionId: string;   // UUID of the active CollectionTest row
  wordCardId: string;      // UUID of the answered card
}
```

---

### 4.3 Validator

**`backend/src/validators/collectionTestAnswer.validator.ts`** — NEW file:

```ts
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const schema = Joi.object({
  testSessionId: Joi.string().uuid().required(),
  wordCardId: Joi.string().uuid().required(),
});

const collectionTestAnswerValidation = (req: Request, res: Response, next: NextFunction) => {
  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }
  next();
};

export default collectionTestAnswerValidation;
```

---

### 4.4 Backend Controller Changes

**`backend/src/controllers/CollectionController.ts`** — add three new methods:

#### `getTestQuestions` — UPDATED

Modify the existing method to:
1. Find or create an active (non-completed) `CollectionTest` for `userId + collectionId`.
2. Fetch `answeredCardIds` from its `CollectionTestAnswer` records.
3. Return extended response: `{ questions, testSessionId, answeredCardIds }`.

```ts
async getTestQuestions(req: Request, res: Response): Promise<void> {
  try {
    const collectionId = String(req.params.collectionId);
    const { userId } = req;

    if (!userId) throw new AuthError("Не авторизованы");

    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, userId },
    });
    if (collection == null) throw new NotFoundError();

    const wordCards = await prisma.wordCard.findMany({ where: { collectionId } });

    if (wordCards.length < 4) {
      res.status(400).json({ message: "Для теста нужно минимум 4 карточки" });
      return;
    }

    // find-or-create active test session
    let testSession = await prisma.collectionTest.findFirst({
      where: { collectionId, userId, completedAt: null },
      include: { answers: { select: { wordCardId: true } } },
    });

    if (testSession == null) {
      testSession = await prisma.collectionTest.create({
        data: { collectionId, userId },
        include: { answers: { select: { wordCardId: true } } },
      });
    }

    const answeredCardIds = testSession.answers.map((a) => a.wordCardId);

    const questions = wordCards.map((card) => {
      const distractors = pickRandom(
        wordCards.filter((c) => c.id !== card.id),
        3
      ).map((c) => c.RearText);
      return {
        id: card.id,
        question: card.frontText,
        options: shuffle([card.RearText, ...distractors]),
        correctAnswer: card.RearText,
      };
    });

    res.status(200).json({ questions, testSessionId: testSession.id, answeredCardIds });
  } catch (err) {
    if (err instanceof AuthError || err instanceof NotFoundError) throw err;
    throw new ServerError();
  }
}
```

#### `submitTestAnswer` — NEW

```ts
async submitTestAnswer(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req;
    if (!userId) throw new AuthError("Не авторизованы");

    const collectionId = String(req.params.collectionId);
    const { testSessionId, wordCardId }: SubmitTestAnswerDto = req.body;

    // verify the session belongs to this user and collection
    const testSession = await prisma.collectionTest.findFirst({
      where: { id: testSessionId, userId, collectionId, completedAt: null },
    });
    if (testSession == null) throw new NotFoundError();

    // upsert answer (idempotent)
    await prisma.collectionTestAnswer.upsert({
      where: { testId_wordCardId: { testId: testSessionId, wordCardId } },
      create: { testId: testSessionId, wordCardId },
      update: { answeredAt: new Date() },
    });

    const totalCount = await prisma.wordCard.count({ where: { collectionId } });
    const correctCount = await prisma.collectionTestAnswer.count({
      where: { testId: testSessionId },
    });

    // auto-complete the session if all cards answered
    if (correctCount >= totalCount) {
      await prisma.collectionTest.update({
        where: { id: testSessionId },
        data: { completedAt: new Date() },
      });
    }

    res.status(200).json({ correctCount, totalCount });
  } catch (err) {
    if (err instanceof AuthError || err instanceof NotFoundError) throw err;
    throw new ServerError();
  }
}
```

#### `resetTestSession` — NEW

```ts
async resetTestSession(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req;
    if (!userId) throw new AuthError("Не авторизованы");

    const collectionId = String(req.params.collectionId);

    // mark any active session as completed
    await prisma.collectionTest.updateMany({
      where: { collectionId, userId, completedAt: null },
      data: { completedAt: new Date() },
    });

    // create fresh session
    const newSession = await prisma.collectionTest.create({
      data: { collectionId, userId },
    });

    res.status(201).json({ testSessionId: newSession.id });
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new ServerError();
  }
}
```

---

### 4.5 Route Changes

**`backend/src/routes/collections.ts`** — add two new routes:

```ts
import collectionTestAnswerValidation from '../validators/collectionTestAnswer.validator';

// existing routes ...
router.post('/:collectionId/tests/answers', auth, collectionTestAnswerValidation, CollectionController.submitTestAnswer);
router.post('/:collectionId/tests/reset',   auth, CollectionController.resetTestSession);
```

> Place the new POST routes **before** any catch-all or conflicting GET routes.

---

### 4.6 Frontend Type Changes

**`frontend/src/types/collectionTest.ts`** — extend existing types:

```ts
export type TestQuestion = {
  id: string;           // card id (the correct card)
  question: string;     // frontText to display
  options: string[];    // 4 shuffled rearText values
  correctAnswer: string;
};

export type CollectionTestData = {
  collectionId: string;
  questions: TestQuestion[];
};

// NEW
export type CollectionTestSessionResponse = {
  questions: TestQuestion[];
  testSessionId: string;
  answeredCardIds: string[];
};

export type SubmitAnswerResponse = {
  correctCount: number;
  totalCount: number;
};
```

---

### 4.7 Frontend API Changes

**`frontend/src/api/collections.api.ts`** — add two new functions and update `fetchCollectionTest`:

```ts
import type { CollectionTestSessionResponse, SubmitAnswerResponse } from '../types/collectionTest';

// REPLACE existing fetchCollectionTest:
export async function fetchCollectionTest(
  collectionId: string
): Promise<CollectionTestSessionResponse> {
  const res = await httpClient.get<CollectionTestSessionResponse>(
    `/collections/${collectionId}/tests`
  );
  return res.data;
}

// NEW
export async function submitTestAnswer(
  collectionId: string,
  testSessionId: string,
  wordCardId: string
): Promise<SubmitAnswerResponse> {
  const res = await httpClient.post<SubmitAnswerResponse>(
    `/collections/${collectionId}/tests/answers`,
    { testSessionId, wordCardId }
  );
  return res.data;
}

// NEW
export async function resetTestSession(collectionId: string): Promise<{ testSessionId: string }> {
  const res = await httpClient.post<{ testSessionId: string }>(
    `/collections/${collectionId}/tests/reset`
  );
  return res.data;
}
```

---

### 4.8 Frontend Hook Changes

**`frontend/src/hooks/useCollectionTest.ts`** — full rewrite to support session management:

```ts
import { useEffect, useState, useCallback } from 'react';
import {
  fetchCollectionTest,
  submitTestAnswer,
  resetTestSession,
} from '../api/collections.api';
import type { TestQuestion, SubmitAnswerResponse } from '../types/collectionTest';

type SuccessState = {
  status: 'success';
  questions: TestQuestion[];
  testSessionId: string;
  answeredCardIds: string[];
  correctCount: number;
  totalCount: number;
};

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | SuccessState
  | { status: 'error'; message: string };

type Actions = {
  submitAnswer: (wordCardId: string) => Promise<SubmitAnswerResponse | null>;
  resetSession: () => Promise<void>;
};

export function useCollectionTest(collectionId: string): State & Actions {
  const [state, setState] = useState<State>({ status: 'idle' });

  const load = useCallback(async () => {
    if (!collectionId) return;
    setState({ status: 'loading' });
    try {
      const data = await fetchCollectionTest(collectionId);
      setState({
        status: 'success',
        questions: data.questions,
        testSessionId: data.testSessionId,
        answeredCardIds: data.answeredCardIds,
        correctCount: data.answeredCardIds.length,
        totalCount: data.questions.length,
      });
    } catch {
      setState({ status: 'error', message: 'Не удалось загрузить тест' });
    }
  }, [collectionId]);

  useEffect(() => { load(); }, [load]);

  const submitAnswer = useCallback(async (wordCardId: string): Promise<SubmitAnswerResponse | null> => {
    if (state.status !== 'success') return null;
    try {
      const result = await submitTestAnswer(collectionId, state.testSessionId, wordCardId);
      setState((prev) =>
        prev.status === 'success'
          ? { ...prev, correctCount: result.correctCount, answeredCardIds: [...prev.answeredCardIds, wordCardId] }
          : prev
      );
      return result;
    } catch {
      return null;
    }
  }, [collectionId, state]);

  const resetSession = useCallback(async () => {
    try {
      await resetTestSession(collectionId);
      await load();
    } catch {
      setState({ status: 'error', message: 'Не удалось сбросить тест' });
    }
  }, [collectionId, load]);

  return { ...state, submitAnswer, resetSession };
}
```

---

### 4.9 Frontend Page Changes

**`frontend/src/Pages/CollectionTestPage.tsx`** — key changes:

1. **Resume from last position:** On mount, compute `startIndex` as the index of the first question whose `id` is NOT in `answeredCardIds`, and initialise `currentQuestion` state to that index.

```ts
// After state.status === 'success':
const firstUnansweredIndex = state.questions.findIndex(
  (q) => !state.answeredCardIds.includes(q.id)
);
const [currentQuestion, setCurrentQuestion] = useState(
  firstUnansweredIndex === -1 ? 0 : firstUnansweredIndex
);
```

2. **Submit answer on correct:** Inside `handleAnswerSelect`, when `answer === currentData.correctAnswer`, call `state.submitAnswer(currentData.id)`.

```ts
if (answer === currentData.correctAnswer) {
  setAnswerState('correct');
  void state.submitAnswer(currentData.id);
}
```

3. **Progress display:** Show `state.correctCount / state.totalCount` somewhere in the header (e.g., `{state.correctCount} / {state.totalCount} правильных`).

4. **Reset button:** Add a "Начать заново" button (e.g., on completion screen or in the header) that calls `state.resetSession()` and resets `currentQuestion` to 0.

> Keep all existing styling and animations unchanged; only add the progress badge and reset button.

---

## 5. Security Considerations

| Risk | Mitigation |
|------|-----------|
| User submits an answer for another user's test session | `submitTestAnswer` verifies `userId` on the session lookup — foreign sessions are rejected with 404 |
| User submits a `wordCardId` that doesn't belong to the collection | The `collectionId` in the route is verified against the session's `collectionId`; no extra card ownership check is needed since cards are collection-scoped |
| Replay / duplicate submissions inflate counts | `@@unique([testId, wordCardId])` + upsert ensures idempotency |
| Submitting to a completed session | `completedAt: null` filter in the session lookup rejects completed sessions with 404 |
| Enumeration of other users' sessions via testSessionId | Session lookup always joins `userId`, so guessing another session UUID returns 404 |
| Oversized batch submissions | Each submission is a single card — no batch endpoint, no risk |

---

## 6. Acceptance Criteria

- [ ] Migration runs cleanly: `CollectionTest` and `CollectionTestAnswer` tables created with correct columns and constraints
- [ ] `GET /api/collections/:id/tests` returns `{ questions, testSessionId, answeredCardIds }` for authenticated user
- [ ] A new `CollectionTest` row is created on first test load; subsequent loads return the same row (same `testSessionId`) while unanswered cards remain
- [ ] `POST /api/collections/:id/tests/answers` with valid body returns `{ correctCount, totalCount }`
- [ ] Submitting the same `wordCardId` twice returns the same counts (idempotent)
- [ ] When `correctCount === totalCount`, the `CollectionTest.completedAt` is set automatically
- [ ] `POST /api/collections/:id/tests/reset` creates a new session; next `GET /tests` starts fresh
- [ ] Frontend resumes test from the first unanswered card after page reload
- [ ] Progress counter (`correctCount / totalCount`) is visible during the test
- [ ] "Начать заново" button resets progress and restarts from question 0
- [ ] All new routes require auth middleware; unauthenticated requests return 401
- [ ] TypeScript strict mode: no `any`, all new types explicit
- [ ] No internal error details (stack traces, DB errors) are exposed in API responses
