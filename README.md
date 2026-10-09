<div align="center">
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="logo" width="80" height="80" />
  <h1>🔒 OmniVault</h1>
  <p><b>Zero-Knowledge Encrypted File Vault with AI Security Intelligence</b></p>

  <p>
    <img src="https://img.shields.io/badge/version-1.1.0-blue.svg?style=for-the-badge&logo=appveyor" alt="Version" />
    <img src="https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen.svg?style=for-the-badge&logo=nodedotjs" alt="Node" />
    <img src="https://img.shields.io/badge/AI-Groq%20%7C%20Llama%203-ff6b35.svg?style=for-the-badge&logo=openai&logoColor=white" alt="AI" />
    <img src="https://img.shields.io/badge/encryption-AES--256--GCM-6366f1.svg?style=for-the-badge&logo=letsencrypt&logoColor=white" alt="Encryption" />
    <img src="https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge" alt="License" />
  </p>
</div>

<hr />

## 🌟 Overview

**OmniVault** is a premium, full-stack encrypted file vault built on a **Zero-Knowledge Architecture**. Files are encrypted entirely inside the user's browser using **AES-256-GCM** before a single byte is sent to the server — meaning the server never sees, processes, or stores any plaintext data. Even if the server were compromised, all stored data remains completely unreadable.

Files are shared via time-limited, passphrase-protected **Vault Links** with configurable download caps and instant revocation. Every access event is tracked via a comprehensive **Audit Log**.

Now supercharged with an **AI Security Layer** powered by Groq (Llama 3) — OmniVault automatically analyzes uploaded files, recommends the safest sharing settings, generates cryptic passphrase hints, and falls back gracefully to a smart rule-based engine when offline.

---

## ✨ Key Features

### 🔑 Authentication & Authorization
- JWT-based stateless authentication
- Secure registration and login with bcrypt password hashing
- Redis-backed token blacklisting for instant logout invalidation
- Protected routes on both frontend and backend

### 🔐 File Security
- **AES-256-GCM** client-side encryption via the Web Crypto API
- Zero-knowledge: server only receives and stores the encrypted blob
- Encryption key is derived from the user's passphrase — never stored anywhere
- Unique encrypted file identifiers stored in MongoDB

### 📤 File Management
- Upload encrypted files with custom passphrase protection
- Secure client-side decryption on download
- View and manage all uploaded files from the Dashboard
- Delete files with automatic storage cleanup

### 🔗 Vault Links & Controlled Sharing
- Generate unique, shareable Vault Links per file
- Configurable **download limit** (1 to 50 downloads)
- Configurable **expiry time** (15 minutes to 7 days)
- **Passphrase hint** shown to recipients before download
- **Instant link revocation** from the dashboard

### 📊 Audit Logging
- Every event is recorded: `UPLOADED`, `DOWNLOADED`, `LINK_ACCESSED`, `LINK_REVOKED`, `LINK_EXPIRED`, `FAILED_ATTEMPT`
- Logs include: IP address, user agent, timestamp, and actor
- Full audit trail viewable per file

### 🛡️ System Protection
- Rate limiting to prevent API abuse
- Helmet security headers on all responses
- CORS protection locked to the configured client origin
- Input validation middleware on all endpoints
- Centralized error handling — no sensitive data ever exposed in responses

### 🤖 AI Security Layer
- **Smart Security Recommender** — AI analyzes filename and size to suggest optimal download limit and expiry
- **AI Passphrase Hint Generator** — creates cryptic, poetic hints without revealing the actual passphrase
- Color-coded sensitivity badges: 🔴 High / 🟡 Medium / 🟢 Low
- Groq (Llama 3-8B) as the AI backend with **graceful rule-based fallback** when offline

---

## 🧠 AI Security Layer — Deep Dive

### 1. Smart Security Recommender

When a user selects a file to upload, OmniVault automatically sends only the **filename and file size** to the AI — never the file content. The AI evaluates the context and returns a security recommendation.

