# OmniVault

Zero-Knowledge Encrypted File Vault with AI Security Intelligence

## Technology Stack

- Backend: Python 3.12, FastAPI, Uvicorn
- Database: MongoDB (Motor async driver)
- Caching & Auth: Redis (with in-memory fallback)
- Storage: AWS S3 & Local filesystem fallback
- Frontend: React.js (Vite)
- Encryption: Web Crypto API (AES-256-GCM + PBKDF2)
- AI Intelligence: Groq API (LLaMA 3 8B)
- Authentication: JWT (PyJWT) + bcrypt
- Containerization: Docker & Docker Compose

## Features

- Zero-Knowledge Architecture: Files are encrypted client-side in the browser using AES-256-GCM before upload. The backend only handles encrypted blobs.
- Controlled Sharing: Time-limited vault links, customizable download caps (1-50), and one-click revocation.
- Audit Logs: Complete access history tracking for every file event.
- AI Security Intelligence: Groq LLaMA 3 analysis for file sensitivity classification and smart passphrase hints with heuristic rule fallback.

## Quick Start (Docker)

`ash
docker-compose up --build
`

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Swagger Documentation: http://localhost:5000/docs

## Local Setup

### 1. Backend (FastAPI)
`ash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 5000
`

### 2. Frontend (React)
`ash
cd client
npm install
npm run dev
`

## API Endpoints

- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- POST /api/auth/logout - Invalidate session
- GET /api/auth/me - Get current user profile
- POST /api/files/upload - Upload encrypted blob
- GET /api/files - List user files
- DELETE /api/files/{id} - Delete file
- GET /api/files/{id}/audit - File audit history
- PATCH /api/files/{id}/revoke - Revoke link
- POST /api/vault/{id}/generate - Create vault link
- GET /api/vault/{token} - Public vault info
- POST /api/vault/{token}/download - Download encrypted blob
- POST /api/ai/security-suggest - AI sensitivity rating
- POST /api/ai/passphrase-hint - AI passphrase hint
- GET /api/health - Service health
