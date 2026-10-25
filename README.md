# Lumina Studio — Full-Stack Storefront

Modern full-stack ecommerce storefront exported from **StockCraft SaaS**:
* **Frontend:** Next.js 14 App Router (Tailored for **Vercel** Edge CDN)
* **Backend:** Python FastAPI REST API (Tailored for **Render** Web Service)
* **Database & Storage:** Supabase PostgreSQL & S3-compatible CDN

---

## 🏗️ Repository Architecture

```
├── backend/                     # Python FastAPI Backend (Deploy to Render)
│   ├── app/
│   │   ├── main.py              # API routes: /health, /api/store, /api/products, /api/orders
│   │   └── models.py            # Pydantic data schemas
│   ├── requirements.txt         # fastapi, uvicorn, pydantic, supabase, python-dotenv
│   ├── run.py                   # Local server entrypoint
│   └── .env.example
│
├── frontend/                    # Next.js 14 Frontend (Deploy to Vercel)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   └── page.tsx         # Responsive catalog, bag drawer, lightbox modal
│   │   └── lib/
│   │       ├── api.ts           # Typed client calling the FastAPI backend
│   │       └── supabase.ts      # Realtime inventory updates
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── README.md
```

---

## 🚀 1. Deploy Backend to Render (Python FastAPI)

1. Go to [Render Dashboard](https://dashboard.render.com/) ➔ **New +** ➔ **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   * **Root Directory:** `backend`
   * **Runtime:** `Python 3`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. In **Environment Variables**, add:
   * `SUPABASE_URL` = your-supabase-project-url
   * `SUPABASE_SECRET_KEY` = your-supabase-secret-or-service-role-key
   * `CORS_ORIGINS` = `*`
5. Click **Create Web Service**. Once deployed, copy your service URL (e.g., `https://lumina-api.onrender.com`).

---

## 🚀 2. Deploy Frontend to Vercel (Next.js 14)

1. Go to [Vercel](https://vercel.com/new), select this repository, and click **Import**.
2. In the project setup screen:
   * **Root Directory:** click Edit and select `frontend`
   * **Framework Preset:** `Next.js`
3. In **Environment Variables**, add:
   * `NEXT_PUBLIC_API_URL` = `https://lumina-api.onrender.com` *(Your Render backend URL)*
   * `NEXT_PUBLIC_SUPABASE_URL` = your-supabase-project-url
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your-supabase-anon-key
4. Click **Deploy**. Your live storefront will be published globally!

---

## 💻 3. Run Locally

### Start Python FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
python run.py
```
*Backend runs on [http://localhost:8000](http://localhost:8000). Interactive Swagger docs at [http://localhost:8000/docs](http://localhost:8000/docs).*

### Start Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on [http://localhost:3000](http://localhost:3000).*
