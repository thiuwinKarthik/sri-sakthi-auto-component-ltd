const { sql, connectDB } = require('./db.js');

async function migrate() {
    await connectDB();
    console.log('Creating custom column tables...');

    // 1. Custom Columns definition table
    await sql.query(`
        IF OBJECT_ID('DISACustomColumns', 'U') IS NULL
        CREATE TABLE DISACustomColumns (
            id          INT IDENTITY(1,1) PRIMARY KEY,
            columnName  NVARCHAR(200) NOT NULL,
            displayOrder INT DEFAULT 0,
            isDeleted   BIT DEFAULT 0,
            createdAt   DATETIME DEFAULT GETDATE()
        )
    `);
    console.log('✅ DISACustomColumns OK');

    // 2. Per-record values table
    await sql.query(`
        IF OBJECT_ID('DISACustomColumnValues', 'U') IS NULL
        CREATE TABLE DISACustomColumnValues (
            id          INT IDENTITY(1,1) PRIMARY KEY,
            recordId    INT NOT NULL,
            columnId    INT NOT NULL,
            value       NVARCHAR(MAX),
            CONSTRAINT FK_DISAColVal_Record FOREIGN KEY (recordId) REFERENCES DISASettingAdjustmentRecord(id) ON DELETE CASCADE,
            CONSTRAINT FK_DISAColVal_Column FOREIGN KEY (columnId) REFERENCES DISACustomColumns(id)
        )
    `);
    console.log('✅ DISACustomColumnValues OK');

    // 3. Drop adminNote if it was added previously (clean up)
    await sql.query(`
        IF EXISTS (
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'DISASettingAdjustmentRecord' 
              AND COLUMN_NAME = 'adminNote'
        )
        ALTER TABLE DISASettingAdjustmentRecord DROP COLUMN adminNote
    `);
    console.log('✅ adminNote column removed (replaced by dynamic system)');

    console.log('\n🎉 Custom column migration complete!');
    process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
