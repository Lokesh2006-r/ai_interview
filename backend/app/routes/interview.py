from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import os

router = APIRouter()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

class InterviewRequest(BaseModel):
    role: str
    company: str
    context: str = ""
    history: list = []

@router.post("/ask")
async def ask_interviewer(req: InterviewRequest):
    # Construct a persona prompt
    prompt = f"Act as a senior interviewer from {req.company} hiring for a {req.role} role. "
    prompt += "Provide exactly one insightful question and don't include meta-descriptions. "
    prompt += f"Context: {req.context}. "
    
    # Simple history management for Gemini Chat
    try:
        chat = model.start_chat(history=[]) # You can implement real history tracking later
        response = chat.send_message(prompt)
        return {"answer": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
