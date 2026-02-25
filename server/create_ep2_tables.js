const { sql, connectDB } = require('./db.js');

async function createEP2Tables() {
    await connectDB();
    console.log('Creating ErrorProof2 tables...');

    // ErrorProofVerification table (used by /add-verification route)
    await sql.query(`
    IF OBJECT_ID('ErrorProofVerification', 'U') IS NULL
    CREATE TABLE ErrorProofVerification (
      id INT IDENTITY(1,1) PRIMARY KEY,
      line NVARCHAR(200),
      errorProofName NVARCHAR(MAX),
      natureOfErrorProof NVARCHAR(MAX),
      frequency NVARCHAR(100),
      recordDate DATE,
      shift NVARCHAR(10),
      observationResult NVARCHAR(20),
      verifiedBy NVARCHAR(100),
      reviewedBy NVARCHAR(100),
      createdAt DATETIME DEFAULT GETDATE()
    )
  `);
    console.log('✅ ErrorProofVerification table OK');

    // ReactionPlan table (used by /add-reaction route and /next-sno)
    await sql.query(`
    IF OBJECT_ID('ReactionPlan', 'U') IS NULL
    CREATE TABLE ReactionPlan (
      id INT IDENTITY(1,1) PRIMARY KEY,
      sNo INT,
      errorProofNo NVARCHAR(100),
      errorProofName NVARCHAR(MAX),
      recordDate DATE,
      shift NVARCHAR(10),
      problem NVARCHAR(MAX),
      rootCause NVARCHAR(MAX),
      correctiveAction NVARCHAR(MAX),
      status NVARCHAR(50),
      reviewedBy NVARCHAR(100),
      approvedBy NVARCHAR(100),
      remarks NVARCHAR(MAX),
      createdAt DATETIME DEFAULT GETDATE()
    )
  `);
    console.log('✅ ReactionPlan table OK');

    console.log('\n🎉 ErrorProof2 tables created successfully!');
    process.exit(0);
}

createEP2Tables().catch(e => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
});
