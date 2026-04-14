const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    template: { type: String, default: 'modern-dark' },
    data: {
        name: String,
        role: String,
        phone: String,
        email: String,
        location: String,
        about: String,
        experience: [{
            company: String,
            dates: String,
            role: String,
            desc: String
        }],
        education: [{
            university: String,
            degree: String,
            year: String
        }],
        skills: [String],
        languages: [{
            name: String,
            level: Number
        }]
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resume', resumeSchema);
