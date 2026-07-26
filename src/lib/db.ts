import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaReady: Promise<void> | undefined
}

// Helper: check if a column exists in a table
async function columnExists(prisma: PrismaClient, table: string, column: string): Promise<boolean> {
  try {
    const rows: { name: string }[] = await prisma.$queryRawUnsafe(
      `SELECT name FROM pragma_table_info('${table}') WHERE name = '${column}'`
    )
    return rows.length > 0
  } catch {
    return false
  }
}

// Helper: safely add a column only if it doesn't exist
async function addColumnIfMissing(prisma: PrismaClient, table: string, column: string, colDef: string) {
  if (await columnExists(prisma, table, column)) return
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${colDef}`)
    console.log(`[db] Added column ${table}.${column}`)
  } catch (err) {
    console.error(`[db] Failed to add column ${table}.${column}:`, err)
  }
}

// Helper: safely drop an index if it exists
async function dropIndexIfExists(prisma: PrismaClient, indexName: string) {
  try {
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${indexName}"`)
  } catch {
    // ignore
  }
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

  // 2) User — with username
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

async function ensureSchema(prisma: PrismaClient) {
  try {
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;')

    // Step 1: Create all tables that don't exist yet
    for (const sql of CREATE_TABLES_SQL) {
      try {
        await prisma.$executeRawUnsafe(sql)
      } catch (err) {
        console.error('[db] Error creating table:', (err as Error).message)
      }
    }

    // Step 2: Create unique index for User(username, householdId)
    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "User_username_householdId_key"
        ON "User" ("username", "householdId")
      `)
    } catch (err) {
      console.error('[db] Error creating User index:', (err as Error).message)
    }

    // Step 3: Migrate existing tables — add missing columns
    // User: add username if missing (old DBs may not have it)
    await addColumnIfMissing(prisma, 'User', 'username', "TEXT NOT NULL DEFAULT ''")
    // Populate username for users that don't have one
    try {
      await prisma.$executeRawUnsafe(`UPDATE "User" SET "username" = REPLACE(REPLACE("email", '@', '_'), '.', '_') WHERE "username" IS NULL OR "username" = ''`)
      await prisma.$executeRawUnsafe(`UPDATE "User" SET "username" = 'usuario_' || SUBSTR("id", 1, 8) WHERE "username" IS NULL OR "username" = ''`)
    } catch (err) {
      console.error('[db] Error populating username:', (err as Error).message)
    }
    // Drop old email+householdId unique index if exists
    await dropIndexIfExists(prisma, 'User_email_householdId_key')

    // Account: add type column if missing
    await addColumnIfMissing(prisma, 'Account', 'type', "TEXT NOT NULL DEFAULT 'bank'")

    // Category: add description column if missing
    await addColumnIfMissing(prisma, 'Category', 'description', 'TEXT')

    // Subcategory: add description column if missing
    await addColumnIfMissing(prisma, 'Subcategory', 'description', 'TEXT')

    // Transaction: add new columns if missing
    await addColumnIfMissing(prisma, 'Transaction', 'toAccountId', 'TEXT')
    await addColumnIfMissing(prisma, 'Transaction', 'memberId', 'TEXT')
    await addColumnIfMissing(prisma, 'Transaction', 'petId', 'TEXT')
    await addColumnIfMissing(prisma, 'Transaction', 'userId', 'TEXT')

    // Create index for toAccountId
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Transaction_toAccountId_idx" ON "Transaction" ("toAccountId")`)
    } catch {
      // ignore
    }

    console.log('[db] Schema verified — all tables and columns ensured.')
  } catch (err) {
    console.error('[db] Failed to ensure schema:', err)
    throw err
  }
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  // Run schema migration and store the promise so callers can await it
  const ready = ensureSchema(client)
  if (!globalForPrisma.__prismaReady) {
    globalForPrisma.__prismaReady = ready
  }

  return client
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Export a promise that resolves when schema is ready
export const dbReady = globalForPrisma.__prismaReady ?? ensureSchema(db)
