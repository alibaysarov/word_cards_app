---
agent: agent
model: Claude Sonnet 4.6 (copilot)
description: "Refactor Sentences page: full-screen card list, word highlight with tooltip, and fix backend highlight/translate return."
---

# Spec: Sentences — Highlight & Full-Screen Layout

## 1. Overview

The "Предложения" (Sentences) section currently shows one sentence at a time in a slider widget. The word title is shown above the sentence text, there is no inline word highlight, and the backend `getSentencesByCollection` does not return the `highLighted` / `translate` fields it detects internally.

This spec describes the changes to:
- Fix the backend to return `{ id, text, highLighted, translate }` objects.
- Replace the slider UI with a full-screen vertical list of sentence cards.
- Remove the word heading from each card.
- Increase sentence font size.
- Inline-highlight (bold + brand color) the matched word inside the sentence text.
- Show a tooltip with the translation on hover of the highlighted word (smooth CSS transition).

---

## 2. Architecture / Flow

```
CollectionSentencesPage
      │
      │ mount
      ▼
useCollectionSentences(collectionId)
      │
      │ GET /collections/:collectionId/sentences
      ▼
SentenceController.getSentencesByCollection
      │
      ▼
SentenceService.getSentencesByCollection
   - prisma.sentence.findMany (include wordCard)
   - prepareList() → returns { id, text, highLighted, translate }[]
      │
      ▼
JSON response: SentenceDTO[]

Frontend:
  Sentence[] (updated type) → map each to
  <SentenceCard sentence={s} />
    └── <HighlightedText text={s.text} word={s.highLighted} />
          └── spans: plain | <Tooltip label={s.translate}><mark>word</mark></Tooltip>
```

---

## 3. File Structure

```
backend/src/services/SentenceService.ts           ← UPDATED
  - getSentencesByCollection returns full DTO (id + text + highLighted + translate)
  - prepareList returns SentenceDTO[] (add id + text to shape)

frontend/src/types/sentence.ts                    ← UPDATED
  - add highLighted: string; translate: string

frontend/src/Pages/CollectionSentencesPage.tsx    ← UPDATED
  - remove slider / pagination
  - render full-screen scrollable VStack of SentenceCard components
  - remove word heading from card

frontend/src/components/ui/HighlightedText.tsx    ← NEW
  - splits text into plain segments + highlighted word span
  - wraps highlighted span in Chakra Tooltip (smooth fade)
```

---

## 4. Step-by-Step Specification

### 4.1 Backend — `SentenceService.getSentencesByCollection`

**File:** `backend/src/services/SentenceService.ts`

Current issues:
- `getSentencesByCollection` only returns `{ id, wordCardId, text }` — no highlight info.
- `prepareList` loses `id` and `text`.

**Changes:**

1. Define `SentenceDTO` interface (replaces loose `Sentence`):
```typescript
interface SentenceDTO {
  id: string
  text: string
  highLighted: string
  translate: string
}
```

2. Update `getSentencesByCollection` to join `wordCard` data, then call `prepareList`:
```typescript
async getSentencesByCollection(collectionId: string): Promise<SentenceDTO[]> {
  const rows = await prisma.sentence.findMany({
    where: { collectionId },
    select: {
      id: true,
      wordCardId: true,
      text: true,
      wordCard: {
        select: { id: true, frontText: true, RearText: true },
      },
    },
  });
  return this.prepareList(rows);
}
```

3. Fix `prepareList` to return `SentenceDTO[]` (include `id` and `text`):
```typescript
private prepareList(sentences: SentenceWithWord[]): SentenceDTO[] {
  return sentences
    .filter((s): s is SentenceWithWord & { wordCard: Word } => s.wordCard != null)
    .map((s) => {
      const { frontText, RearText: rearText } = s.wordCard;
      const highLighted = s.text.toLowerCase().includes(frontText.toLowerCase())
        ? frontText
        : rearText;
      const translate = highLighted === frontText ? rearText : frontText;
      return { id: s.id, text: s.text, highLighted, translate };
    });
}
```

Where `SentenceWithWord` is a local type:
```typescript
interface SentenceWithWord {
  id: string
  wordCardId: string
  text: string
  wordCard?: Word
}
```

> NOTE: `createSentences` already calls `prepareList` from `prisma.sentence.findMany` with `wordCard` included — no change needed there.

---

### 4.2 Frontend — `Sentence` Type

**File:** `frontend/src/types/sentence.ts`

