require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const fileUpload = require('express-fileupload');

// Middleware
app.use(express.json());
app.use(fileUpload());
app.use(cors({
    origin: ["http://localhost:3001", "http://127.0.0.1:3001"]
}));

// Routes
const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interview');
const resumeRoutes = require('./routes/resume');

app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/resume', resumeRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ message: "Hirvo AI Node.js Backend is LIVE! 🚀" });
});

// Database connection
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
