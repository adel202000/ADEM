// Cloudflare D1 Orders Tracking & Analytics Dashboard Frontend Logic
// Integrated with Private Admin Authentication and Universal Backend Adapter (Works on GitHub Pages & Node.js)

var allOrders = window.allOrders || [];
var filteredOrders = window.filteredOrders || [];
var activeStatusFilter = window.activeStatusFilter || 'all';
var activeCarrierFilter = window.activeCarrierFilter || 'all';
var activeSearchQuery = window.activeSearchQuery || '';
var currentTrackingOrder = window.currentTrackingOrder || null;

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.getElementById('d1Toast') || document.getElementById('toastNotification');
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

// Copy to clipboard helper
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Copied to clipboard: ${text}`);
        }).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(`Copied: ${text}`);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackParam = urlParams.get('track');
    const orderParam = urlParams.get('order');

    setupManualOrderForm();
    await checkAdminAuthentication();

    if (trackParam) {
        openTrackingInspector(trackParam);
    } else if (orderParam) {
        openTrackingInspector(orderParam);
    }
});

// Check Admin Authentication Status
async function checkAdminAuthentication() {
    const isAuth = await window.StoreBackend.isAuthenticated();
    const lockScreen = document.getElementById('adminAuthLockScreen');
    const mainSection = document.getElementById('d1MainApp');
    const sessionNav = document.getElementById('navAdminSessionContainer');
    const d1NavItem = document.getElementById('d1NavActiveContainer');

    if (isAuth) {
        document.title = 'D1 Orders Tracking & Analytics Dashboard - Brand';
        if (lockScreen) lockScreen.style.display = 'none';
        if (mainSection) mainSection.style.display = 'block';
        if (sessionNav) sessionNav.style.display = 'inline-flex';
        if (d1NavItem) d1NavItem.style.display = 'block';

        await loadD1Status();
        await loadD1Stats();
        await loadOrders();
    } else {
        document.title = 'Admin Sign In - Brand';
        if (lockScreen) lockScreen.style.display = 'flex';
        if (mainSection) mainSection.style.display = 'none';
        if (sessionNav) sessionNav.style.display = 'none';
        if (d1NavItem) d1NavItem.style.display = 'none';
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
                errorBox.textContent = result.error || 'Authentication failed. Incorrect password.';
                errorBox.style.display = 'block';
            }
        }
    } catch (err) {
        if (errorBox) {
            errorBox.textContent = 'Error: ' + err.message;
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

// 1. Load Cloudflare D1 Connection Status
async function loadD1Status() {
    try {
        const data = await window.StoreBackend.getD1Status();
        if (data.success) {
            const elStatus = document.getElementById('d1EngineStatus');
            const elDb = document.getElementById('d1DatabaseName');
            const elChip = document.getElementById('d1EngineChip');
            
            if (elStatus) elStatus.textContent = data.engine + (data.configured ? ' (Cloudflare Edge)' : ` (${data.mode || 'Active'})`);
            if (elDb) elDb.textContent = data.database_id || 'd1_clothing_store';
            if (elChip) elChip.textContent = data.configured ? 'Cloudflare D1 REST' : (data.engine.includes('Static') ? 'Static D1 Engine' : 'Cloudflare D1 (SQLite)');
            
            const lastTime = document.getElementById('d1LastQueryTime');
            if (lastTime) lastTime.textContent = new Date().toLocaleTimeString();
        }
    } catch (e) {
        console.warn('D1 status error:', e);
    }
}

// 2. Load D1 Summary & Analytics
async function loadD1Stats() {
    try {
        const data = await window.StoreBackend.getD1Stats();
        if (!data.success) throw new Error(data.error);

        const s = data.summary;
        const elTotal = document.getElementById('statTotalOrders');
        const elRev = document.getElementById('statTotalRevenue');
        const elActive = document.getElementById('statActiveOrders');
        const elDelivered = document.getElementById('statDeliveredOrders');
        const elAov = document.getElementById('statAov');
        const elRecords = document.getElementById('d1TotalRecordsCount');

        const aov = s.averageOrderValue !== undefined ? s.averageOrderValue : (s.avgOrderValue !== undefined ? s.avgOrderValue : 0);

        if (elTotal) elTotal.textContent = s.totalOrders;
        if (elRev) elRev.textContent = `$${(s.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (elActive) elActive.textContent = s.activeOrders;
        if (elDelivered) elDelivered.textContent = s.deliveredOrders;
        if (elAov) elAov.textContent = `$${Number(aov).toFixed(2)}`;
        if (elRecords) elRecords.textContent = s.totalOrders;

        // Render Analytics
        renderDailyVolume(data.dailyTrends || []);
        renderStatusDistribution(data.statusCounts || {}, s.totalOrders);
        renderCarrierStats(data.carrierStats || []);
        renderTopProducts(data.topProducts || []);

    } catch (err) {
        console.error('Failed to load D1 statistics:', err);
    }
}

