// require('dotenv').config(); // If you use .env
const express = require('express');
const cors = require('cors');

// --- Import Route Files ---
const mouldRoutes = require('./routes/mouldRoutes');
const disaChecklistRoutes = require('./routes/disaChecklistRoutes'); // <--- 1. Add this import

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// --- Register Routes ---
app.use('/api/unpoured-moulds', mouldRoutes);
app.use('/api/disa-checklist', disaChecklistRoutes); // <--- 2. Add this line

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));