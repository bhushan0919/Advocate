# AdvD — Advocate Digital Court Diary & Case Management System

> **Tagline:** *"Every Case. Every Hearing. One Diary."*

AdvD is a production-grade, multi-tenant Legal SaaS application built to digitize and replace traditional handwritten Indian advocate court diaries while strictly guaranteeing zero cross-workspace data leakage between independent legal chambers.

---

## 🏗 System & Production Architecture

```
                                      +------------------------------------+
                                      |            Client Browser          |
                                      +-----------------+------------------+
                                                        |
                                       HTTPS Requests   |
                         +------------------------------+-----------------------------+
                         |                                                            |
                         v                                                            v
        +----------------------------------+                        +----------------------------------+
        |         NETLIFY FRONTEND         |                        |          RENDER BACKEND          |
        |      (React 18 + Vite + TS)      |                        |    (Node.js + Express + TS)      |
        |----------------------------------|                        |----------------------------------|
        | - SPA Client-Side Routing        |  REST API Calls        | - JWT Authentication & RBAC      |
        | - Tailored Legal Design System   |----------------------->| - Multi-Tenant Workspace Guard   |
        | - Full Marathi Devanagari i18n   |  (Bearer Token / CORS) | - Dynamic Daily Court Diary      |
        | - Responsive Dashboard & Register|                        | - Hearing Calendar Engine        |
        | - PDF & Excel Report Triggers    |                        | - Automated Reminders Scheduler  |
        +----------------------------------+                        +----------------+-----------------+
                                                                                     |
                                                        +----------------------------+----------------------------+
                                                        |                                                         |
                                                        v                                                         v
                                      +------------------------------------+                    +------------------------------------+
                                      |        MONGODB ATLAS (Cloud)       |                    |         CLOUDINARY (Cloud)         |
                                      |------------------------------------|                    |------------------------------------|
                                      | - Multi-tenant compound indexed    |                    | - Advocate headshot storage        |
                                      |   isolated legal collections       |                    | - Automatic face-aware crop        |
                                      | - Activity logs & audit trails     |                    | - Optimized WebP transformations   |
                                      +------------------------------------+                    +------------------------------------+
```

---

## 📂 Production Folder Structure

The repository is structured as a clean, decoupled monorepo:

```
advd/
├── backend/                             # Express REST API (Node.js & TypeScript)
│   ├── assets/                          # Static assets required for report rendering
│   │   └── fonts/                       # Unicode Devanagari fonts (Nirmala.ttf, NirmalaB.ttf)
│   ├── src/
│   │   ├── config/                      # Database (Atlas), Cloudinary, and Environment setup
│   │   ├── controllers/                 # Express route controllers (Auth, Cases, Diary, etc.)
│   │   ├── middleware/                  # JWT Auth, Multi-tenant guard, RBAC, File upload, Validation
│   │   ├── models/                      # Mongoose models & strict multi-tenant schemas
│   │   ├── routes/                      # Modular REST API routes mounted under /api
│   │   ├── scripts/                     # Seed scripts & avatar migration utilities
│   │   ├── services/                    # Business logic (Reminders, Scheduler, PDFKit, ExcelJS)
│   │   ├── test/                        # Automated test suites (300+ test cases)
│   │   ├── utils/                       # Date utilities, token generators, and helpers
│   │   ├── app.ts                       # Express application initialization & CORS
│   │   └── server.ts                    # Production entrypoint & graceful shutdown
│   ├── uploads/                         # Ephemeral document storage (.gitkeep, ignored in Git)
│   ├── .env                             # Local environment variables (ignored in Git)
│   ├── .env.example                     # Environment template for Render deployment
│   ├── .gitignore                       # Backend ignore rules
│   ├── package.json                     # Backend dependencies & npm scripts
│   └── tsconfig.json                    # TypeScript configuration for NodeNext
│
├── frontend/                            # Single-Page Web Client (React 18 & Vite)
│   ├── public/                          # Static web assets (SVG Favicon)
│   │   └── vite.svg
│   ├── src/
│   │   ├── api/                         # Centralized Axios client & typed endpoint APIs
│   │   ├── components/                  # UI components, layout shell, Topbar, Sidebar
│   │   ├── context/                     # AuthContext (workspace state) & Theme/Language context
│   │   ├── i18n/                        # i18next internationalization configuration
│   │   ├── locales/                     # Translation dictionaries (English & Marathi Devanagari)
│   │   ├── pages/                       # Route views (Cases, Diary, Hearings, Tasks, Settings)
│   │   ├── types/                       # Shared TypeScript models and API interfaces
│   │   ├── App.tsx                      # Root route declarations & QueryClientProvider
│   │   ├── index.css                    # Tailwind CSS directives & global typography
│   │   ├── main.tsx                     # DOM render entrypoint
│   │   └── vite-env.d.ts                # Vite environment typings
│   ├── .env                             # Local frontend environment (ignored in Git)
│   ├── .env.example                     # Environment template for Netlify deployment
│   ├── .gitignore                       # Frontend ignore rules
│   ├── index.html                       # HTML entry point with Google Fonts
│   ├── netlify.toml                     # Netlify build, SPA rewrite, & security headers
│   ├── package.json                     # Frontend dependencies & npm scripts
│   ├── postcss.config.js                # PostCSS plugins
│   ├── tailwind.config.js               # Legal theme design tokens & colors
│   ├── tsconfig.json                    # TypeScript configuration for Vite
│   └── vite.config.ts                   # Vite bundler configuration & local dev proxy
│
├── .gitignore                           # Repository-wide ignore rules
├── netlify.toml                         # Monorepo root Netlify configuration
├── package.json                         # Root orchestration scripts (build, test, dev)
├── README.md                            # Comprehensive project & deployment documentation
├── render.yaml                          # Render Blueprint for automated Web Service provisioning
├── run.bat                              # One-click Windows launch script
└── run.ps1                              # One-click PowerShell launch script
```

