const sql = require('mssql/msnodesqlv8');

// ===============================
// Database configuration
// ===============================
const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE || 'FoundryMES',

  driver: 'msnodesqlv8',

  options: {
    trustedConnection: true,
    trustServerCertificate: true
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ MSSQL Connected (Windows Auth)');
    return pool;
  })
  .catch(err => {
    console.error('❌ MSSQL Connection Error:', err);
    throw err;
  });

module.exports = {
  sql,
  poolPromise
};