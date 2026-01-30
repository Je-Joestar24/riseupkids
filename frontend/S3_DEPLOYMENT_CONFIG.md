# S3 Deployment Configuration Guide

## ⚠️ Current Issues with Your .env

### 1. `VITE_APP_URL=http://localhost:3000` ❌
**Problem**: This is wrong for S3 deployment. It should be your actual S3/CloudFront URL.

**Fix**: Update to your production URL:
```env
VITE_APP_URL=https://your-bucket-name.s3-website-region.amazonaws.com
# OR if using CloudFront:
VITE_APP_URL=https://your-cloudfront-domain.cloudfront.net
# OR if using custom domain:
VITE_APP_URL=https://yourdomain.com
```

### 2. `VITE_API_URL=http://100.53.33.62:5000/api` ⚠️
**Problem**: Using IP address instead of domain. This works but is not ideal.

**Better approach**:
```env
# If you have a domain for backend:
VITE_API_URL=https://api.yourdomain.com/api
# OR if backend has a domain:
VITE_API_URL=https://backend.yourdomain.com/api
# OR keep IP if no domain (works but not recommended):
VITE_API_URL=http://100.53.33.62:5000/api
```

### 3. HTTP vs HTTPS ⚠️
**Problem**: Using `http://` for API. Browsers may block mixed content (HTTPS frontend → HTTP backend).

**Fix**: Use HTTPS if possible:
```env
VITE_API_URL=https://100.53.33.62:5000/api
# OR better, use a domain with SSL:
VITE_API_URL=https://api.yourdomain.com/api
```

## ✅ Corrected .env for S3 Deployment

```env
# API Configuration
# Use HTTPS if possible, or your backend domain
VITE_API_URL=https://100.53.33.62:5000/api
# OR: VITE_API_URL=https://api.yourdomain.com/api

# App Configuration
VITE_APP_NAME=Rise Up Kids
VITE_APP_VERSION=1.0.0

# Your S3/CloudFront URL (update after deployment)
VITE_APP_URL=https://your-bucket-name.s3-website-us-east-1.amazonaws.com
# OR: VITE_APP_URL=https://your-cloudfront-domain.cloudfront.net
# OR: VITE_APP_URL=https://yourdomain.com

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SZj7NC5y43EeE9T7muclPevKPvb3KHvBz8Bia8nwy3rrpuvWxhnlFLzhuRFs0xXxgyMGtwYWDKL7thueL1IoIay000wqdijeV
```

## 🔴 CRITICAL: S3 Static Hosting Limitation

**S3 static hosting does NOT support client-side routing!**

Since you're using `BrowserRouter`, you have two options:

### Option 1: Use CloudFront (Recommended)
CloudFront can handle SPA routing with error pages:
1. Create CloudFront distribution pointing to S3 bucket
2. Configure error page:
   - **HTTP Error Code**: 403, 404
   - **Response Page Path**: `/index.html`
   - **HTTP Response Code**: 200

### Option 2: Use HashRouter (Quick Fix)
Change from `BrowserRouter` to `HashRouter` in your router:
```jsx
// Change this:
import { BrowserRouter } from 'react-router-dom';

// To this:
import { HashRouter } from 'react-router-dom';

// And update:
<HashRouter>
  <Routes>...</Routes>
</HashRouter>
```

URLs will be like: `https://your-bucket.s3-website.com/#/login` instead of `/login`

## 📋 Deployment Steps

1. **Update .env** with correct URLs (see above)

2. **Rebuild** (Vite embeds env vars at build time):
   ```bash
   npm run build
   ```

3. **Upload to S3**:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

4. **Enable Static Website Hosting** in S3:
   - Go to S3 bucket → Properties → Static website hosting
   - Enable it
   - Set index document: `index.html`
   - Set error document: `index.html` (for SPA routing)

5. **Configure CORS** in S3 (if needed):
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

6. **Update Backend CORS**:
   Make sure backend allows your S3 URL:
   ```env
   CORS_ORIGIN=https://your-bucket-name.s3-website-region.amazonaws.com
   ```

## ⚠️ Important Notes

1. **Environment Variables are Embedded at Build Time**
   - You MUST rebuild after changing `.env`
   - Variables are NOT available at runtime
   - Use `VITE_` prefix for all frontend env vars

2. **VITE_APP_URL Usage**
   - Currently not used in your codebase
   - You can remove it if not needed
   - Or keep it for future use (OAuth redirects, etc.)

3. **HTTPS Required for Production**
   - S3 static hosting supports HTTPS via CloudFront
   - Consider using CloudFront for SSL certificate
   - Or use a custom domain with SSL

4. **BrowserRouter Requires Server-Side Routing**
   - S3 alone cannot handle this
   - Use CloudFront error pages OR switch to HashRouter

## 🧪 Testing Before Deployment

1. Test locally with preview:
   ```bash
   npm run build
   npm run preview
   ```

2. Verify API connection works

3. Test all routes work (if using BrowserRouter, test with CloudFront)
