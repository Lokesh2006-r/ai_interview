require('dotenv').config({ path: './.env' });

async function run() {
  const apiKey = process.env.GEMINI_API_KEY.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Available models:");
    if (data.models) {
        data.models.forEach(m => console.log(m.name));
    } else {
        console.log("Error response:", JSON.stringify(data));
    }
  } catch (e) {
    console.log("Fetch failed:", e.message);
  }
}

run();
