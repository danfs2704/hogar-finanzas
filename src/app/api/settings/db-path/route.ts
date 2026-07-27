import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

function getConfigPath(): string {
  const dir = process.env.APP_DATA_DIR;
  if (dir) return path.join(dir, 'config.json');
  // Fallback for dev
  return path.join(process.cwd(), 'config.json');
}

function getCurrentDbPath(): string {
  const url = process.env.DATABASE_URL || '';
  // Extract path from "file:/path/to/data.db"
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
    // If config can't be read, return the env var path
    return NextResponse.json({ path: getCurrentDbPath() });
  }
}

// POST — change DB location (copy DB + save config)
export async function POST(request: NextRequest) {
  try {
    const { path: newDir } = await request.json();
    if (!newDir) return NextResponse.json({ error: 'Ruta no especificada' }, { status: 400 });

    // Ensure target directory exists
    await mkdir(newDir, { recursive: true });

    const currentDbPath = getCurrentDbPath();
    const newDbPath = path.join(newDir, 'data.db');

    // Copy current DB to new location if it exists
    if (existsSync(currentDbPath)) {
      await copyFile(currentDbPath, newDbPath);
    }

    // Save config
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);
    await mkdir(configDir, { recursive: true });

    await writeFile(configPath, JSON.stringify({ dbPath: newDir }, null, 2), 'utf-8');

    return NextResponse.json({ path: newDbPath });
  } catch (error: any) {
    console.error('DB path change error:', error);
    return NextResponse.json({ error: error.message || 'Error al cambiar la ubicación' }, { status: 500 });
  }
}
