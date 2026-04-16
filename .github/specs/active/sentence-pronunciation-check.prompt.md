---
agent: Spec Executor
model: Claude Sonnet 4.5 (copilot)
description: "Microphone-based pronunciation check on the Sentences page: record speech, transcribe via GPT-4o, compare word-by-word with the target sentence and highlight matches"
---

# Feature: Sentence Pronunciation Check

## 1. Overview

Currently the **Sentences** page (`/collections/:id/sentences`) shows sentence cards with a highlighted vocabulary word and its translation. There is no way for the user to practise pronunciation.

The **Audio Lesson** page (`/collections/:id/audio_lesson`) uses browser TTS to read words aloud — it is output-only and gives no feedback on the user's own pronunciation.

This feature adds an **inline pronunciation exercise** to each sentence card on the Sentences page:

1. A microphone icon button appears below every sentence.
2. The user clicks it to start recording, reads the sentence aloud, then clicks Stop.
3. The recording is sent to the existing backend transcription endpoint.
4. The transcribed text is compared word-by-word with the original sentence.
5. A result panel renders the original sentence with **each word individually coloured**:
   - **Green / brand** — word was correctly pronounced (found in transcription).
   - **Red / error** — word was missed or mispronounced.
6. The user can retry as many times as they want.

---

## 2. Architecture / Flow

```
User                         Frontend                           Backend
 │                               │                                  │
 │  clicks mic button             │                                  │
 │──────────────────────────────>│                                  │
 │                               │  getUserMedia({ audio: true })   │
 │                               │─────────────────────┐            │
 │                               │  MediaRecorder       │            │
 │  speaks sentence              │                      │            │
 │──────────────────────────────>│                      │            │
 │  clicks stop                  │                      │            │
 │──────────────────────────────>│  stop() → Blob       │            │
 │                               │<────────────────────┘            │
 │                               │                                  │
 │                               │  POST /api/audio/transcribe      │
 │                               │  FormData { audio: Blob }        │
 │                               │─────────────────────────────────>│
 │                               │                                  │  multer saves file
 │                               │                                  │  AudioTestService.getTextFromSpeech()
 │                               │                                  │  → GPT-4o-audio-preview
 │                               │                                  │  → ffmpeg conversion (if needed)
 │                               │  { text: "transcribed string" }  │
 │                               │<─────────────────────────────────│
 │                               │                                  │
 │                               │  compareSentence(original, text) │
 │                               │  → WordMatchResult[]             │
 │                               │                                  │
 │  coloured word-by-word result │                                  │
 │<──────────────────────────────│                                  │
```

---

## 3. New File Structure

```
backend/src/
  controllers/
    AudioController.ts           ← UPDATED  (add transcribe method)
  routes/
    audio.ts                     ← UPDATED  (add POST /transcribe route)

frontend/src/
  hooks/
    useAudioRecorder.ts          ← NEW  (extracted + typed recording hook)
  components/
    app/
      SentencePronunciationCard/ ← NEW
        index.tsx                ← NEW  (sentence card + mic + result panel)
        useSentencePronunciation.ts  ← NEW  (orchestration hook)
    ui/
      PronunciationResult.tsx    ← NEW  (word-by-word coloured text)
  utils/
    compareSentence.ts           ← NEW  (pure comparison function)
  api/
    voiceTests.api.ts            ← UPDATED  (add transcribeAudio function)
  Pages/
    CollectionSentencesPage.tsx  ← UPDATED  (replace inline Box with SentencePronunciationCard)
```

---

## 4. Step-by-Step Specification

### 4.1 Backend — New Route `POST /api/audio/transcribe`

Add a dedicated transcription endpoint alongside the existing `/test_message`.  
`/test_message` stays untouched (dev/test usage).

**`AudioController.ts`** — add method:

```ts
async transcribe(req: Request, res: Response) {
    const { userId } = req;
    if (!userId) throw new AuthError();
    if (!req.file) throw new ServerError("No audio file received");

    const text = await AudioTestService.getTextFromSpeech(req.file.path);
    res.json({ text });
}
```

**`routes/audio.ts`** — add route after existing routes:

```ts
router.post(
    '/transcribe',
    auth,
    upload.single("audio"),    // reuse existing multer instance
    voiceMessageValidation,
    AudioController.transcribe
);
```

No Prisma changes. No new migrations.

