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

