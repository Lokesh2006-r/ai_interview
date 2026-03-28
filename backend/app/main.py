from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import auth, interview
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Bossed AI Backend")

# Allow requests from your new frontend (localhost:3001)
origins = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview"])

@app.get("/")
async def root():
    return {"message": "Bossed AI Backend is LIVE!"}
