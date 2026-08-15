const fs = require('fs');
const path = require('path');

const logPath = process.env.NODE_LOG || path.join(process.cwd(), 'node.log');
const logDir = path.dirname(logPath);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logStream = fs.createWriteStream(logPath, { flags: 'a' });
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logStream.write(line + '\n');
}

log('Server starting...');
log('DATABASE_URL: ' + (process.env.DATABASE_URL || 'not set'));
log('NODE_ENV: ' + (process.env.NODE_ENV || 'not set'));
log('PORT: ' + (process.env.PORT || 'not set'));

// Override console.log and console.error to write to file
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;

console.log = function(...args) {
  origLog.apply(console, args);
  log('LOG: ' + args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
};
console.error = function(...args) {
  origError.apply(console, args);
  log('ERR: ' + args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
};
console.warn = function(...args) {
  origWarn.apply(console, args);
  log('WARN: ' + args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
};

// Catch unhandled errors
process.on('uncaughtException', (err) => {
  log('UNCAUGHT EXCEPTION: ' + err.message);
  log('Stack: ' + err.stack);
});

process.on('unhandledRejection', (reason) => {
  log('UNHANDLED REJECTION: ' + (reason instanceof Error ? reason.stack : String(reason)));
});

try {
  require('./server-original.js');
} catch (err) {
  log('SERVER FAILED: ' + err.message);
  log('Stack: ' + err.stack);
  process.exit(1);
}
