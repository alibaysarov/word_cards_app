import { Box, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import BasicModal from './BasicModal'

interface CardModalProps {
    open: boolean
    onClose: () => void
    frontText: string
    rearText: string
}

export default function CardModal({ open, onClose, frontText, rearText }: CardModalProps) {
    const [isFlipped, setIsFlipped] = useState(false)

    useEffect(() => {
        if (!open) {
            setIsFlipped(false)
        }
    }, [open])

    const handleClose = () => {
        setIsFlipped(false)
        onClose()
    }

    return (
        <BasicModal open={open} onClose={handleClose} transparent>
            <Box
                w='full'
                display='flex'
                justifyContent='center'
                py={{ base: '2', md: '4' }}
                css={{ perspective: '1000px' }}
            >
                <Box
                    role='button'
                    aria-label='Flip card'
                    tabIndex={0}
                    w={{ base: 'min(92vw, 320px)', sm: '360px', md: '440px' }}
                    maxW='full'
                    aspectRatio='4 / 3'
                    position='relative'
                    cursor='pointer'
                    transform={isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}
                    transition='transform 0.6s'
                    onClick={() => setIsFlipped((prev) => !prev)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setIsFlipped((prev) => !prev)
                        }
                    }}
                    css={{ transformStyle: 'preserve-3d' }}
                >
                    <Box
                        position='absolute'
                        inset={0}
                        display='flex'
                        alignItems='center'
                        justifyContent='center'
                        p='6'
                        textAlign='center'
                        bg='bg.surface'
                        color='fg.default'
                        borderRadius='card'
                        boxShadow='card.default'
                        css={{ backfaceVisibility: 'hidden' }}
                    >
                        <Text as='h2' fontWeight='800' fontSize={{ base: 'xl', md: '2xl' }}>
                            {frontText}
                        </Text>
                    </Box>

                    <Box
                        position='absolute'
                        inset={0}
                        display='flex'
                        alignItems='center'
                        justifyContent='center'
                        p='6'
                        textAlign='center'
                        bg='bg.surface'
                        color='fg.default'
                        borderRadius='card'
                        boxShadow='card.default'
                        css={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        <Text as='h2' fontWeight='800' fontSize={{ base: 'xl', md: '2xl' }}>
                            {rearText}
                        </Text>
                    </Box>
                </Box>
            </Box>
        </BasicModal>
    )
}