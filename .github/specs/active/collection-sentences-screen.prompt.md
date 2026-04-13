---
agent: agent
model: Claude Sonnet 4.5 (copilot)
description: "Sentences viewer screen for /collections/:id/sentences — card-by-card navigation with generate button when empty"
---

# Collection Sentences Screen

## 1. Overview

The `/collections/:id/sentences` route already exists and renders `CollectionSentencesPage`, but is currently a placeholder. This feature completes the screen:

- Fetch sentences for the collection from the backend via `GET /collections/:collectionId/sentences`
- Display **one sentence at a time** in a card, with left/right arrow buttons to navigate between them
- Show a loading spinner while fetching
- When the collection has **zero sentences**, hide the navigator and show a **"Сгенерировать примеры"** button that calls `POST /collections/:collectionId/sentences/generate`
- After generation succeeds, show the newly created sentences in the navigator

The `Sentence` model (`id`, `word`, `text`) already exists in the Prisma schema. The `SentenceController` and `SentenceService` also exist.

---

## 2. Architecture / Flow

```
Browser (CollectionSentencesPage)
  │
  ├─► GET /api/collections/:id/sentences
  │     └─ auth middleware
  │     └─ SentenceController.getSentencesByCollection
  │     └─ SentenceService.getSentencesByCollection  ──► prisma.sentence.findMany
  │     └─ 200 { sentences: Sentence[] }
  │
  └─► POST /api/collections/:id/sentences/generate
        └─ auth middleware
        └─ SentenceController.generateSentences
        └─ SentenceService.createSentences(userId, collectionId, 5)
              ├─► prisma.wordCard.findMany       (get words)
              ├─► OpenAI GPT-4.1                (generate sentences)
              ├─► prisma.sentence.createMany     (batch insert)
              └─► prisma.sentence.findMany       (return persisted rows)
        └─ 200 Sentence[]

---

## 3. New File Structure

```
backend/src/routes/
  collections.ts          ← UPDATED  (add GET + POST sentences sub-routes)
backend/src/services/
  SentenceService.ts      ← UPDATED  (persist sentences after generation)
frontend/src/
  api/
    sentences.api.ts      ← NEW      (fetchSentences, generateSentences)
  types/
    sentence.ts           ← NEW      (Sentence type)
  hooks/
    useCollectionSentences.ts  ← NEW (fetch + generate state machine)
  Pages/
    CollectionSentencesPage.tsx  ← UPDATED  (implement real UI)
```

---

## 4. Step-by-Step Specification

### 4.1 Backend — register routes in `collections.ts`

Add two new routes that delegate to `SentenceController`:

```ts
// backend/src/routes/collections.ts  (additions)
import SentenceController from '../controllers/SentenceController';

router.get('/:collectionId/sentences', auth, (req, res, next) =>
  SentenceController.getSentencesByCollection(req, res).catch(next)
);

router.post('/:collectionId/sentences/generate', auth, (req, res, next) =>
  SentenceController.generateSentences(req, res).catch(next)
);
```

Rules:
- Both routes require the `auth` middleware (already defined)
- The POST route does **not** require a request body validator (no body parameters)
- Wrap controller calls in `.catch(next)` to forward thrown errors to `errorHandler`

### 4.2 Backend — persist sentences in `SentenceService.createSentences`

File: `backend/src/services/SentenceService.ts`

The AI response schema returns `sentence` (string), but the DB column is `text`. After calling `generateSentencesPrompt`, insert all rows with `prisma.sentence.createMany`, then re-query and return them as `{ id, word, text }`.

Replace the `return sentences;` line at the end of `createSentences` with:

```ts
const result = await this.generateSentencesPrompt(words);

await prisma.sentence.createMany({
  data: result.sentences.map((s) => ({
    word: s.word,
    text: s.sentence,   // AI field is "sentence", DB column is "text"
    userId,
    collectionId,
  })),
});

const persisted = await prisma.sentence.findMany({
  where: { collectionId },
  select: { id: true, word: true, text: true },
});

