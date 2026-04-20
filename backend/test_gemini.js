const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: './.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

async function run() {
  const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-pro"];
  for (const m of models) {
    try {
      console.log(`Testing model: ${m}`);
      const result = await genAI.getGenerativeModel({ model: m }).generateContent("Hi");
      console.log(`Model ${m} works!`);
      break;
    } catch (e) {
      console.log(`Model ${m} failed: ${e.message}`);
    }
  }
}

run();
