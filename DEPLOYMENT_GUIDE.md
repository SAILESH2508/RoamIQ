
# 🚀 Hosting RoamIQ for FREE (Alternatives to Vercel)

Since Vercel has limitations with Python backend deployments (especially with heavy AI libraries), we recommend using **Render** or **Railway**.

## ✅ Option 1: Render.com (Highly Recommended)

Render offers a generous **Free Tier** for both Python Web Services and React Static Sites.

### Step 1: Push Changes
Ensure you have pushed the latest code (including `render.yaml` and `requirements-render.txt`) to GitHub:
```bash
git add .
git commit -m "Add Render deployment config"
git push origin main
```

### Step 2: Deploy on Render
1.  **Sign Up/Login** at [render.com](https://render.com).
2.  Click **"New +"** -> **"Blueprint"**.
3.  Connect your GitHub repository (`SAILESH2508/RoamIQ`).
4.  Render will automatically detect the `render.yaml` file.
5.  Click **"Apply"** or **"Create Resources"**.

### Step 3: Configure Environment Variables
In the Render Dashboard for your **Backend Service**:
1.  Go to **Environment**.
2.  Add:
    *   `SECRET_KEY`: (Generate a random string)
    *   `OPENAI_API_KEY`: (Your OpenAI Key)
    *   `DATABASE_URL`: (Optional - see below)

### Step 4: Configure Frontend
1.  Once the Backend is deployed, copy its URL (e.g., `https://roamiq-backend.onrender.com`).
2.  Go to the **Frontend Static Site** settings on Render.
3.  Add Environment Variable:
    *   `REACT_APP_API_URL`: `https://roamiq-backend.onrender.com`
4.  **Redeploy** the Frontend so it picks up the API URL.

---

## 🗄️ Database Strategy (Critical)
The default SQLite database (`roamiq.db`) will reflect changes, but **data will be lost every time the free server restarts (spins down)**.

**For persistent data on the free tier:**
1.  Sign up for [Neon.tech](https://neon.tech) (Free Postgres Database).
2.  Create a project and copy the **Connection String** (`postgres://...`).
3.  In Render Backend Environment Variables, add:
    *   `DATABASE_URL`: `postgres://...` (Paste the Neon string)
4.  The app will automatically switch to using Postgres!

---

## ⚠️ Important Note on AI
We have created a lightweight `requirements-render.txt` that **excludes heavy AI libraries** (Torch, Transformers) to ensure it fits on the free tier.
*   The App will use **OpenAI API** for intelligence.
*   Local AI features (if any remains) might be disabled in production.
