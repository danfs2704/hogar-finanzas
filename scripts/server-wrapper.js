console.log('[Hogar] Server starting...');
console.log('[Hogar] DATABASE_URL:', process.env.DATABASE_URL || 'not set');
try {
  require('./server-original.js');
} catch (err) {
  console.error('[Hogar] Server failed:', err.message);
  process.exit(1);
}
