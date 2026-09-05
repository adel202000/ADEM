// B1 Configuration
const B1_ACCOUNT_ID = 'YOUR_ACCOUNT_ID';
const B1_APP_KEY = 'YOUR_APP_KEY'; // Should be stored in backend, not here

// Dashboard state
let dashboardState = {
    totalProducts: 0,
    ordersToday: 0,
    storageUsage: '0 MB',
    lastSync: 'Never',
    r2Status: 'Not configured',
    b1Status: 'Not configured'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupForm();
    updateStatus();
});

// Load dashboard data
async function loadDashboardData() {
    try {
        // In production, these would call your backend
        dashboardState.totalProducts = 12;
        dashboardState.ordersToday = 3;
        dashboardState.storageUsage = '2.4 GB';
        
        updateDashboard();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update dashboard display
function updateDashboard() {
    document.getElementById('totalProducts').textContent = dashboardState.totalProducts;
    document.getElementById('ordersToday').textContent = dashboardState.ordersToday;
    document.getElementById('storageUsage').textContent = dashboardState.storageUsage;
    document.getElementById('lastSync').textContent = dashboardState.lastSync;
}

// Update status
function updateStatus() {
    document.getElementById('r2Status').textContent = dashboardState.r2Status;
    document.getElementById('b1Status').textContent = dashboardState.b1Status;
}

// Sync with R2
async function syncR2() {
    try {
        console.log('Syncing with R2...');
        alert('R2 sync initiated. Check backend logs for details.');
        
        // Call backend endpoint
        const response = await fetch('/api/sync/r2', { method: 'POST' });
        const result = await response.json();
        
        dashboardState.lastSync = new Date().toLocaleString();
        updateDashboard();
        console.log('R2 sync complete:', result);
    } catch (error) {
        console.error('R2 sync error:', error);
        alert('Error syncing R2. See console for details.');
    }
}

// Sync with B1
async function syncB1() {
    try {
        console.log('Syncing with B1...');
        alert('B1 backup sync initiated. Check backend logs for details.');
        
        // Call backend endpoint
        const response = await fetch('/api/sync/b1', { method: 'POST' });
        const result = await response.json();
        
        dashboardState.lastSync = new Date().toLocaleString();
        updateDashboard();
        console.log('B1 sync complete:', result);
    } catch (error) {
        console.error('B1 sync error:', error);
        alert('Error syncing B1. See console for details.');
    }
}

// View logs
function viewLogs() {
    alert('Logs would display here. Backend implementation needed.');
    // In production: fetch and display logs from backend
}

// Form setup
function setupForm() {
    document.getElementById('productForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const product = {
            name: document.getElementById('productName').value,
            price: document.getElementById('productPrice').value,
            category: document.getElementById('productCategory').value,
            image: document.getElementById('productImage').value
        };
        
        addProduct(product);
    });
}

// Add product
async function addProduct(product) {
    try {
        console.log('Adding product:', product);
        
        // Upload to R2 via backend
        const response = await fetch('/api/products/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Product added successfully!');
            document.getElementById('productForm').reset();
            dashboardState.totalProducts += 1;
            updateDashboard();
        } else {
            alert('Error adding product: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Error adding product. See console for details.');
    }
}

// Backend Configuration Instructions
const CONFIG_GUIDE = `
SETUP GUIDE - R2 & B1 Integration

R2 SETUP:
1. Create Cloudflare R2 bucket
2. Generate API token with R2 permissions
3. Set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY, R2_SECRET_KEY in backend
4. Create /api/products endpoint to list products from R2
5. Create /api/sync/r2 endpoint to sync bucket

B1 SETUP:
1. Create Backblaze B1 account
2. Generate application key
3. Set B1_ACCOUNT_ID, B1_APP_KEY in backend
4. Create /api/sync/b1 endpoint for backups
5. Implement backup scheduling

BACKEND ENDPOINTS NEEDED:
- GET /api/products - Fetch products from R2
- POST /api/products/add - Add product to R2
- POST /api/sync/r2 - Sync R2 bucket
- POST /api/sync/b1 - Sync B1 backups
- GET /api/status - Check R2/B1 status
`;

console.log(CONFIG_GUIDE);
