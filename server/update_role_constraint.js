const { sql, connectDB } = require('./db');

async function updateRoleConstraint() {
    await connectDB();
    try {
        // Drop the existing CHECK constraint on Role
        // In SQL Server, we first need to find the name of the constraint programmatically if it was auto-generated
        await sql.query`
      DECLARE @ConstraintName nvarchar(200)
      SELECT @ConstraintName = Name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('Users') AND definition LIKE '%Role%'
      
      IF @ConstraintName IS NOT NULL
      BEGIN
        EXEC('ALTER TABLE Users DROP CONSTRAINT ' + @ConstraintName)
      END

      -- Add the new constraint with SUPERVISOR
      ALTER TABLE Users ADD CONSTRAINT CHK_Users_Role CHECK (Role IN ('HOD', 'HOF', 'SUPERVISOR', 'OPERATOR'))
    `;
        console.log('✅ Users table CHECK constraint updated to include SUPERVISOR.');
    } catch (err) {
        console.error('❌ Error updating constraint:', err.message);
    } finally {
        process.exit(0);
    }
}

updateRoleConstraint();
