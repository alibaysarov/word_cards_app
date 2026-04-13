---
agent: agent
model: Claude Sonnet 4.5 (copilot)
description: "On mobile, show terms left / definitions right side-by-side in CollectionMatchPage and prevent tile text from overflowing the screen"
---

# Match Page — Mobile Two-Column Layout & Overflow Fix

## 1. Overview

Currently `CollectionMatchPage` renders the tile grid with `templateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }}`.  
On mobile (`base`) this stacks **Термины** on top of **Определения**, requiring the user to scroll back and forth — a poor UX for a matching game.

Two problems to fix:
1. **Layout**: On every viewport size the grid must always be two columns: terms on the left, definitions on the right.
2. **Overflow**: Tile `<Box>` elements have no overflow guard. Long words (e.g., compound German nouns) stretch beyond the viewport, causing horizontal scroll.

## 2. Architecture / Flow

```
User (mobile browser)
       │
       ▼
CollectionMatchPage.tsx
  ├── <Grid templateColumns="repeat(2, minmax(0, 1fr))">   ← always 2 cols
  │     ├── Left column — termTiles
  │     │     └── <Box> tile  ← overflow: hidden + wordBreak: break-word
  │     └── Right column — definitionTiles
  │           └── <Box> tile  ← overflow: hidden + wordBreak: break-word
  └── (no backend / DB changes)
```

No server, no DB, no shared-type changes required — this is a pure frontend layout fix.

## 3. New File Structure

```
frontend/
  src/
    Pages/
      CollectionMatchPage.tsx   ← UPDATED (grid breakpoint + tile overflow props)
```

No new files are needed.

## 4. Step-by-Step Specification

### 4.1 Grid `templateColumns` — always two columns

**File:** `frontend/src/Pages/CollectionMatchPage.tsx`  
**Location:** The `<Grid>` that wraps termTiles / definitionTiles columns (~line 322).

**Current:**
```tsx
<Grid templateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }} gap={{ base: 4, md: 6 }}>
```

**Change to:**
```tsx
<Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={{ base: 2, md: 6 }}>
```

Rationale:
- `minmax(0, 1fr)` lets each column shrink below its content width, preventing overflow.
- `gap` reduced from `base: 4` to `base: 2` (8 px) on mobile to reclaim horizontal space for tile text.

### 4.2 Section heading spacing

The column headings (`Термины` / `Определения`) currently use `size="sm"`. On narrow screens this remains fine, but the `<Heading>` wrapper `<VStack>` should not add extra side padding.  
No change needed here — `VStack align="stretch"` already fills its column.

### 4.3 Tile overflow guard

Both the term tile render and the definition tile render share the same `<Box as="button">` shape. Add the following props to **both** tile boxes:

```tsx
// add these props to BOTH <Box as="button"> tile elements
overflow="hidden"
wordBreak="break-word"
lineHeight="snug"
whiteSpace="normal"
```

- `overflow="hidden"` — clips content that would overflow the box boundary.
- `wordBreak="break-word"` (maps to CSS `word-break: break-word`) — breaks long unbreakable strings at the tile boundary.
- `whiteSpace="normal"` — ensures multiline wrapping (overrides any inherited `nowrap`).
- `lineHeight="snug"` — tightens line spacing so wrapped text stays compact inside the `minH="56px"` tile.

Keep `minH="56px"` as is — tiles still need a minimum tap target height (≥44 px per mobile guidelines).

### 4.4 Reduce horizontal tile padding on mobile

Current tile padding: `px={4}` (16 px each side = 32 px total).  
On a 375 px phone with two columns and 8 px gap: each column is `(375 - 8) / 2 ≈ 183 px`. 32 px of padding leaves only ~151 px for text.  
Change tile `px` to `{ base: 2, md: 4 }` for both term and definition tiles.

Analogously, reduce `py` to `{ base: 2, md: 3 }`.

### 4.5 No backend / shared-type changes

This feature touches only one file. No Prisma migration, no API changes, no new types.

## 5. Security Considerations

| Risk | Mitigation |
|------|-----------|
| XSS via tile text rendered as HTML | `{tile.text}` rendered as React text node (not `dangerouslySetInnerHTML`) — no change needed |
| No new inputs or network calls | N/A |

## 6. Acceptance Criteria

- [ ] On a 375 px wide viewport (`base`) the grid shows two columns: terms left, definitions right.
- [ ] On a 768 px+ viewport the grid still shows two columns with wider gap.
- [ ] No horizontal scrollbar appears at 375 px viewport width with any tile text length.
- [ ] Each tile remains tappable with a minimum height of 44 px.
- [ ] Long single-word tile text (e.g., "Donaudampfschifffahrtsgesellschaft") wraps inside the tile box without overflow.
- [ ] Matched (glowing/shaking/selected) visual states are unaffected.
- [ ] Round-complete overlay still covers the entire grid.
- [ ] Dark mode tile appearance is unaffected.
