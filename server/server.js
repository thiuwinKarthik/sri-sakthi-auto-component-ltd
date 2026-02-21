// require('dotenv').config();  // Uncomment this if you are using a .env file
const express = require('express');
const cors = require('cors');

// --- 1. Import Database Connection ---
const { connectDB } = require('./db'); // Ensure this path matches your folder structure

// --- Import Route Files ---
const mouldRoutes = require('./routes/mouldRoutes');
const disaChecklistRoutes = require('./routes/disaChecklistRoutes');
const bottomLevelRoutes = require('./routes/bottomLevelRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// --- 2. Initialize Database Connection ---
connectDB(); // This triggers the connection and prints the console log

// --- Register Routes ---
app.use('/api/unpoured-moulds', mouldRoutes);
app.use('/api/disa-checklist', disaChecklistRoutes);
app.use('/api/bottom-level-audit', bottomLevelRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));