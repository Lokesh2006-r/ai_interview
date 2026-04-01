const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Interview = require('../models/Interview');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

router.post('/', async (req, res) => {
    const { role, company, userId } = req.body;
    try {
        const interview = new Interview({ role, company, userId: userId || 'demo_user' });
        await interview.save();
        res.json({ interviewId: interview._id });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

router.get('/all', async (req, res) => {
    const userId = req.headers['user-id'] || 'demo_user';
    try {
        const interviews = await Interview.find({ userId: userId }).sort({ createdAt: -1 });
        res.json(interviews);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) return res.status(404).json({ detail: "Interview not found" });
        res.json(interview);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

router.post('/ask', async (req, res) => {
    const { role, company, context, history, interviewId, candidateName, currentCode } = req.body;

    try {
        // System Prompt inspired by IntelliView - Professional Coach & Interviewer
        let prompt = `Act as an AI Interview Coach named IntelliView, a senior technical lead from ${company} hiring for a ${role} role. `;
        prompt += `The candidate's name is ${candidateName || 'Candidate'}. `;
        
        // Persona Strategy
        prompt += `INSTRUCTIONS:
        1. Evaluate the candidate's last input briefly (be encouraging).
        2. Ask a high-stakes, specific interview question for ${role}.
        3. If relevant, reference the current code provided: ${currentCode || "No code provided yet"}.
        4. Keep your response CONCISE (max 4 lines). No meta-commentary.
        5. Focus on deep architecture, technical Trade-offs, or soft-skills.
        6. Tone: Professional, authoritative, yet coaching-oriented.`;

        prompt += `\n\nCONTEXT: ${context}\nINTERVIEW HISTORY: ${JSON.stringify(history)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Save both user context and AI response to MongoDB
        if (interviewId) {
             await Interview.findByIdAndUpdate(interviewId, { 
                 $push: { 
                     transcript: { 
                         $each: [
                             { role: 'user', content: context },
                             { role: 'ai', content: text }
                         ]
                     }
                 } 
             });
        }

        res.json({ answer: text });
    } catch (err) {
        console.error("Gemini Error:", err);
        res.status(500).json({ answer: "AI glitch. Please try again.", detail: err.message });
    }
});

router.patch('/:id/complete', async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) return res.status(404).json({ detail: "Interview record missing." });

        if (interview.transcript.length < 2) {
             return res.json({ 
                 success: true, 
                 feedback: { 
                     rating: "Short Session", 
                     overallScore: 0,
                     summaries: ["Insufficient data for a full report."] 
                 } 
             });
        }

        // Evaluation Prompt inspired by IntelliView's structured metric report
        const analysisPrompt = `Analyze the full record of this ${interview.role} interview at ${interview.company}.
        Provide a professional performance report in JSON format only with these keys:
        - rating: (e.g. 'Strong Hire', 'Strong Reject')
        - overallScore: (integer 0-100)
        - metrics: { technical: score, communication: score, problem_solving: score, clarity: score, fillerCount: integer } (all integers 0-10, except fillerCount)
        - summaries: [3-4 high-impact bullet points]
        - strengths: [List of 2-3 specific wins]
        - improvement: [List of 2-3 constructive focus areas]
        
        Full Transcript: ${JSON.stringify(interview.transcript)}`;

        const result = await model.generateContent(analysisPrompt);
        const feedbackText = await result.response.text();
        
        let feedbackData;
        try {
            const cleanJson = feedbackText.match(/\{[\s\S]*\}/)[0];
            feedbackData = JSON.parse(cleanJson);
        } catch (e) {
            feedbackData = { rating: "Completed", overallScore: 0, summaries: ["Failed to generate full report."], metrics: { technical: 5, communication: 5, problem_solving: 5 } };
        }

        await Interview.findByIdAndUpdate(req.params.id, { 
            status: 'completed',
            overallScore: feedbackData.overallScore || 0,
            feedback: JSON.stringify(feedbackData)
        });

        res.json({ success: true, feedback: feedbackData });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

module.exports = router;
