---
agent: agent
model: Claude Sonnet 4.5 (copilot)
description: "Multiple-choice test mode for a collection: generates questions from real card data, 4 answer options per question, Test button disabled when fewer than 4 cards exist"
---

# Collection Test Mode

## 1. Overview

Replace the current hard-coded mock data in `CollectionTestPage` with real card data from the backend. The test engine presents each card's `frontText` as a question and shows four answer options: the correct `rearText` plus three random distractors drawn from the other cards in the same collection.

The "Тест" button on `SingleCollectionPage` must be disabled (and visually indicate it) when the collection has fewer than 4 cards, because a minimum of 4 cards is needed to produce one question with 4 distinct answer options.

No new database tables or migrations are needed—this is purely a query-level feature.

---

## 2. Architecture / Flow

```
Browser                       Express API              PostgreSQL
──────                        ───────────              ──────────
SingleCollectionPage
  useCollection(id) ──GET /collections/:id──► CollectionController.getById
                    ◄── { wordCards: [...] } ─────────────────────────────
  cards.length >= 4 ?
    "Тест" enabled
    : "Тест" disabled

  click "Тест"
  navigate /collections/:id/tests

CollectionTestPage
  useCollectionTest(id) ──GET /collections/:id/tests──► CollectionController.getTestQuestions
                                                           SELECT * wordCards WHERE collectionId
                                                        ◄──────────────────── WordCard[]
                        shuffle + build options
                        ◄── TestQuestion[]  ──────
  render quiz UI
```

---

## 3. File Structure

```
backend/src/
  controllers/
    CollectionController.ts          ← UPDATED  (new getTestQuestions method)
  routes/
    collections.ts                   ← UPDATED  (new GET /:collectionId/tests route)

frontend/src/
  api/
    collections.api.ts               ← UPDATED  (new fetchCollectionTest function)
  hooks/
    useCollectionTest.ts             ← NEW
  types/
    collectionTest.ts                ← NEW
  Pages/
    CollectionTestPage.tsx           ← UPDATED  (replace mock data with hook)
    SingleCollectionPage.tsx         ← UPDATED  (disable Test button when < 4 cards)
```

---

## 4. Step-by-Step Specification

### 4.1  Frontend types — `frontend/src/types/collectionTest.ts` ← NEW

```ts
export type TestQuestion = {
  id: string            // card id (the correct card)
  question: string      // frontText to display
  options: string[]     // 4 shuffled rearText values (1 correct + 3 wrong)
  correctAnswer: string // correct rearText
}

export type CollectionTestData = {
  collectionId: string
  questions: TestQuestion[]
}
```

### 4.2  Backend — building test questions (server-side shuffle, `CollectionController.ts`) ← UPDATED

Add `getTestQuestions` method to `CollectionController`.

**Logic:**
1. Extract `collectionId` from `req.params.collectionId` (string, validated as truthy).
2. Check `req.userId`; throw `AuthError` if absent.
3. Fetch all `wordCards` for the collection from Prisma, filtered by `collectionId`.  
   Also verify the collection belongs to `userId` (security: prevent cross-user access).
4. If `wordCards.length < 4`, respond with **400** and `{ message: "Для теста нужно минимум 4 карточки" }`.
5. For each card `c`:
   - Build `distractors`: pick 3 random cards from the remaining cards (i.e. all cards except `c`), take their `RearText`.
   - Assemble `options = shuffle([c.RearText, ...distractors])`.
   - Return `{ id: c.id, question: c.frontText, options, correctAnswer: c.RearText }`.
6. Return `200` with array `TestQuestion[]`.

**Helper (inline in controller file):**
```ts
function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}
```

**Full method signature:**
```ts
async getTestQuestions(req: Request, res: Response): Promise<void>
```

### 4.3  Backend route — `backend/src/routes/collections.ts` ← UPDATED

Add one line **before** the `/:collectionId` catch-all:

```ts
router.get('/:collectionId/tests', auth, CollectionController.getTestQuestions);
```

The ordering is important: this route must appear before `router.get('/:collectionId', ...)` so Express does not treat "tests" as a collection ID.

### 4.4  Frontend API — `frontend/src/api/collections.api.ts` ← UPDATED

Add:

```ts
import type { TestQuestion } from '../types/collectionTest'

export async function fetchCollectionTest(collectionId: string): Promise<TestQuestion[]> {
  const res = await httpClient.get<TestQuestion[]>(`/collections/${collectionId}/tests`)
  return res.data
}
```

### 4.5  Frontend hook — `frontend/src/hooks/useCollectionTest.ts` ← NEW

