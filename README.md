# Rise Up Kids

## Child Learning Management System (MVP)

### 📌 Project Overview

This project is a child-friendly Learning Management System (LMS) built using the **MERN stack** (MongoDB, Express, React, Node.js).

The platform is designed around three core users:

- **Admin** – manages lessons and content
- **Parent** – manages child accounts and tracks progress
- **Child** – learns through guided lessons, stories, and activities

The goal of this MVP is to deliver a fully functional learning flow while keeping the system simple, stable, and extensible.

---

## 🎯 MVP Scope

For the current version:

- Focus only on **Admin**, **Parent**, and **Child**
- All files (videos, audio, images) are stored **locally on the backend**
- No cloud storage (Cloudinary, S3) yet
- Designed to later support mobile and cloud migration

---

## 🧱 Tech Stack

### Frontend

- React
- React Router
- Context API (or Redux later)
- Child-friendly UI design

### Backend

- Node.js
- Express.js
- MongoDB (Mongoose)
- Local file storage (uploads folder)

### Authentication

- JWT-based authentication
- Role-based access control (Admin, Parent, Child)

### Payment & Subscription (Future)

- Stripe integration for subscription management
- Parent subscription plans and billing

---

## 👥 User Roles & Responsibilities

### 1️⃣ Admin

**Purpose:** Platform manager and content uploader

**Main Responsibilities:**

- Login to admin dashboard
- Manage school/platform settings
- Manage parent accounts
- Send announcements
- Create and manage:
  - Lessons
  - Books
  - Videos
  - Activities
  - Assignments
  - Storytime content
- Upload media files (audio, video, images)
- Search, update, or archive content
- View overall learning progress

> **Note:** Admins are the only users allowed to upload and manage lesson-related content.

---

### 2️⃣ Parent

**Purpose:** Account owner and progress monitor

**Main Responsibilities:**

- Register and login
- Access parent dashboard
- Add, update, or remove child profiles
- View child learning progress
- Search and view progress history
- Manage subscription via Stripe (future integration)
- Handle billing and payment methods
- Receive updates and announcements

> **Note:** Parents do not upload lessons or content.

---

### 3️⃣ Child

**Purpose:** Learner

**Main Responsibilities:**

- Login to child-friendly interface
- Access Home page
- Learn and join classes
- View learning status
- Follow "My Journey":
  - View lessons
  - Read books
  - Listen to audio
  - Complete steps and activities
  - Submit assignments
  - Explore learning content
- Use Kids Wall (basic interaction, moderated)

> **Note:** Children see only learning-related features.

---

## 🧩 Core Features

### 🔐 Authentication & Authorization

- Secure login for all users
- Role-based access control
- Parent-child relationship enforced at backend level

### 📚 Lesson Management

- Structured lessons created by Admin
- Each lesson can include:
  - Text
  - Images
  - Video
  - Audio
  - Activities
  - Assignments
- Lessons are grouped into journeys or categories

### 📖 Read-Along Books (Audio + Text)

Each book can include:

- Written text
- Pre-recorded audio narration
- (Optional) subtitles generated from audio

This allows children to:

- Read
- Listen
- Read while listening

### 📈 Progress Tracking

- Track lesson completion
- Track activities done
- Track assignments submitted
- Parent-visible progress summaries

### 📢 Announcements

- Created by Admin
- Visible to parents and children (based on rules)

### 💳 Subscription & Payment Management (Future)

- Stripe integration for secure payment processing
- Parent subscription plans (monthly/annual)
- Automated billing and invoicing
- Subscription status tracking
- Payment method management
- Subscription upgrades/downgrades
- Access control based on subscription status

---

## 🗂 File Storage Strategy (MVP)

For now, all uploaded files are stored **locally on the backend server**.

**Example structure:**

```
backend/
 └── uploads/
     ├── books/
     │   ├── text/
     │   ├── audio/
     │   └── images/
     ├── videos/
     ├── activities/
     └── assignments/
```

**This approach:**

- Simplifies development
- Reduces cost
- Works well for MVP and testing
- Can later be migrated to Cloudinary or S3

---

## 🎙 Read-Along Audio + Subtitle Question (Important)

### ❓ Is it really possible to:

**Upload audio → transcribe it → generate subtitles?**

### ✅ Short Answer: **YES, it is absolutely possible**

**How it works (Simple Explanation):**

1. Admin uploads an audio narration for a book
2. The backend sends that audio file to a speech-to-text service
3. The service returns:
   - Transcribed text
   - Timestamped words or sentences
4. The system:
   - Saves the subtitle text
   - Displays it synced with the audio

### 🧠 APIs That Can Do This

You can integrate later with:

- OpenAI Speech-to-Text
- Google Speech-to-Text
- Whisper-based APIs
- AssemblyAI
- Deepgram

**For MVP:**

- You can store audio only
- Or store manually added text
- Then later enable auto-transcription

### ⚠ Important Reality Check (Honest)

- Auto-transcription is **not free**
- Accuracy depends on:
  - Audio quality
  - Language
  - Accent

**For MVP:**

- It's okay to support the feature design
- But activate transcription later
- This is industry-normal, not a limitation.

---

## 💳 Stripe Integration (Future)

### Overview

Stripe will be integrated to handle all subscription and payment processing for parent accounts. This will enable the platform to offer subscription-based access to learning content.

### Planned Features

- **Subscription Plans**
  - Monthly and annual subscription options
  - Multiple tier plans (Basic, Premium, Family)
  - Free trial periods

- **Payment Processing**
  - Secure credit/debit card payments
  - Multiple payment methods support
  - Automatic recurring billing

- **Subscription Management**
  - Parent dashboard for subscription management
  - Upgrade/downgrade subscription plans
  - Cancel or pause subscriptions
  - View billing history and invoices

- **Access Control**
  - Content access based on subscription status
  - Grace period for expired subscriptions
  - Automatic access revocation for unpaid subscriptions

### Implementation Notes

- Stripe API integration will be implemented in Phase 3
- Webhook handling for subscription events (created, updated, canceled)
- Secure storage of Stripe customer IDs and subscription IDs
- Admin dashboard for monitoring subscription metrics

---

## 🧪 MVP Development Phases

### Phase 1

- Auth
- Roles
- Local uploads
- Lesson CRUD
- Parent-child linking

### Phase 2

- Progress tracking
- Read-along books
- Assignments
- Admin dashboards

### Phase 3 (Later)

- Cloud storage
- Mobile optimization
- Auto transcription
- Advanced analytics
- Stripe payment integration
- Subscription management system

---

## 🚀 Future Scalability

The system is designed to later support:

- Cloud storage
- Mobile apps
- More roles (Educator, Moderator)
- Advanced communities
- AI-assisted learning tools
- Stripe payment integration for parent subscriptions
- Automated billing and subscription management

---

## 🧾 One-Line Summary

A MERN-based child learning platform where admins manage content, parents track progress, and children learn through guided lessons, stories, and activities.

---

## 📝 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

Create `.env` files in both `backend` and `frontend` directories with the necessary environment variables.

### Running the Application

```bash
# Start backend server
cd backend
npm start

# Start frontend development server
cd frontend
npm start
```

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

