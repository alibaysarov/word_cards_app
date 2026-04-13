"use client"

import {
  Box,
  Drawer,
  Flex,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react"
import type { ComponentType } from "react"
import {
  LuHouse,
  LuInbox,
  LuVoicemail,
} from "react-icons/lu"
import { NavLink } from "react-router"

export const SIDEBAR_WIDTH = "280px"

const navItems = [
  { icon: LuHouse, label: "Главная", to: "/" },
  { icon: LuInbox, label: "Мои коллекции", badge: 4, to: "/collections" },
  { icon: LuVoicemail, label: "Тест аудио", to: "/test_audio" }
]

type SidebarItemProps = {
  icon: ComponentType<any>
  label: string
  to?: string
  badge?: number
  onClick?: () => void
}

function SidebarItem({ icon, label, to, badge, onClick }: SidebarItemProps) {
  const baseStyles = (isActive: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: 3,
    px: 4,
    py: 3,
    w: "full",
    borderRadius: "md",
    cursor: "pointer",
    bg: isActive ? "brand.solid" : "transparent",
    color: isActive ? "brand.contrast" : "fg.muted",
    fontWeight: isActive ? "semibold" : "normal",
    borderLeftWidth: isActive ? "4px" : "2px",
    borderLeftColor: isActive ? "brand.solid" : "transparent",
    transition: "background-color 0.15s ease, color 0.15s ease",
    textDecoration: "none",
  })

  const hoverStyles = (isActive: boolean) => ({
    bg: isActive ? "brand.emphasized" : "bg.muted",
    color: isActive ? "brand.contrast" : "fg.default",
  })

  const activeStyles = (isActive: boolean) => ({
    bg: isActive ? "brand.emphasized" : "bg.subtle",
  })

  const focusStyles = {
    outline: "2px solid",
    outlineColor: "brand.focusRing",
    outlineOffset: "2px",
  }

  const content = (
    <>
      <Icon as={icon} boxSize={5} />
      <Text flex={1} textAlign="left">
        {label}
      </Text>
      {badge && (
        <Box
          bg="brand.solid"
          color="brand.contrast"
          fontSize="xs"
          fontWeight="bold"
          px={2}
          py={0.5}
          borderRadius="full"
        >
          {badge}
        </Box>
      )}
    </>
  )

  if (to) {
    return (
      <NavLink to={to} style={{ textDecoration: "none" }}>
        {({ isActive }) => (
          <Flex
            {...baseStyles(isActive)}
            _hover={hoverStyles(isActive)}
            _active={activeStyles(isActive)}
            _focusVisible={focusStyles}
          >
            {content}
          </Flex>
        )}
      </NavLink>
    )
  }

  return (
    <Flex
      as="button"
      {...baseStyles(false)}
      _hover={hoverStyles(false)}
      _active={activeStyles(false)}
      _focusVisible={focusStyles}
      onClick={onClick}
    >
      {content}
    </Flex>
  )
}

function SidebarContent() {
  return (
    <Box
      w="full"
      h="full"
      bg="bg.surface"
      borderRight="1px"
      borderColor="border.default"
      py={6}
      px={3}
      display="flex"
      flexDirection="column"
      overflowY="hidden"
    >
      {/* Logo */}
      <Box px={4} mb={8}>
        <Text fontSize="xl" fontWeight="bold" color="brand.fg">
          WordCards
        </Text>
      </Box>

      {/* Nav items */}
      <VStack gap={2} align="stretch" flex={1}>
        {navItems.map((item) => (
          <SidebarItem key={item.label} {...item} />
        ))}
      </VStack>
    </Box>
  )
}

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      <Box
        hideBelow="md"
        position="fixed"
        left={0}
        top={0}
        w={SIDEBAR_WIDTH}
        h="100vh"
      >
        <SidebarContent />
      </Box>

      <Drawer.Root
        open={isOpen}
        onOpenChange={(e) => {
          if (!e.open) {
            onClose()
          }
        }}
        placement="start"
      >
        <Drawer.Backdrop hideFrom="md" />
        <Drawer.Positioner hideFrom="md">
          <Drawer.Content w={SIDEBAR_WIDTH} maxW={SIDEBAR_WIDTH}>
            <Drawer.CloseTrigger />
            <Drawer.Body p={0}>
              <SidebarContent />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </>
  )
}