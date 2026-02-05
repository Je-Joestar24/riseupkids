# Rise Up Kids

## Child Learning Management System (LMS)

### 📌 Project Overview

Rise Up Kids is a child-friendly Learning Management System built with the **MERN stack** (MongoDB, Express, React, Node.js) and a **React Native (Expo)** mobile app.

The platform is designed around **four core user roles**:

- **Admin** – Platform and content management, teacher management, integrations (YouTube, Google Meet)
- **Teacher** – Delivers content, creates live classes (Google Meet & YouTube Live), manages courses and Kids Wall
- **Parent** – Account owner, child profiles, progress tracking, subscription (Stripe)
- **Child** – Learner: lessons, books, videos, SCORM, live classes (Meet + YouTube), Kids Wall

**Web frontend** (React/Vite) serves **Admin**, **Teacher**, **Parent**, and **Child**. The **mobile app** (Expo) serves **Parent** and **Child** only; Admin and Teacher use the web dashboard.

---

## 🎯 Current Scope

- **User roles:** Admin, Teacher, Parent, Child (JWT + role-based access)
- **Payments:** Stripe integration for parent signup and subscription (yearly commitment, webhooks, cancel flow)
- **Live classes:** Google Meet (create/join) and YouTube Live (create/stream/watch, OAuth)
- **Content:** Lessons, books, videos, activities, SCORM packages, explore videos, audio assignments, chants
- **Social:** Kids Wall (moderated), Share Something
- **Progress:** Course progress, badges, video watch tracking, book reading
- **Storage:** Local file storage (backend `uploads/`); SCORM served from `/scorm`
- **Support:** Contact support flow

---

## 🧱 Tech Stack

### Backend

- Node.js, Express.js
- MongoDB (Mongoose)
- JWT authentication, role-based authorization (admin, teacher, parent, child)
- Local file storage (`backend/uploads/`), static serve for SCORM

### Web Frontend

- React, Vite
- React Router
- Redux (store + slices)
- Admin, Teacher, Parent, and Child dashboards and flows

### Mobile App (`app/`)

- React Native with **Expo**
- Parent and Child only (portrait, phone → tablet responsive)
- Same backend API; theme aligned with web

### Integrations

- **Stripe** – Parent signup checkout, subscription lifecycle, webhooks, cancel subscription
- **Google Meet** – OAuth for teachers/admins; create meetings; children/parents join via link
- **YouTube Live** – OAuth (admin connects channel); teachers/admins create streams; embed/watch for children; end/archive/delete

---

## 👥 User Roles & Responsibilities

### 1️⃣ Admin

**Purpose:** Platform manager, content and integration owner.

**Main responsibilities:**

- Login to admin dashboard
- Manage platform/school settings
- **Manage teachers** (CRUD, archive, restore)
- Manage parent/child accounts
- **Connect YouTube** (OAuth) for the LMS; teachers/admins then create streams
- Create and manage: lessons, books, videos, activities, assignments, storytime, explore content
- **Create and manage Google Meet meetings** (after Google OAuth)
- **Create and manage YouTube Live streams** (after admin connects YouTube)
- Upload media (audio, video, images)
- Kids Wall moderation, Check Audio (audio assignments)
- View learning progress and dashboard metrics

---

### 2️⃣ Teacher

**Purpose:** Deliver lessons and live classes; manage content visible to children.

**Main responsibilities:**

- Login to teacher dashboard (web only)
- **Live Classes (Google Meet):** Create and manage meetings; children/parents join via link
- **YouTube Live:** Create live streams (uses LMS YouTube connection), view stream key/RTMP, end/archive/delete own streams
- Manage courses: modules, contents, explore videos
- Kids Wall, Check Audio (audio assignments)
- Teachers are created and managed by Admin only

---

### 3️⃣ Parent

**Purpose:** Account owner, progress monitor, subscription holder.

**Main responsibilities:**

- Register and login (signup flow includes **Stripe** checkout for subscription)
- Parent dashboard; add/update/remove child profiles
- View child learning progress
- **Manage subscription** (Stripe): view status, cancel subscription
- Join live classes (Google Meet link) and watch YouTube Live with child when applicable
- Receive announcements; contact support

---

### 4️⃣ Child

**Purpose:** Learner.

**Main responsibilities:**

- Login to child interface (web or app)
- Home: **Live now** (YouTube Live embed) and **Next Live Class** (Google Meet join link)
- **My Journey:** Lessons, books, audio, activities, assignments, SCORM
- **Explore:** Videos and replays
- **Kids Wall** and Share Something (moderated)
- View learning status and badges

---

## 🧩 Core Features

### 🔐 Authentication & Authorization

- JWT-based auth for admin, teacher, parent, child
- Role-based access control; parent–child relationship enforced in backend

### 💳 Stripe (Subscription & Payments)

