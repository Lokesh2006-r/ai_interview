const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: './backend/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

async function run() {
  try {
    const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent("Hi");
    console.log("Gemini 1.5 Flash works!");
  } catch (e) {
    console.log("Gemini 1.5 Flash failed:", e.message);
    try {
        // Try to list models
        // Note: listModels is on the genAI object in some versions or needs a specific call
        // Looking at latest docs, it might be different.
        console.log("Checking available models...");
    } catch (err) {
        console.log("List models failed:", err.message);
    }
  }
}

run();
