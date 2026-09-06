// Admin Dashboard JavaScript: Orders Management, 4 Statuses, 2 Delivery Options, Statistics & i18n

var currentAdminFilter = {
    status: 'all',
    delivery_option: 'all',
    search: ''
};

var allAdminOrders = [];
var selectedModalOption = 'house';

// Helper for in-app toast notification
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

// Password toggle helper
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize i18n
    if (window.I18N) {
        window.I18N.init('dashLangSwitcherContainer');
    }

    await checkAdminAuthentication();
    setupProductCatalogForm();
});

// Admin Authentication Check
async function checkAdminAuthentication() {
    const isAuth = await window.StoreBackend.isAuthenticated();
    const lockScreen = document.getElementById('adminAuthLockScreen');
    const mainSection = document.getElementById('adminDashboardSection');
    const sessionNav = document.getElementById('navAdminSessionContainer');

    if (isAuth) {
        if (lockScreen) lockScreen.style.display = 'none';
        if (mainSection) mainSection.style.display = 'block';
        if (sessionNav) sessionNav.style.display = 'inline-flex';

        await refreshAdminOrders();
        await loadStoreProductsTable();
    } else {
        if (lockScreen) lockScreen.style.display = 'flex';
        if (mainSection) mainSection.style.display = 'none';
        if (sessionNav) sessionNav.style.display = 'none';
    }
}

// Handle Admin Login Form Submission
async function handleAdminLoginSubmit(event) {
    event.preventDefault();
    const pwdInput = document.getElementById('adminPasswordInput');
    const rememberCheckbox = document.getElementById('adminRememberCheckbox');
    const errorBox = document.getElementById('adminAuthError');
    const submitBtn = document.getElementById('adminLoginSubmitBtn');

    if (!pwdInput) return;
    const password = pwdInput.value.trim();
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
    }
    if (errorBox) errorBox.style.display = 'none';

    try {
        const result = await window.StoreBackend.login(password, remember);
        if (result.success) {
            showToast('Authenticated as Administrator', 'success');
            pwdInput.value = '';
            await checkAdminAuthentication();
        } else {
            if (errorBox) {
                errorBox.textContent = result.error || 'Authentication failed. Please check password.';
                errorBox.style.display = 'block';
            }
        }
    } catch (err) {
        if (errorBox) {
            errorBox.textContent = 'Connection error: ' + err.message;
            errorBox.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Unlock Dashboard →';
        }
    }
}

// Handle Admin Logout
async function handleAdminLogout() {
    await window.StoreBackend.logout();
    showToast('Admin session locked', 'success');
    await checkAdminAuthentication();
}

// Change Password Modal Handlers
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        const curr = document.getElementById('currentAdminPwdInput');
        if (curr) curr.focus();
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
    const err = document.getElementById('pwdChangeError');
    if (err) err.style.display = 'none';
    const form = document.getElementById('changePasswordForm');
    if (form) form.reset();
}

async function handleChangePasswordSubmit(event) {
    event.preventDefault();
    const currentPwd = document.getElementById('currentAdminPwdInput').value;
    const newPwd = document.getElementById('newAdminPwdInput').value;
    const confirmPwd = document.getElementById('confirmAdminPwdInput').value;
    const errorBox = document.getElementById('pwdChangeError');

    if (newPwd !== confirmPwd) {
        if (errorBox) {
            errorBox.textContent = 'New passwords do not match.';
            errorBox.style.display = 'block';
        }
        return;
    }

    try {
        const res = await window.StoreBackend.changePassword(currentPwd, newPwd);
        if (res.success) {
            showToast(res.message || 'Password updated successfully!');
            closeChangePasswordModal();
        } else {
            if (errorBox) {
                errorBox.textContent = res.error || 'Failed to update password.';
                errorBox.style.display = 'block';
            }
        }
    } catch (err) {
        if (errorBox) {
            errorBox.textContent = err.message;
            errorBox.style.display = 'block';
        }
    }
}