---

### 4.2 Frontend — `compareSentence.ts` (pure utility)

Location: `frontend/src/utils/compareSentence.ts`

**Purpose:** compare two strings at the word level. Returns an array of objects — one per word in the *original* sentence — with a boolean `matched` flag.

```ts
export interface WordMatch {
    word: string      // original word as it appears in the sentence (preserves case/punctuation for display)
    matched: boolean
}

/**
 * Normalise a word for comparison: lowercase, strip leading/trailing punctuation.
 */
function normalise(word: string): string {
    return word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "")
}

/**
 * Compare `original` sentence with `transcription` word by word.
 *
 * Algorithm: sequential greedy match.
 * Walk through originalTokens; for each token look for a match in a
 * sliding window of ±2 positions in transcriptionTokens. Mark used
 * positions to avoid double-counting.
 */
export function compareSentence(original: string, transcription: string): WordMatch[] {
    const originalTokens = original.trim().split(/\s+/)
    const transTokens = transcription.trim().split(/\s+/).map(normalise)
    const used = new Array<boolean>(transTokens.length).fill(false)

    return originalTokens.map((token, i) => {
        const norm = normalise(token)
        // Search window centred on position i, ±3 tokens
        const start = Math.max(0, i - 3)
        const end = Math.min(transTokens.length, i + 4)
        for (let j = start; j < end; j++) {
            if (!used[j] && transTokens[j] === norm) {
                used[j] = true
                return { word: token, matched: true }
            }
        }
        return { word: token, matched: false }
    })
}
```

---

### 4.3 Frontend — `useAudioRecorder.ts` (shared hook)

Location: `frontend/src/hooks/useAudioRecorder.ts`

Extract and generalise the recording logic currently inlined in `AudioRecord/index.tsx`. The hook returns:

```ts
export type RecorderStatus = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

export interface UseAudioRecorderReturn {
    status: RecorderStatus
    start: () => Promise<void>
    stop: () => void
    reset: () => void
}
```

Implementation requirements:
- `start()` calls `navigator.mediaDevices.getUserMedia({ audio: true })` and starts `MediaRecorder`.
- Chunks are collected in a `useRef<Blob[]>`.
- `stop()` finalises the recording, assembles the blob, calls the provided `onRecordingComplete` callback with the `Blob`.
- `reset()` sets status back to `'idle'` and clears state.
- The hook accepts a callback: `onRecordingComplete: (blob: Blob) => Promise<void>`.
- Status transitions: `idle → recording → uploading → done | error`.
- Releases microphone tracks on stop and on unmount (`useEffect` cleanup).

```ts
export function useAudioRecorder(
    onRecordingComplete: (blob: Blob) => Promise<void>
): UseAudioRecorderReturn
```

---

### 4.4 Frontend — `voiceTests.api.ts` (add transcribeAudio)

Add alongside `uploadVoiceMessage`:

```ts
export interface TranscribeResponse {
    text: string
}

export async function transcribeAudio(form: FormData): Promise<TranscribeResponse> {
    const response = await httpClient.post<TranscribeResponse>('/audio/transcribe', form)
    return response.data
}
```

---

### 4.5 Frontend — `PronunciationResult.tsx` (UI component)

Location: `frontend/src/components/ui/PronunciationResult.tsx`

Renders the word-by-word comparison result inline, using semantic tokens:

```ts
interface PronunciationResultProps {
    results: WordMatch[]
}

export function PronunciationResult({ results }: PronunciationResultProps)
```

Rendering rules:
- Each word is a `<Text as="span">` wrapped in an outer `<Text>` so it flows naturally.
- `matched === true` → `color="green.600"` (or `fg.success` if token exists in theme) + `fontWeight="bold"`
- `matched === false` → `color="red.500"` (or `fg.error`) + `textDecoration="underline"` + `textDecorationStyle="wavy"`
- A summary line below the words: `"Правильно: X / Y слов"` in `fg.muted`.
- No external dependencies beyond Chakra UI.

---

### 4.6 Frontend — `useSentencePronunciation.ts` (component-local hook)

Location: `frontend/src/components/app/SentencePronunciationCard/useSentencePronunciation.ts`

Orchestrates the full flow for one sentence card:

