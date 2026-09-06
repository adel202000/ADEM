// Products Catalog & Direct Order Checkout Integration (Premium & Localized)

var productsList = window.productsList || [];
var filteredProducts = window.filteredProducts || [];
var currentFilter = window.currentFilter || 'all';
var searchQuery = '';
var currentSort = 'default';
var cart = window.cart || [];
var selectedDeliveryOption = 'house'; // 'house' ("To Home") or 'desk' ("To Stop Desk")
var currentQvProduct = null;
var selectedQvSize = 'M';

// Helper for toast notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#ef4444' : '#0f172a';
    toast.style.display = 'flex';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 3500);
}

// Delivery Option Selection: ONLY 'house' ("To Home") or 'desk' ("To Stop Desk")
function selectCheckoutDelivery(option) {
    selectedDeliveryOption = (option === 'desk') ? 'desk' : 'house';
    
    const cardHouse = document.getElementById('optCardHouse');
    const cardDesk = document.getElementById('optCardDesk');
    const label = document.getElementById('deliveryDetailsLabel');
    const input = document.getElementById('custDeliveryDetails');

    if (cardHouse) cardHouse.classList.toggle('selected', selectedDeliveryOption === 'house');
    if (cardDesk) cardDesk.classList.toggle('selected', selectedDeliveryOption === 'desk');

    if (selectedDeliveryOption === 'house') {
        if (label) {
            label.setAttribute('data-i18n', 'detailsHouseLabel');
            label.textContent = window.I18N ? window.I18N.t('detailsHouseLabel') : 'Home Address (Street, House/Apt, City) *';
        }
        if (input) {
            input.setAttribute('data-i18n-placeholder', 'detailsHousePlaceholder');
            input.placeholder = window.I18N ? window.I18N.t('detailsHousePlaceholder') : 'e.g. 742 Evergreen Terrace, Apt 4B, Springfield';
        }
    } else {
        if (label) {
            label.setAttribute('data-i18n', 'detailsDeskLabel');
            label.textContent = window.I18N ? window.I18N.t('detailsDeskLabel') : 'Stop Desk Details (Agency, Station / Desk No.) *';
        }
        if (input) {
            input.setAttribute('data-i18n-placeholder', 'detailsDeskPlaceholder');
            input.placeholder = window.I18N ? window.I18N.t('detailsDeskPlaceholder') : 'e.g. Stop Desk Downtown Agency, Station #4, Desk 12B';
        }
    }
}
window.selectCheckoutDelivery = selectCheckoutDelivery;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check admin status for nav pill visibility
    try {
        if (window.StoreBackend && typeof window.StoreBackend.isAuthenticated === 'function') {
            const isAuth = await window.StoreBackend.isAuthenticated();
            const d1Nav = document.getElementById('shopNavD1Container');
            if (d1Nav) d1Nav.style.display = isAuth ? 'block' : 'none';
        }
    } catch (e) {
        console.warn('Auth check:', e);
    }

    await loadProductsFromApi();
    setupControls();
    setupCheckoutForm();
    updateCartUI();

    // Re-render when language changed
    window.addEventListener('languageChanged', () => {
        renderProducts();
        selectCheckoutDelivery(selectedDeliveryOption);
        updateCartUI();
        updateCategoryCounts();
        if (currentQvProduct) {
            populateQuickView(currentQvProduct);
        }
    });
});

// Load products from API
async function loadProductsFromApi() {
    const grid = document.getElementById('productsGrid');
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to load products');
        productsList = await response.json();
        applyFiltersAndSort();
        updateCategoryCounts();
    } catch (error) {
        console.warn('API fetch fallback:', error);
        grid.innerHTML = '<div class="loading">Failed to load catalog. Please check backend connection.</div>';
    }
}

