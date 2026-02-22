const { sql, connectDB } = require('./db.js');

async function migrate() {
    await connectDB();
    console.log('Starting migration...');

    // =============================================
    // 1. UNPOURED MOULD TABLES
    // =============================================
    await sql.query(`
    IF OBJECT_ID('UnpouredMould_Master', 'U') IS NULL
    CREATE TABLE UnpouredMould_Master (
      MasterId INT IDENTITY(1,1) PRIMARY KEY,
      Department NVARCHAR(MAX),
      ReasonName NVARCHAR(MAX),
      SlNo INT,
      IsDeleted BIT DEFAULT 0
    )
  `);
    console.log('✅ UnpouredMould_Master OK');

    await sql.query(`
    IF OBJECT_ID('UnpouredMould_Trans', 'U') IS NULL
    CREATE TABLE UnpouredMould_Trans (
      TransId INT IDENTITY(1,1) PRIMARY KEY,
      RecordDate DATE,
      DisaMachine NVARCHAR(50),
      Shift INT,
      MasterId INT,
      Quantity INT,
      LastUpdated DATETIME DEFAULT GETDATE()
    )
  `);
    console.log('✅ UnpouredMould_Trans OK');

    const mouldCount = await sql.query(`SELECT COUNT(*) as cnt FROM UnpouredMould_Master`);
    if (mouldCount.recordset[0].cnt === 0) {
        await sql.query(`
      INSERT INTO UnpouredMould_Master (Department, ReasonName, SlNo) VALUES 
      ('MOULDING', 'PATTERN CHANGE', 1),
      ('MOULDING', 'HEAT CODE CHANGE', 2),
      ('MOULDING', 'MOULD BROKEN', 3),
      ('MOULDING', 'AMC CLEANING', 4),
      ('MOULDING', 'MOULD CRUSH', 5),
      ('MOULDING', 'CORE FALLING', 6),
      ('SAND PLANT', 'SAND DELAY', 7),
      ('SAND PLANT', 'DRY SAND', 8),
      ('PREESPOUR', 'NOZZLE CHANGE', 9),
      ('PREESPOUR', 'NOZZLE LEAKAGE', 10),
      ('PREESPOUR', 'SPOUT POCKING', 11),
      ('PREESPOUR', 'ST ROD', 12),
      ('QUALITY CONTROL', 'QC VENT', 13),
      ('QUALITY CONTROL', 'OUT MOULD', 14),
      ('QUALITY CONTROL', 'LOW MG', 15),
      ('QUALITY CONTROL', 'GRADE CHANGE', 16),
      ('QUALITY CONTROL', 'MSI PROBLEM', 17),
      ('MAINTENANCE', 'BRAKE DOWN', 18),
      ('FURNACE', 'WOM', 19),
      ('TOOLING', 'DEV TRAIL', 20),
      ('OTHERS', 'POWER CUT', 21),
      ('OTHERS', 'PLANNED OFF', 22),
      ('OTHERS', 'VAT CLEANING', 23),
      ('OTHERS', 'OTHERS', 24)
    `);
        console.log('✅ Seeded 24 UnpouredMould_Master rows');
    } else {
        console.log('✅ UnpouredMould_Master already has data, skipping seed');
    }

    // =============================================
    // 2. DMM SETTING TABLES
    // =============================================
    await sql.query(`
    IF OBJECT_ID('DmmSetting_Master', 'U') IS NULL
    CREATE TABLE DmmSetting_Master (
      MasterId INT IDENTITY(1,1) PRIMARY KEY,
      ColumnKey NVARCHAR(50),
      ColumnLabel NVARCHAR(100),
      InputType NVARCHAR(20),
      ColumnWidth NVARCHAR(20),
      SlNo INT,
      IsDeleted BIT DEFAULT 0
    )
  `);
    console.log('✅ DmmSetting_Master OK');

    await sql.query(`
    IF OBJECT_ID('DmmSetting_Trans', 'U') IS NULL
    CREATE TABLE DmmSetting_Trans (
      TransId INT IDENTITY(1,1) PRIMARY KEY,
      RecordDate DATE,
      DisaMachine NVARCHAR(50),
      Shift INT,
      RowUUID NVARCHAR(100),
      MasterId INT,
      Value NVARCHAR(MAX),
      LastUpdated DATETIME DEFAULT GETDATE()
    )
  `);
    console.log('✅ DmmSetting_Trans OK');

    const dmmCount = await sql.query(`SELECT COUNT(*) as cnt FROM DmmSetting_Master`);
    if (dmmCount.recordset[0].cnt === 0) {
        await sql.query(`
      INSERT INTO DmmSetting_Master (ColumnKey, ColumnLabel, InputType, ColumnWidth, SlNo) VALUES 
      ('Customer', 'CUSTOMER', 'text', 'w-32', 1),
      ('ItemDescription', 'ITEM DESCRIPTION', 'text', 'w-40', 2),
      ('Time', 'TIME', 'time', 'w-24', 3),
      ('PpThickness', 'PP THICKNESS (mm)', 'number', 'w-20', 4),
      ('PpHeight', 'PP HEIGHT (mm)', 'number', 'w-20', 5),
      ('SpThickness', 'SP THICKNESS (mm)', 'number', 'w-20', 6),
      ('SpHeight', 'SP HEIGHT (mm)', 'number', 'w-20', 7),
      ('CoreMaskOut', 'CORE MASK HEIGHT (OUTSIDE) mm', 'number', 'w-24', 8),
      ('CoreMaskIn', 'CORE MASK HEIGHT (INSIDE) mm', 'number', 'w-24', 9),
      ('SandShotPressure', 'SAND SHOT PRESSURE BAR', 'number', 'w-24', 10),
      ('CorrectionShotTime', 'CORRECTION OF SHOT TIME (SEC)', 'number', 'w-28', 11),
      ('SqueezePressure', 'SQUEEZE PRESSURE Kg/Cm2 / bar', 'number', 'w-28', 12),
      ('PpStripAccel', 'PP STRIPPING ACCELERATION', 'number', 'w-28', 13),
      ('PpStripDist', 'PP STRIPPING DISTANCE', 'number', 'w-28', 14),
      ('SpStripAccel', 'SP STRIPPING ACCELERATION', 'number', 'w-28', 15),
      ('SpStripDist', 'SP STRIPPING DISTANCE', 'number', 'w-28', 16),
      ('MouldThickness', 'MOULD THICKNESS (10mm)', 'number', 'w-28', 17),
      ('CloseUpForce', 'CLOSE UP FORCE (Kg)', 'number', 'w-24', 18),
      ('Remarks', 'REMARKS', 'text', 'w-48', 19)
    `);
        console.log('✅ Seeded 19 DmmSetting_Master rows');
    } else {
        console.log('✅ DmmSetting_Master already has data, skipping seed');
    }

    // =============================================
    // 3. ERROR PROOF TABLES
    // =============================================
    await sql.query(`
    IF OBJECT_ID('ErrorProof_Master', 'U') IS NULL
    CREATE TABLE ErrorProof_Master (
      MasterId INT IDENTITY(1,1) PRIMARY KEY,
      Line NVARCHAR(MAX),
      ErrorProofName NVARCHAR(MAX),
      NatureOfErrorProof NVARCHAR(MAX),
      Frequency NVARCHAR(10),
      SlNo INT,
      IsDeleted BIT DEFAULT 0
    )
  `);
    console.log('✅ ErrorProof_Master OK');

    await sql.query(`
    IF OBJECT_ID('ErrorProof_Trans', 'U') IS NULL
    CREATE TABLE ErrorProof_Trans (
      TransId INT IDENTITY(1,1) PRIMARY KEY,
      RecordDate DATE,
      DisaMachine NVARCHAR(50),
      MasterId INT,
      Shift1_Res NVARCHAR(10),
      Shift2_Res NVARCHAR(10),
      Shift3_Res NVARCHAR(10),
      ReviewedByHOF NVARCHAR(100),
      ApprovedBy NVARCHAR(100),
      LastUpdated DATETIME DEFAULT GETDATE()
    )
  `);
    console.log('✅ ErrorProof_Trans OK');

    const epCount = await sql.query(`SELECT COUNT(*) as cnt FROM ErrorProof_Master`);
    if (epCount.recordset[0].cnt === 0) {
        await sql.query(`
      INSERT INTO ErrorProof_Master (Line, ErrorProofName, NatureOfErrorProof, Frequency, SlNo) VALUES
      ('DISA Line 1', 'Sand Mould Height Check', 'Physical / Visual', 'S', 1),
      ('DISA Line 1', 'Squeeze Pressure Verification', 'Gauge Check', 'S', 2),
      ('DISA Line 2', 'Pattern Alignment Check', 'Visual', 'S', 3),
      ('DISA Line 2', 'Core Mask Height Verification', 'Gauge Check', 'S', 4)
    `);
        console.log('✅ Seeded 4 ErrorProof_Master rows');
    } else {
        console.log('✅ ErrorProof_Master already has data, skipping seed');
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
}

migrate().catch(e => {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
});