// Render Daily Volume Chart
function renderDailyVolume(trends) {
    const container = document.getElementById('dailyVolumeBars');
    if (!container) return;

    if (!trends || trends.length === 0) {
        container.innerHTML = '<div style="color: var(--accent); font-size: 13px; text-align: center; width: 100%;">No recent order history recorded.</div>';
        return;
    }

    const maxOrders = Math.max(...trends.map(t => (t.order_count || t.orders || 1)), 1);

    container.innerHTML = trends.map(day => {
        const count = day.order_count !== undefined ? day.order_count : (day.orders || 0);
        const dateStr = day.order_date || day.date || '';
        const rev = day.daily_revenue !== undefined ? day.daily_revenue : (day.revenue || 0);
        const heightPct = Math.max((count / maxOrders) * 100, 8);
        const dateObj = new Date(dateStr + 'T00:00:00');
        const dayName = isNaN(dateObj) ? dateStr.slice(5) : dateObj.toLocaleDateString(undefined, { weekday: 'narrow', month: 'numeric', day: 'numeric' });

        return `
            <div class="chart-bar-group" title="${dateStr}: ${count} orders ($${Number(rev).toFixed(2)})">
                <div class="chart-bar-value">${count}</div>
                <div class="chart-bar-fill" style="height: ${heightPct}%;"></div>
                <div class="chart-bar-label">${dayName}</div>
            </div>
        `;
    }).join('');
}

// Render Status Breakdown List
function renderStatusDistribution(statusCounts, total) {
    const list = document.getElementById('statusBreakdownList');
    if (!list) return;

    const statuses = [
        { key: 'delivered', label: 'Delivered', color: '#059669', bg: '#10b981' },
        { key: 'in_transit', label: 'In Transit', color: '#2563eb', bg: '#3b82f6' },
        { key: 'out_for_delivery', label: 'Out for Delivery', color: '#7c3aed', bg: '#8b5cf6' },
        { key: 'shipped', label: 'Shipped', color: '#d97706', bg: '#f59e0b' },
        { key: 'processing', label: 'Processing', color: '#64748b', bg: '#94a3b8' },
        { key: 'cancelled', label: 'Cancelled', color: '#ef4444', bg: '#f87171' }
    ];

    list.innerHTML = statuses.map(st => {
        const count = statusCounts[st.key] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

        return `
            <div class="status-progress-item">
                <div class="status-progress-header">
                    <span style="font-weight: 500; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${st.color};"></span>
                        ${st.label}
                    </span>
                    <span style="font-size: 12px; color: var(--accent);">
                        <strong>${count}</strong> orders (${pct}%)
                    </span>
                </div>
                <div class="status-progress-track">
                    <div class="status-progress-bar" style="width: ${pct}%; background: ${st.bg};"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Render Carrier Statistics
function renderCarrierStats(carriers) {
    const container = document.getElementById('carrierList');
    if (!container) return;

    if (!carriers || carriers.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: var(--accent);">No carrier data.</div>';
        return;
    }

    container.innerHTML = carriers.map(c => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 600; font-size: 13px;">${c.carrier}</div>
            <div style="font-size: 12px; color: var(--accent);">
                <strong>${c.count}</strong> shipments &bull; $${(c.revenue || c.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </div>
    `).join('');
}

// Render Top Products
function renderTopProducts(products) {
    const container = document.getElementById('topProductsList');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: var(--accent);">No product sales data.</div>';
        return;
    }

    container.innerHTML = products.map((p, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; font-weight: 700; color: #94a3b8; width: 16px;">#${idx + 1}</span>
                <span style="font-weight: 500; font-size: 13px;">${p.product_name}</span>
            </div>
            <div style="font-size: 12px; color: var(--accent);">
                <strong>${p.units_sold || p.count}</strong> sold &bull; $${(p.revenue || 0).toFixed(2)}
            </div>
        </div>
    `).join('');
}

// 3. Load & Render Orders List
async function loadOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--accent); padding: 30px;">Loading orders from D1 database...</td></tr>';
    }

    try {
        const data = await window.StoreBackend.getOrders({
            status: activeStatusFilter,
            carrier: activeCarrierFilter,
            search: activeSearchQuery
        });

        if (!data.success) throw new Error(data.error);

        allOrders = data.orders || [];
        updateFilterCounts();
        applyFiltersAndRender();
    } catch (err) {
        console.error('Failed to load orders:', err);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 30px;">Error connecting to D1 database: ${err.message}</td></tr>`;
        }
    }
}

