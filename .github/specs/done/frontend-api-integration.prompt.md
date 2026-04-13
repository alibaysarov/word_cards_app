---
agent: agent
model: Claude Sonnet 4.5 (copilot)
description: "Wire frontend pages (Collections, SingleCollection, MatchGame) to existing backend REST endpoints — no new backend logic"
---

# Frontend API Integration — Collections & Cards

## 1. Overview

The frontend currently uses hardcoded mock data on three pages: `CollectionsPage`, `SingleCollectionPage`, and `CollectionMatchPage`. All required backend endpoints already exist. This spec covers replacing mock data with real API calls using lightweight hooks and an expanded API layer.

No backend changes are needed.

---

## 2. Architecture / Flow

```
Browser (React)               API Layer              Express (backend)
       │                           │                        │
       │  useCollections()         │                        │
       ├──────────────────────────►│  GET /collections/     │
       │                           ├───────────────────────►│
       │◄──────────────────────────┤  Collection[]          │
       │                           │                        │
       │  useCollection(id)        │                        │
       ├──────────────────────────►│  GET /collections/:id  │
       │                           ├───────────────────────►│
       │◄──────────────────────────┤  Collection+wordCards  │
       │                           │                        │
       │  useCollectionCards(id)   │                        │
       ├──────────────────────────►│  GET /collections/:id/cards
       │                           ├───────────────────────►│
       │◄──────────────────────────┤  { cards: WordCard[] } │
       │                           │                        │
       │  createCollectionMutation │                        │
       ├──────────────────────────►│  POST /collections/    │
       │                           ├───────────────────────►│
       │◄──────────────────────────┤  Collection            │
       │                           │                        │
       │  createCardMutation       │                        │
       ├──────────────────────────►│  POST /cards/          │
       │                           ├───────────────────────►│
       │◄──────────────────────────┤  WordCard              │
       │                           │                        │
       │  deleteCardMutation       │                        │
       ├──────────────────────────►│  DELETE /cards/:id     │
       │                           ├───────────────────────►│
       │◄──────────────────────────┤  204 No Content        │
```

---

## 3. Files to Create or Modify

```
frontend/
  .env                                      ← UPDATED  (fix VITE_API_URL to include /api)
  .env.example                              ← UPDATED  (same)
  src/
    types/
      collection.ts                         ← NEW      (Collection type)
    api/
      collections.api.ts                    ← UPDATED  (add fetchCollections, createCollection, fetchCollectionById)
      cards.api.ts                          ← NEW      (createCard, deleteCard, updateCard)
    hooks/
      useCollections.ts                     ← NEW      (discriminated-union state hook for collection list)
      useCollection.ts                      ← NEW      (discriminated-union state hook for single collection)
    Pages/
      CollectionsPage.tsx                   ← UPDATED  (replace mock array with useCollections, wire create)
      SingleCollectionPage.tsx              ← UPDATED  (replace mockCards with useCollection, wire create/delete)
      CollectionMatchPage.tsx               ← UPDATED  (replace MOCK_CARDS with useCollectionCards)
```

---

## 4. Step-by-Step Specification

### 4.0 Fix base URL — `.env` and `.env.example`

The backend mounts all routes under `/api`. The `httpClient` `baseURL` must end with `/api` so that relative paths like `/collections/` resolve correctly.

```diff
- VITE_API_URL=http://localhost:3010
+ VITE_API_URL=http://localhost:3010/api
```

Update both `.env` and `.env.example`.

---

### 4.1 New type — `frontend/src/types/collection.ts`

```ts
export type Collection = {
  id: string
  name: string
  userId: string
}
```

---

### 4.2 Expand API layer — `frontend/src/api/collections.api.ts`

Add three new functions alongside the existing `fetchCollectionCards`:

```ts
import type { Collection } from '../types/collection'

// GET /collections/
export async function fetchCollections(): Promise<Collection[]> {
  const res = await httpClient.get<Collection[]>('/collections/')
  return res.data
}

// GET /collections/:id  (returns collection with embedded wordCards)
export async function fetchCollectionById(
  collectionId: string
): Promise<Collection & { wordCards: WordCard[] }> {
  const res = await httpClient.get<Collection & { wordCards: WordCard[] }>(
    `/collections/${collectionId}`
  )
  return res.data
}

// POST /collections/
export async function createCollection(name: string): Promise<Collection> {
  const res = await httpClient.post<Collection>('/collections/', { name })
  return res.data
}
```

---

### 4.3 New API file — `frontend/src/api/cards.api.ts`

```ts
import httpClient from './httpClient'
import type { WordCard } from '../types/wordCard'

export type CreateCardDto = {
  frontText: string
  rearText: string
  collectionId: string
}

export type UpdateCardDto = {
  frontText: string
  rearText: string
}

export async function createCard(dto: CreateCardDto): Promise<WordCard> {
  const res = await httpClient.post<WordCard>('/cards/', dto)
  return res.data
}

export async function updateCard(cardId: string, dto: UpdateCardDto): Promise<WordCard> {
  const res = await httpClient.put<WordCard>(`/cards/${cardId}`, dto)
  return res.data
}

export async function deleteCard(cardId: string): Promise<void> {
  await httpClient.delete(`/cards/${cardId}`)
}
```

---

### 4.4 New hook — `frontend/src/hooks/useCollections.ts`

Follows the same discriminated-union pattern as the existing `useCollectionCards`:

