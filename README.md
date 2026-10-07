# Campus Event Management & QR Ticketing Platform

A full-stack MERN platform built for college campuses to manage the complete lifecycle of campus events, registrations, waitlists, QR ticketing, mobile scanning check-ins, attendance overrides, certificates, and analytics.

---

## Current Status: Phase 4 Completed

- **Phase 0 (Foundation & Development Setup):** Completed & Verified.
- **Phase 1 (Authentication & Access Control):** Completed & Verified.
- **Phase 2 (Club Management & Organizer Assignment):** Completed & Verified.
- **Phase 3 (Event Management & Lifecycle):** Completed & Verified.
- **Phase 4 (Event Discovery):** Completed & Verified.
  - Public discovery endpoint (`GET /api/events`) with case-insensitive search across title & description.
  - Multi-attribute filtering by category, host club, and IST date bounds (`upcoming`, `today`, `all`).
  - Strict exclusion of draft and cancelled events from public listings.
  - Safe projection stripping sensitive management metadata and private credentials.
  - Server-side pagination with default 20 items per page.
  - Public event details page (`/events/:id`) and responsive event cards (`/events`).
  - Full keyboard navigation and touch-friendly 44px interaction targets.

---

## Technology Stack

- **Frontend:** React 18, Vite, React Router 6, Plain CSS with CSS Variables, Inter Font, Lucide Icons
- **Backend:** Node.js (v24), Express.js, MongoDB / Mongoose, Zod, bcryptjs, jsonwebtoken
- **Database:** MongoDB Atlas / Local MongoDB (Replica set support required for transactions in subsequent phases)
- **Deployment Targets:** Vercel (Frontend), Render (Backend)

---

## Quick Start & Local Setup

### 1. Database Requirement
Ensure MongoDB is running locally on port 27017 or provide a MongoDB Atlas URI in `backend/.env`.

### 2. Backend Setup
```bash
cd backend
npm install
npm run seed:admin   # Bootstraps first Admin (admin@campus.edu / AdminPass123!)
npm run dev          # Runs with Node --watch
# or
npm start            # Runs node server.js
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev          # Starts Vite dev server
```

### 4. Run Automated Verification Tests
```bash
cd backend
node scripts/verifyPhase1.js   # Verify Authentication & Access Control
node scripts/verifyPhase2.js   # Verify Club Management & Organizer Assignment
```

---

## Test Accounts & Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@campus.edu` | `AdminPass123!` |
| **Organizer** | `organizer@campus.edu` | `OrgPass123!` |
| **Student** | `student@campus.edu` | `StudentPass123!` |
| **New Student** | Self-register at `/register` | *(Chosen password)* |