// Update Filter Count Badges
function updateFilterCounts() {
    const counts = {
        all: allOrders.length,
        processing: 0,
        shipped: 0,
        in_transit: 0,
        out_for_delivery: 0,
        delivered: 0
    };

    allOrders.forEach(o => {
        if (counts[o.status] !== undefined) {
            counts[o.status]++;
        }
    });

    const elAll = document.getElementById('countAll');
    const elProc = document.getElementById('countProcessing');
    const elShip = document.getElementById('countShipped');
    const elTrans = document.getElementById('countTransit');
    const elOut = document.getElementById('countOutDelivery');
    const elDeliv = document.getElementById('countDelivered');

    if (elAll) elAll.textContent = counts.all;
    if (elProc) elProc.textContent = counts.processing;
    if (elShip) elShip.textContent = counts.shipped;
    if (elTrans) elTrans.textContent = counts.in_transit;
    if (elOut) elOut.textContent = counts.out_for_delivery;
    if (elDeliv) elDeliv.textContent = counts.delivered;
}

// Filter and Render
function applyFiltersAndRender() {
    filteredOrders = allOrders.filter(order => {
        if (activeStatusFilter !== 'all' && order.status !== activeStatusFilter) {
            return false;
        }

        if (activeCarrierFilter !== 'all' && order.carrier !== activeCarrierFilter) {
            return false;
        }

        if (activeSearchQuery) {
            const q = activeSearchQuery.toLowerCase();
            const matchId = (order.order_id || '').toLowerCase().includes(q);
            const matchTracking = (order.tracking_number || '').toLowerCase().includes(q);
            const matchName = (order.customer_name || '').toLowerCase().includes(q);
            const matchEmail = (order.customer_email || '').toLowerCase().includes(q);
            const matchCity = (order.shipping_city || '').toLowerCase().includes(q);
            const matchCarrier = (order.carrier || '').toLowerCase().includes(q);
            if (!matchId && !matchTracking && !matchName && !matchEmail && !matchCity && !matchCarrier) {
                return false;
            }
        }

        return true;
    });

    renderOrdersTable();
}

