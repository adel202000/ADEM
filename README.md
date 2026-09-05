# Brand - Minimal Clothing Store

A minimal, generic clothing brand website with R2 product storage and B1 backup integration.

## Project Structure

```
├── index.html           # Homepage
├── products.html        # Products page (R2 integrated)
├── dashboard.html       # Admin dashboard (B1 integrated)
├── styles.css          # Minimal CSS styling
├── js/
│   ├── products.js     # Products and R2 integration
│   └── dashboard.js    # Dashboard and B1 integration
└── README.md
```

## Setup Instructions

### GitHub Pages Hosting

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/clothing-brand.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings
   - Scroll to "Pages"
   - Set source to `main` branch
   - Site will be live at `https://YOUR_USERNAME.github.io/clothing-brand/`

### R2 Integration (Cloudflare)

1. **Create R2 Bucket**
   - Log into Cloudflare dashboard
   - Navigate to R2
   - Create a new bucket (e.g., `clothing-brand-products`)

2. **Get API Credentials**
   - Create API token with R2 permissions
   - Note: `Account ID`, `Access Key ID`, `Secret Access Key`

3. **Backend Configuration** (Node.js/Python/etc)
   ```javascript
   // Example Node.js setup
   const AWS = require('aws-sdk');
   
   const s3 = new AWS.S3({
       endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
       accessKeyId: process.env.R2_ACCESS_KEY,
       secretAccessKey: process.env.R2_SECRET_KEY,
       region: 'auto'
   });
   ```

4. **Create Endpoints**
   - `GET /api/products` - List all products
   - `POST /api/products/add` - Add new product
   - `POST /api/sync/r2` - Sync R2 bucket

### B1 Integration (Backblaze)

1. **Create B1 Account**
   - Sign up at https://www.backblaze.com/b2
   - Create B1 bucket for backups

2. **Get API Credentials**
   - Create application key with B1 permissions
   - Note: `Account ID`, `Application Key`

3. **Backend Configuration**
   ```python
   # Example Python setup
   from b2sdk.v2 import InMemoryAccountInfo, B2Api
   
   info = InMemoryAccountInfo()
   b2_api = B2Api(info)
   
   b2_api.authorize_account(
       'production',
       account_id=os.environ['B1_ACCOUNT_ID'],
       auth_token=os.environ['B1_APP_KEY']
   )
   ```

4. **Create Endpoints**
   - `POST /api/sync/b1` - Backup to B1
   - `GET /api/status` - Check B1 status

## Customization

### Colors & Typography
Edit CSS variables in `styles.css`:
```css
:root {
    --primary: #000;      /* Main color */
    --secondary: #fff;    /* Background */
    --accent: #666;       /* Secondary text */
    --border: #eee;       /* Borders */
    --bg: #f9f9f9;       /* Light background */
}
```

### Add Products
Navigate to `/dashboard.html` to add products manually, or sync from R2.

### Modify Layout
All HTML is semantic and easy to edit. CSS uses simple grid system:
- `.grid-3` - 3 column layout
- `.products-grid` - 4 column (responsive)
- `.dashboard-grid` - 4 column dashboard cards

## Backend Requirements

**Important**: Frontend is static. For full functionality, you need:

1. **Backend Server** (Node.js, Python, Go, etc.)
   - Handle R2 uploads/downloads
   - Manage B1 backups
   - Serve product data via JSON API
   - Environment variables for API keys

2. **CORS Setup**
   - Frontend needs CORS headers from backend
   - Or use proxy service

3. **Environment Variables** (Backend)
   ```
   R2_ENDPOINT
   R2_BUCKET
   R2_ACCESS_KEY
   R2_SECRET_KEY
   B1_ACCOUNT_ID
   B1_APP_KEY
   ```

## Deployment

### Frontend
```bash
# Already on GitHub Pages
# Just push changes to main branch
git push origin main
```

### Backend (Example with Vercel/Heroku)
```bash
# Deploy backend separately
vercel deploy
# or
git push heroku main
```

## Features

- ✅ Minimal, generic design
- ✅ Responsive grid layout
- ✅ R2 product integration ready
- ✅ B1 backup integration ready
- ✅ Admin dashboard
- ✅ Product filtering
- ✅ GitHub Pages compatible

## TODO

- [ ] Implement R2 backend API
- [ ] Implement B1 backup API
- [ ] Add product database
- [ ] Create shopping cart
- [ ] Add payment processing
- [ ] Implement authentication
- [ ] Add image optimization
- [ ] Set up CDN for images

## Resources

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Backblaze B1 Docs](https://www.backblaze.com/b2/docs/)
- [GitHub Pages Docs](https://docs.github.com/en/pages)

---

**Note**: This is a frontend-focused template. All API calls expect corresponding backend endpoints. CSS and HTML are easily customizable for your brand.
