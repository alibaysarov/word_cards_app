# Migration Safety Checklist

Review every generated `migration.sql` file against this checklist before committing or applying.

---

## 1. Destructive Operations — Require Explicit Approval

| SQL pattern | Risk | Required action |
|-------------|------|-----------------|
| `DROP TABLE` | Permanent data loss | Confirm data is no longer needed; backup first |
| `DROP COLUMN` | Permanent data loss | Must be separated from code that still reads the column |
| `TRUNCATE` | Permanent data loss | Should never appear in a migration |
| `ALTER TABLE ... RENAME COLUMN` | Breaks running queries | Deploy code that handles both names first |
| `ALTER TABLE ... RENAME TO` | Breaks all references | Full deploy coordination required |

**Rule**: Never combine a destructive operation with additive operations in the same migration. Split into two migrations.

**Rule**: Before creating new table or altering existing one add check for existence `IF NOT EXISTS` / `IF EXISTS`.

---

## 2. Data-Type Changes

- Widening (e.g. `INT` → `BIGINT`) is safe.
- Narrowing (e.g. `TEXT` → `VARCHAR(50)`) can truncate existing data — verify all values fit.
- Changing from nullable to `NOT NULL` requires a default or a data backfill step **before** the constraint is added.

---

## 3. Foreign Key Constraints

- Verify that referenced rows exist before adding an FK constraint.
- `ON DELETE CASCADE` is powerful — confirm that cascading deletes are the intended behavior.
- `ON DELETE SET NULL` requires the FK column to be nullable.

---

## 4. Never in Migrations

- `INSERT`/`UPDATE`/`DELETE` of large datasets — do this in a separate data script, not a migration.
- Application-level secrets or environment values.
- `prisma migrate reset` in production — this drops and recreates the entire database.

---

## 5. No Raw SQL in Application Code

This checklist covers migration SQL files (which are inherently SQL). However, **application code must never use raw SQL** — always use Prisma Client methods. If you need a complex query, use Prisma's `findMany`, `groupBy`, `aggregate`, or nested `include`/`select`.
