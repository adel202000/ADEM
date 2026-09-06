# Brand - Minimal Clothing Store with Cloudflare D1 Dashboard

A minimal, high-contrast clothing brand web application featuring an integrated **Cloudflare D1 SQL Orders Tracking & Analytics Dashboard**, **Cloudflare R2** product catalog storage, and **B1** backup capabilities.

---

## Private Dashboard & Security

Both the **Admin Operations Dashboard** (`dashboard.html`) and the **Cloudflare D1 Orders & Tracking Dashboard** (`d1-dashboard.html`) are protected by administrative authentication:

- **Default Admin Password**: `admin123`
- **Environment Variable**: `ADMIN_PASSWORD` in `.env`
- **Private Session Tokens**: Admin authentication grants a sliding-window session token (`x-admin-token` / Bearer token) that protects all sensitive endpoints (`/api/d1/orders`, `/api/d1/stats`, `/api/d1/query`, etc.).
- **In-App Password Management**: Admins can change their password directly inside the dashboard using the "Key" button in the active session navbar badge.

---

## Universal Storage Engine (GitHub Pages Compatibility)

This project features a **Universal Dual-Mode Storage Adapter** (`js/storage-engine.js`):

1. **When running with Node.js backend (`npm start` or Cloud Run)**:
   - Connects to the live SQLite / Cloudflare D1 backend on `/api/d1/*`.
   - Admin authorization is enforced on both the server and client.

2. **When deployed to GitHub Pages (Static Hosting)**:
   - Automatically detects the static environment (or absence of a Node backend).
   - Transparently switches to an in-browser D1 database simulation with `localStorage` persistence.
   - The **private lock screen**, **order tracking milestones**, **carrier analytics**, **KPI metrics**, and **SQL console** continue to function seamlessly on GitHub Pages without requiring a backend server.

---

## Project Structure

```
├── index.html              # Homepage
├── products.html           # Storefront catalog
├── dashboard.html          # Private admin operations dashboard
├── d1-dashboard.html       # Private Cloudflare D1 orders & tracking dashboard
├── styles.css             # High-contrast responsive styling
├── server.js               # Express + SQLite D1 & Auth backend
├── storage-engine.js       # Universal storage & API adapter (Node.js & GitHub Pages)
├── js/
│   ├── storage-engine.js   # Client-side backend adapter & offline D1 engine
│   ├── d1-dashboard.js     # Cloudflare D1 tracking, analytics, and SQL console
│   ├── dashboard.js        # Operations dashboard handlers & authentication
│   └── products.js         # Products catalog & search
└── README.md
```

## Setup & Deployment Instructions

### 1. Local / Server Deployment (Node.js)

```bash
# Install dependencies
npm install

# Start the application server
npm start
```
The application will be live at `http://localhost:3000`.

### 2. GitHub Pages Deployment (Static Web Hosting)

1. **Push the repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Add private D1 dashboard and GitHub Pages support"
   git remote add origin https://github.com/YOUR_USERNAME/brand-store.git
   git branch -M main
   git push -u origin main
   ```

2. **Enable GitHub Pages in GitHub Settings**:
   - Navigate to **Settings** > **Pages**.
   - Under **Build and deployment**, set **Source** to `Deploy from a branch`.
   - Select the `main` branch and `/ (root)` folder, then click **Save**.
   - Your site will be published at `https://YOUR_USERNAME.github.io/brand-store/`.
   - Both dashboards will work immediately out of the box with the password `admin123`.

---

## Features

- 🔒 **Private Admin Access**: Dedicated lock screen preventing unauthorized viewing of customer addresses, orders, and financial data.
- 📦 **Order Milestone Stepper**: Visual tracking stages (Placed &rarr; Shipped &rarr; In Transit &rarr; Out for Delivery &rarr; Delivered).
- 📊 **Real-time Statistics**: Order KPIs, Average Order Value (AOV), daily volume trends, and carrier performance breakdown.
- 💻 **Interactive SQL Console**: Preset queries and custom SQL execution with tabular result inspector.
- 🌐 **GitHub Pages Dual-Mode**: Seamlessly operates with full fidelity on both static hosts and Node servers.


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
