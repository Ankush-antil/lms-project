# LMS Project

## 🚀 Getting Started

This project is a MERN stack Learning Management System.

### Prerequisites

- Node.js installed
- MongoDB installed and running locally

### 🛠️ Installation & Setup

The project is already set up. If you need to restart it:

1.  **Install Dependencies** (if not done):
    ```bash
    npm install
    cd client && npm install
    cd ../server && npm install
    ```

2.  **Start the App**:
    In the root folder `lms-project/`:
    ```bash
    npm run dev
    ```
    This will start both:
    - **Frontend**: `http://localhost:5173`
    - **Backend**: `http://localhost:5000`

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
