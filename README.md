# Hirvo AI Interview Platform 🚀

Hirvo AI is a modern, AI-powered interview simulation platform designed to help candidates prepare for their next big career move.

## ✨ Features
- **AI-Powered Simulator**: Real-time conversation with multiple interviewer personas using Google Gemini AI.
- **Dynamic Dashboard**: Track your performance metrics and interview history.
- **Secure Authentication**: Integrated with Google Sign-In and local email/password login.
- **Node.js/Express Backend**: Robust and scalable backend for handling user data and AI analysis.
- **MongoDB Atlas Integration**: Reliable cloud database for storing user profiles and simulation history.

## 🛠️ Technology Stack
- **Frontend**: HTML5, CSS3 (Vanilla), Vanilla JavaScript.
- **Backend**: Node.js (Express), MongoDB (Mongoose).
- **AI Engine**: Google Gemini 1.5 Flash.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v16+)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)
- MongoDB Atlas account (for database connection)

### 2. Backend Setup
1. Navigate to the `backend` directory.
2. Install dependencies: `npm install`.
3. Create a `.env` file with your credentials:

```env
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_key_here
```

4. Start the backend: `node server.js`.

### 3. Frontend Setup
1. Simply serve the `frontend` directory using any local server (like `serve`).
2. Example: `npx -y serve ./frontend -l 3001`.

## 📄 License
This project is open-source. Feel free to contribute!
