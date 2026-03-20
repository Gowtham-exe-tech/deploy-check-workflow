# Deployment Guide

Complete step-by-step guide to deploy Halleyx Workflow Engine to production.

## Architecture

```
Browser → Vercel (Frontend) → Render (Backend API) → Supabase (PostgreSQL)
```

---

## Step 1 — Supabase (Database)

1. Go to https://supabase.com → Sign up with GitHub
2. Click **New Project**
   - Name: `halleyx-workflow-engine`
   - Database Password: create a strong one — **save it**
   - Region: Southeast Asia (Singapore)
3. Wait 2 minutes for setup
4. Go to **Settings → Database**
5. Scroll to **Connection string → URI tab**
6. Copy the URL — looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with your actual password

---

## Step 2 — Push code to GitHub

```bash
cd halleyx-workflow-engine
git add .
git commit -m "feat: production deployment ready"
git push
```

---

## Step 3 — Render (Backend)

1. Go to https://render.com → Sign up with GitHub
2. Click **New + → Web Service**
3. Connect your `halleyx-workflow-engine` repo
4. Settings:

| Field | Value |
|-------|-------|
| Name | `halleyx-workflow-engine-api` |
| Region | Singapore |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Plan | Free |

5. Add Environment Variables:

| Key | Value |
|-----|-------|
| `PYTHON_VERSION` | `3.11.0` |
| `DATABASE_URL` | your Supabase connection string |

6. Click **Create Web Service**
7. Wait 3-5 minutes
8. Your backend URL: `https://halleyx-workflow-engine-api.onrender.com`
9. Verify: open `https://halleyx-workflow-engine-api.onrender.com/health`
   - Should show: `{"status":"ok","version":"1.0.0"}`

---

## Step 4 — Seed the database

Run this on your local machine to load sample workflows into Supabase:

**macOS/Linux:**
```bash
cd backend
source venv/bin/activate
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres"
python seed.py
```

**Windows PowerShell:**
```powershell
cd backend
venv\Scripts\activate
$env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres"
python seed.py
```

Should show:
```
✓ Seeded: Expense Approval workflow
✓ Seeded: Employee Onboarding workflow
```

---

## Step 5 — Vercel (Frontend)

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New → Project**
3. Import `halleyx-workflow-engine`
4. Settings:

| Field | Value |
|-------|-------|
| Framework Preset | `Vite` |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

5. Add Environment Variable:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://halleyx-workflow-engine-api.onrender.com` |

6. Click **Deploy**
7. Your frontend URL: `https://halleyx-workflow-engine.vercel.app`

---

## Step 6 — Update CORS on Render

After getting your Vercel URL, add it to Render:

1. Go to Render → your service → **Environment**
2. Add variable:

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://halleyx-workflow-engine.vercel.app` |

3. Click **Save** → service will redeploy automatically

---

## Step 7 — Verify everything works

| Check | URL | Expected |
|-------|-----|----------|
| Backend health | `https://halleyx-workflow-engine-api.onrender.com/health` | `{"status":"ok"}` |
| API docs | `https://halleyx-workflow-engine-api.onrender.com/docs` | Swagger UI |
| Frontend | `https://halleyx-workflow-engine.vercel.app` | App with 2 workflows |

---

## Important — Render free tier

Render free tier spins down after 15 minutes of inactivity.
First request after sleep takes 30-60 seconds to wake up.

**Before your demo:** open the health URL 2 minutes early to wake the server:
```
https://halleyx-workflow-engine-api.onrender.com/health
```
