# Rise Up Kids - Backend API

Backend server for Rise Up Kids Learning Management System built with Node.js and Express.js.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root of the backend directory:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
   - MongoDB connection string
   - JWT secret key
   - Port number (default: 5000)

### Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in `.env`).

## 📁 Project Structure

```
backend/
├── config/           # Configuration files (database, etc.)
├── controllers/      # Route controllers (business logic)
├── middleware/       # Custom middleware (auth, error handling, etc.)
├── models/           # Mongoose models (database schemas)
├── routes/           # API routes
├── uploads/          # User-uploaded files (local storage)
├── server.js         # Main server file
├── package.json      # Dependencies and scripts
└── .env              # Environment variables (not in git)
```

## 🔌 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Available Endpoints

- `GET /` - Root endpoint with API information
- `GET /api` - Sample API route returning JSON data
- `GET /api/health` - Health check endpoint

## 🛠 Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (via Mongoose)
- **JWT** - Authentication
- **Multer** - File uploads
- **Bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger

## 📝 Environment Variables

See `.env.example` for all available environment variables.

### CMS book audio silence trim

CMS book admin audio uploads (`POST /api/admin/cms-books/media` with `mediaType=audio`) can remove **leading and trailing silence** before files are stored on S3/CloudFront.

- Enabled by default (`AUDIO_SILENCE_TRIM_ENABLED=true`). Set to `false` to disable.
- Uses FFmpeg via `@ffmpeg-installer/ffmpeg` (installed with `npm install`). No separate system install is required on most hosts.
- Tunables: `AUDIO_SILENCE_TRIM_THRESHOLD_DB`, `AUDIO_SILENCE_TRIM_MIN_SILENCE_SEC`, `AUDIO_SILENCE_TRIM_PAD_MS` (see `.env.example`).
- API response includes `duration` (seconds after trim) and `trimMeta` for the book builder to keep reading word highlights aligned.

**Staging QA checklist**

1. Upload a narration clip with ~1–2s silence at the start and end in the CMS book builder.
2. Save the book and confirm the CloudFront audio is shorter than the original.
3. Play the book as a child user — word highlights should stay in sync with speech.
4. Upload interactive option audio and confirm playback works (no reading timeline on those clips).

## 🔒 Security Notes

- Never commit `.env` file to version control
- Use strong JWT secrets in production
- Enable CORS only for trusted origins
- Validate and sanitize all user inputs

## 🚧 Development Status

This is an MVP backend. Features will be added incrementally:
- Phase 1: Authentication, Roles, Local uploads
- Phase 2: Progress tracking, Read-along books
- Phase 3: Cloud storage, Stripe integration

