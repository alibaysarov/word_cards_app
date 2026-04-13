---
agent: agent
model: Claude Sonnet 4.5 (copilot)
description: "Frontend match game page at /collections/:id/match — pair shuffled terms with definitions"
---

# Collection Match Game — Frontend

## 1. Overview

A new page at `/collections/:id/match` where the user pairs shuffled term tiles with definition tiles. Game state is entirely client-side — no results are persisted. The feature includes a typed API helper, a data-fetching hook, the game page itself, and wiring up the existing "Подбор" button.

---

## 2. Architecture / Flow

```
Browser
  │
  ├─ useCollectionCards(id)
  │    └─ fetchCollectionCards(id)  →  GET /api/collections/:id/cards
  │
  └─ CollectionMatchPage
       ├─ status: loading  → Spinner
       ├─ status: error    → Error message
       └─ status: success  → Game board
            ├── Header: "Round N / Total"  +  "Ошибок: N"
            ├── Grid (2 cols): [term tiles] | [definition tiles]
            ├── Round-complete interstitial (1.5 s)
            └── Summary screen → "Сыграть ещё раз" | "К коллекции"
```

---

## 3. Files to Create / Modify

```
frontend/
  src/
    types/
      wordCard.ts             ← NEW   (WordCard, MatchTile types)
    api/
      collections.api.ts      ← NEW   (fetchCollectionCards)
    hooks/
      useCollectionCards.ts   ← NEW   (discriminated-union data hook)
    Pages/
      CollectionMatchPage.tsx ← NEW   (match game page)
      SingleCollectionPage.tsx← UPDATED  (wire Подбор button)
    router/
      index.tsx               ← UPDATED  (add /collections/:id/match route)
```

---

## 4. Step-by-Step Specification

### 4.1 Shared Types — `frontend/src/types/wordCard.ts`

```ts
export type WordCard = {
  id: string
  frontText: string
  RearText: string        // matches Prisma field name (capital R)
  collectionId: string
}

export type MatchTile = {
  id: string              // wordCard id
  text: string
  side: 'term' | 'definition'
  matched: boolean
  shaking: boolean
}
```

---

### 4.2 API Helper — `frontend/src/api/collections.api.ts`

```ts
import httpClient from './httpClient'
import type { WordCard } from '../types/wordCard'

export type GetCollectionCardsResponse = {
  cards: WordCard[]
}

export async function fetchCollectionCards(
  collectionId: string
): Promise<GetCollectionCardsResponse> {
  const res = await httpClient.get<GetCollectionCardsResponse>(
    `/collections/${collectionId}/cards`
  )
  return res.data
}
```

---

### 4.3 Data Hook — `frontend/src/hooks/useCollectionCards.ts`

```ts
import { useEffect, useState } from 'react'
import { fetchCollectionCards } from '../api/collections.api'
import type { WordCard } from '../types/wordCard'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; cards: WordCard[] }
  | { status: 'error'; message: string }

export function useCollectionCards(collectionId: string): State {
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    if (!collectionId) return
    setState({ status: 'loading' })
    fetchCollectionCards(collectionId)
      .then(({ cards }) => setState({ status: 'success', cards }))
      .catch(() =>
        setState({ status: 'error', message: 'Не удалось загрузить карточки' })
      )
  }, [collectionId])

  return state
}
```

---

### 4.4 Match Game Page — `frontend/src/Pages/CollectionMatchPage.tsx`

#### Game rules
- Cards are split into **rounds of up to 8 pairs**.
- In each round both columns (terms left, definitions right) are **independently shuffled**.
- Clicking a tile **selects** it (highlighted with `brand.solid` border).
- Clicking a tile on the **opposite side** checks for a match:
  - **Match** → both tiles turn green (`accent.solid`), gain `matched: true`, become non-interactive.
  - **No match** → both tiles briefly shake, then deselect. Mismatch counter increments.
- Clicking the same tile twice deselects it.
- Clicking a tile on the same side as the selected tile switches selection to the new tile.
- When all pairs in a round are matched → show **"Round complete"** interstitial for 1.5 s, then advance.
- After the last round → show **Session summary** screen.

#### Component tree (single file)

```
CollectionMatchPage
├── Loading spinner         (status === 'loading')
├── Error state             (status === 'error')
├── Empty state             (cards.length < 2)
├── Game board              (phase === 'playing' | 'round-complete')
│   ├── Header: "Round N / Total"  +  mismatch counter
│   ├── Grid 2-col: term tiles | definition tiles
│   └── Round-complete overlay (phase === 'round-complete')
└── Summary screen          (phase === 'summary')
    ├── Heading: "Отлично!"
    ├── "Ошибок: N"
    ├── "Сыграть ещё раз" → reset()
    └── "К коллекции"     → navigate(-1)
```

#### Key state

```ts
type GamePhase = 'playing' | 'round-complete' | 'summary'

const [round, setRound] = useState(0)
const [tiles, setTiles] = useState<MatchTile[]>([])
const [selectedTile, setSelectedTile] = useState<MatchTile | null>(null)
const [mismatches, setMismatches] = useState(0)
const [phase, setPhase] = useState<GamePhase>('playing')
```

#### Round initialisation