```typescript
export type Sentence = {
  id: string
  text: string
  highLighted: string
  translate: string
}
```

Remove the old `word` field (it was unused — the backend never returned it).

---

### 4.3 Frontend — `HighlightedText` Component

**File:** `frontend/src/components/ui/HighlightedText.tsx`

Responsibility: given `text` and `word`, split the text at the first case-insensitive occurrence of `word`, render the match as a styled `<mark>` wrapped in a Chakra `Tooltip` with smooth fade animation.

```typescript
import { Text, Tooltip } from '@chakra-ui/react'

interface Props {
  text: string
  word: string
  translate: string
}

export function HighlightedText({ text, word, translate }: Props) {
  const regex = new RegExp(`(${word})`, 'i')
  const parts = text.split(regex) // ['She drove her new ', 'car', ' to the...']

  return (
    <Text fontSize="xl" color="fg.default" lineHeight="tall" textAlign="center">
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Tooltip
            key={i}
            content={translate}
            openDelay={100}
            positioning={{ placement: 'top' }}
          >
            <Text
              as="mark"
              bg="transparent"
              color="brand.fg"
              fontWeight="bold"
              textDecoration="underline dotted"
              textUnderlineOffset="3px"
              cursor="help"
              display="inline"
            >
              {part}
            </Text>
          </Tooltip>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </Text>
  )
}
```

Tooltip animation is handled by Chakra UI v3's built-in `_open` / `_closed` animation on `TooltipContent`. The default fade is smooth.

---

### 4.4 Frontend — `CollectionSentencesPage`

**File:** `frontend/src/Pages/CollectionSentencesPage.tsx`

**Changes:**

1. Remove slider state (`currentIndex`, `setCurrentIndex`, navigation buttons, `< IconButton >`, counter text).
2. Remove `useEffect` that reset `currentIndex`.
3. Replace the `HStack gap={4} align="center"` slider structure with a `VStack` scrollable list.
4. Inside each card:
   - Remove `<Heading size="md">` that showed `sentence.word`.
   - Use `<HighlightedText>` instead of plain `<Text>`.
5. Expand card width to full content area (`maxW="860px" w="full"`).
6. Increase padding to `p={8}`.

**Success state JSX skeleton:**

```tsx
// success state — full-screen list
const sentences = state.sentences

return (
  <VStack gap={8} py={8} px={4} align="center" w="full">
    <Heading size="lg" color="fg.default">
      Предложения
    </Heading>

    <VStack gap={6} w="full" maxW="860px">
      {sentences.map((sentence) => (
        <Box
          key={sentence.id}
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="modal"
          shadow="card.default"
          w="full"
          p={8}
          textAlign="center"
        >
          <HighlightedText
            text={sentence.text}
            word={sentence.highLighted}
            translate={sentence.translate}
          />
        </Box>
      ))}
    </VStack>

    <Button variant="ghost" color="fg.muted" onClick={() => navigate(`/collections/${collectionId}`)}>
      К коллекции
    </Button>
  </VStack>
)
```

---

## 5. Security Considerations

| Risk | Mitigation |
|------|-----------|
| Regex injection in `HighlightedText` via `word` value from server | Escape special regex chars before constructing `RegExp`: `word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` |
| XSS through sentence text rendered into DOM | All values rendered as React children (not `dangerouslySetInnerHTML`) — safe by default |
| Unauthorized access to sentences | `auth` middleware already guards `GET /collections/:id/sentences` |

---

## 6. Acceptance Criteria

- [ ] `GET /collections/:id/sentences` returns `{ id, text, highLighted, translate }[]`
- [ ] `highLighted` is the word that actually appears in `text` (case-insensitive match against `frontText` or `RearText`)
- [ ] `translate` is the opposite side of the matched word
- [ ] Sentences page renders all cards in a vertical list (no prev/next buttons, no counter)
- [ ] Each card does NOT show a word heading above the sentence
- [ ] Sentence text font size is visually larger than before (`fontSize="xl"` or `2xl`)
- [ ] The matched word is visually highlighted (brand color, bold, dotted underline)
- [ ] Hovering the highlighted word shows a tooltip containing the translation
- [ ] Tooltip appears/disappears with a smooth fade animation (no abrupt show/hide)
- [ ] Regex special characters in the word are escaped (no runtime error)
- [ ] TypeScript strict mode: no `any`, no type errors
- [ ] ESLint passes with no new warnings
