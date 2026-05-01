
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

## 🌐 Self-Hosting Options

You can deploy this application on any cloud provider that supports:
- Python Flask applications
- React static files
- PostgreSQL/SQLite databases

Popular options include:
- DigitalOcean
- AWS
- Google Cloud
- Azure
- Railway
- Heroku

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