```ts
const ROUND_SIZE = 8

function buildTiles(cards: WordCard[]): MatchTile[] {
  const terms: MatchTile[] = shuffle(cards).map((c) => ({
    id: c.id, text: c.frontText, side: 'term', matched: false, shaking: false,
  }))
  const defs: MatchTile[] = shuffle(cards).map((c) => ({
    id: c.id, text: c.RearText, side: 'definition', matched: false, shaking: false,
  }))
  return [...terms, ...defs]
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
```

Slice `cards` for the current round: `cards.slice(round * ROUND_SIZE, (round + 1) * ROUND_SIZE)`.

#### Tile interaction handler

```ts
function handleTileClick(tile: MatchTile) {
  if (tile.matched || tile.shaking) return

  if (!selectedTile) {
    setSelectedTile(tile)
    return
  }

  if (selectedTile.id === tile.id && selectedTile.side === tile.side) {
    setSelectedTile(null)
    return
  }

  if (selectedTile.side === tile.side) {
    setSelectedTile(tile)
    return
  }

  // Opposite sides — evaluate
  if (selectedTile.id === tile.id) {
    // ✅ Match
    setTiles((prev) =>
      prev.map((t) => (t.id === tile.id ? { ...t, matched: true } : t))
    )
  } else {
    // ❌ Mismatch
    const wrongIds = [selectedTile, tile].map((t) => `${t.id}-${t.side}`)
    setMismatches((n) => n + 1)
    setTiles((prev) =>
      prev.map((t) =>
        wrongIds.includes(`${t.id}-${t.side}`) ? { ...t, shaking: true } : t
      )
    )
    setTimeout(() => {
      setTiles((prev) =>
        prev.map((t) =>
          wrongIds.includes(`${t.id}-${t.side}`) ? { ...t, shaking: false } : t
        )
      )
    }, 600)
  }
  setSelectedTile(null)
}
```

#### Round-completion effect

```ts
useEffect(() => {
  if (tiles.length === 0) return
  const allMatched = tiles.every((t) => t.matched)
  if (!allMatched) return

  const totalRounds = Math.ceil(cards.length / ROUND_SIZE)
  setPhase('round-complete')
  setTimeout(() => {
    if (round + 1 >= totalRounds) {
      setPhase('summary')
    } else {
      setRound((r) => r + 1)
      setPhase('playing')
    }
  }, 1500)
}, [tiles])
```

#### Shake animation (Chakra `css` prop)

```ts
css={tile.shaking ? {
  animation: 'shake 0.5s',
  '@keyframes shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '20%, 60%': { transform: 'translateX(-6px)' },
    '40%, 80%': { transform: 'translateX(6px)' },
  },
} : undefined}
```

#### Tile visual states

| State | `borderColor` | `bg` |
|---|---|---|
| idle | `border.default` | `bg.surface` |
| selected | `brand.solid` | `brand.subtle` |
| matched | `accent.solid` | `accent.subtle` |
| shaking | `red.500` | `red.subtle` |

All colours are semantic tokens — no hardcoded values.

---

### 4.5 Router Update — `frontend/src/router/index.tsx`

```ts
import CollectionMatchPage from '../Pages/CollectionMatchPage'

// Add inside children array:
{
  path: 'collections/:id/match',
  element: <CollectionMatchPage />,
},
```

---

### 4.6 Wire "Подбор" Button — `frontend/src/Pages/SingleCollectionPage.tsx`

Change the existing "Подбор" button from a static button to one with navigation:

```tsx
<Button
  colorPalette="accent"
  variant="solid"
  size="md"
  onClick={() => navigate(`/collections/${id}/match`)}
>
  Подбор
</Button>
```

---

## 5. Security Considerations

| Risk | Mitigation |
|---|---|
| Reflected XSS via card text | Chakra UI renders via React — no `dangerouslySetInnerHTML` |
| Auth token exposed in state | Token stays in `localStorage`, only sent via `httpClient` interceptor header |
| 401 redirect loop | `httpClient` interceptor removes token and redirects to `/login` on 401 — handled globally |

---

## 6. Acceptance Criteria

### Routing & data
- [ ] Navigating to `/collections/:id/match` renders `CollectionMatchPage`
- [ ] The "Подбор" button on `SingleCollectionPage` navigates to `/collections/:id/match`
- [ ] Page shows a loading spinner while cards are being fetched
- [ ] Page shows an error message if the API call fails
- [ ] Page shows an empty-state message if the collection has fewer than 2 cards

### Game mechanics
- [ ] Cards are split into rounds of ≤ 8 pairs; remaining cards form the next round
- [ ] Term tiles and definition tiles are shuffled independently each round
- [ ] Clicking a tile highlights it; clicking the same tile deselects it
- [ ] Clicking a tile on the same side switches selection to the new tile
- [ ] A correct match makes both tiles green and non-interactive
- [ ] An incorrect match shakes both tiles and increments the mismatch counter
- [ ] When all pairs in a round are matched, the next round starts after 1.5 s
- [ ] After the last round the summary screen is shown with total mismatch count
- [ ] "Сыграть ещё раз" resets the entire game without a page reload
- [ ] "К коллекции" navigates back to `/collections/:id`

### Visual / UX
- [ ] All tile states use semantic tokens only — no hardcoded colours
- [ ] Layout is usable on mobile (single-column below `sm` breakpoint, if applicable)
- [ ] Header shows current round number and total rounds
