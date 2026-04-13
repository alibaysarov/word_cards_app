import { Button, Input, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import BasicModal from './BasicModal'

interface AddCardModalProps {
  open: boolean
  onClose: () => void
  onSave: (frontText: string, rearText: string) => void
}

export default function AddCardModal({ open, onClose, onSave }: AddCardModalProps) {
  const [frontText, setFrontText] = useState('')
  const [rearText, setRearText] = useState('')

  const handleSave = () => {
    if (frontText.trim() && rearText.trim()) {
      onSave(frontText, rearText)
      setFrontText('')
      setRearText('')
      onClose()
    }
  }

  const handleClose = () => {
    setFrontText('')
    setRearText('')
    onClose()
  }

  return (
    <BasicModal
      open={open}
      onClose={handleClose}
      title="Добавить карточку"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button 
            colorPalette="brand"
            variant="solid"
            onClick={handleSave}
          >
            Сохранить
          </Button>
        </>
      }
    >
      <VStack gap={4} align="stretch">
        <Input 
          placeholder="Передняя сторона (например, Hello)" 
          size="lg"
          value={frontText}
          onChange={(e) => setFrontText(e.target.value)}
        />
        <Input 
          placeholder="Задняя сторона (например, Привет)" 
          size="lg"
          value={rearText}
          onChange={(e) => setRearText(e.target.value)}
        />
      </VStack>
    </BasicModal>
  )
}
