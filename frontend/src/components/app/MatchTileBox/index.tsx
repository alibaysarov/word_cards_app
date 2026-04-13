import { Box } from "@chakra-ui/react";
import type { GamePhase } from "../../../types/tests";
import type { MatchTile } from "../../../types/wordCard";


interface MatchTileProps {
    tile: MatchTile
    selectedTile: MatchTile | null
    phase: GamePhase
    handleTileClick: (tile: MatchTile) => void

}

const MatchTileBox = ({ tile, selectedTile, phase, handleTileClick }: MatchTileProps) => {
    const isSelected =
        selectedTile?.id === tile.id && selectedTile?.side === tile.side
    const isDisabled = tile.matched || tile.glowing || tile.shaking || phase !== 'playing'

    const borderColor = tile.glowing
        ? 'green.400'
        : tile.shaking
            ? 'red.500'
            : tile.matched
                ? 'accent.solid'
                : isSelected
                    ? 'brand.solid'
                    : 'border.default'

    const background = tile.glowing
        ? 'green.900/40'
        : tile.shaking
            ? 'red.subtle'
            : tile.matched
                ? 'accent.subtle'
                : isSelected
                    ? 'brand.subtle'
                    : 'bg.surface'
    return (
        <Box
            key={`${tile.id}-${tile.side}`}
            as="button"
            
            overflow="hidden"
            wordBreak="break-word"
            whiteSpace="normal"
            borderWidth="2px"
            borderColor={borderColor}
            bg={background}
            borderRadius="card"
            minH="56px"
            px={{ base: 2, md: 4 }}
            py={{ base: 2, md: 3 }}
            textAlign="center"
            color="fg.default"
            fontWeight="medium"
            cursor={isDisabled ? 'not-allowed' : 'pointer'}
            opacity={isDisabled ? 0.85 : 1}
            pointerEvents={isDisabled ? 'none' : 'auto'}
            transition="all 0.2s"
            aria-disabled={isDisabled}
            aria-pressed={isSelected}
            _hover={
                isDisabled
                    ? undefined
                    : {
                        borderColor: 'brand.emphasized',
                        boxShadow: 'card.hover',
                        transform: 'translateY(-1px)',
                    }
            }
            css={
                tile.glowing
                    ? {
                        animation: 'glow 0.5s ease-in-out',
                        '@keyframes glow': {
                            '0%': { transform: 'scale(1)' },
                            '50%': { transform: 'scale(1.05)' },
                            '100%': { transform: 'scale(1)' },
                        },
                    }
                    : tile.shaking
                        ? {
                            animation: 'shake 0.5s',
                            '@keyframes shake': {
                                '0%, 100%': { transform: 'translateX(0)' },
                                '20%, 60%': { transform: 'translateX(-6px)' },
                                '40%, 80%': { transform: 'translateX(6px)' },
                            },
                        }
                        : undefined
            }
            onClick={() => {
                if (!isDisabled) {
                    handleTileClick(tile)
                }
            }}
        >
            {tile.text}
        </Box>
    )
}

export default MatchTileBox;