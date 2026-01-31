# OpenChatLLM

OpenChatLLM is a robust, full-stack AI chat application that allows you to interact with various LLM providers (OpenAI, Anthropic, Google Gemini, and vLLM) through a unified, beautiful interface.

## Features

- **Multi-Provider Support**: Switch between OpenAI, Anthropic, Gemini, and local vLLM instances seamlessly.
- **Real-time Streaming**: Enjoy fast, interactive chat experiences with real-time response streaming.
- **Conversation Management**: Save, view, rename, and delete your chat history.
- **Settings Sync**: Your API keys and preferences are securely stored and synced across sessions.
- **Modern UI**: A clean, responsive design built with React and Vite.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Lucide-React.
- **Backend**: FastAPI, MongoDB (via Beanie/Motor), Python 3.x.
- **Authentication**: JWT-based secure authentication.

---

## Setup Instructions

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Create a `.env` file in the `backend` directory and add your MongoDB URI:
   ```env
   MONGODB_URL=mongodb://localhost:27017/openchatllm
   JWT_SECRET=your_jwt_secret_key
   ```

5. **Run the server**:
   ```bash
   python -m app.main
   ```
   The backend will be available at `http://localhost:8000`.

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

---

## License

This project is licensed under the MIT License.
