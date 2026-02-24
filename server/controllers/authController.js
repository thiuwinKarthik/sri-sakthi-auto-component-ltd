const { sql } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sakthi-auto-secret-key-2024';
const JWT_EXPIRES_IN = '8h';

// ── Helper: insert into role-specific table ──────────────────────────────────
const insertIntoRoleTable = async (role, userId, username) => {
    const r = role.toUpperCase();
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

const authController = {
    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            // Find user by username
            const result = await sql.query`
                SELECT Id, Username, Password, Role FROM Users WHERE Username = ${username}
            `;

            if (result.recordset.length === 0) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            const user = result.recordset[0];

            // Compare password — support both bcrypt hashed and plain text (legacy)
            let passwordMatch = false;
            const isHashed = user.Password && user.Password.startsWith('$2');

            if (isHashed) {
                passwordMatch = await bcrypt.compare(password, user.Password);
            } else {
                // Legacy plain text comparison
                passwordMatch = password === user.Password;

                // Upgrade to bcrypt hash on successful plain-text login
                if (passwordMatch) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await sql.query`UPDATE Users SET Password = ${hashedPassword} WHERE Id = ${user.Id}`;
                }
            }

            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            // Sign JWT
            const token = jwt.sign(
                { id: user.Id, username: user.Username, role: user.Role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.json({
                token,
                user: {
                    id: user.Id,
                    username: user.Username,
                    role: user.Role
                }
            });

        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ error: 'Server error during login' });
        }
    },

    register: async (req, res) => {
        try {
            const { username, password, role } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }

            // Validate role
            const ALLOWED_ROLES = ['ADMIN', 'OPERATOR', 'SUPERVISOR', 'HOD', 'HOF'];
            const ROLE = (role || 'OPERATOR').toUpperCase();
            if (!ALLOWED_ROLES.includes(ROLE)) {
                return res.status(400).json({ error: 'Invalid role selected' });
            }

            // Check if username already taken
            const existing = await sql.query`
                SELECT COUNT(*) as count FROM Users WHERE Username = ${username}
            `;
            if (existing.recordset[0].count > 0) {
                return res.status(400).json({ error: 'Username already exists. Please choose another.' });
            }

            // Insert into Users table
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await sql.query`
                INSERT INTO Users (Username, Password, Role)
                OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Role
                VALUES (${username}, ${hashedPassword}, ${ROLE})
            `;

            const newUser = result.recordset[0];

            // Insert into role-specific table
            try {
                await insertIntoRoleTable(ROLE, newUser.Id, newUser.Username);
            } catch (roleErr) {
                console.warn('Role table insert failed:', roleErr.message);
            }

            // Auto-login: sign and return JWT
            const token = jwt.sign(
                { id: newUser.Id, username: newUser.Username, role: newUser.Role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.status(201).json({
                token,
                user: { id: newUser.Id, username: newUser.Username, role: newUser.Role }
            });

        } catch (err) {
            console.error('Register error:', err);
            res.status(500).json({ error: 'Server error during registration' });
        }
    }
};

module.exports = authController;
