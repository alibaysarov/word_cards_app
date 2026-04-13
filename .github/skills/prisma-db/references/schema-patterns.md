# Prisma Schema Patterns

Reference templates for common model patterns in this project.

---

## Datasource & Generator

```prisma
generator client {
  provider = "prisma-client"
  url      = env("DB_URL")
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

---

## ID Strategy

Use `uuid(7)` with `@db.Uuid` for all primary keys:

```prisma
id String @id @default(uuid(7)) @db.Uuid
```

---

## Base Fields

Include `createdAt` and `updatedAt` on models that need timestamp tracking:

```prisma
model Example {
  id        String   @id @default(uuid(7)) @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## One-to-Many Relation

```prisma
model Collection {
  id        String     @id @default(uuid(7)) @db.Uuid
  name      String
  userId    String     @db.Uuid
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  user      User       @relation(fields: [userId], references: [id])
  wordCards WordCard[]
}

model WordCard {
  id           String     @id @default(uuid(7)) @db.Uuid
  frontText    String
  RearText     String
  collectionId String     @db.Uuid
  collection   Collection @relation(fields: [collectionId], references: [id])
}
```

---

## No Raw SQL

**Never use raw SQL queries.** Always use Prisma Client methods:

```ts
// ✅ Correct
const collections = await prisma.collection.findMany({
  where: { userId },
  orderBy: { updatedAt: 'desc' },
  include: { _count: { select: { wordCards: true } } }
})

// ❌ Wrong — never do this
const result = await prisma.$queryRaw`SELECT * FROM "Collection" WHERE ...`
```

---

## Query Patterns

### Counting related records
```ts
await prisma.collection.findMany({
  include: { _count: { select: { wordCards: true } } }
})
```

### Pagination
```ts
await prisma.collection.findMany({
  take: limit,
  skip: offset,
  orderBy: { updatedAt: 'desc' }
})
```

### Upsert (for seeding)
```ts
await prisma.user.upsert({
  where: { login: 'admin' },
  update: {},
  create: { login: 'admin', password: hashedPassword }
})
```