// Update counts on filter pills
function updateCategoryCounts() {
    const countAll = document.getElementById('countAll');
    const countShirts = document.getElementById('countShirts');
    const countHoodies = document.getElementById('countHoodies');
    const countBottoms = document.getElementById('countBottoms');

    if (countAll) countAll.textContent = productsList.length;
    if (countShirts) countShirts.textContent = productsList.filter(p => p.category.toLowerCase() === 'shirts').length;
    if (countHoodies) countHoodies.textContent = productsList.filter(p => p.category.toLowerCase() === 'hoodies').length;
    if (countBottoms) countBottoms.textContent = productsList.filter(p => p.category.toLowerCase() === 'bottoms').length;
}

// Controls: Filters, Search, Sort
function setupControls() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            const targetBtn = e.currentTarget;
            targetBtn.classList.add('active');
            
            currentFilter = targetBtn.getAttribute('data-filter');
            applyFiltersAndSort();
        });
    });

    // Search input
    const searchInput = document.getElementById('shopSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            if (clearBtn) clearBtn.style.display = searchQuery ? 'block' : 'none';
            applyFiltersAndSort();
        });
    }

    // Sort select
    const sortSelect = document.getElementById('shopSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFiltersAndSort();
        });
    }
}

function clearSearch() {
    const searchInput = document.getElementById('shopSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    searchQuery = '';
    applyFiltersAndSort();
}
window.clearSearch = clearSearch;

// Filter and Sort Pipeline
function applyFiltersAndSort() {
    let list = [...productsList];

    // 1. Category Filter
    if (currentFilter !== 'all') {
        list = list.filter(p => p.category.toLowerCase() === currentFilter.toLowerCase());
    }

    // 2. Search Query (matches English or translated localized name/category)
    if (searchQuery) {
        list = list.filter(p => {
            const origName = (p.name || '').toLowerCase();
            const origCat = (p.category || '').toLowerCase();
            const locName = (window.I18N ? window.I18N.getProductName(p.name) : '').toLowerCase();
            const locCat = (window.I18N ? window.I18N.getProductCategory(p.name, p.category) : '').toLowerCase();

            return origName.includes(searchQuery) ||
                   origCat.includes(searchQuery) ||
                   locName.includes(searchQuery) ||
                   locCat.includes(searchQuery);
        });
    }

    // 3. Sorting
    if (currentSort === 'price-asc') {
        list.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-desc') {
        list.sort((a, b) => b.price - a.price);
    }

    filteredProducts = list;
    renderProducts();
}

// Render products with smooth staggered animation & localized texts
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (filteredProducts.length === 0) {
        const msg = window.I18N ? (window.I18N.getLanguage() === 'ar' ? 'لا توجد منتجات تطابق هذا البحث أو التصنيف.' : (window.I18N.getLanguage() === 'fr' ? 'Aucun produit trouvé dans cette catégorie.' : 'No products found matching your search or category.')) : 'No products found.';
        grid.innerHTML = `<div class="loading" style="grid-column: 1 / -1; padding: 40px; text-align: center;">${msg}</div>`;
        return;
    }

    const tAdd = window.I18N ? window.I18N.t('addToCart') : 'Add to Cart';
    const tBuy = window.I18N ? window.I18N.t('buyNow') : 'Buy Now';
    const tQuick = window.I18N ? window.I18N.t('quickViewBtn') : 'Quick View';
    const tBadgeCotton = window.I18N ? window.I18N.t('badgeHeavyweight') : 'Heavyweight 280 GSM';
    const tBadgeDelivery = window.I18N ? window.I18N.t('badgeDeliveryOptions') : 'Home & Stop Desk';

    grid.innerHTML = filteredProducts.map((product, index) => {
        const displayName = window.I18N ? window.I18N.getProductName(product.name) : product.name;
        const displayCategory = window.I18N ? window.I18N.getProductCategory(product.name, product.category) : product.category;
        const displayDesc = window.I18N ? window.I18N.getProductDesc(product.name) : '';
        const displayPrice = window.I18N ? window.I18N.formatPrice(product.price) : `$${product.price.toFixed(2)}`;

        return `
            <div class="product-card" id="productCard-${product.id}" style="animation: cardFadeUp 0.35s ease backwards; animation-delay: ${Math.min(index * 40, 400)}ms;">
                <div class="product-img-wrap">
                    <div class="img-placeholder" style="background-image: url('${product.image}');" role="img" aria-label="${displayName}"></div>
                    <div class="product-badge-stack">
                        <span class="product-card-badge">${tBadgeCotton}</span>
                        <span class="product-card-badge badge-accent">${tBadgeDelivery}</span>
                    </div>
                    <button type="button" class="btn-quick-view-trigger" onclick="openQuickView(${product.id})">
                        ${tQuick}
                    </button>
                </div>
                <div class="product-info">
                    <p class="product-category">${displayCategory}</p>
                    <h3 class="product-title">${displayName}</h3>
                    ${displayDesc ? `<p class="product-desc-preview">${displayDesc}</p>` : ''}
                    <div class="product-price">${displayPrice}</div>
                    <div class="product-actions">
                        <button id="addBtn-${product.id}" class="btn btn-add-cart" onclick="addToCart(${product.id}, this)">
                            <span class="btn-text">${tAdd}</span>
                        </button>
                        <button class="btn btn-secondary btn-quick-buy" onclick="quickBuy(${product.id})" title="${tBuy}">${tBuy}</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Quick View Modal
function openQuickView(productId) {
    const product = productsList.find(p => p.id === productId);
    if (!product) return;
    currentQvProduct = product;
    populateQuickView(product);
    const modal = document.getElementById('quickViewModal');
    if (modal) modal.style.display = 'flex';
}
window.openQuickView = openQuickView;

function populateQuickView(product) {
    const qvImg = document.getElementById('qvImage');
    const qvCategory = document.getElementById('qvCategory');
    const qvTitle = document.getElementById('qvTitle');
    const qvPrice = document.getElementById('qvPrice');
    const qvDesc = document.getElementById('qvDescription');

    const displayName = window.I18N ? window.I18N.getProductName(product.name) : product.name;
    const displayCategory = window.I18N ? window.I18N.getProductCategory(product.name, product.category) : product.category;
    const displayDesc = window.I18N ? window.I18N.getProductDesc(product.name) : '';
    const displayPrice = window.I18N ? window.I18N.formatPrice(product.price) : `$${product.price.toFixed(2)}`;

    if (qvImg) qvImg.style.backgroundImage = `url('${product.image}')`;
    if (qvCategory) qvCategory.textContent = displayCategory;
    if (qvTitle) qvTitle.textContent = displayName;
    if (qvPrice) qvPrice.textContent = displayPrice;
    if (qvDesc) qvDesc.textContent = displayDesc || 'Premium fabric engineered for long-lasting comfort and timeless fit.';
}

function closeQuickViewModal() {
    const modal = document.getElementById('quickViewModal');
    if (modal) modal.style.display = 'none';
}
window.closeQuickViewModal = closeQuickViewModal;

function selectSize(btn, size) {
    selectedQvSize = size;
    document.querySelectorAll('.qv-size-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}
window.selectSize = selectSize;

function qvAddToCart() {
    if (!currentQvProduct) return;
    const btn = document.getElementById('qvAddToCartBtn');
    addToCart(currentQvProduct.id, btn);
}
window.qvAddToCart = qvAddToCart;

function qvBuyNow() {
    if (!currentQvProduct) return;
    addToCart(currentQvProduct.id);
    closeQuickViewModal();
    openCheckoutModal();
}
window.qvBuyNow = qvBuyNow;

// Cart management with Micro-interactions
function addToCart(productId, triggerBtn = null) {
    const product = productsList.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.product.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ product, quantity: 1, size: selectedQvSize || 'M' });
    }

    updateCartUI();

    const displayName = window.I18N ? window.I18N.getProductName(product.name) : product.name;
    const tAdded = window.I18N ? window.I18N.t('itemAdded') : 'Added to cart!';
    showToast(`"${displayName}" - ${tAdded}`);
    
    // Trigger bounce animation on cart bar
    const cartBar = document.getElementById('cartBar');
    if (cartBar) {
        cartBar.classList.add('cart-bump');
        setTimeout(() => cartBar.classList.remove('cart-bump'), 320);
    }

    // Button visual feedback animation
    const btn = triggerBtn || document.getElementById(`addBtn-${productId}`);
    if (btn) {
        btn.classList.add('added');
        const origText = btn.innerHTML;
        const tSuccess = window.I18N ? window.I18N.t('itemAddedSuccess') : 'Added ✓';
        btn.innerHTML = `<span>${tSuccess}</span>`;
        setTimeout(() => {
            btn.classList.remove('added');
            btn.innerHTML = origText;
        }, 1200);
    }
}
window.addToCart = addToCart;

function quickBuy(productId) {
    addToCart(productId);
    openCheckoutModal();
}
window.quickBuy = quickBuy;

function updateCartUI() {
    const countBadge = document.getElementById('cartCountBadge');
    const bubbleCount = document.getElementById('cartCountNumber');
    const subtotalBadge = document.getElementById('cartSubtotalBadge');
    const freeShippingText = document.getElementById('freeShippingText');
    const freeShippingProgress = document.getElementById('freeShippingProgressBar');

    const totalItems = cart.reduce((sum, it) => sum + it.quantity, 0);
    const subtotal = cart.reduce((sum, it) => sum + (it.product.price * it.quantity), 0);

    const itemLabel = window.I18N ? window.I18N.t('cartItems') : 'items';
    if (countBadge) countBadge.textContent = `${totalItems} ${itemLabel}`;
    if (bubbleCount) bubbleCount.textContent = totalItems;
    if (subtotalBadge) {
        subtotalBadge.textContent = window.I18N ? window.I18N.formatPrice(subtotal) : `$${subtotal.toFixed(2)}`;
    }

    // Update free shipping bar ($100 target)
    const threshold = 100;
    const remaining = Math.max(0, threshold - subtotal);
    const progressPct = Math.min(100, Math.round((subtotal / threshold) * 100));

    if (freeShippingProgress) {
        freeShippingProgress.style.width = `${progressPct}%`;
    }

    if (freeShippingText) {
        const lang = window.I18N ? window.I18N.getLanguage() : 'en';
        if (remaining === 0) {
            if (lang === 'ar') freeShippingText.textContent = '🎉 مبروك! لقد حصلت على توصيل مجاني سريع!';
            else if (lang === 'fr') freeShippingText.textContent = '🎉 Félicitations ! Vous bénéficiez de la livraison express offerte !';
            else freeShippingText.textContent = '🎉 You unlocked FREE express delivery!';
        } else {
            const formattedRemaining = window.I18N ? window.I18N.formatPrice(remaining) : `$${remaining.toFixed(2)}`;
            if (lang === 'ar') freeShippingText.textContent = `✨ أضف ${formattedRemaining} إضافية للتوصيل المجاني السريع!`;
            else if (lang === 'fr') freeShippingText.textContent = `✨ Ajoutez ${formattedRemaining} pour la livraison express gratuite !`;
            else freeShippingText.textContent = `✨ Add ${formattedRemaining} more for FREE express delivery!`;
        }
    }
}

// Checkout Modal
function openCheckoutModal() {
    if (cart.length === 0) {
        const tEmpty = window.I18N ? window.I18N.t('cartEmpty') : 'Your cart is empty! Please add a product first.';
        showToast(tEmpty, 'error');
        return;
    }

    const modal = document.getElementById('checkoutModal');
    const list = document.getElementById('checkoutItemsList');
    const totalElem = document.getElementById('checkoutTotalVal');
    const notice = document.getElementById('checkoutSuccessNotice');
    const form = document.getElementById('checkoutForm');

    if (notice) notice.style.display = 'none';
    if (form) form.style.display = 'block';

    let subtotal = 0;
    list.innerHTML = cart.map(item => {
        const itemTotal = item.product.price * item.quantity;
        subtotal += itemTotal;
        const displayName = window.I18N ? window.I18N.getProductName(item.product.name) : item.product.name;
        const formattedTotal = window.I18N ? window.I18N.formatPrice(itemTotal) : `$${itemTotal.toFixed(2)}`;
        const sizeBadge = item.size ? `<span style="font-size: 11px; color: #64748b; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; margin-left: 6px; margin-right: 6px;">Size: ${item.size}</span>` : '';

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 13px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${item.product.image}" alt="${displayName}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0;">
                    <div>
                        <strong>${displayName}</strong> ${sizeBadge}
                        <div style="color: #64748b; font-size: 11px;">Qty: ${item.quantity}</div>
                    </div>
                </div>
                <span style="font-weight: 600;">${formattedTotal}</span>
            </div>
        `;
    }).join('');

    const grandTotal = Math.round(subtotal * 100) / 100;
    const tSub = window.I18N ? window.I18N.t('subtotal') : 'Subtotal:';
    const formattedGrandTotal = window.I18N ? window.I18N.formatPrice(grandTotal) : `$${grandTotal.toFixed(2)}`;

    list.innerHTML += `
        <div style="border-top: 1px dashed var(--border); margin-top: 10px; padding-top: 10px; font-size: 13px; color: #64748b;">
            <div style="display: flex; justify-content: space-between;"><span>${tSub}</span><strong>${formattedGrandTotal}</strong></div>
        </div>
    `;

    totalElem.textContent = formattedGrandTotal;
    selectCheckoutDelivery(selectedDeliveryOption);
    modal.style.display = 'flex';
}
window.openCheckoutModal = openCheckoutModal;

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.style.display = 'none';
}
window.closeCheckoutModal = closeCheckoutModal;

