import { Avatar, Flex, HStack, Icon, Menu, Portal, Text } from "@chakra-ui/react"
import { LuLogOut, LuUser } from "react-icons/lu"
import { useNavigate } from "react-router"
import { useAuth } from "../../../hooks/useAuth"

export function ProfileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (user === null) {
    return null
  }

  const initial = user.login.trim().charAt(0).toUpperCase() || "?"

  const handleProfileClick = () => {
    navigate("/profile")
  }

  const handleLogoutClick = async () => {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <HStack gap={2} cursor="pointer">
          <Avatar.Root size="sm">
            <Avatar.Fallback>{initial}</Avatar.Fallback>
          </Avatar.Root>
          <Text
            display={{ base: "none", md: "block" }}
            color="fg.default"
            maxW="160px"
            truncate
          >
            {user.login}
          </Text>
        </HStack>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content bg="bg.surface">
            <Menu.Item value="profile" onClick={handleProfileClick} color="fg.default">
              <Flex align="center" gap={2}>
                <Icon as={LuUser} color="fg.muted" boxSize={4} />
                <Text color="fg.default">Профиль</Text>
              </Flex>
            </Menu.Item>

            <Menu.Separator />

            <Menu.Item value="logout" onClick={handleLogoutClick} color="fg.default">
              <Flex align="center" gap={2}>
                <Icon as={LuLogOut} color="fg.muted" boxSize={4} />
                <Text color="fg.default">Выйти</Text>
              </Flex>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