```ts
import { useEffect, useState } from 'react'
import { fetchCollectionTest } from '../api/collections.api'
import type { TestQuestion } from '../types/collectionTest'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; questions: TestQuestion[] }
  | { status: 'error'; message: string }

export function useCollectionTest(collectionId: string): State {
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    if (!collectionId) return
    setState({ status: 'loading' })
    fetchCollectionTest(collectionId)
      .then((questions) => setState({ status: 'success', questions }))
      .catch(() => setState({ status: 'error', message: 'Не удалось загрузить тест' }))
  }, [collectionId])

  return state
}
```

### 4.6  Frontend page — `CollectionTestPage.tsx` ← UPDATED

- Remove the `mockTestData` constant and all imports that only served the mock.
- Call `useCollectionTest(id ?? '')` at the top of the component.
- While `status === 'loading'`, render a full-screen `<Spinner>` (same pattern as `SingleCollectionPage`).
- While `status === 'error'`, render an error state with a "Назад" link.
- When `status === 'success'`, drive the existing quiz UI from `questions` instead of `mockTestData`.
- Keep using `currentQuestion` index state as before; derive `totalQuestions = questions.length` and `currentData = questions[currentQuestion]`.
- Answer visual feedback:
  - When the user clicks an option, compare it with `currentData.correctAnswer`.
  - Highlight the chosen box green (`green.500` border) if correct, red (`red.500`) if wrong.
  - After a 900 ms pause, advance to the next question (or navigate back on last question).
- The "Не уверен?" skip button stays unchanged.

**State types to add:**
```ts
type AnswerState = 'idle' | 'correct' | 'wrong'
```
Add `const [answerState, setAnswerState] = useState<AnswerState>('idle')`.

Border color for each option button:
```ts
borderColor={
  selectedAnswer === option
    ? answerState === 'correct'
      ? 'green.500'
      : answerState === 'wrong'
        ? 'red.500'
        : 'brand.solid'
    : 'border.default'
}
```

### 4.7  Frontend page — `SingleCollectionPage.tsx` ← UPDATED

- The `cards` array is already available from `useCollection`.
- Add `const canTest = cards.length >= 4` constant.
- Pass `disabled={!canTest}` to the "Тест" `<Button>`.
- Add a tooltip or helper text when disabled. Use Chakra `<Tooltip>` wrapped around the button:
  ```tsx
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
  ```
- Import `Tooltip` from `@chakra-ui/react`.

---

## 5. Security Considerations

| Risk | Mitigation |
|------|------------|
| Cross-user data access: user A requests `/collections/:id/tests` for user B's collection | In `getTestQuestions`, fetch the collection with `where: { id: collectionId }` and verify `collection.userId === req.userId` before returning data. Throw `NotFoundError` (404) to avoid leaking existence. |
| Parameter injection via `collectionId` | Prisma uses parameterized queries; no raw SQL. `collectionId` is typed as `string` and passed directly to Prisma `where`. |
| Denial of service via huge collections | The query fetches only `wordCards` of a given collection. No threat beyond normal DB load; no additional rate limiting needed beyond existing middleware. |
| Client-side answer spoofing | `correctAnswer` is returned from the server, so the client knows the answer — this is acceptable for a self-study flashcard app; no sensitive data is exposed. |

---

## 6. Acceptance Criteria

- [ ] `GET /api/collections/:collectionId/tests` returns `400` when the collection has fewer than 4 cards.
- [ ] `GET /api/collections/:collectionId/tests` returns `401` when the request has no valid JWT.
- [ ] `GET /api/collections/:collectionId/tests` returns `404` when the collection belongs to a different user.
- [ ] Each question in the response contains exactly 4 options.
- [ ] The correct answer is always among the 4 options.
- [ ] Option order is randomized across different requests (not always the same shuffle).
- [ ] All cards in the collection appear as questions (questions count == cards count).
- [ ] Frontend "Тест" button is disabled and shows tooltip when collection has 0–3 cards.
- [ ] Frontend "Тест" button is enabled and navigates to `/collections/:id/tests` when ≥ 4 cards exist.
- [ ] `CollectionTestPage` shows a loading spinner while the test data is being fetched.
- [ ] `CollectionTestPage` shows an error state (with back navigation) when the API call fails.
- [ ] Selecting the correct answer highlights the chosen button green for ~900 ms, then advances.
- [ ] Selecting a wrong answer highlights the chosen button red for ~900 ms, then advances.
- [ ] After the last question the user is navigated back to `/collections/:id`.
- [ ] The "Не уверен?" skip button still advances without any colour feedback.
- [ ] No mock data remains in `CollectionTestPage`.
