import { Box, Text } from "@chakra-ui/react"

import { Tooltip } from "./tooltip"

interface HighlightedTextProps {
  text: string
  word: string
  translate: string
}

export function HighlightedText({ text, word, translate }: HighlightedTextProps) {
  if (!word) {
    return (
      <Text fontSize="xl" color="fg.default" lineHeight="tall" textAlign="center">
        {text}
      </Text>
    )
  }

  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${escaped})`, "i")
  const parts = text.split(regex)

  return (
    <Text fontSize="xl" color="fg.default" lineHeight="tall" textAlign="center">
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Tooltip
            key={i}
            showArrow
            interactive
            content={
              <Box textAlign="center">
                <Text fontWeight="bold" fontSize="md">
                  {part}
                </Text>
                <Text fontSize="md">{translate}</Text>
              </Box>
            }
            contentProps={{
              bg: "brand.solid",
              color: "white",
              borderRadius: "button",
              px: 4,
              py: 3,
            }}
          >
            <Text
              as="mark"
              bg="transparent"
              color="brand.fg"
              fontWeight="bold"
              textDecoration="underline dotted"
              textUnderlineOffset="3px"
              cursor="pointer"
              display="inline"
            >
              {part}
            </Text>
          </Tooltip>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </Text>
  )
}