```ts
import { useEffect, useState } from 'react'
import { fetchCollections } from '../api/collections.api'
import type { Collection } from '../types/collection'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; collections: Collection[] }
  | { status: 'error'; message: string }

export function useCollections(): {
  state: State
  refetch: () => void
} {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setState({ status: 'loading' })
    fetchCollections()
      .then((collections) => setState({ status: 'success', collections }))
      .catch(() => setState({ status: 'error', message: 'Не удалось загрузить коллекции' }))
  }, [tick])

  return { state, refetch: () => setTick((t) => t + 1) }
}
```

The `refetch` callback allows `CollectionsPage` to reload the list after creating a new collection.

---

### 4.5 New hook — `frontend/src/hooks/useCollection.ts`

```ts
import { useEffect, useState } from 'react'
import { fetchCollectionById } from '../api/collections.api'
import type { Collection } from '../types/collection'
import type { WordCard } from '../types/wordCard'

type CollectionWithCards = Collection & { wordCards: WordCard[] }

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; collection: CollectionWithCards }
  | { status: 'error'; message: string }

export function useCollection(collectionId: string): {
  state: State
  refetch: () => void
} {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!collectionId) return
    setState({ status: 'loading' })
    fetchCollectionById(collectionId)
      .then((collection) => setState({ status: 'success', collection }))
      .catch(() => setState({ status: 'error', message: 'Не удалось загрузить коллекцию' }))
  }, [collectionId, tick])

  return { state, refetch: () => setTick((t) => t + 1) }
}
```

---

### 4.6 Update `CollectionsPage.tsx`

Replace the hardcoded `collections` array with `useCollections`. Wire `handleSaveCollection` to call `createCollection` and trigger `refetch`.

**Key changes:**
- Remove the `const collections = [...]` mock array
- Call `const { state, refetch } = useCollections()`
- In `handleSaveCollection`: call `createCollection(name)`, then `refetch()` on success
- Render a loading spinner (`<Spinner />`) when `state.status === 'loading'`
- Render an error `<Text>` when `state.status === 'error'`
- Map over `state.collections` when `state.status === 'success'`
- The card count badge: use `state.collections`'s length — backend's `GET /collections/` does not return `wordCount`. Display the count only if `fetchCollectionById` is called, otherwise omit the badge or show it as "–"

> **Note:** the `GET /collections/` endpoint returns `Collection[]` without word counts. To keep the page fast, omit the word count badge on `CollectionsPage` or show it as a static placeholder. The `SingleCollectionPage` gets the full `wordCards` array via `GET /collections/:id`.

---

### 4.7 Update `SingleCollectionPage.tsx`

Replace the `mockCards` array with `useCollection(id)`.

**Key changes:**
- Remove `const mockCards = [...]`
- Call `const { state, refetch } = useCollection(id ?? '')`
- Derive displayed cards from `state.collection.wordCards` when `state.status === 'success'`
- `handleSaveCard`: call `createCard({ frontText, rearText, collectionId: id! })`, then `refetch()`
- Delete button handler: call `deleteCard(cardId)`, then `refetch()`
- Show loading / error states appropriately
- `totalWords` = `state.collection.wordCards.length` (replace hardcoded `mockCards.length`)
- The heading `Коллекция #${id}` can be replaced with `state.collection.name` once loaded

---

### 4.8 Update `CollectionMatchPage.tsx`

The game logic and `buildTiles` function are complete. Only the data source needs to change.

**Key changes:**
- Remove the `MOCK_CARDS` constant
- Call `const cardsState = useCollectionCards(id ?? '')` (hook already exists)
- Add a loading / error guard before rendering the game grid:
  - `cardsState.status === 'loading'` → show `<Spinner />`
  - `cardsState.status === 'error'` → show error text
  - `cardsState.status === 'success'` → pass `cardsState.cards` to the existing game initialisation
- The game's internal `useState` for tiles is already seeded from the cards array — pass `cardsState.cards` to `buildTiles()` at initialization

---

## 5. Security Considerations

| Risk | Mitigation |
|---|---|
| Token in `localStorage` exposed to XSS | Existing risk; out of scope for this integration spec; `httpClient` interceptor already handles 401 redirect |
| Cross-collection card access | `createCard` sends `collectionId` from route params — backend verifies collection ownership already |
| Missing `collectionId` in create card | `collectionId` comes from `useParams`, never from user input |
| Stale data after mutation | `refetch()` re-triggers the hook's `useEffect` to reload fresh data from the server |

---

## 6. Acceptance Criteria

- [ ] `CollectionsPage` renders the authenticated user's collections from the API (no mock array)
- [ ] Creating a collection via `AddCollectionModal` calls `POST /collections/` and the new collection appears in the list without a page reload
- [ ] `SingleCollectionPage` renders the collection name (not `Коллекция #id`) and its real cards from the API
- [ ] Adding a card via `AddCardModal` calls `POST /cards/` and the card appears in the list without a page reload
- [ ] Deleting a card calls `DELETE /cards/:id` and removes it from the list without a page reload
- [ ] `CollectionMatchPage` loads real cards from `GET /collections/:id/cards` instead of `MOCK_CARDS`
- [ ] Loading states are shown while API calls are in flight
- [ ] Error states are shown if an API call fails
- [ ] `VITE_API_URL` in `.env` and `.env.example` is `http://localhost:3010/api`
- [ ] No TypeScript `any` — all API responses are typed
