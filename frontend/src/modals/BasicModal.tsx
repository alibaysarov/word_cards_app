import { Dialog, Portal } from '@chakra-ui/react'
import type React from 'react'

interface BasicModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  transparent?: boolean
}

const BasicModal = ({ open, onClose, title, children, footer, transparent }: BasicModalProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg={transparent ? 'transparent' : 'bg.surface'}
            borderRadius="modal"
            boxShadow={transparent ? 'none' : 'modal'}
          >
            <Dialog.CloseTrigger />
            {title && (
              <Dialog.Header>
                <Dialog.Title color="fg.default">{title}</Dialog.Title>
              </Dialog.Header>
            )}
            <Dialog.Body>{children}</Dialog.Body>
            {footer && <Dialog.Footer>{footer}</Dialog.Footer>}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default BasicModal