```ts
export interface UseSentencePronunciationReturn {
    recorderStatus: RecorderStatus
    results: WordMatch[] | null
    start: () => Promise<void>
    stop: () => void
    reset: () => void
}

export function useSentencePronunciation(sentenceText: string): UseSentencePronunciationReturn
```

Internal logic:
1. Defines `handleBlob(blob: Blob)`:
   - Builds `FormData` with `blob` appended as `"audio"` named `"recording.webm"`.
   - Calls `transcribeAudio(form)`.
   - Calls `compareSentence(sentenceText, response.text)`.
   - Sets `results` state with the `WordMatch[]`.
2. Passes `handleBlob` to `useAudioRecorder`.
3. `reset()` clears `results` and delegates to recorder reset.

---

### 4.7 Frontend — `SentencePronunciationCard/index.tsx` (component)

Replaces the inline `<Box>` in `CollectionSentencesPage`. Props:

```ts
interface SentencePronunciationCardProps {
    sentence: Sentence   // { id, text, highLighted, translate }
}

export function SentencePronunciationCard({ sentence }: SentencePronunciationCardProps)
```

Layout (top → bottom, all inside the existing `bg="bg.surface"` card box):

```
┌─────────────────────────────────────────────┐
│  <HighlightedText />  (sentence text)        │
│                                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                              │
│  [🎤 Произнести]  or  [⏹ Остановить]        │
│                                              │
│  (Spinner while uploading)                   │
│                                              │
│  <PronunciationResult results={results} />   │
│  (only shown after result is ready)          │
│                                              │
│  [Повторить] (only after result, ghost btn)  │
└─────────────────────────────────────────────┘
```

Accessibility:
- Mic button: `aria-label="Начать запись произношения"` / `"Остановить запись"`.
- Result section: `aria-live="polite"` on the wrapper `<Box>`.

---

### 4.8 Frontend — `CollectionSentencesPage.tsx` (update)

Replace the inner `<Box>` sentence block:

```tsx
// BEFORE
<Box key={sentence.id} bg="bg.surface" ... p={8} textAlign="center">
    <HighlightedText ... />
</Box>

// AFTER
<SentencePronunciationCard key={sentence.id} sentence={sentence} />
```

No other changes to this file.

---

## 5. Security Considerations

| Risk | Mitigation |
|------|-----------|
| Unauthenticated transcription (API cost) | `auth` middleware on `POST /audio/transcribe` — same as existing endpoint |
| Oversized file upload | Existing multer limit of 20 MB retained; no change needed |
| Non-audio file upload | Existing `fileFilter` (`mimetype.startsWith("audio/")`) retained |
| OPENAI_API_KEY exposure | Key lives in `process.env` only; validated at service startup with the existing guard |
| Prompt injection via audio content | Audio is transcribed as literal speech; transcription is only compared to the sentence string client-side — no LLM call uses the transcription as a prompt |
| Microphone permission not granted | `getUserMedia` throws; `useAudioRecorder` catches, sets status `error`, shows user-facing error message |
| Blob URL memory leak | `URL.revokeObjectURL` called in `useEffect` cleanup or on reset inside the hook |

---

## 6. Acceptance Criteria

- [ ] `POST /api/audio/transcribe` exists, requires authentication, accepts `multipart/form-data` with field `audio`, returns `{ text: string }`
- [ ] Existing `POST /api/audio/test_message` still works unchanged
- [ ] `compareSentence("Hello world", "hello world")` returns `[{ word: "Hello", matched: true }, { word: "world", matched: true }]`
- [ ] `compareSentence("The cat sat", "the dog sat")` returns matched=true for "The" and "sat", matched=false for "cat"
- [ ] Each sentence card on `/collections/:id/sentences` shows a microphone icon button
- [ ] Clicking the mic button starts recording (button changes to Stop icon, red colour)
- [ ] Clicking Stop uploads the recording; a spinner is shown during upload
- [ ] After upload, the original sentence is rendered word-by-word with green/red colouring
- [ ] The summary line shows correct count, e.g. "Правильно: 4 / 6 слов"
- [ ] "Повторить" button resets the card to initial state
- [ ] If microphone permission is denied, an error message is shown inside the card (no crash)
- [ ] Multiple sentence cards operate independently (recording on card A does not affect card B)
- [ ] The page is responsive: mic button and result panel are readable on mobile (320px)
- [ ] `useAudioRecorder` releases microphone tracks on component unmount
