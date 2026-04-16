export interface WordMatch {
  word: string;
  matched: boolean;
}

function normalise(word: string): string {
  return word.toLowerCase().replace(/^[^a-zа-яё0-9]+|[^a-zа-яё0-9]+$/gi, "");
}

export function compareSentence(original: string, transcription: string): WordMatch[] {
  const originalTokens: string[] = original.trim() === "" ? [] : original.split(/\s+/);
  const transcriptionTokens: string[] =
    transcription.trim() === "" ? [] : transcription.split(/\s+/).map(normalise);
  const used: boolean[] = new Array<boolean>(transcriptionTokens.length).fill(false);

  return originalTokens.map((token: string, i: number): WordMatch => {
    const normalisedToken: string = normalise(token);
    const start: number = Math.max(0, i - 3);
    const endExclusive: number = Math.min(transcriptionTokens.length, i + 4);

    for (let j = start; j < endExclusive; j += 1) {
      if (!used[j] && transcriptionTokens[j] === normalisedToken) {
        used[j] = true;
        return { word: token, matched: true };
      }
    }

    return { word: token, matched: false };
  });
}