// Refresh Orders and Stats
async function refreshAdminOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (tbody && allAdminOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--accent);">Loading orders...</td></tr>`;
    }

    try {
        // Fetch stats and orders concurrently
        const [statsRes, ordersRes] = await Promise.all([
            window.StoreBackend.getStats(),
            window.StoreBackend.getOrders()
        ]);

        if (statsRes && statsRes.success) {
            updateStatsUI(statsRes);
        }

        if (ordersRes && ordersRes.success && Array.isArray(ordersRes.orders)) {
            allAdminOrders = ordersRes.orders;
            renderOrdersTable();
        }
    } catch (err) {
        console.error('Error loading admin orders/stats:', err);
        showToast('Failed to refresh orders: ' + err.message, 'error');
    }
}

// Update the 6 KPI statistics cards & badges
function updateStatsUI(stats) {
    const elMoney = document.getElementById('statTotalMoney');
    const elTotal = document.getElementById('statTotalOrders');
    const elWaiting = document.getElementById('statWaitingCount');
    const elConfirmed = document.getElementById('statConfirmedCount');
    const elDelivered = document.getElementById('statDeliveredCount');
    const elCancelled = document.getElementById('statCancelledCount');

    const totalMoney = Number(stats.total_money || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (elMoney) elMoney.textContent = `$${totalMoney}`;
    if (elTotal) elTotal.textContent = stats.total_orders || 0;
    if (elWaiting) elWaiting.textContent = stats.waiting_count || 0;
    if (elConfirmed) elConfirmed.textContent = stats.confirmed_count || 0;
    if (elDelivered) elDelivered.textContent = stats.delivered_count || 0;
    if (elCancelled) elCancelled.textContent = stats.cancelled_count || 0;

    // Update pill badges
    const pillAll = document.getElementById('pillCountAll');
    const pillWaiting = document.getElementById('pillCountWaiting');
    const pillConfirmed = document.getElementById('pillCountConfirmed');
    const pillDelivered = document.getElementById('pillCountDelivered');
    const pillCancelled = document.getElementById('pillCountCancelled');

    if (pillAll) pillAll.textContent = stats.total_orders || 0;
    if (pillWaiting) pillWaiting.textContent = stats.waiting_count || 0;
    if (pillConfirmed) pillConfirmed.textContent = stats.confirmed_count || 0;
    if (pillDelivered) pillDelivered.textContent = stats.delivered_count || 0;
    if (pillCancelled) pillCancelled.textContent = stats.cancelled_count || 0;
}

// Category selection: All, Waiting, Confirmed, Delivered, Cancelled
function selectCategoryFilter(statusCategory) {
    currentAdminFilter.status = statusCategory;

    // Update clickable stat cards visual highlight
    const cardMap = {
        'all': 'statCardAll',
        'waiting': 'statCardWaiting',
        'confirmed': 'statCardConfirmed',
        'delivered': 'statCardDelivered',
        'cancelled': 'statCardCancelled'
    };

    ['statCardAll', 'statCardWaiting', 'statCardConfirmed', 'statCardDelivered', 'statCardCancelled', 'statCardMoney'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active-category');
    });

    const activeCardId = cardMap[statusCategory];
    if (activeCardId) {
        const activeCard = document.getElementById(activeCardId);
        if (activeCard) activeCard.classList.add('active-category');
    }

    // Update category pills
    document.querySelectorAll('#adminCategoryPills .category-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === statusCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update current category label
    const labelElem = document.getElementById('currentCategoryLabel');
    if (labelElem && window.I18N) {
        const catKey = statusCategory === 'all' ? 'filterCategoryAll' : `status_${statusCategory}`;
        labelElem.textContent = window.I18N.t(catKey) || statusCategory.toUpperCase();
    }

    renderOrdersTable();
}

// Delivery option filter
function handleDeliveryOptionFilter() {
    const select = document.getElementById('deliveryOptionFilterSelect');
    if (!select) return;
    currentAdminFilter.delivery_option = select.value;
    renderOrdersTable();
}

// Search input
function handleOrderSearch() {
    const input = document.getElementById('orderSearchInput');
    if (!input) return;
    currentAdminFilter.search = input.value.trim().toLowerCase();
    renderOrdersTable();
}

// Render Orders Table with filtered view
function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    let filtered = [...allAdminOrders];

    // Filter by status category
    if (currentAdminFilter.status && currentAdminFilter.status !== 'all') {
        filtered = filtered.filter(o => o.status === currentAdminFilter.status);
    }

    // Filter by delivery option
    if (currentAdminFilter.delivery_option && currentAdminFilter.delivery_option !== 'all') {
        filtered = filtered.filter(o => (o.delivery_option || 'house').toLowerCase() === currentAdminFilter.delivery_option.toLowerCase());
    }

    // Filter by search query
    if (currentAdminFilter.search) {
        const q = currentAdminFilter.search;
        filtered = filtered.filter(o => 
            (o.id && o.id.toLowerCase().includes(q)) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
            (o.customer_phone && o.customer_phone.toLowerCase().includes(q)) ||
            (o.delivery_details && o.delivery_details.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px 20px; color: var(--accent);">
                    <div style="font-size: 24px; margin-bottom: 8px;">📭</div>
                    <div style="font-weight: 500;">No orders found matching the selected filter.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(order => {
        const orderId = order.id || 'ORD-0000';
        const dateStr = order.created_at ? new Date(order.created_at).toLocaleString() : 'Recent';
        const custName = escapeHtml(order.customer_name || 'Customer');
        const custPhone = escapeHtml(order.customer_phone || 'No phone provided');
        const isDesk = (order.delivery_option || 'house').toLowerCase() === 'desk';
        const deliveryOptLabel = isDesk ? '🏢 To Desk' : '🏠 To House';
        const deliveryOptClass = isDesk ? 'delivery-pill-desk' : 'delivery-pill-house';
        const deliveryDetails = escapeHtml(order.delivery_details || 'Address not specified');
        
        const total = Number(order.total_amount || 0).toFixed(2);
        const itemsCount = (order.items && order.items.length) ? order.items.reduce((s, i) => s + (i.quantity || 1), 0) : 1;
        const status = order.status || 'waiting';

        // Badge styling & labels
        let statusBadgeClass = 'status-waiting';
        let statusLabel = 'Waiting for confirmation';
        if (status === 'confirmed') {
            statusBadgeClass = 'status-confirmed';
            statusLabel = 'Confirmed';
        } else if (status === 'delivered') {
            statusBadgeClass = 'status-delivered';
            statusLabel = 'Delivered';
        } else if (status === 'cancelled') {
            statusBadgeClass = 'status-cancelled';
            statusLabel = 'Cancelled';
        }

        if (window.I18N) {
            statusLabel = window.I18N.t(`status_${status}`) || statusLabel;
        }

        return `
            <tr id="orderRow-${orderId}">
                <td>
                    <span class="order-id-badge">${orderId}</span>
                </td>
                <td style="font-size: 12px; color: #64748b; white-space: nowrap;">
                    ${dateStr}
                </td>
                <td>
                    <div style="font-weight: 600; color: #0f172a;">${custName}</div>
                    <div style="font-size: 12px; color: #64748b;">📞 ${custPhone}</div>
                </td>
                <td>
                    <span class="delivery-option-badge ${deliveryOptClass}">${deliveryOptLabel}</span>
                </td>
                <td style="max-width: 220px; font-size: 13px; color: #334155; line-height: 1.4;">
                    ${deliveryDetails}
                </td>
                <td>
                    <div style="font-weight: 700; color: #0f172a;">$${total}</div>
                    <div style="font-size: 11px; color: #64748b;">${itemsCount} item${itemsCount === 1 ? '' : 's'}</div>
                </td>
                <td>
                    <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
                </td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 4px; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
                        <select class="status-change-select" onchange="handleAdminSetStatus('${orderId}', this.value)" title="Set Status">
                            <option value="waiting" ${status === 'waiting' ? 'selected' : ''}>⏳ Waiting</option>
                            <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>📋 Confirmed</option>
                            <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>✓ Delivered</option>
                            <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>✕ Cancelled</option>
                        </select>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Handle Admin Setting Status directly (Waiting, Confirmed, Delivered, Cancelled)
async function handleAdminSetStatus(orderId, newStatus) {
    const valid = ['waiting', 'confirmed', 'delivered', 'cancelled'];
    if (!valid.includes(newStatus)) {
        showToast('Invalid status choice', 'error');
        return;
    }

    try {
        const res = await window.StoreBackend.updateOrderStatus(orderId, newStatus);
        if (res && res.success) {
            showToast(`Order ${orderId} updated to ${newStatus.toUpperCase()}`);
            
            // Update in local array
            const order = allAdminOrders.find(o => o.id === orderId);
            if (order) {
                order.status = newStatus;
                order.updated_at = new Date().toISOString();
            }

            // Refresh stats to keep counts strictly in sync
            const statsRes = await window.StoreBackend.getStats();
            if (statsRes && statsRes.success) {
                updateStatsUI(statsRes);
            }

            renderOrdersTable();
        } else {
            showToast('Failed to update status: ' + (res.error || 'Server error'), 'error');
            await refreshAdminOrders();
        }
    } catch (err) {
        showToast('Error setting status: ' + err.message, 'error');
        await refreshAdminOrders();
    }
}

// Create Order Modal Handlers
function openCreateOrderModal() {
    const modal = document.getElementById('createOrderModal');
    if (modal) {
        modal.style.display = 'flex';
        selectModalDeliveryOption('house');
    }
}

function closeCreateOrderModal() {
    const modal = document.getElementById('createOrderModal');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('adminNewOrderForm');
    if (form) form.reset();
}

function selectModalDeliveryOption(opt) {
    selectedModalOption = opt;
    const houseCard = document.getElementById('modalOptHouseCard');
    const deskCard = document.getElementById('modalOptDeskCard');
    const label = document.getElementById('modalDetailsLabel');
    const textarea = document.getElementById('modalDeliveryDetails');

    if (opt === 'house') {
        if (houseCard) houseCard.classList.add('active');
        if (deskCard) deskCard.classList.remove('active');
        if (label) label.textContent = window.I18N ? window.I18N.t('detailsHouseLabel') : 'Home Address (Street, Apt, City) *';
        if (textarea) textarea.placeholder = window.I18N ? window.I18N.t('detailsHousePlaceholder') : 'e.g. 742 Evergreen Terrace, Apt 4B, Springfield';
    } else {
        if (deskCard) deskCard.classList.add('active');
        if (houseCard) houseCard.classList.remove('active');
        if (label) label.textContent = window.I18N ? window.I18N.t('detailsDeskLabel') : 'Desk / Office Details (Building, Floor, Desk No.) *';
        if (textarea) textarea.placeholder = window.I18N ? window.I18N.t('detailsDeskPlaceholder') : 'e.g. Tower B, Floor 14, Desk 14-A';
    }
}

async function handleAdminCreateOrderSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById('modalSubmitOrderBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating...';
    }

    const name = document.getElementById('modalCustomerName').value.trim();
    const phone = document.getElementById('modalCustomerPhone').value.trim();
    const details = document.getElementById('modalDeliveryDetails').value.trim();
    const productVal = document.getElementById('modalProductSelect').value;
    const [prodId, prodName, prodPrice] = productVal.split('|');

    const payload = {
        customer_name: name,
        customer_phone: phone,
        delivery_option: selectedModalOption,
        delivery_details: details,
        items: [
            {
                product_id: parseInt(prodId, 10),
                product_name: prodName,
                quantity: 1,
                price: parseFloat(prodPrice)
            }
        ]
    };

    try {
        const res = await window.StoreBackend.createOrder(payload);
        if (res && res.success) {
            showToast(`New order ${res.order ? res.order.id : ''} created in Waiting category!`);
            closeCreateOrderModal();
            await refreshAdminOrders();
        } else {
            showToast('Failed to create order: ' + (res.error || 'Unknown error'), 'error');
        }
    } catch (err) {
        showToast('Error creating order: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Create Order →';
        }
    }
}

// Product catalog management & Cloudflare R2 Gallery Picture Uploader
window.triggerGalleryFilePick = function() {
    const fileInput = document.getElementById('productImageFileInput');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
};

window.copyProductImageLink = function() {
    const input = document.getElementById('productImage');
    if (!input || !input.value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(() => {
            showToast('Image link copied to clipboard!');
        }).catch(() => {
            input.select();
            document.execCommand('copy');
            showToast('Image link copied!');
        });
    } else {
        input.select();
        document.execCommand('copy');
        showToast('Image link copied!');
    }
};

async function handleImageFileUpload(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (JPG, PNG, WEBP, etc.)', 'error');
        return;
    }

    const dropPrompt = document.getElementById('r2DropzonePrompt');
    const loadingBox = document.getElementById('r2UploadLoading');
    const successBox = document.getElementById('r2UploadSuccessBox');
    const previewThumb = document.getElementById('r2PreviewThumb');
    const fileNameSpan = document.getElementById('r2UploadFileName');
    const uploadMeta = document.getElementById('r2UploadMeta');
    const statusPill = document.getElementById('r2StatusPill');
    const imageInput = document.getElementById('productImage');
    const liveThumb = document.getElementById('productImageLivePreview');
    const autoPastedBadge = document.getElementById('r2AutoPastedIndicator');

    // Show loading state
    if (dropPrompt) dropPrompt.style.display = 'none';
    if (successBox) successBox.style.display = 'none';
    if (loadingBox) loadingBox.style.display = 'flex';

    try {
        const result = await window.StoreBackend.uploadImage(file);

        if (result && result.success && result.url) {
            const uploadedUrl = result.url;

            // 1. AUTO-PASTE LINK DIRECTLY INTO PRODUCT IMAGE INPUT FIELD
            if (imageInput) {
                imageInput.value = uploadedUrl;
                imageInput.classList.remove('auto-pasted-flash');
                void imageInput.offsetWidth;
                imageInput.classList.add('auto-pasted-flash');
            }

            // 2. Update preview thumbnails
            if (liveThumb) {
                liveThumb.src = uploadedUrl;
            }
            if (previewThumb) {
                previewThumb.src = uploadedUrl;
            }

            // 3. Update details
            if (fileNameSpan) {
                fileNameSpan.textContent = result.filename || file.name;
            }
            if (uploadMeta) {
                const sizeKb = (file.size / 1024).toFixed(1);
                uploadMeta.textContent = `${sizeKb} KB • ${result.storage === 'cloudflare_r2' ? 'Cloudflare R2 Bucket' : 'Saved & Linked'}`;
            }
            if (statusPill) {
                if (result.storage === 'cloudflare_r2') {
                    statusPill.textContent = '☁️ Cloudflare R2 Stored';
                    statusPill.style.background = '#dcfce7';
                    statusPill.style.color = '#15803d';
                } else {
                    statusPill.textContent = '✓ Stored with Link';
                    statusPill.style.background = '#eff6ff';
                    statusPill.style.color = '#1d4ed8';
                }
            }
            if (autoPastedBadge) {
                autoPastedBadge.style.display = 'inline-block';
            }

            // Show success box
            if (loadingBox) loadingBox.style.display = 'none';
            if (successBox) successBox.style.display = 'flex';

            showToast(window.I18N ? window.I18N.t('r2UploadSuccess') : 'Picture stored in Cloudflare R2! Link automatically pasted.');
        } else {
            throw new Error(result?.error || 'Failed to upload image to Cloudflare R2');
        }
    } catch (err) {
        console.error('Gallery image upload error:', err);
        showToast('Error uploading picture: ' + err.message, 'error');
        if (loadingBox) loadingBox.style.display = 'none';
        if (dropPrompt) dropPrompt.style.display = 'flex';
    }
}

function resetR2UploadState() {
    const dropPrompt = document.getElementById('r2DropzonePrompt');
    const loadingBox = document.getElementById('r2UploadLoading');
    const successBox = document.getElementById('r2UploadSuccessBox');
    const autoPastedBadge = document.getElementById('r2AutoPastedIndicator');
    const fileInput = document.getElementById('productImageFileInput');

    if (dropPrompt) dropPrompt.style.display = 'flex';
    if (loadingBox) loadingBox.style.display = 'none';
    if (successBox) successBox.style.display = 'none';
    if (autoPastedBadge) autoPastedBadge.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

function setupProductCatalogForm() {
    const form = document.getElementById('productForm');
    const fileInput = document.getElementById('productImageFileInput');
    const dropzone = document.getElementById('r2Dropzone');
    const imageInput = document.getElementById('productImage');
    const liveThumb = document.getElementById('productImageLivePreview');

    // 1. File Input Change (Gallery or File Picker)
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleImageFileUpload(files[0]);
            }
        });
    }

    // 2. Drag & Drop on R2 Dropzone
    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                handleImageFileUpload(files[0]);
            }
        });
    }

    // 3. Live Thumbnail Sync with Image URL Input
    if (imageInput && liveThumb) {
        imageInput.addEventListener('input', () => {
            const val = imageInput.value.trim();
            if (val) {
                liveThumb.src = val;
            }
        });
    }

    // 4. Form Submit
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btnAddProductSubmit');
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const category = document.getElementById('productCategory').value;
        const image = document.getElementById('productImage').value.trim();

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding Product...';
        }

        try {
            const result = await window.StoreBackend.addProduct({ name, price, category, image });
            if (result.success) {
                showToast(`Product "${name}" added to catalog with Cloudflare R2 image!`);
                form.reset();
                resetR2UploadState();
                if (imageInput) {
                    imageInput.value = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80';
                }
                if (liveThumb) {
                    liveThumb.src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80';
                }
                await loadStoreProductsTable();
            } else {
                showToast('Failed to add product: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            showToast('Error adding product: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = window.I18N ? window.I18N.t('addProductBtn') : '+ Add Product to Store';
            }
        }
    });
}

// Load and Render Store Products in Admin Dashboard
async function loadStoreProductsTable() {
    const tbody = document.getElementById('adminProductsList');
    if (!tbody) return;

    try {
        const products = await window.StoreBackend.getProducts();
        if (!products || products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">No products found in catalog. Add your first item above!</td></tr>`;
            return;
        }

        tbody.innerHTML = products.map(p => {
            const isR2 = p.image && (p.image.includes('/uploads') || p.image.includes('/api/r2') || p.image.includes('r2.cloudflarestorage') || p.image.includes('r2.dev'));
            const isGallery = p.image && p.image.startsWith('data:image');
            const badgeHtml = isR2 ? '<span style="color:#16a34a; font-weight:600;">☁️ Cloudflare R2</span>' :
                             isGallery ? '<span style="color:#2563eb; font-weight:600;">🖼️ Gallery Upload</span>' :
                             '<span style="color:#64748b;">Image URL</span>';
            return `
                <tr>
                    <td>
                        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" 
                             style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border);"
                             onerror="this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80'">
                    </td>
                    <td style="font-weight: 500; font-size: 13px;">
                        <div>${escapeHtml(p.name)}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                            ID: #${p.id} • ${badgeHtml}
                        </div>
                    </td>
                    <td>
                        <span style="font-size: 11px; text-transform: uppercase; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 600;">
                            ${escapeHtml(p.category)}
                        </span>
                    </td>
                    <td style="font-weight: 600; font-size: 13px;">
                        $${parseFloat(p.price).toFixed(2)}
                    </td>
                    <td style="text-align: right;">
                        <button type="button" class="btn-secondary" onclick="deleteStoreProduct(${p.id})" 
                                style="padding: 5px 10px; font-size: 11px; color: #dc2626; border-color: #fecaca; background: #fef2f2; cursor: pointer;">
                            🗑️ Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Failed to load products table:', e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #ef4444;">Failed to load products: ${escapeHtml(e.message)}</td></tr>`;
    }
}

// Delete product from store catalog
async function deleteStoreProduct(id, optionalName) {
    const products = await window.StoreBackend.getProducts();
    const prod = (products || []).find(p => Number(p.id) === Number(id));
    const name = optionalName || prod?.name || ('Product #' + id);
    if (!confirm(`Are you sure you want to remove "${name}" from the store catalog?`)) {
        return;
    }
    try {
        const res = await window.StoreBackend.deleteProduct(id);
        if (res && res.success) {
            showToast(`Product "${name}" deleted from catalog.`);
            await loadStoreProductsTable();
        } else {
            showToast('Failed to delete product: ' + (res?.error || 'Unknown error'), 'error');
        }
    } catch (err) {
        showToast('Error deleting product: ' + err.message, 'error');
    }
}

window.loadStoreProductsTable = loadStoreProductsTable;
window.deleteStoreProduct = deleteStoreProduct;

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
