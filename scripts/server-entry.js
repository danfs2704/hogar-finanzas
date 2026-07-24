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

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOSTNAME = process.env.HOSTNAME || '127.0.0.1';

async function start() {
  console.log(`[Server] Starting on ${HOSTNAME}:${PORT}...`);
  console.log(`[Server] DATABASE_URL: ${process.env.DATABASE_URL || 'not set'}`);
  console.log(`[Server] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

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
