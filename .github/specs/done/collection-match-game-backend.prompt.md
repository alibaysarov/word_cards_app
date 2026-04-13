---
agent: agent
model: Claude Sonnet 4.5 (copilot)
description: "Backend endpoint to fetch cards of a collection for the match game"
---

# Collection Match Game — Backend

## 1. Overview

Expose a new authenticated endpoint `GET /api/collections/:collectionId/cards` that returns all word cards belonging to a specific collection. This powers the client-side match game without returning the full collection metadata.

---

## 2. Architecture / Flow

```
Browser                         Express (backend)               PostgreSQL
  │                                    │                              │
  │  GET /api/collections/:id/cards    │                              │
  │  Authorization: Bearer <token>     │                              │
  ├───────────────────────────────────►│                              │
  │                                    │  collection.findFirst        │
  │                                    │  where: { id, userId }       │
  │                                    ├─────────────────────────────►│
  │                                    │◄─────────────────────────────┤
  │                                    │  wordCard.findMany           │
  │                                    │  where: { collectionId }     │
  │                                    ├─────────────────────────────►│
  │                                    │◄─────────────────────────────┤
  │◄───────────────────────────────────┤  200 { cards: WordCard[] }   │
```

---

## 3. Files to Modify

```
backend/
  src/
    routes/
      collections.ts        ← UPDATED  (add GET /:collectionId/cards)
    controllers/
      CollectionController.ts ← UPDATED  (add getCards method)
```

---

## 4. Step-by-Step Specification

### 4.1 Route — `backend/src/routes/collections.ts`

Add the following line **before** the existing `router.get('/:collectionId', ...)` so Express matches `/cards` before the generic segment:

```ts
router.get('/:collectionId/cards', auth, CollectionController.getCards);
```

### 4.2 Controller — `CollectionController.getCards`

**File:** `backend/src/controllers/CollectionController.ts`

```ts
async getCards(req: Request, res: Response) {
  const { userId } = req

  if (!userId) {
    throw new AuthError("Не авторизованы")
  }

  const collectionId = String(req.params.collectionId)

  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId }
  })

  if (!collection) {
    throw new NotFoundError()
  }

  const cards = await prisma.wordCard.findMany({
    where: { collectionId }
  })

  return res.status(200).json({ cards })
}
```

The `userId` ownership check in `findFirst` ensures users can only access cards from their own collections.

### 4.3 `WordCardController.getCardsByCollection` stub

The existing empty stub in `WordCardController` is intentionally left unused — the new route is handled by `CollectionController` to keep collection-scoped concerns together.

---

## 5. Security Considerations

| Risk | Mitigation |
|---|---|
| Horizontal privilege escalation — fetching another user's cards | `getCards` filters `collection` by both `id` and `userId`; returns `404` if not owned |
| Unauthenticated access | `auth` middleware applied to the route; missing/invalid token yields `401` |
| Sensitive error details leaked | Controller throws typed `NotFoundError` / `AuthError`; `errorHandler` middleware maps them to safe HTTP responses |

---

## 6. Acceptance Criteria

- [ ] `GET /api/collections/:collectionId/cards` returns `{ cards: WordCard[] }` with status `200` for the collection's owner
- [ ] Returns `401` when called without a valid JWT
- [ ] Returns `404` when the collection does not exist or belongs to a different user
- [ ] Cards array is scoped to the requested collection only — no cross-collection leakage
- [ ] Route is placed before `/:collectionId` in `collections.ts` to avoid shadowing
