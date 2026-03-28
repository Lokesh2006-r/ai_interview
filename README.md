# Bossed AI Interview Platform 🚀

Bossed AI is a modern, AI-powered interview simulation platform designed to help candidates prepare for their next big career move.

## ✨ Features
- **AI-Powered Simulator**: Real-time conversation with multiple interviewer personas using Google Gemini AI.
- **Dynamic Dashboard**: Track your performance metrics and interview history.
- **Secure Authentication**: Integrated with Google Sign-In and local email/password login.
- **Clean Architecture**: Simple and lightweight FastAPI backend with a beautiful HTML/CSS/JS frontend.

## 🛠️ Technology Stack
- **Frontend**: HTML5, CSS3 (Vanilla), Vanilla JavaScript.
- **Backend**: Python (FastAPI), Google Gemini API.
- **AI Engine**: Google Gemini 1.5 Flash.

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.9+
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 2. Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment: `py -m venv venv` or `python -m venv venv`.
3. Activate it: `.\venv\Scripts\activate`.
4. Install dependencies: `pip install -r requirements.txt`.
5. Create a `.env` file with your `GEMINI_API_KEY`.

```env
GEMINI_API_KEY=your_key_here
```

6. Start the backend: `uvicorn app.main:app --reload`.

### 3. Frontend Setup
1. Simply serve the `frontend` directory using any local server (like `http-server`).
2. Example: `npx http-server ./frontend -p 3001`.

## 📄 License
This project is open-source. Feel free to contribute!
