const { sql } = require('../db');

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

            const result = await sql.query`
        INSERT INTO Users (Username, Password, Role) 
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Role, INSERTED.CreatedAt
        VALUES (${username}, ${password}, ${role})
      `;

            res.status(201).json(result.recordset[0]);
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
