---
agent: agent
model: Claude Sonnet 4.5 (copilot)
description: "Add light/dark theming with OS preference detection, updated cool-tone light palette, and a theme toggle button in the app shell"
---

# App Theming — Implementation Spec

## 1. Overview

The application already has the semantic token infrastructure (Chakra UI v3 `_light`/`_dark` conditions, `next-themes` installed, `ColorModeProvider` and `ColorModeButton` in place). However three things are missing:

| Gap | Current state | Target state |
|---|---|---|
| OS/browser preference not used | `ColorModeProvider` has no `defaultTheme` → defaults to `"light"` | `defaultTheme="system"` — respects the user's OS preference on first visit |
| Toggle not exposed in the UI | `ColorModeButton` exists but is mounted nowhere | Rendered in the top-right header area of `App.tsx` |
| Light theme palette is warm/beige | `neutral.*` tokens are warm (`#f8f7f5`, `#f0efec`) | Cool lavender-gray palette matching the provided screenshot (`#f5f5fc`, `#eeeef9` …) |

Additionally, the current box-shadow values are hardcoded with a single rgba colour that looks fine in light mode but is visually wrong in dark mode. The spec replaces them with a mode-aware approach via CSS variables.

The `design.instructions.md` must also be updated to document the two-theme approach so future components are written correctly from the start.

---

## 2. Architecture / Flow

```
Browser OS preference (prefers-color-scheme)
         │
         ▼
next-themes ThemeProvider
  defaultTheme="system"
  enableSystem (default: true)
  attribute="class"          ← writes "dark" / "light" on <html>
         │
         ▼
ChakraProvider (Chakra UI v3)
  reads the class on <html>
  resolves _light / _dark semantic token values
         │
         ▼
All components use semantic tokens
  bg="bg.app"  →  light: #f5f5fc  /  dark: neutral.950
  bg="bg.surface" →  light: #fff  /  dark: neutral.900
  etc.

User clicks ColorModeButton (in App.tsx header)
  → useColorMode().toggleColorMode()
  → next-themes writes new class to <html>
  → all semantic tokens re-resolve automatically
  → no component code changes needed
```

---

## 3. File Structure

```
frontend/
  src/
    theme.ts                                       ← UPDATED  (neutral palette + shadow tokens)
    App.tsx                                        ← UPDATED  (add ColorModeButton to header)
    components/
      ui/
        color-mode.tsx                             ← UPDATED  (add defaultTheme="system", remove disableTransitionOnChange)
  .github/
    instructions/
      design.instructions.md                      ← UPDATED  (document dual-theme rules, updated palette)
```

No new files are needed — the required primitives already exist.

---

## 4. Step-by-Step Specification

---

### 4.1 Fix `ColorModeProvider` — enable OS preference detection

**File:** `frontend/src/components/ui/color-mode.tsx`

The `ColorModeProvider` component must pass `defaultTheme="system"` to `next-themes`' `ThemeProvider`. This makes the app respect the user's OS preference on the very first visit (or when no stored preference exists in `localStorage`).

`disableTransitionOnChange` should also be removed so theme switches animate smoothly with CSS transitions.

**Before:**
```tsx
export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange {...props} />
  )
}
```

**After:**
```tsx
export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem {...props} />
  )
}
```

> `enableSystem` is the `next-themes` prop that activates `prefers-color-scheme` listening. It is `true` by default in recent versions of `next-themes` but must be made explicit here because `defaultTheme="system"` alone does not guarantee reactive OS-preference listening in all versions.

---

### 4.2 Update neutral palette — cool lavender-gray

**File:** `frontend/src/theme.ts`

Replace the warm-beige `neutral` scale with a cool blue-gray scale that matches the screenshot's overall tone (light lavender background, white card surfaces).

**Light-mode visual targets from the screenshot:**
- Page background (`bg.app`): soft lavender-gray, approx `#f5f5fc`
- Card surface (`bg.surface`): white or near-white, approx `#ffffff`
- Borders: barely visible cool gray

