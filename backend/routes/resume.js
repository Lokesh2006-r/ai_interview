const express = require('express');
const router = express.Router();
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

router.post('/upload', async (req, res) => {
    if (!req.files || !req.files.resume) {
        return res.status(400).json({ detail: "No resume file uploaded" });
    }

    try {
        const file = req.files.resume;
        const pdfData = await pdf(file.data);
        const resumeText = pdfData.text;

        // Structured Analysis Prompt
        const prompt = `Analyze the following resume text and provide a professional evaluation in JSON format.
        Resume Text: ${resumeText.substring(0, 5000)}

        Return EXACTLY this JSON structure:
        {
            "success": true,
            "userName": "Extracted name",
            "atsScore": 85,
            "experienceLevel": "Junior/Mid/Senior",
            "summary": "2-3 sentence professional summary",
            "topSkills": ["Skill 1", "Skill 2"],
            "missingSkills": ["Suggested Skill 1", "Suggested Skill 2"],
            "targetRole": "Professional Job Title",
            "fitAnalysis": "Why they fit this role",
            "topCompanies": ["Company A", "Company B"]
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean potential markdown blocks
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : text);

        res.json(analysis);
    } catch (err) {
        console.error("Analysis Error:", err);
        res.status(500).json({ success: false, detail: "Deep Analysis Failed: " + err.message });
    }
});

module.exports = router;
