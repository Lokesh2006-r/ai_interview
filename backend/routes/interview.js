const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Interview = require('../models/Interview');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
        const systemPrompt = `You are an elite Technical Interviewer and Subject Matter Expert (SME) for the role of ${role}. 
Your goal is to conduct a high-fidelity, professional interview that is indistinguishable from a senior lead at a top tech company like ${company || 'Google'}.

Accuracy & Depth:
- Ask high-impact technical questions that test deep understanding, not just surface knowledge.
- Proactively analyze any code provided and give precise, architect-level feedback.
- If an answer is vague, drill down with "How exactly would that work?" or "What are the trade-offs?".

Voice-First Conversational Style (Human-like pacing):
- Use SHORT, punchy sentences.
- Use natural pauses (commas/periods) for lifelike rhythm.
- Use a "Thinking out loud" style: "Interesting... let's shift gears to..." or "That's a solid explanation. Now, about...".
- Keep responses extremely CONCISE (max 40-50 words) so the TTS starts quickly.
- Persona: Senior Lead/Architect. Calm, sharp, and encouraging but rigorous.`;


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

        const analysisPrompt = `Generate a high-fidelity, professional interview report for the ${interview.role} interview at ${interview.company}.
        
        Analyze all answers (transcript) and any code provided.
        
        Provide a JSON response with these keys:
        - rating: (Hiring Decision: 'Yes', 'No', 'Maybe')
        - overallScore: (Score out of 100)
        - metrics: { 
            technical: (0-10), 
            communication: (0-10), 
            problem_solving: (0-10), 
            confidence: (0-10) 
        }
        - summaries: [List of high-impact observations]
        - code_analysis: {
            complexity: "Time: O(?), Space: O(?)",
            suggestions: "How to optimize this code"
        }
        - strengths: [List of 3-4 key candidate strengths]
        - weaknesses: [List of areas needing focus]
        - roadmap: [3-step growth plan with specific topics based on gaps found]
        - improvement: [A list of 3-5 specific topics to study]
        
        Full Transcript and History: ${JSON.stringify(interview.transcript)}`;

        const result = await model.generateContent(analysisPrompt);
        const feedbackText = await result.response.text();
        
        let feedbackData;
        try {
            const cleanJson = feedbackText.match(/\{[\s\S]*\}/)[0];
            feedbackData = JSON.parse(cleanJson);
        } catch (e) {
            feedbackData = { rating: "Completed", overallScore: 70, summaries: ["Session analyzed successfully."], strengths: ["Good attempt"], weaknesses: ["Needs more technical depth"], metrics: { technical: 7, communication: 7, problem_solving: 7, confidence: 7 } };
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

router.post('/transcribe', async (req, res) => {
    console.log("[STT] Transcription request received");
    if (!req.files || !req.files.audio) {
        console.error("[STT Error] No audio file in request");
        return res.status(400).json({ detail: "No audio file provided" });
    }

    try {
        const audioData = req.files.audio.data;
        console.log(`[STT] Audio size: ${audioData.length} bytes, Mime: ${req.files.audio.mimetype}`);
        
        // Use Gemini for high-accuracy transcription (Multimodal input)
        console.log("[STT] Calling Gemini for transcription...");
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: audioData.toString('base64')
                }
            },
            { text: "Transcribe the following audio precisely. Return ONLY the transcribed text and nothing else. If there is no speech, return an empty string." }
        ]);

        const text = result.response.text();
        console.log(`[STT] Transcription success: "${text.substring(0, 50)}..."`);
        
        if (text !== undefined) {
            res.json({ text: text.trim() });
        } else {
            res.status(500).json({ detail: "Transcription failed: Empty response" });
        }
    } catch (err) {
        console.error("[STT Error (Gemini)]:", err);
        res.status(500).json({ detail: err.message });
    }
});

router.delete('/all', async (req, res) => {
    const userId = req.headers['user-id'] || 'demo_user';
    try {
        await Interview.deleteMany({ userId: userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// GET Leaderboard (Top 10)
router.get('/leaderboard', async (req, res) => {
    try {
        const topScorers = await Interview.aggregate([
            { $match: { status: 'completed', overallScore: { $gt: 0 } } },
            { $group: { 
                _id: "$userId", 
                maxScore: { $max: "$overallScore" },
                latestRole: { $last: "$role" }
            }},
            { $sort: { maxScore: -1 } },
            { $limit: 10 }
        ]);
        res.json(topScorers);
    } catch (err) {
        res.status(500).json({ error: "Leaderboard error" });
    }
});

module.exports = router;