// Setup Checkout Form Submission
function setupCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitOrderBtn');
        submitBtn.disabled = true;
        const origText = submitBtn.innerHTML;
        submitBtn.textContent = window.I18N ? window.I18N.t('processingOrder') : 'Processing Order...';

        const custName = document.getElementById('custName').value.trim();
        const custPhone = document.getElementById('custPhone').value.trim();
        const details = document.getElementById('custDeliveryDetails').value.trim();

        const payload = {
            customer_name: custName,
            customer_phone: custPhone,
            delivery_option: selectedDeliveryOption, // 'house' or 'desk'
            delivery_details: details || (selectedDeliveryOption === 'desk' ? 'Stop Desk Delivery' : 'Home Delivery'),
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
            const data = await window.StoreBackend.createOrder(payload);
            if (data && data.success && data.order) {
                form.style.display = 'none';
                const notice = document.getElementById('checkoutSuccessNotice');
                const codeSpan = document.getElementById('createdTrackingCode');
                const deliveryTypeSpan = document.getElementById('createdDeliveryType');

                const orderId = data.order.id || data.order.tracking_number;
                if (codeSpan) codeSpan.textContent = orderId;

                const destText = window.I18N ? window.I18N.translateDeliveryOption(selectedDeliveryOption) : (selectedDeliveryOption === 'desk' ? 'To Stop Desk' : 'To Home');
                if (deliveryTypeSpan) deliveryTypeSpan.textContent = destText;

                notice.style.display = 'block';

                // Clear cart
                cart = [];
                updateCartUI();
                const tPlaced = window.I18N ? window.I18N.t('orderPlacedSuccess') : 'Order placed successfully!';
                showToast(`${tPlaced} (${orderId})`);
            } else {
                showToast('Failed to create order: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (err) {
            showToast('Network error placing order: ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
        }
    });
}


