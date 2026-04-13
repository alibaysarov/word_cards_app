---
description: "Use when creating or editing React components, hooks, pages, or frontend UI code in frontend/. Covers component patterns, state management, Chakra UI styling, responsive layouts, and Vite/React conventions."
applyTo: "frontend/**"
---

# React Frontend Conventions

## Component Rules

- Use **functional components only** — no class components.
- Every component must be a **named export** in a PascalCase file (e.g., `ChatWindow.tsx`). Never use default exports for components.
- Co-locate component-specific styles, tests, and sub-components in the same folder as the component.
- Extract any logic over ~20 lines into a custom hook in the same folder, named `use<Component>.ts`.
- Reusable UI components must live in `frontend/src/components/` and page-specific components must live alongside the page that owns them.
- Prefer composition over duplication: if a component or element pattern is reused in more than one feature, extract it into a shared component.
- Shared primitives should be designed as **polymorphic components** when the underlying element may vary (`button`, `a`, `div`, etc.).

```tsx
// ✅ correct
export function ChatMessage({ message }: ChatMessageProps) { ... }

// ❌ wrong
export default function ChatMessage(...) { ... }
```

## Reusable & Polymorphic Components

- Build reusable primitives for repeated UI patterns: buttons, text, surface/card, input wrappers, modal shells, list items, avatars, badges, stacks, grids, and containers.
- If a shared component may need to render different tags, support an `as` prop with properly typed polymorphic props.
- Shared components must expose variants through typed props (`size`, `tone`, `align`, `gap`, `columns`, etc.) instead of ad-hoc class overrides from call sites.
- Keep page files focused on composition; move reusable presentation and layout logic into shared components.

```tsx
type BoxProps<T extends React.ElementType> = {
  as?: T;
  padding?: 'sm' | 'md' | 'lg';
} & React.ComponentPropsWithoutRef<T>;

export function Box<T extends React.ElementType = 'div'>({ as, padding = 'md', ...props }: BoxProps<T>) {
  const Component = as ?? 'div';
  return <Component {...props} />;
}
```

## Hooks

- Custom hooks live in `frontend/src/hooks/` (shared) or alongside the component (local).
- Hooks must start with `use` and return typed objects, not positional arrays (except where idiomatic—e.g., `useState`).
- Never fetch data directly in a component body — always delegate to a hook.

## State Management

- Prefer local state (`useState`, `useReducer`) and context for simple shared state.
- Use a dedicated state library (e.g., Zustand or Jotai) only if global state grows beyond 2–3 contexts.
- Keep server state (chat history, user info) separate from UI state (modal open, input value).

## Streaming Chat Rendering

- AI responses arrive as a stream; render tokens incrementally using `ReadableStream` or SSE.
- Buffer streamed tokens in a `ref`, flush to state with `useCallback` on each chunk.
- Show a blinking cursor while streaming; hide it on completion or error.

```tsx
// Pattern for streaming into state
const [content, setContent] = useState('');
const bufferRef = useRef('');

onChunk((chunk) => {
  bufferRef.current += chunk;
  setContent(bufferRef.current);  // triggers re-render per chunk
});
```

## Forms & Validation

- Use `react-hook-form` + Zod resolver for all forms. Import shared schemas where available.
- Never write inline validation logic — always reference the shared Zod schema.

## Environment Variables

- Access only via `import.meta.env.VITE_*`.
- Validate at app startup in `src/env.ts` using Zod; throw if required vars are absent.

```ts
// src/env.ts
import { z } from 'zod';
const envSchema = z.object({ VITE_API_URL: z.string().url() });
export const env = envSchema.parse(import.meta.env);
```

## Styling

- Use **Chakra UI style props** as the primary styling approach for components.
- Reference semantic tokens from `frontend/src/theme.ts` instead of hardcoding color values (e.g., use `color="fg.default"` not `color="gray.800"`).
- Never use raw hex color values or Chakra palette colors directly — always use semantic tokens (`bg.surface`, `fg.muted`, `brand.solid`, etc.).
- No inline `style` props unless animating dynamic numeric values.
- Use Chakra's responsive prop syntax for responsive design: `{{ base: "value", md: "value", lg: "value" }}`.

## Theming

- The custom theme is defined in `frontend/src/theme.ts` using Chakra UI v3's `createSystem` and `defineConfig`.
- All design tokens (colors, fonts, radii, shadows) are centralized in the theme file.
- Use semantic tokens that support light/dark mode automatically (e.g., `bg.app`, `bg.surface`, `fg.default`, `fg.muted`, `brand.solid`, `brand.fg`).
- Components must consume semantic tokens, not raw palette values (`blue.500`, `gray.200`).
- Button, Input, and Badge components have recipe overrides in the theme — use `colorPalette` and `variant` props instead of inline color props.
- For dark mode, semantic tokens handle the switch automatically via `_light`/`_dark` conditions — no need for `useColorModeValue` in new code.

## Responsive Design

- Use Chakra UI responsive prop objects as the primary responsive mechanism: `{{ base: "value", sm: "value", md: "value", lg: "value" }}`.
- The sidebar collapses to a drawer on mobile (below `md` breakpoint).
- Every page, shared component, and major UI element must have responsive behaviour for desktop, tablet, and mobile.
- Design mobile and tablet states intentionally — do not rely on desktop styles collapsing automatically.
- Validate layouts at common breakpoints at minimum: mobile (`320-767px`), tablet (`768-1023px`), desktop (`1024px+`).
- Components must remain usable on touch devices: sufficient spacing, readable typography, and tap targets of at least `44x44px`.
- Do not hardcode widths/heights that break on smaller screens; prefer fluid sizing, wrapping, and responsive variants.

## Layout Components

- Layout primitives such as `Container`, `Stack`, `Inline`, `Grid`, `Flex`, `Section`, and page shells must be extracted into reusable shared components when reused.
- Layout primitives must support responsive variants through props instead of one-off page CSS.
- Layout primitives should also be polymorphic where it improves reuse, for example `Container` rendering as `section`, `main`, or `div`.
- Keep spacing, alignment, columns, and direction configurable with typed props so pages compose layout declaratively.

```tsx
export function Grid<T extends React.ElementType = 'div'>({
  as,
  columns = 'auto',
  gap = 'md',
  ...props
}: GridProps<T>) {
  const Component = as ?? 'div';
  return <Component {...props} />;
}
```

## Accessibility

- Every interactive element needs an accessible label (`aria-label`, `aria-labelledby`, or visible text).
- Use semantic HTML (`<button>`, `<nav>`, `<main>`) over `<div>` with click handlers.