---

## 🚀 Step-by-Step Production Deployment Guide

### Phase 1: Deploy Backend on Render

1. **Log in to [Render](https://render.com/)** and click **New + > Web Service**.
2. Connect your Git repository (`advd`).
3. Set the following build settings:
   - **Name**: `advd-backend` (or your preferred name)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Under **Environment Variables**, add:
   | Key | Example Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `10000` *(Render sets this automatically)* | Port Express listens on |
   | `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/advd?retryWrites=true&w=majority` | MongoDB Atlas URI |
   | `JWT_ACCESS_SECRET` | *(64-character random string)* | Access token secret |
   | `JWT_REFRESH_SECRET` | *(64-character random string)* | Refresh token secret |
   | `CORS_ORIGIN` | `https://your-app.netlify.app` | Netlify frontend URL |
   | `APP_URL` | `https://your-app.netlify.app` | Used for invitations & reset links |
   | `API_URL` | `https://advd-backend.onrender.com` | Public backend URL |
   | `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | Cloudinary credentials |
   | `CLOUDINARY_API_KEY` | `your_api_key` | Cloudinary credentials |
   | `CLOUDINARY_API_SECRET` | `your_api_secret` | Cloudinary credentials |
5. Click **Create Web Service**. Once deployed, copy your Render public URL (e.g., `https://advd-backend.onrender.com`).

---

### Phase 2: Deploy Frontend on Netlify

1. **Log in to [Netlify](https://www.netlify.com/)** and click **Add new site > Import an existing project**.
2. Connect the same Git repository (`advd`).
3. Set the following build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Under **Site configuration > Environment variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://advd-backend.onrender.com` | Your deployed Render backend URL |
5. Click **Deploy Site**.
   - Netlify will run `npm run build` and deploy the single-page application.
   - All SPA client-side routes (e.g. `/cases`, `/diary`, `/calendar`, `/settings`) are automatically rewritten to `/index.html` via `netlify.toml`.
6. Once deployed, copy your Netlify site URL (e.g., `https://your-app.netlify.app`) and update the `CORS_ORIGIN` and `APP_URL` environment variables in your Render Dashboard.

---

## 💻 Local Development Workflow

### Prerequisites
- Node.js v18+ (tested on Node.js v22)
- MongoDB instance running locally on `localhost:27017` or MongoDB Atlas URI

### 1-Click Launch (Windows)
Double-click `run.bat` or run:
```powershell
.\run.ps1
```

### Manual Command-Line Launch
```bash
# Install dependencies for both apps
npm run install:all

# Start backend dev server (Port 5000)
npm run dev:backend

# Start frontend dev server (Port 5173 with Vite proxy)
npm run dev:frontend
```

### Run Automated Backend Test Suites
```bash
npm run test:backend
```

---

## 🧪 Pre-Configured Fictional Test Accounts

| Role | Name | Email | Password | Chamber Workspace |
|---|---|---|---|---|
| **Advocate (Owner)** | Adv. Rajesh Sharma | `rajesh.sharma@advd-demo.in` | `Advocate@123` | Sharma & Associates Chambers |
| **Clerk (Staff)** | Suresh Verma | `suresh.clerk@advd-demo.in` | `Clerk@123` | Sharma & Associates Chambers |
| **Advocate (Owner)** | Adv. Priya Deshmukh | `priya.deshmukh@advd-demo.in` | `Advocate@123` | Deshmukh Law Chambers (*Isolated*) |

*(The login screen also features 1-Click Quick Demo sign-in buttons for immediate evaluator testing.)*
