import { NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';

export async function GET() {
  try {
    await dbReady;
    const tables = await db.$queryRawUnsafe(
      `SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name`
    ) as { name: string; sql: string }[];

    const tableDetails: Record<string, { columns: string[]; missing: string[] }> = {};
    const expected: Record<string, string[]> = {
      User: ['id', 'email', 'username', 'password', 'name', 'role', 'isActive', 'householdId', 'createdAt', 'updatedAt'],
      Account: ['id', 'name', 'type', 'currency', 'balance', 'color', 'icon', 'isActive', 'householdId', 'createdAt', 'updatedAt'],
      Category: ['id', 'name', 'type', 'icon', 'color', 'description', 'isDefault', 'householdId', 'createdAt', 'updatedAt'],
      Subcategory: ['id', 'name', 'icon', 'color', 'description', 'categoryId', 'isDefault', 'createdAt', 'updatedAt'],
      Transaction: ['id', 'type', 'amount', 'description', 'date', 'notes', 'householdId', 'accountId', 'toAccountId', 'categoryId', 'subcategoryId', 'memberId', 'petId', 'userId', 'createdAt', 'updatedAt'],
      HouseholdMember: ['id', 'name', 'isMinor', 'avatar', 'notes', 'householdId', 'createdAt', 'updatedAt'],
      Pet: ['id', 'name', 'species', 'breed', 'avatar', 'notes', 'householdId', 'createdAt', 'updatedAt'],
    };

    for (const table of tables) {
      const cols = await db.$queryRawUnsafe(`PRAGMA table_info("${table.name}")`) as { name: string }[];
      const colNames = cols.map(c => c.name);
      const exp = expected[table.name];
      tableDetails[table.name] = {
        columns: colNames,
        missing: exp ? exp.filter(e => !colNames.includes(e)) : [],
      };
    }

    // Check for expected tables that don't exist
    const existingTables = tables.map(t => t.name);
    for (const [name, expCols] of Object.entries(expected)) {
      if (!existingTables.includes(name)) {
        tableDetails[name] = { columns: [], missing: expCols };
      }
    }

    // Try a simple query
    let userCount = 0;
    let accountCount = 0;
    try {
      const r = await db.$queryRawUnsafe('SELECT COUNT(*) as c FROM "User"') as { c: number }[];
      userCount = r[0]?.c || 0;
    } catch (e) {
      tableDetails['User'].missing.push(`query error: ${(e as Error).message}`);
    }
    try {
      const r = await db.$queryRawUnsafe('SELECT COUNT(*) as c FROM "Account"') as { c: number }[];
      accountCount = r[0]?.c || 0;
    } catch (e) {
      tableDetails['Account'].missing.push(`query error: ${(e as Error).message}`);
    }

    return NextResponse.json({
      dbPath: process.env.DATABASE_URL || 'not set',
      tables: tableDetails,
      userCount,
      accountCount,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Debug failed', detail: (error as Error).message, stack: (error as Error).stack }, { status: 500 });
  }
}
