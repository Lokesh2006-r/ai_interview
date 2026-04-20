const express = require('express');
const router = express.Router();
const pdf = require('pdf-parse');
const jwt = require('jsonwebtoken');
const Resume = require('../models/Resume');

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY?.trim();
const PRIMARY_MODEL = "google/gemma-2-9b-it:fastest";
const FALLBACK_MODEL = "Qwen/Qwen2.5-7B-Instruct:fastest";

/**
 * Robust Helper to call Hugging Face Inference API
 */
async function callHuggingFace(prompt, modelOverride = null) {
    if (!HF_API_KEY) {
        throw new Error("HUGGINGFACE_API_KEY is missing in .env");
    }

    const modelToUse = modelOverride || PRIMARY_MODEL;
    console.log(`[AI] Calling ${modelToUse}...`);

    try {
        const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [{ role: "user", content: prompt + "\n\nCRITICAL: Return ONLY raw JSON. No markdown, no explanations." }],
                max_tokens: 2000,
                temperature: 0.1 // Lower temperature for more stable JSON
            })
        });

        const result = await response.json();
        
        if (result.error) {
            console.error(`[AI Error] ${modelToUse}:`, result.error);
            // Retry with fallback if primary fails
            if (!modelOverride && PRIMARY_MODEL !== FALLBACK_MODEL) {
                console.log(`[AI] Retrying with ${FALLBACK_MODEL}...`);
                return await callHuggingFace(prompt, FALLBACK_MODEL);
            }
            throw new Error(`HF Error: ${JSON.stringify(result.error)}`);
        }
        
        if (!result.choices || !result.choices[0]) {
            throw new Error("Empty or malformed response from AI provider");
        }

        return result.choices[0].message.content;
    } catch (err) {
        if (!modelOverride) {
            console.log(`[AI] Network error, retrying with fallback...`);
            return await callHuggingFace(prompt, FALLBACK_MODEL);
        }
        throw err;
    }
}

function parseAIJson(text) {
    try {
        // Find the first { and the last }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("No JSON found in response");
        return JSON.parse(text.substring(start, end + 1));
    } catch (e) {
        console.error("[Parse Error] Failed to parse AI JSON:", text);
        throw new Error("AI returned invalid JSON format. Please try again.");
    }
}

// Helper to get userId from token
const getUserId = (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return 'demo_user';
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    } catch(e) {
        return 'demo_user';
    }
};

router.post('/upload', async (req, res) => {
    if (!req.files || !req.files.resume) {
        return res.status(400).json({ detail: "No resume file uploaded" });
    }

    try {
        const file = req.files.resume;
        const pdfData = await pdf(file.data);
        const resumeText = pdfData.text;

        const prompt = `Analyze this resume and provide a professional evaluation as JSON.
        Resume Text: ${resumeText.substring(0, 6000)}

        Required JSON structure:
        {
            "success": true,
            "userName": "Extracted name",
            "atsScore": 85,
            "experienceLevel": "Junior/Mid/Senior/Lead",
            "summary": "Impactful professional summary",
            "topSkills": ["Skill A", "Skill B"],
            "missingSkills": ["Requirement A", "Requirement B"],
            "targetRole": "Ideal Job Title",
            "fitAnalysis": "Brief career gap or fit analysis",
            "topCompanies": ["Tech Co 1", "Tech Co 2"]
        }`;

        const responseText = await callHuggingFace(prompt);
        const analysis = parseAIJson(responseText);

        // Save to database
        const userId = req.body.userId || getUserId(req);
        const newResume = new Resume({
            userId,
            filename: file.name,
            analysis: {
                atsScore: analysis.atsScore,
                summary: analysis.summary,
                topSkills: analysis.topSkills,
                missingSkills: analysis.missingSkills
            }
        });
        await newResume.save();

        res.json({ success: true, analysis, resumeId: newResume._id });
    } catch (err) {
        console.error("Analysis Error:", err);
        res.status(500).json({ success: false, detail: "Deep Analysis Failed: " + err.message });
    }
});

router.post('/generate-summary', async (req, res) => {
    const { role, skills } = req.body;
    try {
        const prompt = `Write a high-impact, professional 3-sentence "About Me" summary for a ${role} with these skills: ${skills || "relevant expertise"}. Return only the summary text.`;
        const summary = await callHuggingFace(prompt);
        res.json({ summary: summary.trim() });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

router.post('/analyze', async (req, res) => {
    const { jobDescription, resumeData } = req.body;
    try {
        const prompt = jobDescription 
            ? `Evaluate resume match for job.\nRESUME: ${JSON.stringify(resumeData)}\nJOB DESC: ${jobDescription}\nReturn JSON with 'score' (number), 'summary_insight', 'strengths' (array), 'weaknesses' (array).`
            : `Analyze resume quality. RESUME: ${JSON.stringify(resumeData)}. Return JSON with 'score' (number), 'summary_insight', 'strengths' (array), 'weaknesses' (array).`;

        const responseText = await callHuggingFace(prompt);
        const data = parseAIJson(responseText);
        res.json(data);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// GET all resumes for a user
router.get('/all', async (req, res) => {
    const userId = req.query.userId || getUserId(req);
    try {
        const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });
        res.json(resumes);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// DELETE a resume
router.delete('/:id', async (req, res) => {
    try {
        const result = await Resume.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ detail: "Resume not found" });
        res.json({ success: true, message: "Resume removed from portfolio" });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

router.post('/suggest-bullets', async (req, res) => {
    const { role, company } = req.body;
    try {
        const prompt = `Write 4-5 results-oriented professional bullet points for ${role} at ${company || "company"}. Use quantifiable achievements. Return ONLY the bullet points, each on a new line starting with a dash.`;
        const bullets = await callHuggingFace(prompt);
        res.json({ bullets: bullets.trim() });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

router.post('/create', async (req, res) => {
    const { template, data } = req.body;
    const userId = getUserId(req);
    try {
        const resume = new Resume({ userId, template, data });
        await resume.save();
        res.json({ success: true, resumeId: resume._id });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

module.exports = router;
