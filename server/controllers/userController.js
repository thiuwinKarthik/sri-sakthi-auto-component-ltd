const { sql } = require('../db');
const bcrypt = require('bcryptjs');

// ── Helper: insert into role-specific table ─────────────────────────────────
const insertIntoRoleTable = async (role, userId, username) => {
    const r = (role || '').toUpperCase();
    if (r === 'OPERATOR') {
        await sql.query`INSERT INTO Operators (OperatorName) VALUES (${username})`;
    } else if (r === 'SUPERVISOR') {
        await sql.query`INSERT INTO Supervisors (supervisorName) VALUES (${username})`;
    } else if (r === 'HOD') {
        await sql.query`INSERT INTO Hod (hodName) VALUES (${username})`;
    } else if (r === 'HOF') {
        await sql.query`INSERT INTO Hof (hofName) VALUES (${username})`;
    }
    // ADMIN → no separate table
};

// ── Helper: delete from role-specific table by name ───────────────────
const deleteFromRoleTable = async (role, userId, username) => {
    const r = (role || '').toUpperCase();
    if (r === 'OPERATOR') {
        await sql.query`DELETE FROM Operators WHERE OperatorName = ${username}`;
    } else if (r === 'SUPERVISOR') {
        await sql.query`DELETE FROM Supervisors WHERE supervisorName = ${username}`;
    } else if (r === 'HOD') {
        await sql.query`DELETE FROM Hod WHERE hodName = ${username}`;
    } else if (r === 'HOF') {
        await sql.query`DELETE FROM Hof WHERE hofName = ${username}`;
    }
};

const userController = {
    // --- 1. Get All Users ---
    getUsers: async (req, res) => {
        try {
            const result = await sql.query`
        SELECT Id, Username, Role, CreatedAt FROM Users
      `;
            res.json(result.recordset);
        } catch (err) {
            console.error('Error fetching users:', err);
            res.status(500).send('Server Error');
        }
    },

    // --- 2. Create User ---
    createUser: async (req, res) => {
        try {
            const { username, password, role } = req.body;

            if (!username || !password || !role) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            // Check if user already exists
            const checkRes = await sql.query`
        SELECT COUNT(*) as count FROM Users WHERE Username = ${username}
      `;

            if (checkRes.recordset[0].count > 0) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // Hash password before storing
            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await sql.query`
        INSERT INTO Users (Username, Password, Role) 
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Role, INSERTED.CreatedAt
        VALUES (${username}, ${hashedPassword}, ${role})
      `;

            const newUser = result.recordset[0];

            // Insert into role-specific table
            try {
                await insertIntoRoleTable(role, newUser.Id, newUser.Username);
            } catch (roleErr) {
                console.warn('Role table insert failed:', roleErr.message);
            }

            res.status(201).json(newUser);
        } catch (err) {
            console.error('Error creating user:', err);
            res.status(500).send('Server Error');
        }
    },

    // --- 3. Update User ---
    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const { username, role } = req.body; // Not updating password here for simplicity, or handle it if needed

            if (!username || !role) {
                return res.status(400).json({ error: 'Username and role are required' });
            }

            const result = await sql.query`
        UPDATE Users 
        SET Username = ${username}, Role = ${role}
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Role, INSERTED.CreatedAt
        WHERE Id = ${id}
      `;

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(result.recordset[0]);
        } catch (err) {
            console.error('Error updating user:', err);
            res.status(500).send('Server Error');
        }
    },

    // --- 4. Delete User ---
    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;

            // Look up role + username before deleting so we can clean the role table
            const userRes = await sql.query`SELECT Role, Username FROM Users WHERE Id = ${id}`;
            const userRole = userRes.recordset[0]?.Role;
            const userUsername = userRes.recordset[0]?.Username;

            // Delete from role-specific table first
            if (userRole && userUsername) {
                try {
                    await deleteFromRoleTable(userRole, id, userUsername);
                } catch (roleErr) {
                    console.warn('Role table delete failed:', roleErr.message);
                }
            }

            const result = await sql.query`
        DELETE FROM Users WHERE Id = ${id}
      `;

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ success: true, message: 'User deleted successfully' });
        } catch (err) {
            console.error('Error deleting user:', err);
            res.status(500).send('Server Error');
        }
    }
};

module.exports = userController;
