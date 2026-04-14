const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Interview = require('../models/Interview');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const { role, company, context, history, interviewId, candidateName, level, stage, memory_summary, currentCode } = req.body;

    try {
        const systemPrompt = `You are a professional AI Interviewer who speaks in a highly realistic, human-like voice similar to ElevenLabs text-to-speech. 
Your responses will be converted into speech, so you MUST sound natural, smooth, and conversational. 

Speaking Style:
- Use clear pronunciation and natural pacing.
- Use SHORT sentences.
- Use commas and periods strategically to create natural pauses and a lifelike speaking rhythm.
- Maintain a confident, calm, and slightly formal tone.
- Occasionally use natural fillers like "Alright," "Okay," "I see," or "Good" to sound human.
- Keep responses CONCISE (max 2-3 short sentences).

Interview Flow:
1. Start by asking the candidate’s name, role, and experience level.
2. Proceed through stages: Warm-up, Technical, Problem-solving, and HR.
3. Ask ONE question at a time. Wait for a response.
4. After each answer, respond briefly with a natural reaction ("I see," "Interesting point"), then ask a follow-up or the next question.

Rules:
- Adapt difficulty: increase challenge if answers are strong, simplify if weak.
- Test depth with "why" or "how".
- NEVER break character.
- Avoid robotic or overly complex wording.
- Keep the flow smooth for voice output.
- Ton: Senior Lead from ${company || 'Top Tech Company'}`;

        const dynamicUserPrompt = `Candidate Response: "${context}"
Candidate Code: 
\`\`\`
${currentCode || 'No code provided yet'}
\`\`\`
Interview Context:
- Role: ${role}
- Experience: ${level || 'Intermediate'}
- Current Stage: ${stage || 'Warm-up'}
- Previous Answers Summary: ${memory_summary || 'Starting session'}

Instructions:
- Analyze the response
- Ask next best question
- Adjust difficulty dynamically
- Keep interview flow natural`;

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: dynamicUserPrompt }
        ]);
        const response = await result.response;
        const text = response.text();

        // Save transcript
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

        const analysisPrompt = `Generate a final interview report for the ${interview.role} interview at ${interview.company}.
        Analyze all answers and tracked scores. 
        
        Provide a JSON response with these keys:
        - rating: (Hiring Decision: 'Yes', 'No', 'Maybe')
        - overallScore: (Score out of 10)
        - metrics: { technical: score/10, communication: score/10, problem_solving: score/10, confidence: score/10 }
        - summaries: [Detailed performance summary]
        - strengths: [List of strengths]
        - weaknesses: [List of weaknesses]
        - improvement: [Suggested topics to improve]
        
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
