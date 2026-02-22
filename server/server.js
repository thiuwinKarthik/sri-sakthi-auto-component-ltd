// require('dotenv').config();  // Uncomment this if you are using a .env file
const express = require('express');
const cors = require('cors');

// --- 1. Import Database Connection ---
const { connectDB } = require('./db'); // Ensure this path matches your folder structure

// --- Import Route Files ---
const mouldRoutes = require('./routes/mouldRoutes');
const disaChecklistRoutes = require('./routes/disaChecklistRoutes');
const bottomLevelRoutes = require('./routes/bottomLevelRoutes');
const dmmRoutes = require('./routes/dmmRoutes');
const errorProofRoutes = require('./routes/errorProofRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes'); // <-- Added for PDF exports
const configRoutes = require('./routes/configRoutes'); // <-- Added for Form Customizations

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
app.use('/api/dmm-settings', dmmRoutes);
app.use('/api/error-proof', errorProofRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes); // <-- Added Endpoint
app.use('/api/config', configRoutes); // <-- Added Admin Config Router

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));