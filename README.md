# ⚖️ Advocate Diary – Legal Practice Management System

<p align="center">
  A Digital Workspace for Advocates and Their Clerks
</p>

<p align="center">
  <a href="https://advocatedi.vercel.app/">
    <img src="https://img.shields.io/badge/Live_Demo-Visit_Application-2ea44f?style=for-the-badge" alt="Live Demo"/>
  </a>
  <img src="https://img.shields.io/badge/React-TypeScript-3178C6?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express.js-API-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
</p>

---

## 📌 Overview

**Advocate Diary** is a full-stack legal practice management application designed to help advocates organize and manage their daily professional activities through a centralized digital workspace.

The platform provides tools for managing clients, cases, hearing schedules, legal activities, and other practice-related information.

It supports individual workspaces for advocates and controlled access for their invited clerks, allowing legal professionals to collaborate while maintaining workspace-level data isolation.

The application is built using React, TypeScript, Node.js, Express.js, and MongoDB.

🔗 **Live Application:** https://advocatedi.vercel.app/

---

## 🎯 Problem Statement

Managing multiple legal cases, client records, hearing dates, and daily professional activities manually can become challenging for advocates.

Traditional paper-based diaries and disconnected records make it difficult to organize information and keep track of important legal activities.

Advocate Diary aims to simplify these workflows by providing a centralized digital solution for legal practice management.

---

## ✨ Key Features

- 🔐 **Authentication:** Secure user authentication using JWT.
- 👥 **Role-Based Access:** Dedicated access for Advocates and Clerks.
- 🏢 **Multi-Tenant Workspaces:** Individual workspaces for advocates.
- 🤝 **Clerk Invitations:** Advocates can invite clerks to collaborate.
- 🔒 **Workspace Isolation:** Clerk access is restricted to the associated advocate's workspace.
- 📁 **Case Management:** Organize and manage legal case information.
- 👤 **Client Management:** Maintain client-related information.
- 📅 **Hearing Management:** Manage important hearing dates and schedules.
- 📖 **Digital Diary:** Organize daily legal activities.
- 📊 **Dashboard:** Centralized interface for legal practice activities.
- 📱 **Responsive UI:** Accessible across desktop and mobile devices.

*Note: The feature list reflects the intended functional scope. Keep individual modules listed here only if they are working in the deployed application.*

---

## 👥 User Roles

### 1. Advocate

- Register and securely access an individual workspace.
- Manage workspace access.
- Invite clerks to collaborate.
- Access the advocate dashboard.
- Organize legal practice information.
- Manage cases, clients, and hearing schedules.

### 2. Clerk

- Access the workspace of the advocate who invited them.
- Assist with assigned legal practice activities.
- Access information according to their permissions.
- Work within the associated advocate's workspace.

---

## 🛠️ Technology Stack

### Frontend
- React.js
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express.js
- TypeScript
- REST APIs

### Database
- MongoDB
- Mongoose

### Authentication & Security
- JSON Web Tokens (JWT)
- Role-Based Access Control
- Workspace-Level Authorization

### Deployment
- Vercel – Frontend Hosting
- Add actual backend hosting provider here.

---

## 🏗️ System Architecture

The application follows a client-server architecture with workspace-aware authorization.

```text
               ┌────────────────────────┐
               │    React + TypeScript  │
               │       Frontend         │
               │       (Vercel)         │
               └───────────┬────────────┘
                           │
                        REST APIs
                           │
               ┌───────────▼────────────┐
               │      Express.js        │
               │    Node.js + TypeScript│
               │       Backend          │
               └───────────┬────────────┘
                           │
               ┌───────────▼────────────┐
               │ Authentication &       │
               │ Authorization          │
               │ JWT + Role + Workspace │
               └───────────┬────────────┘
                           │
               ┌───────────▼────────────┐
               │       MongoDB          │
               │      Mongoose          │
               └────────────────────────┘
```

---

## 🖥️ Application Screenshots

Add actual application screenshots inside the `screenshots/` directory.

### Application Dashboard

![Application Dashboard](screenshots/dashboard.png)

### Advocate Workspace

![Advocate Workspace](screenshots/advocate-workspace.png)

### Clerk Workspace

![Clerk Workspace](screenshots/clerk-workspace.png)

### Case Management

![Case Management](screenshots/case-management.png)

### Client Management

![Client Management](screenshots/client-management.png)

### Hearing Calendar

![Hearing Calendar](screenshots/hearing-calendar.png)

---

## 📂 Project Structure

```text
Advocate/
│
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── server.ts
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       └── package.json
│
├── screenshots/
├── package.json
├── .gitignore
└── README.md
```

*Illustrative structure. Adjust the folders to match the actual repository.*

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js
- npm
- MongoDB or MongoDB Atlas

### 1. Clone the Repository

```bash
git clone https://github.com/bhushan0919/Advocate.git

cd Advocate
```

### 2. Install Dependencies

```bash
npm install
```

If the repository uses separate package files for frontend and backend, install dependencies in their respective directories.

### 3. Environment Configuration

Create the required `.env` files using `.env.example` as a reference.

Configure the following values according to your application:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:5173
```

Frontend configuration:

```env
VITE_API_URL=http://localhost:5000
```

Never commit real credentials or production environment files.

### 4. Run the Application

Use the development scripts defined in the respective `package.json` files to start the backend and frontend.

---

## 🚀 Deployment

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Add actual hosting provider |
| Database | MongoDB Atlas, if applicable |

**Live Application:** https://advocatedi.vercel.app/

The frontend communicates with the backend through configured REST API endpoints.

---

## 🔐 Security Considerations

- JWT-based authentication.
- Role-based authorization.
- Protected backend routes.
- Workspace-level access control.
- Clerk-to-advocate association.
- Environment-based secret management.
- Tenant-aware database queries.

---

## 🔮 Future Enhancements

- Automated hearing reminders.
- Advanced case document management.
- Calendar synchronization.
- Case activity timeline.
- Advanced reporting and analytics.
- Document export and PDF generation.
- Additional collaboration features.

---

## 👨‍💻 Developer

**Bhushan Gavhane**

Computer Engineering Graduate | Full Stack Developer

- GitHub: https://github.com/bhushan0919

---

<p align="center">
  <b>Advocate Diary – Simplifying Legal Practice Through Technology. ⚖️</b>
</p>