| File Example | AI Verdict | Suggested Settings |
|---|---|---|
| `tax_returns_2023.pdf` | 🔴 **High Sensitivity** | 1 download · 1 hour expiry |
| `nda_contract_signed.docx` | 🔴 **High Sensitivity** | 1 download · 1 hour expiry |
| `project_proposal_v2.pdf` | 🟡 **Medium Sensitivity** | 5 downloads · 24 hours expiry |
| `team_meeting_notes.txt` | 🟡 **Medium Sensitivity** | 5 downloads · 24 hours expiry |
| `funny_cat_video.mp4` | 🟢 **Low Sensitivity** | 10 downloads · 7 days expiry |
| `wallpaper_collection.zip` | 🟢 **Low Sensitivity** | 10 downloads · 7 days expiry |

The badge also displays the **AI's reasoning** (e.g., *"Financial document detected — strict limits applied"*) and labels the auto-filled dropdowns with `🤖 suggested`. The user can override at any time.

### 2. AI Passphrase Hint Generator

After typing a passphrase, a `✨ AI Generate Hint` button appears. One click sends the passphrase to Groq which crafts a **cryptic, memorable hint** — without including any part of the actual passphrase.

```
Passphrase:  "BlueSky2024"
AI Hint:     "Where the horizon never ends, the year begins anew."

Passphrase:  "MyDog$Max99"
AI Hint:     "The loyal one, aged by two digits past a century."
```

The hint is stored with the vault link and shown to recipients before they attempt to decrypt — helping them remember without ever exposing the secret.

### 3. Rule-Based Fallback Engine

If `GROQ_API_KEY` is not set or the Groq API is unavailable, a smart fallback activates automatically using keyword matching:

- **High-risk keywords**: `tax`, `passport`, `ssn`, `bank`, `salary`, `contract`, `medical`, `kyc`, `nda`, `credentials`, `private`
- **Low-risk keywords**: `meme`, `fun`, `cat`, `dog`, `music`, `photo`, `wallpaper`, `game`, `clip`
- Everything else → Medium sensitivity defaults

The application works perfectly with zero configuration.

### AI Request Flow

```
USER selects file
       │
       ▼
Upload.jsx  ──► POST /api/ai/security-suggest ──► ai.controller.js
                                                         │
                                               GROQ_API_KEY set?
                                               ┌──────────────────┐
                                             Yes                   No
                                               │                   │
                                        Groq Llama 3         Rule-based
                                        API Call             Fallback
                                               │                   │
                                               └─────────┬─────────┘
                                                         │
                                    { sensitivity, downloadLimit,
                                      expiresInMinutes, reason, badge }
                                                         │
                                                         ▼
                              Upload.jsx shows badge + auto-fills dropdowns
```

---

## 🧱 Tech Stack

### 🌐 Frontend
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)

### 🖥️ Backend
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

### 🗄️ Database, Cache & Storage
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS_S3-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

### 🔒 Security & Utilities
- **AES-256-GCM** — client-side encryption via Web Crypto API
- **bcryptjs** — secure password hashing
- **Multer** — secure file upload interception
- **Helmet** — HTTP security headers
- **express-rate-limit** — API abuse prevention
- **express-validator** — input sanitization
- **Winston + Morgan** — structured logging

