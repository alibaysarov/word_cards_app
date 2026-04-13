import { Button, Input, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import BasicModal from './BasicModal'

interface AddCollectionModalProps {
  open: boolean
  onClose: () => void
  onSave: (name: string) => void
}

export default function AddCollectionModal({ open, onClose, onSave }: AddCollectionModalProps) {
  const [name, setName] = useState('')

  const handleSave = () => {
    if (name.trim()) {
      onSave(name)
      setName('')
      onClose()
    }
  }

  const handleClose = () => {
    setName('')
    onClose()
  }

  return (
    <BasicModal
      open={open}
      onClose={handleClose}
      title="Добавить коллекцию"
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
          placeholder="Введите название коллекции" 
          size="lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </VStack>
    </BasicModal>
  )
}
