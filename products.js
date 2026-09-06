// Products Catalog & D1 Checkout Integration

var productsList = window.productsList || [];
var filteredProducts = window.filteredProducts || [];
var currentFilter = window.currentFilter || 'all';
var cart = window.cart || [];

// Helper for toast notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#ef4444' : '#000000';
    toast.style.display = 'flex';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 3500);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadProductsFromApi();
    setupFilters();
    setupCheckoutForm();
});

// Load products from API
async function loadProductsFromApi() {
    const grid = document.getElementById('productsGrid');
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to load products');
        productsList = await response.json();
        filteredProducts = [...productsList];
        renderProducts();
    } catch (error) {
        console.warn('API fetch fallback:', error);
        grid.innerHTML = '<div class="loading">Failed to load catalog. Please check backend connection.</div>';
    }
}

// Render products
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '<div class="loading">No products found in this category.</div>';
        return;
    }

    grid.innerHTML = filteredProducts.map(product => `
        <div class="product-card" id="productCard-${product.id}">
            <div class="img-placeholder" style="background-image: url('${product.image}'); background-size: cover; background-position: center;"></div>
            <h3>${product.name}</h3>
            <p style="text-transform: capitalize;">${product.category}</p>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <div style="display: flex; gap: 8px;">
                <button class="btn" style="flex: 1;" onclick="addToCart(${product.id})">Add to Cart</button>
                <button class="btn btn-secondary" style="padding: 10px; margin: 0;" onclick="quickBuy(${product.id})" title="Instant Checkout via D1">Buy Now</button>
            </div>
        </div>
    `).join('');
}

// Filter setup
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const filter = e.target.getAttribute('data-filter');
            currentFilter = filter;
            
            if (filter === 'all') {
                filteredProducts = [...productsList];
            } else {
                filteredProducts = productsList.filter(p => p.category.toLowerCase() === filter.toLowerCase());
            }
            renderProducts();
        });
    });
}

// Cart management
function addToCart(productId) {
    const product = productsList.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.product.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ product, quantity: 1 });
    }

    updateCartUI();
    showToast(`Added "${product.name}" to cart!`);
}

function quickBuy(productId) {
    addToCart(productId);
    openCheckoutModal();
}

function updateCartUI() {
    const countBadge = document.getElementById('cartCountBadge');
    const totalItems = cart.reduce((sum, it) => sum + it.quantity, 0);
    if (countBadge) {
        countBadge.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;
    }
}

// Checkout Modal
function openCheckoutModal() {
    if (cart.length === 0) {
        showToast('Your cart is empty! Please add a product first.', 'error');
        return;
    }

    const modal = document.getElementById('checkoutModal');
    const list = document.getElementById('checkoutItemsList');
    const totalElem = document.getElementById('checkoutTotalVal');
    const notice = document.getElementById('checkoutSuccessNotice');
    const form = document.getElementById('checkoutForm');

    if (notice) notice.style.display = 'none';
    if (form) form.style.display = 'flex';

    let subtotal = 0;
    list.innerHTML = cart.map(item => {
        const itemTotal = item.product.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px;">
                <span><strong>${item.product.name}</strong> &times; ${item.quantity}</span>
                <span>$${itemTotal.toFixed(2)}</span>
            </div>
        `;
    }).join('');

    const shipping = subtotal > 100 ? 0 : 10;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const grandTotal = subtotal + shipping + tax;

    list.innerHTML += `
        <div style="border-top: 1px dashed var(--border); margin-top: 8px; padding-top: 8px; font-size: 12px; color: #64748b;">
            <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Shipping:</span><span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Tax (est):</span><span>$${tax.toFixed(2)}</span></div>
        </div>
    `;

    totalElem.textContent = `$${grandTotal.toFixed(2)}`;
    modal.style.display = 'flex';
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.style.display = 'none';
}

// Setup Checkout Form Submission to D1
function setupCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitOrderBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving to D1...';

        const payload = {
            customer_name: document.getElementById('custName').value.trim(),
            customer_email: document.getElementById('custEmail').value.trim(),
            shipping_address: document.getElementById('custAddress').value.trim(),
            shipping_city: document.getElementById('custCity').value.trim(),
            carrier: document.getElementById('custCarrier').value,
            items: cart.map(it => ({
                product_id: it.product.id,
                product_name: it.product.name,
                category: it.product.category,
                quantity: it.quantity,
                price: it.product.price,
                image: it.product.image
            }))
        };

        try {
            const res = await fetch('/api/d1/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success && data.order) {
                form.style.display = 'none';
                const notice = document.getElementById('checkoutSuccessNotice');
                const codeSpan = document.getElementById('createdTrackingCode');
                const trackBtn = document.getElementById('trackInD1Btn');

                codeSpan.textContent = data.order.tracking_number;
                trackBtn.href = `d1-dashboard.html?track=${data.order.tracking_number}`;
                notice.style.display = 'block';

                // Clear cart
                cart = [];
                updateCartUI();
                showToast(`Order logged to Cloudflare D1 (${data.order.tracking_number})!`);
            } else {
                showToast('Failed to create order: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (err) {
            showToast('Network error saving to D1: ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Place Order to D1 →';
        }
    });
}
