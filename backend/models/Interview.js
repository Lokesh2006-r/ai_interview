const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
    userId: { type: String, default: "demo_user" },
    role: { type: String, required: true },
    company: { type: String, required: true },
    transcript: [{
        role: { type: String, enum: ['ai', 'user'] },
        content: { type: String }
    }],
    overallScore: { type: Number, default: 0 },
    feedback: { type: String, default: "" },
    status: { type: String, enum: ['ongoing', 'completed'], default: 'ongoing' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Interview', interviewSchema);
