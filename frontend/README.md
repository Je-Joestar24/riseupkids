# Rise Up Kids - Frontend

Frontend application for Rise Up Kids Learning Management System built with React, Redux, and Material UI.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root of the frontend directory:
```bash
cp .env.example .env
```

3. Update the `.env` file if needed (default API URL is `http://localhost:5000/api`)

### Running the Application

**Development mode:**
```bash
npm run dev
```

The application will start on `http://localhost:3000`

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── axios.js          # Axios instance configuration
│   ├── assets/
│   │   └── css/
│   │       └── App.css      # Global styles
│   ├── components/           # Reusable components
│   ├── config/
│   │   └── constants.js      # App constants
│   ├── hooks/                # Custom React hooks
│   ├── layouts/              # Layout components
│   ├── pages/                # Page components
│   │   └── TestPage.jsx      # Test page with API call
│   ├── router/
│   │   └── AppRouter.jsx     # React Router configuration
│   ├── services/
│   │   └── apiService.js     # API service functions
│   ├── store/
│   │   ├── store.js          # Redux store configuration
│   │   └── slices/
│   │       └── apiSlice.js   # API Redux slice
│   ├── util/                 # Utility functions
│   ├── App.jsx               # Main App component
│   └── main.jsx              # Entry point
├── index.html
├── package.json
├── vite.config.js
└── .env                      # Environment variables
```

## 🛠 Tech Stack

- **React 18** - UI library
- **Redux Toolkit** - State management
- **React Router** - Routing
- **Axios** - HTTP client
- **Material UI** - UI component library (for future use)
- **Vite** - Build tool and dev server

## 🔌 API Integration

The frontend is configured to communicate with the backend API at `http://localhost:5000/api`.

- Axios instance is configured in `src/api/axios.js`
- API services are in `src/services/apiService.js`
- Redux slice for API state management in `src/store/slices/apiSlice.js`

## 🧪 Testing API Connection

The test page (`/`) automatically makes an API call to verify:
- CORS configuration
- API connectivity
- Redux state management
- Axios configuration

Check the browser's Network tab to inspect the API request and response.

## 📝 Development Notes

- Material UI is installed but not actively used yet (for future drag-and-drop features)
- Custom CSS is preferred, but Material UI components are available as needed
- Redux store is set up and ready for additional slices
- Router is configured and ready for route additions

