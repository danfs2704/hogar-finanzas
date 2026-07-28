import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir, copyFile, access, stat } from 'fs/promises';
import { existsSync, constants } from 'fs';
import path from 'path';

function getConfigPath(): string {
  const dir = process.env.APP_DATA_DIR;
  if (dir) return path.join(dir, 'config.json');
  return path.join(process.cwd(), 'config.json');
}

function getCurrentDbPath(): string {
  const url = process.env.DATABASE_URL || '';
  const match = url.match(/^file:(.+)/);
  return match ? match[1] : path.join(process.cwd(), 'data.db');
}

function getDefaultDbDir(): string {
  const dir = process.env.APP_DATA_DIR;
  return dir || process.cwd();
}

// GET — return current DB file path
export async function GET() {
  try {
    const configPath = getConfigPath();
    let dbDir = getDefaultDbDir();

    if (existsSync(configPath)) {
      const raw = await readFile(configPath, 'utf-8');
      const config = JSON.parse(raw);
      if (config.dbPath) dbDir = config.dbPath;
    }

    const dbFile = path.join(dbDir, 'data.db');
    return NextResponse.json({ path: dbFile });
  } catch (error) {
    return NextResponse.json({ path: getCurrentDbPath() });
  }
}

// POST — change DB location
export async function POST(request: NextRequest) {
  try {
    const { path: newDir } = await request.json();
    if (!newDir) return NextResponse.json({ error: 'Ruta no especificada' }, { status: 400 });

    // Ensure target directory exists
    await mkdir(newDir, { recursive: true });

    const newDbPath = path.join(newDir, 'data.db');
    const existingDbInTarget = existsSync(newDbPath);
    const currentDbPath = getCurrentDbPath();

    if (existingDbInTarget) {
      // An existing DB was found at the target — use it
      console.log(`[db-path] Found existing data.db at ${newDbPath} — switching to it`);
    } else if (existsSync(currentDbPath)) {
      // No existing DB at target — copy current DB there
      await copyFile(currentDbPath, newDbPath);
      console.log(`[db-path] Copied ${currentDbPath} to ${newDbPath}`);
    }
    // else: neither exists — a new empty DB will be created when the app restarts

    // Save config
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);
    await mkdir(configDir, { recursive: true });

    await writeFile(configPath, JSON.stringify({ dbPath: newDir }, null, 2), 'utf-8');

    return NextResponse.json({ path: newDbPath, usedExisting: existingDbInTarget });
  } catch (error: any) {
    console.error('DB path change error:', error);
    return NextResponse.json({ error: error.message || 'Error al cambiar la ubicación' }, { status: 500 });
  }
}
