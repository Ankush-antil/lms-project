# LMS Project

## 🚀 Getting Started

This project is a MERN stack Learning Management System.

### Prerequisites

- Node.js installed
- MongoDB installed and running locally

### 🛠️ Installation & Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    # This will install root, client, and server dependencies
    ```

2.  **Start Development**:
    ```bash
    npm run dev
    ```
    This will start both the Frontend (`http://localhost:5173`) and Backend (`http://localhost:5000`).

3.  **Production Build & Start**:
    ```bash
    # Build the frontend
    npm run build

    # Start the production server
    npm start
    ```
    In production, the server serves the frontend from `client/dist`.

### 🔑 Default Login Credentials

You can use these credentials to access different panels (Mock Login):

*   **Admin**:
    *   Email: `admin@lms.com`
    *   Password: `admin`
    *   (Access to Dashboard, Students, Teachers, Test Creation)

*   **Teacher**:
    *   Email: `teacher@lms.com`
    *   Password: `teacher`

*   **Student**:
    *   Email: `student@lms.com`
    *   Password: `student`

### 📂 Project Structure

- **`/client`**: React Frontend (Vite + Tailwind)
- **`/server`**: Express Backend (Node + MongoDB)
- **`LMS_ARCHITECTURE.md`**: Detailed architectural documentation.

### ✨ Features Implemented

*   **Admin Dashboard**: comprehensive stats.
*   **Student & Teacher Management**: detailed lists and profiles.
*   **Create Test Flow**: 3-step wizard with Rich Text Editor.
*   **Tests List**: view all tests.

---
*Created by Antigravity*
