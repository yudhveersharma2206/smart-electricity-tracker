# Smart Electricity Usage Tracker

This repository has been reorganized into a clean full-stack JavaScript architecture.

## Structure

- `backend/` — Node.js + Express API server
- `frontend/` — Vite-powered React application
- `README.md` — setup and run instructions

## Setup

Install dependencies separately for each package:

```bash
cd backend
npm install
cd ../frontend
npm install
```

## Run locally

Start the backend API server:

```bash
cd backend
npm start
```

Start the frontend development app:

```bash
cd frontend
npm run dev
```

## Backend environment

Copy or edit `backend/.env` and provide values for:

- `JWT_SECRET`
- `GEMINI_API_KEY` (optional for AI suggestions)

The backend listens on port `3000` by default.

## Notes

- The frontend proxies `/api` requests to the backend in development.
- No TypeScript is used in this project.
