// NOTE: We require 'mssql/msnodesqlv8' specifically for Windows Authentication
const sql = require('mssql/msnodesqlv8');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'FoundryMES',
  port: 1433,
  driver: 'msnodesqlv8', // Windows Auth

  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

// Global connect (used by existing controllers via sql.query`...`)
const connectDB = async () => {
  try {
    await sql.connect(config);
    console.log("✅ MSSQL Connected (Windows Auth)");
  } catch (err) {
    console.error("❌ DB Connection Failed:", err.message);
  }
};

// Pool promise (used by new controllers that need pool.request().query())
let _pool = null;
const poolPromise = new Promise(async (resolve, reject) => {
  try {
    const pool = await new sql.ConnectionPool(config).connect();
    _pool = pool;
    resolve(pool);
  } catch (err) {
    reject(err);
  }
});

module.exports = { sql, connectDB, poolPromise };