**Replace** the `neutral` token block inside `tokens.colors`:

```typescript
neutral: {
  50:  { value: "#f5f5fc" },   // page bg (light)
  100: { value: "#eeeef9" },   // surface highlight
  200: { value: "#d9daf0" },   // muted bg / hover
  300: { value: "#b8bae2" },   // subtle border
  400: { value: "#9296d0" },   // muted border
  500: { value: "#6b6fb8" },   // mid-tone
  600: { value: "#5557a0" },   // muted fg
  700: { value: "#40427e" },   // secondary text
  800: { value: "#2e305b" },   // dark surface (dark mode)
  900: { value: "#1d1e3c" },   // dark card (dark mode)
  950: { value: "#0f1020" },   // darkest bg (dark mode)
},
```

#### 4.2.1 Update `bg.surface` semantic token

Because the light surface should be pure white (rather than `neutral.100`, which is now `#eeeef9`), update the semantic token:

```typescript
bg: {
  app: {
    value: { _light: "{colors.neutral.50}", _dark: "{colors.neutral.950}" },
  },
  surface: {
    value: { _light: "white", _dark: "{colors.neutral.900}" },  // ← white in light mode
  },
  muted: {
    value: { _light: "{colors.neutral.200}", _dark: "{colors.neutral.800}" },
  },
  subtle: {
    value: { _light: "{colors.neutral.100}", _dark: "{colors.neutral.900}" },
  },
},
```

#### 4.2.2 Update shadow tokens — mode-aware

The current shadows use a hardcoded deep-blue rgba that is invisible in dark mode. Replace them with two variants using CSS variable semantics:

```typescript
shadows: {
  card: {
    default: {
      value: {
        _light: "0 2px 8px rgba(40, 42, 120, 0.08)",
        _dark:  "0 2px 8px rgba(0, 0, 0, 0.40)",
      },
    },
    hover: {
      value: {
        _light: "0 8px 24px rgba(40, 42, 120, 0.14)",
        _dark:  "0 8px 24px rgba(0, 0, 0, 0.56)",
      },
    },
  },
  modal: {
    value: {
      _light: "0 16px 40px rgba(40, 42, 120, 0.18)",
      _dark:  "0 16px 40px rgba(0, 0, 0, 0.64)",
    },
  },
},
```

> Chakra UI v3 semantic token conditions (`_light`, `_dark`) work for any token type, including shadows.

---

### 4.3 Add `ColorModeButton` to the app shell header

**File:** `frontend/src/App.tsx`

Place the `ColorModeButton` to the left of the `ProfileMenu` in the top-right action area. This gives users a persistent, discoverable way to override the system theme.

```tsx
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
```

The `ColorModeButton` renders a sun/moon icon that rotates between modes. It is already implemented in `color-mode.tsx` — this change only mounts it.

---

### 4.4 Update `design.instructions.md`

**File:** `frontend/.github/instructions/design.instructions.md`

The instructions file must be updated to:
1. Document the system-preference-first approach
2. Specify the new cool-tone neutral palette values
3. Expand the dark mode section with explicit dos/don'ts for component authors

#### Changes to make:

**In the "Color System → Semantic Tokens" table** — no changes needed (tokens are already correct).

**In the "Rules" block under Color System**, add:

```markdown
### Rules
- **Never** use raw hex values (`#4255ff`, `#fff`) in components.
- **Never** use Chakra palette colors directly (`blue.500`, `gray.200`) — always use semantic tokens.
- **Never** use `useColorModeValue` — semantic tokens resolve mode automatically.
- All semantic tokens automatically support light and dark mode via `_light`/`_dark` conditions in `theme.ts`.
```

**Replace the entire "Dark Mode" section** with:

```markdown
## Dark Mode

