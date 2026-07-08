
# 🚀 Hosting RoamIQ for FREE

This repository is designed for local development and self-hosting.

## 🏠 Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the backend
python run_backend.py
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install --legacy-peer-deps

# Start the development server
npm start
```

## 🌐 Cloud Deployment (Vercel + Render)

This codebase contains built-in configurations to support seamless deployment using **Vercel** (for the React Frontend) and **Render** (for the Flask Backend + PostgreSQL Database).

### 1. Backend Deployment (Render)

We have provided a Render Blueprint spec in `render.yaml` at the root of the project to automatically configure your Flask backend and a PostgreSQL database.

1. Create a [Render](https://render.com/) account.
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub/GitLab repository.
4. Render will automatically detect `render.yaml` and prompt you to create the services:
   - A PostgreSQL database (`roamiq-db`) will be provisioned.
   - A Web Service (`roamiq-backend`) running with Gunicorn will be created.
5. In the dashboard, configure the `GOOGLE_API_KEY` environment variable on the web service with your actual Google Gemini API Key.
6. Once deployed, note down the URL of your backend service (e.g., `https://roamiq-backend.onrender.com`).

### 2. Frontend Deployment (Vercel)

We have provided a `frontend/vercel.json` file to configure path rewrites, ensuring React Router SPA routing works smoothly without 404 errors on page reload.

1. Create a [Vercel](https://vercel.com/) account.
2. Click **Add New** -> **Project** and import your Git repository.
3. In the configuration settings:
   - Set the **Root Directory** to `frontend`.
   - Set the **Build Command** to `npm run build`.
   - Set the **Output Directory** to `build`.
4. Under **Environment Variables**, add:
   - `REACT_APP_API_URL`: Your deployed backend service URL (e.g., `https://roamiq-backend.onrender.com`).
5. Click **Deploy**. Vercel will build and serve your static React application.

---

## 🗄️ Database Strategy

The application uses SQLite by default for development. For production:
1. Set up a PostgreSQL database
2. Configure the `DATABASE_URL` environment variable
3. The app will automatically switch to PostgreSQL

---

## ⚠️ Important Note on AI

The application includes both local AI capabilities and OpenAI API integration:
- Local AI uses libraries like Torch, Transformers, etc.
- OpenAI API provides cloud-based AI features
- You can choose which to use based on your hosting environment
