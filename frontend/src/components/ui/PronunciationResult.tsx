import { Box, Text } from '@chakra-ui/react';
import type { WordMatch } from '../../utils/compareSentence';

interface PronunciationResultProps {
  results: WordMatch[];
}

export function PronunciationResult({ results }: PronunciationResultProps) {
  const total = results.length;
  const correctCount = results.filter((r) => r.matched).length;

  return (
    <Box aria-live="polite">
      <Text>
        {results.map((r, i) => (
          <Text
            key={i}
            as="span"
            mr="1"
            color={r.matched ? 'green.600' : 'red.500'}
            fontWeight={r.matched ? 'bold' : 'normal'}
            textDecoration={!r.matched ? 'underline' : 'none'}
            textDecorationStyle={!r.matched ? 'wavy' : 'solid'}
          >
            {r.word}
          </Text>
        ))}
      </Text>
      <Text color="fg.muted" fontSize="sm" mt="3">
        Правильно: {correctCount} / {total} слов
      </Text>
    </Box>
  );
}
