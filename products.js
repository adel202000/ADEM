// R2 Configuration
const R2_ENDPOINT = 'YOUR_R2_ENDPOINT'; // e.g., https://your-bucket.r2.cloudflarestorage.com
const R2_BUCKET = 'YOUR_BUCKET_NAME';
const R2_ACCESS_KEY = 'YOUR_ACCESS_KEY'; // Should be stored in backend, not here
const R2_SECRET_KEY = 'YOUR_SECRET_KEY'; // Should be stored in backend, not here

// Sample products data (will be replaced with R2 fetch)
const PRODUCTS = [
    {
        id: 1,
        name: 'Classic White T-Shirt',
        category: 'shirts',
        price: 29.99,
        image: 'products/tshirt-white.jpg'
    },
    {
        id: 2,
        name: 'Black Hoodie',
        category: 'hoodies',
        price: 79.99,
        image: 'products/hoodie-black.jpg'
    },
    {
        id: 3,
        name: 'Gray Joggers',
        category: 'bottoms',
        price: 59.99,
        image: 'products/joggers-gray.jpg'
    },
    {
        id: 4,
        name: 'Navy T-Shirt',
        category: 'shirts',
        price: 29.99,
        image: 'products/tshirt-navy.jpg'
    },
    {
        id: 5,
        name: 'White Hoodie',
        category: 'hoodies',
        price: 79.99,
        image: 'products/hoodie-white.jpg'
    },
    {
        id: 6,
        name: 'Black Jeans',
        category: 'bottoms',
        price: 89.99,
        image: 'products/jeans-black.jpg'
    }
];

let filteredProducts = PRODUCTS;
let currentFilter = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupFilters();
});

// Fetch products from R2
async function loadProductsFromR2() {
    try {
        // This should call your backend endpoint that fetches from R2
        const response = await fetch('/api/products');
        const products = await response.json();
        return products;
    } catch (error) {
        console.error('Error loading from R2:', error);
        return PRODUCTS; // Fallback to sample data
    }
}

// Load and render products
function loadProducts() {
    const grid = document.getElementById('productsGrid');
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '<div class="loading">No products found</div>';
        return;
    }

    grid.innerHTML = filteredProducts.map(product => `
        <div class="product-card">
            <div class="img-placeholder" style="background-image: url('${product.image}'); background-size: cover;"></div>
            <h3>${product.name}</h3>
            <p>${product.category}</p>
            <div class="product-price">$${product.price}</div>
            <button class="btn" onclick="addToCart(${product.id})">Add to Cart</button>
        </div>
    `).join('');
}

// Filter setup
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentFilter = e.target.dataset.filter;
            applyFilter();
        });
    });
}

// Apply filter
function applyFilter() {
    if (currentFilter === 'all') {
        filteredProducts = PRODUCTS;
    } else {
        filteredProducts = PRODUCTS.filter(p => p.category === currentFilter);
    }
    loadProducts();
}

// Add to cart (placeholder)
function addToCart(productId) {
    alert(`Product ${productId} added to cart!`);
}

// Sync products from R2
async function syncFromR2() {
    try {
        const response = await fetch('/api/sync-r2', { method: 'POST' });
        const result = await response.json();
        console.log('R2 sync complete:', result);
        loadProducts();
    } catch (error) {
        console.error('Error syncing R2:', error);
    }
}
