const { PGlite } = require('@electric-sql/pglite');
const { createServer } = require('pglite-server');
const path = require('path');

const dataDir = path.join(__dirname, '../../.pgdata');
const db = new PGlite(dataDir);
const server = createServer(db);

const PORT = 5432;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[PGlite Server] Local PostgreSQL wire-protocol server listening on port ${PORT}`);
  console.log(`[PGlite Server] Data stored in: ${dataDir}`);
});

process.on('SIGINT', () => {
  console.log('Stopping PGlite server...');
  server.close(() => process.exit(0));
});

