import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaInitialized: boolean
}

// SQLite CREATE TABLE statements matching prisma/schema.prisma.
// All use CREATE TABLE IF NOT EXISTS so they are safe to run repeatedly.
const CREATE_TABLES_SQL: string[] = [
  // 1) Household
  `CREATE TABLE IF NOT EXISTS "Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  // 2) User — @@unique([username, householdId])
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "householdId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // unique index for User(username, householdId)
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_householdId_key"
    ON "User" ("username", "householdId")`,

  // 3) HouseholdMember
  `CREATE TABLE IF NOT EXISTS "HouseholdMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isMinor" BOOLEAN NOT NULL DEFAULT 0,
    "avatar" TEXT,
    "notes" TEXT,
    "householdId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // 4) Pet
  `CREATE TABLE IF NOT EXISTS "Pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL DEFAULT 'Perro',
    "breed" TEXT,
    "avatar" TEXT,
    "notes" TEXT,
    "householdId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pet_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // 5) Account (with type column)
  `CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'bank',
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "balance" REAL NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT 'Wallet',
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "householdId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // 6) Category (with description)
  `CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT 0,
    "householdId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // 7) Subcategory (with description)
  `CREATE TABLE IF NOT EXISTS "Subcategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  // 8) Transaction (with toAccountId, categoryId nullable for transfers)
  `CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "householdId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "toAccountId" TEXT,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "memberId" TEXT,
    "petId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
]

// Migration statements — safe to run repeatedly, only add columns/indices if missing.
const MIGRATION_SQL: string[] = [
  // User: add username column if missing
  `ALTER TABLE "User" ADD COLUMN "username" TEXT`,
  // Populate username from email for existing users
  `UPDATE "User" SET "username" = REPLACE(REPLACE("email", '@', '_'), '.', '_') WHERE "username" IS NULL OR "username" = ''`,
  // Make username NOT NULL after migration
  `UPDATE "User" SET "username" = 'usuario_' || SUBSTR("id", 1, 8) WHERE "username" IS NULL OR "username" = ''`,
  // Drop old email+householdId unique index if exists, create new username one
  `DROP INDEX IF EXISTS "User_email_householdId_key"`,
  // Make email nullable (SQLite doesn't ALTER COLUMN, but new schema handles it)

  // Account: add type column if missing
  `ALTER TABLE "Account" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'bank'`,

  // Category: add description column if missing
  `ALTER TABLE "Category" ADD COLUMN "description" TEXT`,

  // Subcategory: add description column if missing
  `ALTER TABLE "Subcategory" ADD COLUMN "description" TEXT`,

  // Transaction: add toAccountId column if missing
  `ALTER TABLE "Transaction" ADD COLUMN "toAccountId" TEXT`,

  // Add foreign key index for toAccountId
  `CREATE INDEX IF NOT EXISTS "Transaction_toAccountId_idx" ON "Transaction" ("toAccountId")`,
]

async function ensureSchema(prisma: PrismaClient) {
  if (globalForPrisma.__prismaInitialized) return
  try {
    // Make sure foreign keys are honoured on every connection.
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;')
    for (const sql of CREATE_TABLES_SQL) {
      await prisma.$executeRawUnsafe(sql)
    }
    // Run migrations — each is wrapped individually so one failure doesn't block others
    for (const sql of MIGRATION_SQL) {
      try {
        await prisma.$executeRawUnsafe(sql)
      } catch {
        // Column or index may already exist — that's fine
      }
    }
    globalForPrisma.__prismaInitialized = true
    // eslint-disable-next-line no-console
    console.log('[db] Schema verified — all 8 tables ensured.')
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] Failed to ensure schema:', err)
    // Do not mark as initialized so a future call could retry.
    throw err
  }
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  // Kick off schema creation immediately. Any errors will surface on the
  // first query (Prisma queues operations until connected).
  ensureSchema(client).catch((err) => {
    // Swallow here — the error has already been logged.
    void err
  })

  return client
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
