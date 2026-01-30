# Frontend Deployment Guide

## Issue: Build Successful But App Not Loading

If your build is successful but the app doesn't load, here are the most common causes and solutions:

## ✅ Solution 1: Use a Web Server (REQUIRED)

**NEVER open `dist/index.html` directly in a browser** (file://). ES modules require a web server.

### Option A: Test Locally with Vite Preview
```bash
npm run preview
```
This serves your `dist` folder on `http://localhost:3000`

### Option B: Use a Simple HTTP Server
```bash
# Install http-server globally
npm install -g http-server

# Serve the dist folder
cd dist
http-server -p 3000
```

### Option C: Use Python (if installed)
```bash
cd dist
python -m http.server 3000
```

## ✅ Solution 2: Server Configuration for Production

Since you're using `BrowserRouter`, your server MUST be configured to serve `index.html` for all routes (SPA fallback).

### For Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### For Apache (.htaccess in dist folder):
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### For Express.js (serving from backend):
```javascript
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Handle React routing - return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

## ✅ Solution 3: Check Browser Console

Open browser DevTools (F12) and check:
1. **Console tab** - Look for JavaScript errors
2. **Network tab** - Check if assets are loading (404 errors?)
3. **Application tab** - Check if service workers or cache issues

## ✅ Solution 4: Verify Environment Variables

Vite embeds environment variables at **build time**. Make sure your `.env` file has:
```env
VITE_API_URL=http://100.53.33.62:5000/api
```

Then rebuild:
```bash
npm run build
```

## ✅ Solution 5: Check API Connection

If the app loads but shows errors, verify:
1. Backend is running on `http://100.53.33.62:5000`
2. CORS is configured correctly in backend
3. Network allows connections to that IP/port

## Quick Test Checklist

- [ ] Using a web server (not file://)
- [ ] Server configured for SPA routing (serves index.html for all routes)
- [ ] Browser console shows no errors
- [ ] Network tab shows assets loading (200 status)
- [ ] API URL is correct in `.env` and rebuilt
- [ ] Backend is accessible from frontend server

## Common Errors

### "Failed to load module script"
- **Cause**: Opening file directly (file://)
- **Fix**: Use a web server

### "404 Not Found" on routes
- **Cause**: Server not configured for SPA
- **Fix**: Configure server to serve index.html for all routes

### "Network Error" or CORS errors
- **Cause**: Backend not accessible or CORS misconfigured
- **Fix**: Check backend URL and CORS settings
