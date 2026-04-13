# Word Cards App — Workspace Instructions

This is a **fullstack project** for a Word Cards flashcard application built with React, Express, and TypeScript.

## Project Structure

```
frontend/        # React + Vite frontend
backend/         # Express backend
.github/         # Instructions, skills, prompts
```

## TypeScript

- `strict: true` is required in all `tsconfig.json` files. Never disable strict mode.
- Prefer explicit return types on exported functions.
- Use `type` for data shapes, `interface` for extendable contracts (e.g., request/response).
- Never use `any`. Use `unknown` + type guards or generics instead.
- Use `satisfies` operator to validate object literals against types without widening.

## Conventions

- All environment variables must be validated at startup. Fail fast if required vars are missing.
- Use `npm` as the package manager. Do not use `pnpm` or `yarn`.
- ESLint is enforced. No custom overrides without justification.

## Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| React components | PascalCase file + named export | `CollectionsPage.tsx` |
| Hooks | `use` prefix, camelCase | `useSidebarDrawer.ts` |
| Express controllers | PascalCase + Controller suffix | `AuthController.ts` |
| Express routes | kebab-case | `collections.ts` |
| Types | PascalCase, suffix with domain | `CardModalData`, `ApiError` |
| Constants | SCREAMING_SNAKE_CASE | `SIDEBAR_WIDTH` |

## Design System

- The custom theme is defined in `frontend/src/theme.ts` using Chakra UI v3.
- See `.github/instructions/design.instructions.md` for the full design system reference.
- Always use **semantic tokens** (`bg.surface`, `fg.default`, `brand.solid`) — never hardcode colors.
- Use Chakra recipe props (`colorPalette`, `variant`) for buttons and badges.

## Error Handling

- Use a discriminated union `Result<T, E>` pattern for business logic errors; reserve thrown errors for truly exceptional/unrecoverable cases.
- Never expose internal error details (stack traces, DB errors) to the client.

## Environment Variables

- Duplicate variables to `.env.example`
- Use envs for secrets and necessary values

## npm Commands

- Execute them in related docker compose containers
- Do not run npm without docker