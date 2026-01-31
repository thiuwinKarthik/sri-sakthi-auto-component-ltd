// NOTE: We require 'mssql/msnodesqlv8' specifically for Windows Authentication
const sql = require('mssql/msnodesqlv8'); 


const config = {
  server: process.env.DB_SERVER || 'localhost', 
  database: process.env.DB_NAME || 'FoundryMES',
  
  // ✅ IMPORTANT: If your previous port was 1143, set it here.
  // (The default is usually 1433, but 1143 is fine if that's how your SQL Server is configured)
  port: 1433, 

  driver: 'msnodesqlv8', // This tells it to use Windows Auth

  options: {
    trustedConnection: true, // ✅ True = No username/password needed
    trustServerCertificate: true, // Helps avoid SSL errors on local setups
  },
};

const connectDB = async () => {
  try {
    // We pass the config to the connect function
    await sql.connect(config);
    console.log("✅ MSSQL Connected (Windows Auth)");
  } catch (err) {
    console.error("❌ DB Connection Failed:", err.message);
    // Optional: Log the full error to see details if it fails
    // console.error(err); 
  }
};

module.exports = { sql, connectDB };