- **Parent signup:** Create parent account → Stripe Checkout Session (yearly price) → redirect to Stripe → success/cancel return
- **Webhooks:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, invoice events to keep subscription status in sync
- **Subscription management:** Parent can cancel subscription (API + dashboard); status and period end stored on user
- **Access control:** Subscription status (e.g. active, cancelled, pending_payment) for parent access

See `STRIP_INTEGRATION_PLAN.md` and `backend/STRIPE_LOCAL_SETUP.md` for setup.

### 📅 Live Classes – Google Meet

- **Teachers & Admins:** OAuth with Google (Calendar API); create and list meetings; store meeting link and metadata
- **Children & Parents:** Join via meeting link (no Google account required)
- **App:** Opens Meet link in browser/InAppBrowser

See `GOOGLE_MEETING_INTEGRATION.md`.

### 📺 YouTube Live

- **Admin:** Connects LMS to YouTube channel (OAuth); single shared connection
- **Teachers & Admins:** Create live streams; receive stream key/RTMP URL; list own streams; end broadcast, archive, or delete
- **Children & Parents (web & app):** See “Live now” (embed) and join; no stream key exposed
- **API:** `/api/youtube` – OAuth, create/list/get/archive/end/delete

### 📚 Lessons, Books, Videos, SCORM

- Structured lessons (text, images, video, audio, activities, assignments)
- Read-along books (text + optional audio)
- Videos and explore videos with watch tracking
- SCORM packages (upload, launch, completion tracking)
- Audio assignments and chants (with review flow for teachers/admins)

### 📈 Progress & Gamification

- Course/module progress, lesson and activity completion
- Badges; video watch and book reading tracking
- Parent-visible progress and parent dashboard

### 📢 Kids Wall & Support

- Kids Wall (moderated posts); Share Something
- Contact support (backend + frontend)

---

## 🗂 Repository Structure

```
RiseUpKids/
├── backend/          # Express API (shared by web + app)
├── frontend/         # React/Vite web app — Admin, Teacher, Parent, Child
├── app/              # React Native (Expo) app — Parent + Child only
├── README.md
├── APP_PLAN.md       # App scope, layout, theming
├── GOOGLE_MEETING_INTEGRATION.md
├── STRIP_INTEGRATION_PLAN.md
├── SCORM_INTEGRATION_GUIDE.md
└── backend/STRIPE_LOCAL_SETUP.md
```

### File storage (backend)

- **Uploads:** `backend/uploads/` (books, videos, activities, assignments, etc.)
- **SCORM:** Served under `/scorm` from `uploads/scorm`

---

## 🎙 Read-Along Audio & Subtitles

- **Possible:** Upload audio → speech-to-text → timestamped subtitles (e.g. OpenAI, Google, Whisper, AssemblyAI).
- **MVP:** Store audio (and optional manual text); auto-transcription can be added later.
- Cost and accuracy depend on quality and language; design supports transcription when enabled.

---

## 🧪 Development Phases (Reference)

- **Done:** Auth, roles (admin, teacher, parent, child), teachers CRUD, local uploads, lessons/books/videos, progress, Stripe signup & webhooks, Google Meet, YouTube Live, SCORM, Kids Wall, badges, contact support, explore videos, parent dashboard, mobile app (Parent + Child).
- **Future (examples):** Cloud storage, more analytics, additional payment plans, mobile for teacher/admin (if ever needed).

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

### Environment

Create `.env` in `backend/` and `frontend/` (and `app/` if running the app). Backend may include:

- `MONGODB_URI`, `JWT_SECRET`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_YEARLY` (see `STRIP_INTEGRATION_PLAN.md`, `backend/STRIPE_LOCAL_SETUP.md`)
- Google Meet: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (see `GOOGLE_MEETING_INTEGRATION.md`)
- YouTube: Google OAuth credentials and YouTube API (see backend YouTube routes and docs)

### Install & run

```bash
# Backend
cd backend
npm install
npm start

# Web frontend
cd frontend
npm install
npm start

# Mobile app (optional)
cd app
npm install
npx expo start
```

---

## 🧾 One-Line Summary

Rise Up Kids is a MERN-based child LMS with four roles (Admin, Teacher, Parent, Child): admins and teachers manage content and run live classes (Google Meet + YouTube Live), parents pay via Stripe and track progress, and children learn through lessons, books, videos, SCORM, and live streams—on web and in an Expo app (Parent + Child).

---

## 📄 License

[Add your license information here]

---

## 👤 Author

**Jejomar Parrilla**

- Email: jpar1252003@gmail.com
- GitHub: [github.com/Je-Joestar24](https://github.com/Je-Joestar24)

---

## 🤝 Contributing

[Add contribution guidelines if applicable]

---

## 📞 Support

For support, email jpar1252003@gmail.com or create an issue in the repository.
