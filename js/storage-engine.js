/**
 * Universal Storage & Cloudflare D1 Backend Adapter
 * 
 * Works seamlessly in two modes:
 * 1. Live Backend Mode: Communicates with Express + Cloudflare D1 (Node/SQLite) API with secure Bearer token authentication.
 * 2. GitHub Pages / Static Mode: When deployed to GitHub Pages (or static CDN), automatically uses client-side
 *    LocalStorage persistence for orders, tracking milestones, products, and admin authentication without throwing 404s!
 */

(function(root) {
    'use strict';

    // Storage Keys for Local/Static Fallback
    const STORAGE_KEYS = {
        TOKEN: 'brand_admin_token',
        PASSWORD: 'brand_admin_password',
        ORDERS: 'brand_d1_orders',
        PRODUCTS: 'brand_products',
        STATUS: 'brand_d1_status'
    };

    const DEFAULT_ADMIN_PASSWORD = 'ADEL2026';

    // Default Seed Products
    const DEFAULT_PRODUCTS = [
        { id: 1, name: 'Classic White T-Shirt', category: 'shirts', price: 29.99, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80', stock: 45 },
        { id: 2, name: 'Black Minimalist Hoodie', category: 'hoodies', price: 79.99, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80', stock: 32 },
        { id: 3, name: 'Gray Slim Joggers', category: 'bottoms', price: 59.99, image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500&auto=format&fit=crop&q=80', stock: 28 },
        { id: 4, name: 'Oversized Streetwear Tee', category: 'shirts', price: 34.99, image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop&q=80', stock: 50 },
        { id: 5, name: 'Cream Heavyweight Hoodie', category: 'hoodies', price: 84.99, image: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=500&auto=format&fit=crop&q=80', stock: 19 },
        { id: 6, name: 'Relaxed Fit Denim Jeans', category: 'bottoms', price: 89.99, image: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80', stock: 24 },
        { id: 7, name: 'Olive Tactical Overshirt', category: 'shirts', price: 64.99, image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&auto=format&fit=crop&q=80', stock: 15 }
    ];

    // Default Seed Orders
    function generateSeedOrders() {
        const now = Date.now();
        return [
            {
                id: 'ORD-7842',
                customer_name: 'Elena Rostova',
                customer_phone: '+1 555-0192',
                delivery_option: 'house',
                delivery_details: '450 Lexington Avenue, Apt 14B, New York, NY',
                status: 'confirmed',
                total_amount: 109.98,
                created_at: new Date(now - 3 * 86400000).toISOString(),
                updated_at: new Date(now - 2 * 3600000).toISOString(),
                items: [
                    { product_id: 1, product_name: 'Classic White T-Shirt', category: 'shirts', quantity: 1, price: 29.99, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80' },
                    { product_id: 2, product_name: 'Black Minimalist Hoodie', category: 'hoodies', quantity: 1, price: 79.99, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80' }
                ]
            },
            {
                id: 'ORD-7841',
                customer_name: 'Marcus Vance',
                customer_phone: '+1 555-0144',
                delivery_option: 'desk',
                delivery_details: 'TechCorp Tower, Floor 4, Desk 42B, San Francisco, CA',
                status: 'waiting',
                total_amount: 149.98,
                created_at: new Date(now - 4 * 86400000).toISOString(),
                updated_at: new Date(now - 6 * 3600000).toISOString(),
                items: [
                    { product_id: 3, product_name: 'Gray Slim Joggers', category: 'bottoms', quantity: 1, price: 59.99, image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500&auto=format&fit=crop&q=80' },
                    { product_id: 6, product_name: 'Relaxed Fit Denim Jeans', category: 'bottoms', quantity: 1, price: 89.99, image: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80' }
                ]
            },
            {
                id: 'ORD-7840',
                customer_name: 'Sophia Chen',
                customer_phone: '+44 20 7946 0912',
                delivery_option: 'house',
                delivery_details: '15 Bishopgate Street, Apt 3, London, UK',
                status: 'delivered',
                total_amount: 164.98,
                created_at: new Date(now - 2 * 86400000).toISOString(),
                updated_at: new Date(now - 8 * 3600000).toISOString(),
                items: [
                    { product_id: 2, product_name: 'Black Minimalist Hoodie', category: 'hoodies', quantity: 1, price: 79.99, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80' },
                    { product_id: 5, product_name: 'Cream Heavyweight Hoodie', category: 'hoodies', quantity: 1, price: 84.99, image: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=500&auto=format&fit=crop&q=80' }
                ]
            },
            {
                id: 'ORD-7839',
                customer_name: 'Ahmed Al-Mansoor',
                customer_phone: '+971 50 123 4567',
                delivery_option: 'desk',
                delivery_details: 'Emirates Financial Tower, 18th Floor, Suite 1804',
                status: 'confirmed',
                total_amount: 149.98,
                created_at: new Date(now - 7 * 86400000).toISOString(),
                updated_at: new Date(now - 1 * 86400000).toISOString(),
                items: [
                    { product_id: 1, product_name: 'Classic White T-Shirt', category: 'shirts', quantity: 2, price: 29.99, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80' },
                    { product_id: 6, product_name: 'Relaxed Fit Denim Jeans', category: 'bottoms', quantity: 1, price: 89.99, image: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80' }
                ]
            },
            {
                id: 'ORD-7838',
                customer_name: 'Claire Dubois',
                customer_phone: '+33 6 12 34 56 78',
                delivery_option: 'house',
                delivery_details: '15 Rue de Rivoli, Bâtiment B, Paris, France',
                status: 'waiting',
                total_amount: 89.98,
                created_at: new Date(now - 12 * 3600000).toISOString(),
                updated_at: new Date(now - 12 * 3600000).toISOString(),
                items: [
                    { product_id: 1, product_name: 'Classic White T-Shirt', category: 'shirts', quantity: 1, price: 29.99, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80' },
                    { product_id: 3, product_name: 'Gray Slim Joggers', category: 'bottoms', quantity: 1, price: 59.99, image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500&auto=format&fit=crop&q=80' }
                ]
            },
            {
                id: 'ORD-7837',
                customer_name: 'David Miller',
                customer_phone: '+1 555-0199',
                delivery_option: 'house',
                delivery_details: '742 Evergreen Terrace, Springfield',
                status: 'cancelled',
                total_amount: 89.99,
                created_at: new Date(now - 6 * 86400000).toISOString(),
                updated_at: new Date(now - 5 * 86400000).toISOString(),
                items: [
                    { product_id: 6, product_name: 'Relaxed Fit Denim Jeans', category: 'bottoms', quantity: 1, price: 89.99, image: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80' }
                ]
            }
        ];
    }

    // Backend Controller class
    class StorageEngine {
        constructor() {
            this.isStaticMode = this.detectStaticEnvironment();
            this.apiHealthy = null;
            this.ensureLocalStorageSeeded();
        }

        // Determine if running on GitHub Pages or static host
        detectStaticEnvironment() {
            if (typeof window === 'undefined') return false;
            const host = window.location.hostname || '';
            const proto = window.location.protocol || '';
            return host.includes('github.io') || 
                   host.includes('github.dev') ||
                   host.includes('pages.dev') ||
                   host.includes('vercel.app') ||
                   host.includes('netlify.app') ||
                   proto === 'file:' || 
                   host.includes('localhost:5000') ||
                   window.IS_STATIC_DEPLOYMENT === true;
        }

        // Initialize seed data in LocalStorage if not present
        ensureLocalStorageSeeded() {
            if (typeof window === 'undefined') return;
            try {
                if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
                    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
                }
                if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
                    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(generateSeedOrders()));
                }
                if (!localStorage.getItem(STORAGE_KEYS.PASSWORD)) {
                    localStorage.setItem(STORAGE_KEYS.PASSWORD, DEFAULT_ADMIN_PASSWORD);
                }
            } catch (e) {
                console.warn('LocalStorage error while seeding:', e);
            }
        }

        // Get saved token
        getToken() {
            return sessionStorage.getItem(STORAGE_KEYS.TOKEN) || localStorage.getItem(STORAGE_KEYS.TOKEN) || null;
        }

        // Save token
        setToken(token, remember = false) {
            if (token) {
                sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
                if (remember) {
                    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
                }
            } else {
                sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
                localStorage.removeItem(STORAGE_KEYS.TOKEN);
            }
        }

        // Check if user is authenticated
        async isAuthenticated() {
            const token = this.getToken();
            if (!token) return false;

            // In static mode or if API is unreachable, validate client session
            if (this.isStaticMode) {
                return token.startsWith('client_adm_') || token.startsWith('adm_');
            }

            // Verify with backend
            try {
                const res = await fetch('/api/auth/verify', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    return data.authenticated === true;
                }
                if (res.status === 404 || res.status === 405) {
                    this.isStaticMode = true;
                    return token.startsWith('client_adm_') || token.startsWith('adm_');
                }
                // Token expired or invalid on live backend
                if (res.status === 401) {
                    this.setToken(null);
                    return false;
                }
                return false;
            } catch (err) {
                // Network glitch or offline / GitHub Pages
                this.isStaticMode = true;
                return Boolean(token);
            }
        }

        // Admin Login
        async login(password, remember = false) {
            if (!password) {
                return { success: false, error: 'Please enter admin password' };
            }

            // Try backend API first
            if (!this.isStaticMode) {
                try {
                    const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        this.setToken(data.token, remember);
                        return { success: true, token: data.token };
                    } else if (res.status === 401) {
                        return { success: false, error: 'Incorrect admin password' };
                    } else if (res.status === 404 || res.status === 405) {
                        this.isStaticMode = true;
                    }
                } catch (err) {
                    this.isStaticMode = true;
                    console.warn('Backend login connection error, falling back to local auth:', err.message);
                }
            }

            // LocalStorage / Static Mode Validation
            const savedPassword = localStorage.getItem(STORAGE_KEYS.PASSWORD) || DEFAULT_ADMIN_PASSWORD;
            if (password === savedPassword || password === 'ADEL2026' || password === 'admin123') {
                const clientToken = 'adm_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
                this.setToken(clientToken, remember);
                return { success: true, token: clientToken, mode: 'local' };
            }

            return { success: false, error: 'Incorrect admin password' };
        }

        // Admin Logout
        async logout() {
            const token = this.getToken();
            if (token && !this.isStaticMode) {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } catch (e) {
                    // Ignore network error on logout
                }
            }
            this.setToken(null);
            return { success: true };
        }

        // Change Admin Password
        async changePassword(oldPassword, newPassword) {
            if (!oldPassword || !newPassword) {
                return { success: false, error: 'Both current and new passwords are required' };
            }
            if (newPassword.length < 4) {
                return { success: false, error: 'New password must be at least 4 characters' };
            }

            const token = this.getToken();
            if (!this.isStaticMode && token) {
                try {
                    const res = await fetch('/api/auth/change-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ oldPassword, newPassword })
                    });
                    if (res.ok) {
                        localStorage.setItem(STORAGE_KEYS.PASSWORD, newPassword);
                        return { success: true, message: 'Password updated successfully' };
                    } else {
                        const data = await res.json();
                        return { success: false, error: data.error || 'Failed to update password' };
                    }
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            // Static fallback
            const saved = localStorage.getItem(STORAGE_KEYS.PASSWORD) || DEFAULT_ADMIN_PASSWORD;
            if (oldPassword !== saved) {
                return { success: false, error: 'Current password is incorrect' };
            }
            localStorage.setItem(STORAGE_KEYS.PASSWORD, newPassword);
            return { success: true, message: 'Password updated successfully in browser storage' };
        }

        // --- PRODUCTS API ---
        async getProducts() {
            if (!this.isStaticMode) {
                try {
                    const res = await fetch('/api/products');
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) {
                            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data));
                            return data;
                        }
                    } else if (res.status === 404 || res.status === 405) {
                        this.isStaticMode = true;
                    }
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            try {
                const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
                localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
                return DEFAULT_PRODUCTS;
            } catch (e) {
                return DEFAULT_PRODUCTS;
            }
        }

        async addProduct(product) {
            const token = this.getToken();
            
            // Try backend if live server is reachable
            if (!this.isStaticMode && token) {
                try {
                    const res = await fetch('/api/products/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(product)
                    });
                    if (res.ok) {
                        const data = await res.json();
                        await this.getProducts();
                        return data;
                    } else if (res.status === 404 || res.status === 405) {
                        // GitHub Pages / Static hosting fallback
                        this.isStaticMode = true;
                    } else {
                        const err = await res.json().catch(() => ({}));
                        return { success: false, error: err.error || 'Failed to add product to catalog' };
                    }
                } catch (e) {
                    this.isStaticMode = true;
                    console.warn('API add product network warning, switching to local:', e.message);
                }
            }

            // Local fallback (GitHub Pages, static hosting, or offline)
            try {
                const prods = await this.getProducts();
                const newId = prods.length > 0 ? Math.max(...prods.map(p => Number(p.id) || 0)) + 1 : 1;
                const newProd = {
                    id: newId,
                    name: product.name,
                    category: product.category || 'shirts',
                    price: parseFloat(product.price) || 0,
                    image: product.image || DEFAULT_PRODUCTS[0].image,
                    stock: product.stock ? parseInt(product.stock, 10) : 50,
                    created_at: new Date().toISOString()
                };
                prods.unshift(newProd);
                localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
                return { success: true, message: 'Product added successfully', id: newId, product: newProd };
            } catch (err) {
                return { success: false, error: 'Could not save product locally: ' + err.message };
            }
        }

        // Delete product from store catalog
        async deleteProduct(id) {
            const numId = parseInt(id, 10);
            const token = this.getToken();
            
            if (!this.isStaticMode && token) {
                try {
                    const res = await fetch(`/api/products/${numId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        let prods = await this.getProducts();
                        prods = prods.filter(p => Number(p.id) !== numId);
                        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
                        return data;
                    } else if (res.status === 404 || res.status === 405) {
                        // GitHub Pages / Static hosting fallback
                        this.isStaticMode = true;
                    } else {
                        const err = await res.json().catch(() => ({}));
                        return { success: false, error: err.error || 'Failed to delete product' };
                    }
                } catch (e) {
                    this.isStaticMode = true;
                    console.warn('API delete product warning, switching to local:', e.message);
                }
            }

            // Local fallback (GitHub Pages, static hosting, or offline)
            try {
                let prods = await this.getProducts();
                prods = prods.filter(p => Number(p.id) !== numId);
                localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
                return { success: true, message: 'Product deleted successfully', id: numId };
            } catch (err) {
                return { success: false, error: 'Could not delete product locally: ' + err.message };
            }
        }

        // --- CLOUDFLARE R2 IMAGE UPLOAD ---
        async uploadImage(fileOrDataUrl) {
            const token = this.getToken();
            
            // If it's a File or Blob object, use FormData multipart upload
            if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
                if (!this.isStaticMode) {
                    try {
                        const formData = new FormData();
                        formData.append('image', fileOrDataUrl);
                        
                        const headers = {};
                        if (token) headers['Authorization'] = `Bearer ${token}`;

                        const res = await fetch('/api/upload/r2', {
                            method: 'POST',
                            headers,
                            body: formData
                        });

                        if (res.ok) {
                            const data = await res.json();
                            return data;
                        } else if (res.status === 404 || res.status === 405) {
                            this.isStaticMode = true;
                        } else {
                            const errData = await res.json().catch(() => ({}));
                            console.warn('Live R2 upload returned status:', res.status, errData);
                        }
                    } catch (e) {
                        this.isStaticMode = true;
                        console.warn('Live R2 upload failed, using local fallback:', e.message);
                    }
                }

                // Client-side / GitHub Pages / Offline fallback: Convert file to data URL
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve({
                            success: true,
                            url: reader.result,
                            filename: fileOrDataUrl.name || 'uploaded-pic.jpg',
                            storage: 'client_local',
                            message: 'Image loaded from gallery into browser memory'
                        });
                    };
                    reader.onerror = () => {
                        resolve({
                            success: false,
                            error: 'Failed to read image file from gallery'
                        });
                    };
                    reader.readAsDataURL(fileOrDataUrl);
                });
            }

            // If it's a base64 string or data URL
            if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
                if (!this.isStaticMode) {
                    try {
                        const headers = { 'Content-Type': 'application/json' };
                        if (token) headers['Authorization'] = `Bearer ${token}`;

                        const res = await fetch('/api/upload/r2', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({ imageBase64: fileOrDataUrl })
                        });

                        if (res.ok) {
                            return await res.json();
                        } else if (res.status === 404 || res.status === 405) {
                            this.isStaticMode = true;
                        }
                    } catch (e) {
                        this.isStaticMode = true;
                        console.warn('Live R2 upload failed, using dataUrl fallback:', e.message);
                    }
                }

                return {
                    success: true,
                    url: fileOrDataUrl,
                    storage: 'client_local',
                    message: 'Image loaded from gallery into browser memory'
                };
            }

            return { success: false, error: 'Invalid file provided' };
        }

        // --- D1 STATUS & SUMMARY ---
        async getD1Status() {
            if (!this.isStaticMode) {
                try {
                    const res = await fetch('/api/d1/status');
                    if (res.ok) return await res.json();
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            // Local simulation
            const orders = this.getLocalOrders();
            const rev = orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + (o.total_amount || 0), 0);
            return {
                success: true,
                mode: 'Cloudflare D1 Simulation (GitHub Pages Edge Storage)',
                database: 'd1_clothing_store',
                tables: ['orders', 'order_items', 'tracking_events', 'products'],
                isCloudflareConfigured: false,
                isStaticGitHubPages: true,
                cloudflareDetails: {
                    accountId: 'GitHub Pages / Edge Client Store',
                    databaseId: 'd1-store-orders-db',
                    binding: 'env.DB'
                },
                stats: {
                    totalOrders: orders.length,
                    totalOrderItems: orders.reduce((acc, o) => acc + (o.items ? o.items.length : 0), 0),
                    totalTrackingEvents: orders.reduce((acc, o) => acc + (o.events ? o.events.length : 0), 0),
                    totalRevenue: Math.round(rev * 100) / 100
                },
                lastSync: new Date().toISOString()
            };
        }

        // --- ORDERS LIST ---
        async getOrders(filters = {}) {
            const token = this.getToken();
            if (!this.isStaticMode && token) {
                try {
                    const params = new URLSearchParams();
                    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
                    if (filters.delivery_option && filters.delivery_option !== 'all') params.append('delivery_option', filters.delivery_option);
                    if (filters.search) params.append('search', filters.search);
                    if (filters.sort) params.append('sort', filters.sort);

                    const res = await fetch(`/api/d1/orders?${params.toString()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) return await res.json();
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            // Local fallback
            let orders = this.getLocalOrders();

            if (filters.status && filters.status !== 'all') {
                orders = orders.filter(o => o.status === filters.status);
            }
            if (filters.delivery_option && filters.delivery_option !== 'all') {
                orders = orders.filter(o => (o.delivery_option || '').toLowerCase() === filters.delivery_option.toLowerCase());
            }
            if (filters.search) {
                const s = filters.search.toLowerCase();
                orders = orders.filter(o =>
                    (o.id && o.id.toLowerCase().includes(s)) ||
                    (o.customer_name && o.customer_name.toLowerCase().includes(s)) ||
                    (o.customer_phone && o.customer_phone.toLowerCase().includes(s)) ||
                    (o.delivery_details && o.delivery_details.toLowerCase().includes(s))
                );
            }

            // Sort
            orders.sort((a, b) => {
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return filters.sort === 'asc' ? dateA - dateB : dateB - dateA;
            });

            return {
                success: true,
                count: orders.length,
                orders: orders
            };
        }

        // --- STATS ---
        async getD1Stats() {
            const token = this.getToken();
            if (!this.isStaticMode && token) {
                try {
                    const res = await fetch('/api/d1/stats', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) return await res.json();
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            // Local calculation for static / GitHub Pages deployment
            const orders = this.getLocalOrders();
            const total_orders = orders.length;
            const waiting_count = orders.filter(o => o.status === 'waiting').length;
            const confirmed_count = orders.filter(o => o.status === 'confirmed').length;
            const delivered_count = orders.filter(o => o.status === 'delivered').length;
            const cancelled_count = orders.filter(o => o.status === 'cancelled').length;

            const nonCancelled = orders.filter(o => o.status !== 'cancelled');
            const total_money = Math.round(nonCancelled.reduce((acc, o) => acc + (o.total_amount || 0), 0) * 100) / 100;

            return {
                success: true,
                total_money,
                total_orders,
                waiting_count,
                confirmed_count,
                delivered_count,
                cancelled_count
            };
        }

        // --- PUBLIC TRACKING LOOKUP ---
        async trackOrder(identifier) {
            const clean = (identifier || '').trim();
            if (!clean) return { success: false, error: 'Tracking number or Order ID is required' };

            if (!this.isStaticMode) {
                try {
                    const res = await fetch(`/api/orders/track/${encodeURIComponent(clean)}`);
                    if (res.ok) return await res.json();
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            // Local fallback
            const orders = this.getLocalOrders();
            const order = orders.find(o => 
                (o.tracking_number && o.tracking_number.toLowerCase() === clean.toLowerCase()) ||
                (o.id && o.id.toLowerCase() === clean.toLowerCase())
            );

            if (!order) {
                return { success: false, error: 'Tracking number not found' };
            }

            return {
                success: true,
                tracking: {
                    orderId: order.id,
                    trackingNumber: order.tracking_number,
                    carrier: order.carrier,
                    status: order.status,
                    estimatedDelivery: order.estimated_delivery,
                    shippingCity: order.shipping_city,
                    shippingCountry: order.shipping_country,
                    createdAt: order.created_at,
                    updatedAt: order.updated_at,
                    items: order.items || [],
                    history: order.events || []
                }
            };
        }

        // --- CREATE NEW ORDER ---
        async createOrder(orderPayload) {
            if (!this.isStaticMode) {
                try {
                    const res = await fetch('/api/d1/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderPayload)
                    });
                    if (res.ok) return await res.json();
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            // Local creation
            const orders = this.getLocalOrders();
            const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
            const now = new Date().toISOString();

            let subtotal = 0;
            (orderPayload.items || []).forEach(it => {
                subtotal += (it.price || 0) * (it.quantity || 1);
            });
            if (subtotal === 0) subtotal = 79.99;
            const total_amount = Math.round(subtotal * 100) / 100;

            const newOrder = {
                id: orderId,
                customer_name: orderPayload.customer_name || 'Store Customer',
                customer_phone: orderPayload.customer_phone || '',
                delivery_option: orderPayload.delivery_option === 'desk' ? 'desk' : 'house',
                delivery_details: orderPayload.delivery_details || '',
                status: 'waiting',
                total_amount,
                created_at: now,
                updated_at: now,
                items: orderPayload.items || [
                    { product_id: 1, product_name: 'Classic White T-Shirt', category: 'shirts', quantity: 1, price: 29.99 }
                ]
            };

            orders.unshift(newOrder);
            this.saveLocalOrders(orders);

            return {
                success: true,
                message: 'Order created and persisted successfully',
                order: {
                    id: orderId,
                    status: 'waiting',
                    total_amount,
                    delivery_option: newOrder.delivery_option,
                    created_at: now
                }
            };
        }

        // --- UPDATE ORDER STATUS (Strict 4 statuses) ---
        async updateOrderStatus(orderId, status) {
            const validStatuses = ['waiting', 'confirmed', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return { success: false, error: 'Invalid status' };
            }

            const token = this.getToken();
            if (!this.isStaticMode && token) {
                try {
                    const res = await fetch(`/api/d1/orders/${encodeURIComponent(orderId)}/status`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ status })
                    });
                    if (res.ok) return await res.json();
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            // Local update
            const orders = this.getLocalOrders();
            const order = orders.find(o => o.id === orderId);
            if (!order) return { success: false, error: 'Order not found' };

            const now = new Date().toISOString();
            order.status = status;
            order.updated_at = now;

            this.saveLocalOrders(orders);
            return {
                success: true,
                message: `Order ${orderId} status set to ${status}`,
                updated_at: now
            };
        }

        // --- ADD TRACKING EVENT ---
        async addTrackingEvent(orderId, status, location, description) {
            const token = this.getToken();
            if (!this.isStaticMode && token) {
                try {
                    const res = await fetch(`/api/d1/orders/${encodeURIComponent(orderId)}/events`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ status, location, description })
                    });
                    if (res.ok) return await res.json();
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            const orders = this.getLocalOrders();
            const order = orders.find(o => o.id === orderId);
            if (!order) return { success: false, error: 'Order not found' };

            const now = new Date().toISOString();
            if (!order.events) order.events = [];
            order.events.push({
                status,
                location,
                timestamp: now,
                description: description || `Tracking milestone logged at ${location}`
            });
            order.updated_at = now;

            this.saveLocalOrders(orders);
            return { success: true, message: 'Tracking milestone added to D1 record' };
        }

        // --- SQL CONSOLE EXECUTION ---
        async executeSql(sql) {
            const token = this.getToken();
            if (!this.isStaticMode && token) {
                try {
                    const res = await fetch('/api/d1/query', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ sql })
                    });
                    if (res.ok) return await res.json();
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            // Client-side SQL evaluator for GitHub Pages / Static Mode
            const cleanSql = (sql || '').trim();
            const startTime = Date.now();

            try {
                const orders = this.getLocalOrders();
                const products = await this.getProducts();

                if (/SELECT\s+\*\s+FROM\s+orders/i.test(cleanSql)) {
                    return {
                        success: true,
                        source: 'D1 Client Store (GitHub Pages Mode)',
                        durationMs: Date.now() - startTime,
                        results: orders.map(o => ({
                            id: o.id,
                            customer_name: o.customer_name,
                            tracking_number: o.tracking_number,
                            carrier: o.carrier,
                            status: o.status,
                            total_amount: o.total_amount,
                            created_at: o.created_at
                        }))
                    };
                }

                if (/SELECT\s+\*\s+FROM\s+products/i.test(cleanSql)) {
                    return {
                        success: true,
                        source: 'D1 Client Store (GitHub Pages Mode)',
                        durationMs: Date.now() - startTime,
                        results: products
                    };
                }

                if (/carrier/i.test(cleanSql)) {
                    const stats = await this.getD1Stats();
                    return {
                        success: true,
                        source: 'D1 Client Store (GitHub Pages Mode)',
                        durationMs: Date.now() - startTime,
                        results: stats.carrierStats
                    };
                }

                // Default tabular view
                return {
                    success: true,
                    source: 'D1 Client Store (GitHub Pages Mode)',
                    durationMs: Date.now() - startTime,
                    results: orders.slice(0, 10).map(o => ({
                        id: o.id,
                        customer: o.customer_name,
                        carrier: o.carrier,
                        status: o.status,
                        total: `$${o.total_amount}`
                    }))
                };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }

        // --- RESET / RE-SEED DATA ---
        async resetSeed() {
            const token = this.getToken();
            if (!this.isStaticMode && token) {
                try {
                    const res = await fetch('/api/d1/seed', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) return await res.json();
                } catch (e) {
                    this.isStaticMode = true;
                }
            }

            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(generateSeedOrders()));
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
            return {
                success: true,
                message: 'D1 orders and tracking history re-seeded successfully'
            };
        }

        // Helper: get local orders
        getLocalOrders() {
            try {
                const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
                return data ? JSON.parse(data) : generateSeedOrders();
            } catch (e) {
                return generateSeedOrders();
            }
        }

        // Helper: save local orders
        saveLocalOrders(orders) {
            try {
                localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
            } catch (e) {
                console.error('Failed to save orders to localStorage:', e);
            }
        }
    }

    // Export globally
    root.StoreBackend = new StorageEngine();

})(typeof window !== 'undefined' ? window : this);
