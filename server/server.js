// require('dotenv').config(); // If you use .env
const express = require('express');
const cors = require('cors');
const mouldRoutes = require('./routes/mouldRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/unpoured-moulds', mouldRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));