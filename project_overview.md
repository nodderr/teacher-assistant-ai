# Project Overview: TeacherAssistant

TeacherAssistant is an AI-powered desktop application designed to assist educators in creating examination papers, solving existing papers, and evaluating student submissions automatically.

## 🏗️ Architecture

The application follows a client-server architecture, recently packaged as a desktop application.

- **Frontend**: React (Vite) + Tailwind CSS, wrapped in Electron for desktop distribution.
- **Backend**: Python (FastAPI) server, handling AI logic, file processing, and database interactions.
- **Database & Storage**: Supabase (PostgreSQL + Objects) for storing metadata and file artifacts (PDFs, Markdown).
- **AI Engine**: Google Gemini (`gemini-3-flash-preview` configured in code) for multimodal reasoning.

## 🚀 Key Features

### 1. Paper Solver (`/solve`)
- **Input**: Uploads Question Papers (PDF or Images).
- **Process**: 
    - Converts PDF pages to images using `pypdfium2`.
    - Streams images to Gemini with a "Solver System Prompt".
    - Generates step-by-step LaTeX/Markdown solutions page-by-page.
- **Output**: Real-time streaming response of the solution.

### 2. Paper Generator (`/generate-paper`)
- **Input**: Class Level (e.g., "Class 10"), Subject, Board (CBSE/ICSE/IB), Difficulty, Chapters.
- **Process**:
    - Selects board-specific prompting templates (defined in `solver.py`).
    - Uses Gemini to generate a structured exam paper following board formatting rules.
- **Output**: Returns the generated paper text and saves it as a Markdown file.

### 3. Student Evaluation (`/evaluate`)
- **Input**: Student Submission (PDF/Images) + Reference Solution (Text).
- **Process**: 
    - Renders student submission pages to images.
    - Sends both the Reference Solution and Student Images to Gemini.
    - AI compares answers and generates a tabular "Student Evaluation Report".
    - `regex` parsing extracts the numerical score from the AI response.
- **Output**: Detailed Feedback Report + Final Score.

### 4. Desktop Integration
- **Electron**: Wraps the web app.
- **Squirrel.Windows**: Handles installation and auto-updates.
- **Settings**: Local state management for Themes, User Profile, and Data cleanup.

## 📂 File Structure Highlights

### Frontend (`frontend/src`)
- `App.jsx`: Main routing and layout logic.
- `components/Dashboard.jsx`: Central workspace for Solving and Evaluating.
- `components/CreatePaper.jsx`: Form interface for the Generator.
- `components/Settings.jsx`: Application preferences.

### Backend (`backend/`)
- `main.py`: FastAPI routes and request handling.
- `solver.py`: 
    - **Core AI Logic**: Configures Gemini client.
    - **Prompts**: Contains extensive system prompts for `SOLVER`, `EVALUATOR`, and `GENERATORS` (CBSE/ICSE/IB).
- `db.py`: Interface for Supabase Storage and Database operations.

## 🔧 AI Configuration
- **Model**: The project is currently configured to use `gemini-3-flash-preview`.
- **Safety**: Safety filters are explicitly disabled (`BLOCK_NONE`) to ensure academic content isn't falsely flagged.
- **Prompts**: Specialized prompts enforce strict LaTeX formatting (`\boxed{}`) and specific board layouts (HTML/Markdown headers).
