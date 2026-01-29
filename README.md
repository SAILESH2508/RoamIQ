# 🌅 RoamIQ - Premium AI Travel Companion

RoamIQ is a studio-grade, AI-powered travel orchestrator designed to transform the way you plan, experience, and remember your journeys. Featuring a stunning **Sunset Orange Glassmorphism UI**, RoamIQ integrates multi-modal AI capabilities to provide a seamless travel planning experience.

![RoamIQ Header](https://raw.githubusercontent.com/placeholder-path/header.png)

## ✨ Highlights

- **🤖 Intelligent Orchestrator**: Powered by Google Gemini 1.5 Flash for lightning-fast, context-aware travel advice.
- **🎨 Sunset Glassmorphism UI**: A premium, high-visibility orange theme with sophisticated blur effects and smooth animations.
- **🎙️ Voice-Activated Planning**: Integrated voice transcription and processing for hands-free interaction.
- **🖼️ Vision Analysis**: Upload photos of landmarks or destinations to get instant AI-powered insights and similar recommendations.
- **📅 Smart Itineraries**: Multi-day trip planning with budget management and sustainability scoring.
- **📊 AI Insights Dashboard**: Advanced analytics tracking your travel patterns and AI usage.

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Bootstrap 5, Styled Components, Axios |
| **Backend** | Flask (Python), Flask-JWT-Extended, Flask-CORS |
| **AI Engine** | Google Generative AI (Gemini), Multi-provider LLM Orchestrator |
| **Database** | SQLite (Development), SQLAlchemy ORM |
| **Styling** | Custom Vanilla CSS (Sunset Light Theme) |

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 16+
- Google Gemini API Key (or OpenAI/Anthropic)

### 1. Clone & Setup Backend
```bash
# Clone the repository
git clone https://github.com/yourusername/RoamIQ.git
cd RoamIQ

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements_windows.txt

# Setup environment variables
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
```

### 2. Setup Frontend
```bash
cd frontend
npm install
```

### 3. Launch
```bash
# Terminal 1: Backend
python run_backend.py

# Terminal 2: Frontend
cd frontend
npm start
```

## 📁 Project Architecture

```
RoamIQ/
├── backend/            # Flask API & AI Services
│   ├── routes/         # API Endpoints (Auth, AI, Travel)
│   ├── services/       # Core Logic & AI Orchestration
│   ├── models/         # Database Schemas
│   └── data/           # Knowledge bases & DB
├── frontend/           # React Single Page Application
│   ├── src/
│   │   ├── components/ # Modular UI Components
│   │   ├── contexts/   # Auth & Currency Global State
│   │   └── App.css     # Global Theme Overrides
└── scripts/            # Utility & Maintenance scripts
```

## 🔐 Environment Variables
A comprehensive list of configurable options can be found in [.env.example](.env.example). At minimum, you will need:
- `GOOGLE_API_KEY`: For Gemini-powered features.
- `SECRET_KEY`: For session management.
- `JWT_SECRET_KEY`: For token-based authentication.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---
*Built with ❤️ by the RoamIQ Team.*