function filterByStatus(status) {
    activeStatusFilter = status;
    document.querySelectorAll('.btn-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    applyFiltersAndRender();
}

function handleCarrierFilter(carrier) {
    activeCarrierFilter = carrier;
    applyFiltersAndRender();
}

function handleSearch(query) {
    activeSearchQuery = query.trim();
    applyFiltersAndRender();
}

// Render Orders Table
function renderOrdersTable() {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody) return;

    if (filteredOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--accent); padding: 40px 20px;">
                    No orders match your filter criteria in Cloudflare D1.
                </td>
            </tr>
        `;
        return;
    }

    const statusLabels = {
        processing: 'Processing',
        shipped: 'Shipped',
        in_transit: 'In Transit',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
    };

    tableBody.innerHTML = filteredOrders.map(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const statusBadge = `
            <span class="badge-status badge-${order.status}">
                ${statusLabels[order.status] || order.status}
            </span>
        `;

        return `
            <tr>
                <td>
                    <span class="order-id-link" onclick="openTrackingInspector('${order.tracking_number || order.order_id}')">
                        ${order.order_id}
                    </span>
                    <div style="font-size: 11px; color: var(--accent); margin-top: 2px;">${orderDate}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${order.customer_name}</div>
                    <div style="font-size: 11px; color: var(--accent);">${order.customer_email}</div>
                </td>
                <td>
                    <span class="tracking-pill" onclick="openTrackingInspector('${order.tracking_number}')" title="Inspect tracking details">
                        ${order.tracking_number}
                    </span>
                    <button class="btn-copy-tiny" onclick="copyToClipboard('${order.tracking_number}')" title="Copy tracking number">📋</button>
                </td>
                <td>
                    <span class="carrier-chip carrier-${order.carrier.toLowerCase().replace(/\s+/g, '-')}">
                        ${order.carrier}
                    </span>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div style="font-size: 12px; font-weight: 500;">${order.shipping_city || 'N/A'}</div>
                    <div style="font-size: 11px; color: var(--accent);">ETA: ${order.estimated_delivery || 'Pending'}</div>
                </td>
                <td style="font-weight: 600; font-size: 13px;">
                    $${order.total_amount ? Number(order.total_amount).toFixed(2) : '0.00'}
                </td>
                <td>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn-action-sm" onclick="openTrackingInspector('${order.tracking_number}')">
                            Track &rarr;
                        </button>
                        <select onchange="quickUpdateStatus(${order.id}, this.value)" style="font-size: 11px; padding: 3px 6px; border: 1px solid var(--border); background: #fff; border-radius: 3px;">
                            <option value="" disabled selected>Update</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="in_transit">In Transit</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                        </select>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 4. Detailed Tracking Inspector Modal
async function openTrackingInspector(trackingNumberOrOrderId) {
    const modal = document.getElementById('trackingModal');
    const content = document.getElementById('trackingModalContent');
    if (!modal || !content) return;

    modal.style.display = 'flex';
    content.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--accent);">
            <div style="font-size: 24px; margin-bottom: 8px;">📦</div>
            <div>Querying Cloudflare D1 for tracking records...</div>
        </div>
    `;

    try {
        const data = await window.StoreBackend.trackOrder(trackingNumberOrOrderId);
        if (!data.success || !data.tracking) {
            content.innerHTML = `
                <div style="padding: 30px; text-align: center;">
                    <h3 style="color: #ef4444; margin-bottom: 8px;">Shipment Not Found</h3>
                    <p style="font-size: 13px; color: var(--accent);">No tracking record found for "${trackingNumberOrOrderId}" in the D1 database.</p>
                </div>
            `;
            return;
        }

        currentTrackingOrder = data.tracking;
        renderTrackingInspectorContent(data.tracking);
    } catch (err) {
        content.innerHTML = `<div style="padding: 30px; color: #ef4444;">Error fetching tracking: ${err.message}</div>`;
    }
}

function renderTrackingInspectorContent(t) {
    const content = document.getElementById('trackingModalContent');
    if (!content) return;

    const statusSteps = [
        { key: 'processing', label: 'Order Placed & Packed' },
        { key: 'shipped', label: 'Carrier Accepted' },
        { key: 'in_transit', label: 'In Transit' },
        { key: 'out_for_delivery', label: 'Out for Delivery' },
        { key: 'delivered', label: 'Delivered' }
    ];

    const stepIndexMap = {
        'processing': 0,
        'shipped': 1,
        'in_transit': 2,
        'out_for_delivery': 3,
        'delivered': 4,
        'cancelled': -1
    };

    const currentIdx = stepIndexMap[t.status] !== undefined ? stepIndexMap[t.status] : 0;

    const stepperHtml = statusSteps.map((step, idx) => {
        let stateClass = 'pending';
        let iconContent = idx + 1;

        if (t.status === 'cancelled') {
            stateClass = 'pending';
        } else if (idx < currentIdx) {
            stateClass = 'completed';
            iconContent = '✓';
        } else if (idx === currentIdx) {
            stateClass = 'active';
            iconContent = '●';
        }

        return `
            <div class="stepper-step ${stateClass}">
                <div class="stepper-circle">${iconContent}</div>
                <div class="stepper-label">${step.label}</div>
            </div>
        `;
    }).join('');

    const statusMap = {
        processing: 'Processing',
        shipped: 'Shipped',
        in_transit: 'In Transit',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
    };

    const eventsHtml = (t.events && t.events.length > 0) ? t.events.map(ev => {
        const timeStr = new Date(ev.created_at).toLocaleString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        return `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-status">${ev.status.toUpperCase().replace('_', ' ')}</span>
                        <span class="timeline-time">${timeStr}</span>
                    </div>
                    <div class="timeline-desc">${ev.description}</div>
                    ${ev.location ? `<div class="timeline-location">📍 ${ev.location}</div>` : ''}
                </div>
            </div>
        `;
    }).join('') : '<div style="color: var(--accent); font-size: 13px;">No milestone events recorded yet.</div>';

    const itemsHtml = (t.items && t.items.length > 0) ? t.items.map(it => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
            <div>
                <strong>${it.product_name}</strong>
                <span style="color: var(--accent); font-size: 12px; margin-left: 6px;">&times; ${it.quantity}</span>
            </div>
            <div>$${(it.price * it.quantity).toFixed(2)}</div>
        </div>
    `).join('') : '';

    content.innerHTML = `
        <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                <div>
                    <span class="d1-badge-chip">Cloudflare D1 Tracking</span>
                    <h2 style="font-size: 22px; font-weight: 600; margin-top: 6px;">Shipment ${t.trackingNumber}</h2>
                    <p style="font-size: 13px; color: var(--accent); margin-top: 2px;">
                        Order Ref: <strong>${t.orderId}</strong> | Customer: <strong>${t.customerName}</strong>
                    </p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="badge-status badge-${t.status}">${statusMap[t.status] || t.status}</span>
                    <button class="btn-secondary" onclick="copyToClipboard('${t.trackingNumber}')" style="font-size: 12px; padding: 6px 12px; margin: 0;">Copy Tracking #</button>
                </div>
            </div>
        </div>

        <!-- Visual Shipping Stepper -->
        <div class="shipping-stepper" style="margin-bottom: 30px;">
            ${stepperHtml}
        </div>

        <!-- Tracking Summary Details Card -->
        <div class="tracking-summary-card" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; background: #fafafa; border: 1px solid var(--border); padding: 16px; margin-bottom: 24px;">
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: var(--accent);">Carrier</div>
                <div style="font-size: 14px; font-weight: 600; margin-top: 2px;">${t.carrier}</div>
            </div>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: var(--accent);">Estimated Delivery</div>
                <div style="font-size: 14px; font-weight: 600; margin-top: 2px;">${t.estimatedDelivery || 'Pending'}</div>
            </div>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: var(--accent);">Destination</div>
                <div style="font-size: 14px; font-weight: 600; margin-top: 2px;">${t.shippingCity}, ${t.shippingCountry}</div>
            </div>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: var(--accent);">Order Total</div>
                <div style="font-size: 14px; font-weight: 600; margin-top: 2px;">$${t.totalAmount ? Number(t.totalAmount).toFixed(2) : '0.00'}</div>
            </div>
        </div>

        <!-- Live Milestones Timeline -->
        <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <h3 style="font-size: 16px; font-weight: 600;">Delivery Milestones (D1 Event Log)</h3>
                <span style="font-size: 12px; color: var(--accent);">${t.events ? t.events.length : 0} events recorded</span>
            </div>
            <div class="timeline-container">
                ${eventsHtml}
            </div>
        </div>

        <!-- Quick Status Update & Add Milestone Form -->
        <div style="background: #f8fafc; border: 1px solid var(--border); padding: 16px; margin-bottom: 24px;">
            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">Update Status in D1</h4>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn-sql-pill" onclick="updateOrderStatusFromInspector(${t.id}, 'shipped')">Mark as Shipped</button>
                <button class="btn-sql-pill" onclick="updateOrderStatusFromInspector(${t.id}, 'in_transit')">Mark In-Transit</button>
                <button class="btn-sql-pill" onclick="updateOrderStatusFromInspector(${t.id}, 'out_for_delivery')">Mark Out for Delivery</button>
                <button class="btn-sql-pill" onclick="updateOrderStatusFromInspector(${t.id}, 'delivered')" style="border-color: #059669; color: #059669;">✓ Mark Delivered</button>
            </div>

            <div style="margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
                <span style="font-size: 12px; font-weight: 600; color: #475569;">Add Custom Milestone Event:</span>
                <form id="addEventForm" onsubmit="handleAddEventSubmit(event, ${t.id})" style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                    <input type="text" id="evLocation" placeholder="Location (e.g. Chicago Sorting Facility)" style="padding: 8px; font-size: 12px; border: 1px solid var(--border); flex: 1; min-width: 180px;">
                    <input type="text" id="evDesc" placeholder="Event description" required style="padding: 8px; font-size: 12px; border: 1px solid var(--border); flex: 2; min-width: 200px;">
                    <button type="submit" class="btn" style="padding: 8px 16px; font-size: 12px;">+ Add Event</button>
                </form>
            </div>
        </div>

        <!-- Itemized Order Content -->
        <div style="border-top: 1px solid var(--border); padding-top: 16px;">
            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Order Manifest</h4>
            <div style="background: #ffffff;">
                ${itemsHtml}
            </div>
        </div>
    `;
}