### 🤖 AI & Intelligence
![Groq](https://img.shields.io/badge/Groq-ff6b35?style=for-the-badge&logo=openai&logoColor=white)
![Llama3](https://img.shields.io/badge/Llama_3_8B-6366f1?style=for-the-badge&logo=meta&logoColor=white)
- Rule-based fallback engine (keyword + heuristic matching)
- Smart expiry snapping to valid time slots

---

## 🏗️ System Architecture

```
# ===========================
# CLIENT LAYER (Frontend)
# ===========================
┌──────────────────────────────┐
│        React + Vite          │
│      Tailwind CSS UI         │
│   Axios + Web Crypto API     │
└──────────────┬───────────────┘
               │  HTTPS / REST
               ▼

# ===========================
# BACKEND API GATEWAY
# ===========================
┌─────────────────────────────────────────────┐
│           Node.js + Express.js              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │       Authentication Layer          │   │
│  │  JWT Tokens + Redis Blacklist       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │       File Management               │   │
│  │  Upload / Download / Delete / Audit │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │       Vault Link Engine             │   │
│  │  Generate / Revoke / Expiry / Caps  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │       AI Security Layer             │   │
│  │  Groq Llama 3 + Rule-based Fallback │   │
│  │  Security Recommender + Hint Gen    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │       Security Middleware           │   │
│  │  Helmet / Rate Limit / Validation   │   │
│  └─────────────────────────────────────┘   │
└──────────────┬──────────────────────────────┘
               │
               ▼

# ===========================
# DATA & STORAGE LAYER
# ===========================
┌─────────────────────────────────────────────┐
│                 Data Layer                   │
│                                             │
│  MongoDB                                    │
│  ├─ User profiles                           │
│  ├─ File metadata (no plaintext content)    │
│  ├─ Audit logs (every access event)         │
│  └─ Vault tokens                            │
│                                             │
│  Redis                                      │
│  └─ JWT blacklist (instant logout)          │
│                                             │
│  AWS S3 / Local Filesystem                  │
│  └─ Encrypted .bin blobs (AES-256-GCM)      │
└─────────────────────────────────────────────┘
```

---

## 🔄 Security Flows

### Authentication Flow
```
User registers → bcrypt hashes password → stored in MongoDB
User logs in   → JWT issued → stored client-side (localStorage)
Every request  → JWT verified by auth.middleware.js
User logs out  → JWT added to Redis blacklist → instantly invalidated
```

### Upload & Encryption Flow
```
User selects file
       ↓
AI analyzes filename → recommends security settings (🔴🟡🟢)
       ↓
User sets passphrase → optionally generates AI hint
       ↓
Browser encrypts file with AES-256-GCM (Web Crypto API)
       ↓
Encrypted blob uploaded to server — server never sees plaintext
       ↓
Blob stored in S3 / Local Storage, metadata saved to MongoDB
       ↓
Vault Link generated with token, download cap, expiry, and hint
```

### Download & Decryption Flow
```
Recipient opens Vault Link
       ↓
Server validates: not revoked, not expired, under download cap
       ↓
Encrypted blob streamed from storage to browser
       ↓
Recipient enters passphrase
       ↓
Browser decrypts using AES-256-GCM — server never sees key
       ↓
File saved to device
```

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `POST` | `/api/auth/logout` | Logout and blacklist JWT |
| `GET` | `/api/auth/me` | Get current user profile |
| `POST` | `/api/files/upload` | Upload encrypted file |
| `GET` | `/api/files` | List all files owned by user |
| `DELETE` | `/api/files/:fileId` | Delete a file |
| `GET` | `/api/files/:fileId/audit` | Get audit log for a file |
| `PATCH` | `/api/files/:fileId/revoke` | Revoke vault link |
| `POST` | `/api/vault/:fileId/generate` | Generate a new vault link |
| `GET` | `/api/vault/:vaultToken` | Get vault file info (public) |
| `POST` | `/api/vault/:vaultToken/download` | Download encrypted blob |
| `POST` | `/api/ai/security-suggest` | AI security recommendation |
| `POST` | `/api/ai/passphrase-hint` | AI passphrase hint generator |
| `GET` | `/api/health` | Server health check |

---

## 🗂️ Project Structure

### 🖥️ Backend
```
server/
├── config/
│   ├── db.js                  # MongoDB connection
│   ├── redis.js               # Redis client + fallback
│   └── s3.js                  # AWS S3 / local filesystem abstraction
├── controllers/
│   ├── auth.controller.js     # Register, login, logout, profile
│   ├── file.controller.js     # Upload, list, delete, audit, revoke
│   ├── vault.controller.js    # Generate link, get info, download
│   └── ai.controller.js       # Security suggest, passphrase hint
├── middlewares/
│   ├── auth.middleware.js     # JWT verification
│   ├── rateLimit.middleware.js# API rate limiting
│   ├── upload.middleware.js   # Multer config
│   └── validate.middleware.js # Input validation
├── models/
│   ├── User.model.js          # User schema
│   ├── File.model.js          # File metadata schema
│   └── AuditLog.model.js      # Audit event schema
├── routes/
│   ├── auth.routes.js
│   ├── file.routes.js
│   ├── vault.routes.js
│   └── ai.routes.js
├── utils/
│   ├── logger.js              # Winston structured logging
│   └── generateVaultLink.js   # Vault token generator
├── local-storage/             # Encrypted blobs (when not using S3)
├── logs/                      # Winston log files
├── app.js                     # Express app setup
└── server.js                  # Entry point
```

### 🌐 Frontend
```
client/src/
├── api/
│   └── axios.js               # Axios instance + JWT interceptor
├── components/
│   ├── Navbar.jsx             # Navigation with auth state
│   ├── FileUploader.jsx       # Drag-and-drop file selector
│   ├── VaultLinkCard.jsx      # Displays generated vault link
│   ├── DownloadGate.jsx       # Passphrase entry + decryption UI
│   ├── AuditLogTable.jsx      # Renders per-file audit events
│   └── ProtectedRoute.jsx     # Route guard for auth
├── context/
│   └── AuthContext.jsx        # Global auth state
├── pages/
│   ├── Login.jsx              # Login page
│   ├── Register.jsx           # Registration page
│   ├── Dashboard.jsx          # File list + stats
│   ├── Upload.jsx             # Upload + AI security features
│   ├── Download.jsx           # Vault link download page
│   └── AuditLog.jsx           # Full audit trail viewer
├── utils/
│   └── crypto.js              # AES-256-GCM encrypt/decrypt helpers
├── App.jsx                    # Router setup
└── main.jsx                   # React entry point
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `server/.env` and configure:

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB
MONGO_URI=mongodb://localhost:27017/securevault

# Redis (optional — in-memory fallback used if unavailable)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# AWS S3 (optional — local filesystem used if not set)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=securevault-files

# Email (optional — for future OTP features)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=

# AI — Groq API (optional — get a FREE key at https://console.groq.com)
# Leave empty to use the built-in rule-based fallback automatically
GROQ_API_KEY=
```

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ Yes | MongoDB connection string |
| `JWT_SECRET` | ✅ Yes | Long random string for signing tokens |
| `REDIS_URL` | ⚠️ Optional | Redis for token blacklisting — falls back to in-memory map |
| `AWS_ACCESS_KEY_ID` | ⚠️ Optional | Leave blank to use local filesystem storage |
| `GROQ_API_KEY` | ⚠️ Optional | Enables real AI — falls back to rule engine if absent |

> ⚠️ **Never commit your `.env` file to GitHub.** It is already listed in `.gitignore`.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** 18+ 
- **MongoDB** running locally (or MongoDB Atlas URI)
- **Docker & Docker Compose** (optional but recommended)

### ⚡ One-Command Setup (Docker)

```bash
docker-compose up --build
```

- Frontend → `http://localhost:3000`
- Backend API → `http://localhost:5000`

### 🔧 Manual Setup

**1. Clone the repository**
```bash
git clone https://github.com/AtharvaFutane/OmniVault.git
cd OmniVault
```

**2. Configure environment**
```bash
cp .env.example server/.env
# Edit server/.env with your values
```

**3. Start the Backend**
```bash
cd server
npm install
npm run dev
```
You should see:
```
info: MongoDB connected: localhost
info: OmniVault server running on port 5000
```

**4. Start the Frontend**
```bash
cd client
npm install
npm run dev
```
Navigate to `http://localhost:5173`

---

## 🧪 Error Handling

- Centralized error handling middleware on all routes
- Proper HTTP status codes (`400`, `401`, `403`, `404`, `410`, `500`)
- Authentication and validation errors handled without leaking sensitive data
- Winston-based structured logging (info / warn / error levels) to `logs/`
- Morgan access logging piped through Winston

---

## 🚀 Future Improvements

- [ ] End-to-end file versioning
- [ ] Google OAuth 2.0 login
- [ ] Live anomaly detection with WebSocket alerts
- [ ] Admin panel with user management
- [ ] Virus scanning before encryption
- [ ] AI-powered Data Loss Prevention (DLP) scanner
- [ ] Activity analytics dashboard
- [ ] Email OTP for vault link access

---

<br />

<div align="center">
  <h3>Developed & Designed by</h3>
  <br/>
  <b>Atharva Futane</b>
</div>