### Theme Detection
- The app reads the user's OS/browser `prefers-color-scheme` preference on first load via `next-themes` (`defaultTheme="system"`).
- The user can override the detected preference at any time using the `ColorModeButton` in the app header.
- The chosen override is stored in `localStorage` (`"theme"` key) and takes priority over OS preference on subsequent visits.
- Resetting `localStorage` restores OS-preference detection.

### Authoring Components for Two Themes
- Use **only semantic tokens** (`bg.surface`, `fg.default`, `brand.solid`, etc.) — these resolve to the correct value automatically per mode.
- **Never** hardcode colors with raw hex, Chakra palette direct references, or `useColorModeValue`.
- Shadows must also use token references: `boxShadow="card.default"` (not an inline `rgba(…)` string).
- Test every new component in both light and dark mode before merging.

### Theme Palette — Light Mode
The light theme uses a cool lavender-gray neutral scale inspired by the product screenshot:

| Token | Value | Role |
|-------|-------|------|
| `neutral.50` | `#f5f5fc` | Page background |
| `neutral.100` | `#eeeef9` | Subtle tint |
| `neutral.200` | `#d9daf0` | Muted background, hover states |
| `neutral.300` | `#b8bae2` | Subtle borders |
| `bg.surface` | `white` | Card / panel background |

### Theme Palette — Dark Mode
| Token | Value | Role |
|-------|-------|------|
| `neutral.950` | `#0f1020` | Page background |
| `neutral.900` | `#1d1e3c` | Card / panel background |
| `neutral.800` | `#2e305b` | Muted surface |
| `neutral.700` | `#40427e` | Secondary text / muted fg |
```

---

## 5. Security Considerations

| Risk | Mitigation |
|---|---|
| Theme preference stored in `localStorage` — could be tampered | `next-themes` only reads `"light"` or `"dark"` as valid values; any other value falls back to `defaultTheme="system"` |
| `prefers-color-scheme` media query unavailable (old browser) | `next-themes` falls back gracefully to light mode |
| Flash of wrong theme on initial page load (FOUC) | `next-themes` injects a blocking inline `<script>` into `<head>` that applies the class before React hydrates, preventing FOUC |
| CSS transition on theme change could expose a timing side-channel | Cosmetic only — no sensitive data is involved |

---

## 6. Acceptance Criteria

### System Theme Detection
- [ ] On first visit with no stored preference and OS set to dark mode, the app renders in dark mode
- [ ] On first visit with no stored preference and OS set to light mode, the app renders in light mode
- [ ] Changing the OS theme while the app is open switches the theme in real time (no page reload)

### Manual Toggle
- [ ] A sun/moon icon button is visible in the top-right header on all pages
- [ ] Clicking the button switches between light and dark mode
- [ ] The chosen mode persists across page reloads (stored in `localStorage`)
- [ ] Clearing `localStorage` restores OS-preference detection

### Light Theme Palette
- [ ] The page background in light mode is a cool lavender-gray (`#f5f5fc`), not warm beige
- [ ] Card surfaces in light mode are white
- [ ] All text, border, and shadow colors are visible with sufficient contrast in light mode

### Dark Theme
- [ ] All card/panel backgrounds in dark mode use `#1d1e3c` (neutral.900)
- [ ] Shadows are visible in dark mode (use the dark-mode shadow variant)
- [ ] No components hard-code a color that breaks in dark mode

### Design Instructions
- [ ] `design.instructions.md` documents the system-preference approach
- [ ] `design.instructions.md` forbids `useColorModeValue` with clear rationale
- [ ] `design.instructions.md` documents both light and dark neutral palette values

### Component Audit — No `useColorModeValue` usage
- [ ] A search across `frontend/src/` for `useColorModeValue` returns zero results (excluding `color-mode.tsx` where it is defined as a utility for legacy use)
- [ ] A search for raw hex values (`#[0-9a-fA-F]{3,6}`) in component files returns zero results