function closeTrackingModal() {
    const modal = document.getElementById('trackingModal');
    if (modal) modal.style.display = 'none';
    currentTrackingOrder = null;
}

// Quick Status Update from Table
async function quickUpdateStatus(orderId, newStatus) {
    if (!newStatus) return;
    try {
        const data = await window.StoreBackend.updateOrderStatus(orderId, newStatus);
        if (data.success) {
            showToast(`Order status updated to "${newStatus}" in D1`);
            await loadOrders();
            await loadD1Stats();
        } else {
            showToast('Failed to update status: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Update error: ' + err.message, 'error');
    }
}

// Update Status from Inspector
async function updateOrderStatusFromInspector(orderId, newStatus) {
    try {
        const data = await window.StoreBackend.updateOrderStatus(orderId, newStatus);
        if (data.success) {
            showToast(`Status updated to "${newStatus}" in D1`);
            await loadOrders();
            await loadD1Stats();
            if (currentTrackingOrder) {
                openTrackingInspector(currentTrackingOrder.trackingNumber);
            }
        } else {
            showToast('Failed to update: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// Add Event from Inspector
async function handleAddEventSubmit(e, orderId) {
    e.preventDefault();
    const locInput = document.getElementById('evLocation');
    const descInput = document.getElementById('evDesc');
    const location = locInput ? locInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    if (!description) return;

    try {
        const status = currentTrackingOrder ? currentTrackingOrder.status : 'in_transit';
        const data = await window.StoreBackend.addTrackingEvent(orderId, status, location || 'Transit Hub', description);
        if (data.success) {
            showToast('Milestone appended to D1 event log!');
            if (currentTrackingOrder) {
                openTrackingInspector(currentTrackingOrder.trackingNumber);
            }
        } else {
            showToast('Failed to add milestone: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// 5. Public Tracking Lookup Modal
function openPublicTrackModal() {
    const modal = document.getElementById('publicTrackModal');
    if (modal) modal.style.display = 'flex';
}

function closePublicTrackModal() {
    const modal = document.getElementById('publicTrackModal');
    if (modal) modal.style.display = 'none';
}

async function submitPublicLookup() {
    const input = document.getElementById('modalTrackInput');
    const resultBox = document.getElementById('publicLookupResult');
    if (!input || !resultBox) return;

    const code = input.value.trim();
    if (!code) {
        showToast('Please enter a tracking number or Order ID', 'error');
        return;
    }

    resultBox.innerHTML = '<div style="padding: 16px; font-size: 13px; color: var(--accent);">Searching D1 database...</div>';

    try {
        const data = await window.StoreBackend.trackOrder(code);
        if (data.success && data.tracking) {
            const tr = data.tracking;
            resultBox.innerHTML = `
                <div style="background: #f8fafc; border: 1px solid var(--border); padding: 16px; margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 600; font-size: 14px;">Shipment Found: ${tr.trackingNumber}</span>
                        <span class="badge-status badge-${tr.status}">${tr.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <p style="font-size: 13px; color: var(--accent); margin-bottom: 12px;">Carrier: <strong>${tr.carrier}</strong> | ETA: <strong>${tr.estimatedDelivery}</strong></p>
                    <button class="btn" style="padding: 8px 18px; font-size: 12px;" onclick="closePublicTrackModal(); openTrackingInspector('${tr.trackingNumber}');">
                        Open Full Interactive Tracker &rarr;
                    </button>
                </div>
            `;
        } else {
            resultBox.innerHTML = `
                <div style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 13px; margin-top: 10px;">
                    No shipment found matching "${code}" in Cloudflare D1.
                </div>
            `;
        }
    } catch (e) {
        resultBox.innerHTML = '<div style="color: #ef4444; font-size: 13px;">Error during search.</div>';
    }
}

// 6. Manual Order Creation Modal
function openCreateOrderModal() {
    const modal = document.getElementById('createOrderModal');
    if (modal) modal.style.display = 'flex';
}

function closeCreateOrderModal() {
    const modal = document.getElementById('createOrderModal');
    if (modal) modal.style.display = 'none';
}

function setupManualOrderForm() {
    const form = document.getElementById('manualOrderForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const catalogMap = {
            '1': { name: 'Classic White T-Shirt', price: 29.99, category: 'shirts' },
            '2': { name: 'Black Hoodie', price: 79.99, category: 'hoodies' },
            '3': { name: 'Gray Joggers', price: 59.99, category: 'bottoms' },
            '5': { name: 'Cream Heavyweight Hoodie', price: 84.99, category: 'hoodies' },
            '6': { name: 'Relaxed Fit Denim Jeans', price: 89.99, category: 'bottoms' }
        };

        const selVal = document.getElementById('mOrderItemSelect').value;
        const item = catalogMap[selVal] || catalogMap['1'];

        const payload = {
            customer_name: document.getElementById('mCustName').value.trim(),
            customer_email: document.getElementById('mCustEmail').value.trim(),
            shipping_address: document.getElementById('mCustAddress').value.trim(),
            shipping_city: document.getElementById('mCustCity').value.trim(),
            carrier: document.getElementById('mCustCarrier').value,
            items: [{
                product_id: parseInt(selVal),
                product_name: item.name,
                category: item.category,
                quantity: 1,
                price: item.price
            }]
        };

        try {
            const data = await window.StoreBackend.createOrder(payload);
            if (data.success && data.order) {
                closeCreateOrderModal();
                form.reset();
                showToast(`Order created in D1! Tracking: ${data.order.tracking_number}`);
                await loadOrders();
                await loadD1Stats();
                openTrackingInspector(data.order.tracking_number);
            } else {
                showToast('Failed to create order: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (err) {
            showToast('Network error: ' + err.message, 'error');
        }
    });
}

// 7. D1 Interactive SQL Console
function toggleSqlConsole() {
    const drawer = document.getElementById('sqlConsoleDrawer');
    if (!drawer) return;
    if (drawer.style.display === 'none' || !drawer.style.display) {
        drawer.style.display = 'block';
        if (!document.getElementById('sqlInput').value) {
            loadSqlPreset('all_orders');
        }
    } else {
        drawer.style.display = 'none';
    }
}

function loadSqlPreset(preset) {
    const input = document.getElementById('sqlInput');
    if (!input) return;

    switch (preset) {
        case 'all_orders':
            input.value = "SELECT id, order_id, customer_name, total_amount, status, carrier, tracking_number FROM orders ORDER BY id DESC LIMIT 10;";
            break;
        case 'active_shipments':
            input.value = "SELECT order_id, customer_name, status, carrier, tracking_number, estimated_delivery FROM orders WHERE status NOT IN ('delivered', 'cancelled') ORDER BY id DESC;";
            break;
        case 'carrier_stats':
            input.value = "SELECT carrier, COUNT(*) as count, SUM(total_amount) as total_volume FROM orders GROUP BY carrier ORDER BY count DESC;";
            break;
        case 'tracking_events':
            input.value = "SELECT te.id, o.order_id, te.status, te.location, te.description, te.created_at FROM tracking_events te JOIN orders o ON te.order_id = o.id ORDER BY te.id DESC LIMIT 10;";
            break;
        case 'top_items':
            input.value = "SELECT product_name, SUM(quantity) as units_sold, SUM(price * quantity) as revenue FROM order_items GROUP BY product_name ORDER BY units_sold DESC;";
            break;
    }
    executeSqlConsoleQuery();
}

async function executeSqlConsoleQuery() {
    const input = document.getElementById('sqlInput');
    const resultBox = document.getElementById('sqlResultsBox');
    const statusBox = document.getElementById('sqlExecutionStatus');
    if (!input || !resultBox) return;

    const query = input.value.trim();
    if (!query) {
        showToast('Please enter a SQL query', 'error');
        return;
    }

    statusBox.textContent = 'Executing against Cloudflare D1...';
    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="color: #94a3b8; font-size: 13px;">Executing query...</div>';

    try {
        const startTime = performance.now();
        const data = await window.StoreBackend.executeSql(query);
        const duration = Math.round(performance.now() - startTime);

        if (data.success) {
            const rows = data.results || [];
            statusBox.textContent = `Returned ${rows.length} row(s) in ${duration}ms`;

            if (rows.length === 0) {
                resultBox.innerHTML = '<div style="color: #94a3b8; font-size: 13px;">Statement executed successfully. No rows returned.</div>';
                return;
            }

            const headers = Object.keys(rows[0]);
            resultBox.innerHTML = `
                <table class="sql-result-table">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${headers.map(h => `<td>${row[h] !== null && row[h] !== undefined ? row[h] : '<em style="color:#64748b;">NULL</em>'}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            statusBox.textContent = 'Execution error';
            resultBox.innerHTML = `<div style="color: #f87171; font-size: 13px;">Error: ${data.error}</div>`;
        }
    } catch (err) {
        statusBox.textContent = 'Network error';
        resultBox.innerHTML = `<div style="color: #f87171; font-size: 13px;">Error: ${err.message}</div>`;
    }
}

// 8. Refresh All D1 Data
async function refreshAllD1Data() {
    showToast('Refreshing D1 data...');
    await loadD1Status();
    await loadD1Stats();
    await loadOrders();
    showToast('D1 orders & statistics updated!');
}

// 9. Reset / Re-seed Demo Data
async function resetDemoOrders() {
    try {
        const data = await window.StoreBackend.resetSeed();
        if (data.success) {
            showToast('D1 sample orders and tracking milestones restored!');
            await loadOrders();
            await loadD1Stats();
        } else {
            showToast('Seed failed: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Seed error: ' + err.message, 'error');
    }
}