return persisted;
```

Rules:
- Use `createMany` (single round-trip) — do not loop with individual `create` calls
- Re-query after insert so the caller always receives `{ id, word, text }` — matching the same shape as `getSentencesByCollection`
- The outer `try/catch` already exists in `createSentences`; DB errors will bubble naturally
- No migration needed — the `Sentence` model already has all required fields

### 4.3 Frontend — Sentence type

File: `frontend/src/types/sentence.ts`

```ts
export type Sentence = {
  id: string
  word: string
  text: string
}
```

### 4.4 Frontend — API layer

File: `frontend/src/api/sentences.api.ts`

```ts
import httpClient from './httpClient'
import type { Sentence } from '../types/sentence'

export type GetSentencesResponse = {
  sentences: Sentence[]
}

export async function fetchSentences(collectionId: string): Promise<Sentence[]> {
  const res = await httpClient.get<Sentence[]>(`/collections/${collectionId}/sentences`)
  return res.data
}

export async function generateSentences(collectionId: string): Promise<Sentence[]> {
  const res = await httpClient.post<Sentence[]>(
    `/collections/${collectionId}/sentences/generate`
  )
  return res.data
}
```

> Both endpoints now return `Sentence[]` (`{ id, word, text }`) with the same shape — no mapper needed.

### 4.5 Frontend — Hook: `useCollectionSentences`

File: `frontend/src/hooks/useCollectionSentences.ts`

State machine:

| State | Description |
|-------|-------------|
| `idle` | Not yet fetched |
| `loading` | Fetch or generate in progress |
| `empty` | Fetch completed, zero sentences returned |
| `success` | Sentences loaded, navigator active |
| `error` | Fetch or generate failed |

```ts
import { useEffect, useState, useCallback } from 'react'
import { fetchSentences, generateSentences } from '../api/sentences.api'
import type { Sentence } from '../types/sentence'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; sentences: Sentence[] }
  | { status: 'error'; message: string }

type Actions = {
  generate: () => Promise<void>
}

export function useCollectionSentences(collectionId: string): State & Actions {
  const [state, setState] = useState<State>({ status: 'idle' })

  const load = useCallback(async () => {
    if (!collectionId) return
    setState({ status: 'loading' })
    try {
      const sentences = await fetchSentences(collectionId)
      setState(sentences.length === 0 ? { status: 'empty' } : { status: 'success', sentences })
    } catch {
      setState({ status: 'error', message: 'Не удалось загрузить предложения' })
    }
  }, [collectionId])

  useEffect(() => { void load() }, [load])

  const generate = useCallback(async () => {
    if (!collectionId) return
    setState({ status: 'loading' })
    try {
      const sentences = await generateSentences(collectionId)
      setState(sentences.length === 0 ? { status: 'empty' } : { status: 'success', sentences })
    } catch {
      setState({ status: 'error', message: 'Не удалось сгенерировать предложения' })
    }
  }, [collectionId])

  return { ...state, generate }
}
```

### 4.6 Frontend — `CollectionSentencesPage` UI

File: `frontend/src/Pages/CollectionSentencesPage.tsx`

Replace the current placeholder implementation entirely. UI spec:

**Loading state:** `<Spinner size="xl" color="brand.solid" />` centered on page.

**Error state:** Heading "Ошибка" + message text + "К коллекции" button.

**Empty state (no sentences):**
```
Heading:  "Предложения"
Text:     "Для этой коллекции ещё нет примеров предложений."
Button:   "Сгенерировать примеры"  (colorPalette="brand" variant="solid")
          ↳ calls state.generate(), shows spinner while loading
