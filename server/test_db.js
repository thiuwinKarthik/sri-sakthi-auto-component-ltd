const { sql, connectDB } = require('./db');

async function testQuery() {
    await connectDB();
    try {
        const res = await sql.query`SELECT * FROM Users`;
        console.log('Query success:', res.recordset);
    } catch (err) {
        console.error('Query error:', err.message);
    } finally {
        process.exit(0);
    }
}

testQuery();
