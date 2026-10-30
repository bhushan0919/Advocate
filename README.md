# AdvD — Digital Court Diary & Advocate Case Management System

> **Tagline:** *"Every Case. Every Hearing. One Diary."*

AdvD is a production-grade, multi-tenant SaaS web application built to digitize and replace traditional handwritten Indian advocate court diaries while strictly guaranteeing zero cross-workspace data leakage between independent legal chambers.

---

## 🏛 Multi-Tenant Architecture & Security Model

1. **Independent Chambers (Workspaces):**
   - Every advocate registers independently and automatically receives a private, cryptographically scoped Workspace.
   - All case records, clients, daily diary entries, documents, tasks, and hearing histories are stored with `workspaceId`.
   - Compound indexes ensure uniqueness per workspace (e.g. `{ workspaceId: 1, caseNumber: 1 }`), preventing cross-chamber collisions while allowing identical case numbering conventions.

2. **Server-Enforced Tenant Invariant:**
   - Client-provided `workspaceId` values are untrusted.
   - The backend JWT authentication guard and tenant middleware derive active membership strictly from the server-side database.
   - Any attempt by Advocate A to access Workspace B records via manipulated headers, URLs, or parameters is met with `403 Forbidden`.

3. **Clerk Access Control:**
   - Clerks cannot register independently to acquire a workspace.
   - Clerks enter the platform only via secure, expiring invitation tokens issued by an Advocate Workspace Owner.
   - Clerk accounts are permanently bound to the inviting advocate's workspace.

---

## 🛠 Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router 7, TanStack Query, React Hook Form, Zod.
- **Backend:** Node.js, Express.js, TypeScript, MongoDB & Mongoose 8, JWT, bcryptjs, Zod validation, Helmet, CORS.
- **Testing:** Supertest, Custom Automated Multi-Tenant Isolation Suite (27 test cases).

---

## 🚀 Quick Setup & Running Locally

### Prerequisites
- Node.js v18+ (verified on Node.js v22)
- MongoDB instance running locally on `localhost:27017` or a MongoDB Atlas connection string.

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds fictional test advocates & clerk accounts
npm run dev      # Starts API on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

### 3. Run Automated Multi-Tenant Test Suite
```bash
cd backend
npm test         # Runs 27 rigorous tenant isolation and auth tests
```

---

## 🧪 Pre-Configured Fictional Test Accounts

| Role | Name | Email | Password | Workspace |
|---|---|---|---|---|
| **Advocate (Owner)** | Adv. Rajesh Sharma | `rajesh.sharma@advd-demo.in` | `Advocate@123` | Sharma & Associates Chambers |
| **Clerk (Staff)** | Suresh Verma | `suresh.clerk@advd-demo.in` | `Clerk@123` | Sharma & Associates Chambers |
| **Advocate (Owner)** | Adv. Priya Deshmukh | `priya.deshmukh@advd-demo.in` | `Advocate@123` | Deshmukh Law Chambers (*Isolated*) |

*(Note: The login page includes 1-click Quick Demo account buttons for immediate evaluator testing.)*

---

## 📂 Project Structure

```
advd/
├── backend/
│   ├── src/
│   │   ├── config/              # MongoDB & Environment configs
│   │   ├── controllers/         # Auth & Workspace controllers
│   │   ├── middleware/          # Auth, Tenant isolation, Permissions, Validation
│   │   ├── models/              # Mongoose schemas (All 11 collections defined)
│   │   ├── routes/              # Express API routing
│   │   ├── scripts/             # Database seed fixtures
│   │   ├── test/                # Tenant isolation test runner
│   │   ├── utils/               # JWT, Token rotation, Transactions, Logger
│   │   ├── app.ts               # Express configuration & middleware
│   │   └── server.ts            # Entrypoint
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios client with auth interceptors & refresh rotation
│   │   ├── components/          # AppLayout, Sidebar, Topbar, MobileNav
│   │   ├── context/             # AuthContext (multi-tenant state)
│   │   ├── pages/               # Login, Register, AcceptInvite, Dashboard, Staff
│   │   ├── App.tsx              # Router & QueryClient
│   │   ├── main.tsx
│   │   └── index.css            # Tailwind CSS
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── package.json
```

