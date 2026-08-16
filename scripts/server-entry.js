/**
 * Production server entry point for Tauri desktop app
 * This file gets copied into the bundled "server" directory
 * and is started by the Tauri Rust code.
 *
 * It simply starts the Next.js standalone server with the correct
 * PORT, HOSTNAME, and DATABASE_URL environment variables.
 */

const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOSTNAME = process.env.HOSTNAME || '127.0.0.1';

// --- File-based DB lock for OneDrive/shared folder scenarios ---
function getDbDir() {
  const dbUrl = process.env.DATABASE_URL || '';
  // DATABASE_URL format: "file:C:/path/to/data.db"
  const match = dbUrl.match(/^file:(.+)/);
  if (match) {
    return path.dirname(match[1]);
  }
  return null;
}

function getLockFilePath() {
  const dir = getDbDir();
  return dir ? path.join(dir, 'data.db.lock') : null;
}

function getDeviceName() {
  return os.hostname();
}

function createFileLock() {
  const lockPath = getLockFilePath();
  if (!lockPath) return;
  try {
    const lockData = {
      device: getDeviceName(),
      pid: process.pid,
      lockedAt: new Date().toISOString(),
      heartbeatAt: new Date().toISOString(),
    };
    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), 'utf8');
    console.log(`[Lock] File lock created at ${lockPath}`);
  } catch (err) {
    console.error('[Lock] Error creating file lock:', err.message);
  }
}

function removeFileLock() {
  const lockPath = getLockFilePath();
  if (!lockPath) return;
  try {
    if (fs.existsSync(lockPath)) {
      // Only delete if we own it (same device + PID)
      const content = fs.readFileSync(lockPath, 'utf8');
      const lockData = JSON.parse(content);
      if (lockData.device === getDeviceName() && lockData.pid === process.pid) {
        fs.unlinkSync(lockPath);
        console.log('[Lock] File lock removed');
      }
    }
  } catch (err) {
    console.error('[Lock] Error removing file lock:', err.message);
  }
}

// Update heartbeat in lock file every 30 seconds
let heartbeatTimer = null;
function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    const lockPath = getLockFilePath();
    if (!lockPath) return;
    try {
      if (fs.existsSync(lockPath)) {
        const content = fs.readFileSync(lockPath, 'utf8');
        const lockData = JSON.parse(content);
        if (lockData.device === getDeviceName() && lockData.pid === process.pid) {
          lockData.heartbeatAt = new Date().toISOString();
          fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), 'utf8');
        }
      }
    } catch { /* ignore */ }
  }, 30_000);
}

async function start() {
  console.log(`[Server] Starting on ${HOSTNAME}:${PORT}...`);
  console.log(`[Server] DATABASE_URL: ${process.env.DATABASE_URL || 'not set'}`);
  console.log(`[Server] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

  // Create file lock next to the database
  createFileLock();
  startHeartbeat();

  // Import the Next.js server
  let next;
  try {
    next = require('next/dist/server/next-server').default;
  } catch {
    // Try alternate import path for newer Next.js versions
    next = require('./server.js');
  }

  const app = next({
    dev: false,
    dir: __dirname,
    hostname: HOSTNAME,
    port: PORT,
  });

  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[Server] Error handling request:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  });

  server.listen(PORT, HOSTNAME, () => {
    console.log(`[Server] Ready on http://${HOSTNAME}:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Server] Shutting down...');
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    removeFileLock();
    server.close(() => {
      console.log('[Server] Closed.');
      process.exit(0);
    });
    // Force exit after 5 seconds
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