```

**Success state (navigator):**
```
┌─────────────────────────────────────────────────────┐
│  "Предложения"  (Heading lg, fg.default)            │
│                                                     │
│  ← [     word (fg.default, bold)                  ] →
│     [     sentence text (fg.muted)                ]
│                                                     │
│  1 / 7  (Text sm, fg.subtle, centered)              │
└─────────────────────────────────────────────────────┘
```

- Arrow buttons: `IconButton` with `LuChevronLeft` / `LuChevronRight` icons
  - `variant="ghost"`, `colorPalette="brand"`
  - Disabled when at the first / last sentence
- Sentence card:
  - `bg="bg.surface"`, `borderWidth="1px"`, `borderColor="border.default"`, `borderRadius="modal"`, `shadow="card.default"`
  - Min width `320px`, max width `560px`  
  - `word` displayed as `Heading size="md" color="fg.default"`
  - `text` displayed as `Text color="fg.muted"`
- Navigation counter `{current + 1} / {total}` below the card using `Text size="sm" color="fg.subtle"`
- "К коллекции" ghost button at the bottom: `variant="ghost" color="fg.muted"`

Local state: `const [currentIndex, setCurrentIndex] = useState(0)` — reset to 0 when sentences change.

Component outline:

```tsx
export function CollectionSentencesPage() {
  const { id } = useParams<{ id: string }>()
  const collectionId = id ?? ''
  const state = useCollectionSentences(collectionId)
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)

  // Reset index when new sentences arrive
  useEffect(() => {
    if (state.status === 'success') setCurrentIndex(0)
  }, [state.status])

  if (state.status === 'idle' || state.status === 'loading') { /* spinner */ }
  if (state.status === 'error') { /* error */ }
  if (state.status === 'empty') { /* empty + generate button */ }

  // state.status === 'success'
  const { sentences } = state
  const sentence = sentences[currentIndex]
  const total = sentences.length

  return (
    <VStack minH="60vh" justify="center" gap={6}>
      <Heading size="lg" color="fg.default">Предложения</Heading>

      <HStack gap={4} align="center">
        <IconButton
          aria-label="Предыдущее"
          variant="ghost"
          colorPalette="brand"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(i => i - 1)}
        >
          <LuChevronLeft />
        </IconButton>

        <Box /* sentence card */>
          <Heading size="md" color="fg.default">{sentence.word}</Heading>
          <Text color="fg.muted" mt={2}>{sentence.text}</Text>
        </Box>

        <IconButton
          aria-label="Следующее"
          variant="ghost"
          colorPalette="brand"
          disabled={currentIndex === total - 1}
          onClick={() => setCurrentIndex(i => i + 1)}
        >
          <LuChevronRight />
        </IconButton>
      </HStack>

      <Text color="fg.subtle" fontSize="sm">{currentIndex + 1} / {total}</Text>

      <Button variant="ghost" color="fg.muted" onClick={() => navigate(`/collections/${collectionId}`)}>
        К коллекции
      </Button>
    </VStack>
  )
}
```

---

## 5. Security Considerations

| Risk | Mitigation |
|------|-----------|
| Unauthenticated access to sentences | Both routes protected by `auth` middleware — returns 401 if no valid JWT |
| IDOR — user reads another user's sentences | `getSentencesByCollection` filters by `collectionId` only. The `Sentence` model has `userId` but `getSentencesByCollection` queries only by `collectionId`. **Add a check** that the collection belongs to `req.userId` before returning sentences, or add `userId` to the `findMany` where clause |
| AI generation abuse (cost explosion) | `createSentences` defaults to `limit=5`. No rate-limiting yet — consider adding one later |
| Prompt injection via word card content | OpenAI call uses structured output (`withStructuredOutput`) and a fixed prompt template — risk is low but exists if word content is adversarial |

> **Action required:** In `SentenceController.getSentencesByCollection`, verify ownership by either checking collection ownership in the service or passing `userId` to the query.

---

## 6. Acceptance Criteria

- [ ] `GET /api/collections/:collectionId/sentences` returns `200` with an array of `{ id, word, text }` objects for an authenticated user
- [ ] `POST /api/collections/:collectionId/sentences/generate` returns `200` with generated and **persisted** sentences for an authenticated user
- [ ] After calling generate, a subsequent `GET /sentences` returns the same sentences (persistence verified)
- [ ] Both routes return `401` when called without a valid JWT
- [ ] `CollectionSentencesPage` shows a spinner while loading
- [ ] `CollectionSentencesPage` shows the "Сгенерировать примеры" button when the API returns an empty array
- [ ] Clicking "Сгенерировать примеры" calls the generate endpoint and transitions to the navigator on success
- [ ] The sentence card displays the `word` and `text` fields
- [ ] Left arrow is disabled on the first sentence; right arrow is disabled on the last sentence
- [ ] The counter below the card shows `{current} / {total}` correctly
- [ ] "К коллекции" button navigates to `/collections/:id`
- [ ] No TypeScript strict-mode errors (`strict: true`)
- [ ] All semantic color tokens are used — no raw hex or Chakra palette colors
