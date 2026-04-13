import { Box, Flex, IconButton } from '@chakra-ui/react'
import Sidebar, { SIDEBAR_WIDTH } from './components/app/Sidebar'
import { ProfileMenu } from './components/app/ProfileMenu'
import { ColorModeButton } from './components/ui/color-mode'
import { LuMenu } from 'react-icons/lu'
import { useState } from 'react'
import { Outlet } from 'react-router'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <Box h="100vh" display="flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box
        flex={1}
        ml={{ base: 0, md: SIDEBAR_WIDTH }}
        bg="bg.app"
        h="100%"
        p={6}
        overflowY="auto"
      >
        <Flex direction="row" justify="space-between" align="center" mb={4}>
          <Box>
            <IconButton
              hideFrom="md"
              aria-label="Открыть меню"
              onClick={() => setSidebarOpen(true)}
              variant="ghost"
            >
              <LuMenu />
            </IconButton>
          </Box>
          <Flex align="center" gap={2}>
            <ColorModeButton />
            <ProfileMenu />
          </Flex>
        </Flex>
        <Outlet />
      </Box>
    </Box>
  )
}
