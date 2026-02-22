const { sql, connectDB } = require('./db');

async function createTable() {
    await connectDB();
    try {
        await sql.query`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
      CREATE TABLE Users (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Username NVARCHAR(50) NOT NULL UNIQUE,
        Password NVARCHAR(255) NOT NULL,
        Role NVARCHAR(20) NOT NULL CHECK (Role IN ('HOD', 'HOF', 'OPERATOR')),
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `;
        console.log('✅ Users table created or already exists.');
    } catch (err) {
        console.error('❌ Error creating table:', err.message);
    } finally {
        process.exit(0);
    }
}

createTable();
