---
name: prisma-db
description: 'Workflow skill for PostgreSQL + Prisma ORM tasks: adding models, writing migrations, seeding data, running schema changes safely, fixing drift, and reviewing migration history.'
argument-hint: "e.g. add timestamps to Collection model"
---

# Prisma + PostgreSQL Workflow

## When to Use

- Adding or modifying a Prisma model or relation
- Creating a migration
- Seeding or re-seeding the database
- Resolving migration drift or failed migrations
- Integrating a new model into an Express service

---

## Key Rules

- **Never write raw SQL queries.** Always use Prisma Client methods (`findMany`, `create`, `update`, etc.).
- **All commands run inside Docker.** Never run `npm` or `npx prisma` on the host machine.
- **Schema location:** `backend/prisma/schema.prisma`

---

## Commands

All commands must be executed inside the backend Docker container:

| Task | Command |
|------|---------|
| Generate client | `docker compose -f docker-compose.local.yml exec backend npx prisma generate` |
| Create migration | `docker compose -f docker-compose.local.yml exec backend npx prisma migrate dev --name <descriptive-name>` |
| Check migration status | `docker compose -f docker-compose.local.yml exec backend npx prisma migrate status` |
| Seed database | `docker compose -f docker-compose.local.yml exec backend npx prisma db seed` |
| Reset database | `docker compose -f docker-compose.local.yml exec backend npx prisma migrate reset` — **requires user confirmation** |

Migration names should be imperative and descriptive: `add-collection-timestamps`, `add-user-email-index`. Never use generic names like `migration1` or `update`.

---

## Procedures

### A. Add or Modify a Model

1. **Edit `backend/prisma/schema.prisma`.**
   - Follow the [schema patterns reference](./references/schema-patterns.md).
   - Use `uuid(7)` with `@db.Uuid` for IDs.

2. **Create the migration** (inside Docker):
   ```bash
   docker compose -f docker-compose.local.yml exec backend npx prisma migrate dev --name <descriptive-name>
   ```

3. **Review the generated SQL** in `backend/prisma/migrations/<timestamp>_<name>/migration.sql` before committing.
   - Follow the [migration safety checklist](./references/migration-safety.md).

4. **Update frontend types** in `frontend/src/types/` to reflect the new model shape.

5. **Update the controller/service layer** in `backend/src/controllers/` to use the new model via the Prisma client.

---

### B. Seed the Database

1. Edit or create `backend/prisma/seed.ts`.
2. Use `upsert` with deterministic `where` clauses so seeding is idempotent.
3. Run:
   ```bash
   docker compose -f docker-compose.local.yml exec backend npx prisma db seed
   ```

---

### C. Resolve Migration Drift

1. Check current state:
   ```bash
   docker compose -f docker-compose.local.yml exec backend npx prisma migrate status
   ```
2. If migrations were applied manually to the DB but not recorded:
   ```bash
   docker compose -f docker-compose.local.yml exec backend npx prisma migrate resolve --applied <migration-name>
   ```
3. Never run `prisma migrate reset` in production or against shared databases — confirm with the user first.

---

### D. Integrate Model into Express Service

1. Import the singleton Prisma client:
   ```ts
   import { prisma } from '../prisma'
   ```
2. Use the client in controllers — never instantiate `new PrismaClient()` inline.
3. Use `select` or `include` explicitly — never return the full Prisma object to avoid leaking fields (e.g., `password`).
4. **Never use raw SQL** (`prisma.$queryRaw`, `prisma.$executeRaw`). Always use Prisma Client query methods.

---

## References

- [Schema patterns](./references/schema-patterns.md) — model templates, relations, indexes
- [Migration safety checklist](./references/migration-safety.md) — review criteria before committing migrations
