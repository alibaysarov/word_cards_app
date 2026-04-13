---
description: "Use when creating or editing UI components, pages, or visual elements in the frontend. Covers the design system, color tokens, typography, spacing, responsive patterns, and component styling conventions."
applyTo: "frontend/src/**"
---

# Design System Conventions

## Design Philosophy

The WordCards design system is inspired by modern flashcard/learning apps like Quizlet and Flashcards.world:
- Clean, focused layouts that minimize visual noise
- Card-based UI patterns with subtle shadows and rounded corners
- Strong typography hierarchy for readability during learning
- Smooth micro-animations (card flips, hover lifts, transitions)
- Consistent spacing and alignment across all views

## Theme File

All design tokens are defined in `frontend/src/theme.ts` using Chakra UI v3's `createSystem` + `defineConfig`. This is the single source of truth for visual design.

## Color System

### Semantic Tokens (always use these)

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `bg.app` | Main page background | Page wrapper |
| `bg.surface` | Card/panel/modal backgrounds | Collection card, word card |
| `bg.muted` | Secondary backgrounds | Hover states, progress track |
| `bg.subtle` | Very light tint backgrounds | Subtle highlights |
| `fg.default` | Primary text | Headings, card front text |
| `fg.muted` | Secondary text | Descriptions, card back text |
| `fg.subtle` | Tertiary/hint text | Labels, metadata |
| `border.default` | Standard borders | Card borders, dividers |
| `border.muted` | Subtle borders | Secondary dividers |
| `brand.solid` | Primary brand color | Active nav item bg, primary buttons |
| `brand.contrast` | Text on brand backgrounds | Button text on brand bg |
| `brand.fg` | Brand-colored text/links | Links, logo text |
| `brand.muted` | Lighter brand shade | Hover tints |
| `brand.subtle` | Very light brand background | Add-card slot bg |
| `brand.emphasized` | Hover/active brand | Hover borders |
| `brand.focusRing` | Focus ring color | Keyboard focus indicators |
| `success.solid` | Success/correct/learned | Correct answer, progress |
| `success.fg` | Success text | "Learned" labels |
| `danger.solid` | Error/delete actions | Delete button |
| `danger.fg` | Error text | Error messages |

### Rules
- **Never** use raw hex values (`#4255ff`, `#fff`) in components.
- **Never** use Chakra palette colors directly (`blue.500`, `gray.200`) — always use semantic tokens.
- **Never** use `useColorModeValue` — semantic tokens resolve mode automatically.
- All semantic tokens automatically support light and dark mode via `_light`/`_dark` conditions in `theme.ts`.

## Typography

- Font stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Headings: `fonts.heading` token
- Body text: `fonts.body` token
- Use Chakra's `Heading` component with `size` prop for hierarchy (2xl, xl, lg, md, sm)
- Use Chakra's `Text` component for body content

## Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `card` | 12px | Word cards, collection cards |
| `button` | 8px | Buttons |
| `modal` | 16px | Modals, question cards |
| `pill` | 9999px | Badges, tags |

## Shadow Tokens

| Token | Usage |
|-------|-------|
| `card.default` | Default card shadow |
| `card.hover` | Elevated card shadow on hover |
| `modal` | Modal/dialog shadow |

## Component Patterns

### Buttons
Use Chakra recipe props — never style buttons with inline color props:
```tsx
// ✅ Correct
<Button colorPalette="brand" variant="solid">Save</Button>
<Button colorPalette="accent" variant="solid">Match</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost" color="fg.muted">Skip</Button>

// ❌ Wrong
<Button bg="blue.500" color="white" _hover={{ bg: "blue.600" }}>Save</Button>
```

### Cards (Word Cards, Collection Cards)
```tsx
<Box
  bg="bg.surface"
  borderWidth="1px"
  borderColor="border.default"
  borderRadius="card"
  boxShadow="card.default"
  _hover={{ borderColor: "brand.emphasized", boxShadow: "card.hover", transform: "translateY(-2px)" }}
  transition="all 0.2s"
>
```

### "Add" Placeholder Cards
```tsx
<Box
  borderWidth="2px"
  borderStyle="dashed"
  borderColor="brand.solid"
  bg="brand.subtle"
  _hover={{ bg: "brand.muted", borderColor: "brand.emphasized" }}
>
```

### Modals
Use BasicModal component which wraps Chakra v3 Dialog with semantic tokens.

### Card Flip Animation
The CardModal implements 3D flip using CSS perspective and backface-visibility. Pattern:
- Outer: `perspective: 1000px`
- Inner: `transformStyle: preserve-3d`, `transition: transform 0.6s`
- Front/Back faces: `position: absolute`, `backfaceVisibility: hidden`
- Back face has `transform: rotateY(180deg)`

## Responsive Design

### Breakpoints
| Name | Min Width | Target |
|------|-----------|--------|
| `base` | 0px | Mobile phones |
| `sm` | 480px | Large phones |
| `md` | 768px | Tablets, small laptops |
| `lg` | 1024px | Desktops |
| `xl` | 1280px | Large desktops |

### Layout Rules
- **Sidebar**: Fixed on desktop (≥md), drawer on mobile (<md)
- **Content area**: Full width on mobile, offset by sidebar width on desktop
- **Card grids**: Use responsive `templateColumns` — fewer columns on smaller screens
- **Test answer grids**: Single column on mobile, 2 columns on sm+
- **Touch targets**: Minimum 44×44px on mobile
- **Typography**: Remains readable at all breakpoints

### Responsive Prop Pattern
```tsx
// Use Chakra responsive objects
<Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}>
<Box p={{ base: 4, md: 6 }}>
<Box ml={{ base: 0, md: SIDEBAR_WIDTH }}>
```

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
The light theme uses a cool lavender-gray neutral scale:

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
