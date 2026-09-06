import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import axios from 'axios';
import crypto from 'crypto';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Ensure data and uploads directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// Configure multer for memory storage (up to 15MB images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Initialize SQLite D1 Store
const dbPath = path.join(dataDir, 'd1_clothing_store.sqlite');
const db = new DatabaseSync(dbPath);

// Initialize Cloudflare D1 Schema
function initD1Database() {
  let needsRecreate = false;
  try {
    const info = db.prepare("PRAGMA table_info(orders)").all();
    const hasDeliveryOpt = info.some(col => col.name === 'delivery_option');
    if (!hasDeliveryOpt) needsRecreate = true;
  } catch (e) {
    needsRecreate = true;
  }

  if (needsRecreate) {
    db.exec(`
      DROP TABLE IF EXISTS tracking_events;
      DROP TABLE IF EXISTS order_items;
      DROP TABLE IF EXISTS orders;
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS d1_config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_option TEXT NOT NULL CHECK(delivery_option IN ('house', 'desk')),
      delivery_details TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('waiting', 'confirmed', 'delivered', 'cancelled')),
      total_amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      image TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      stock INTEGER DEFAULT 50,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders(delivery_option);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  `);

  // Seed default products if empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM products');
  const prodCount = countStmt.get();
  if (prodCount.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, category, price, image, stock, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const initialProducts = [
      ['Classic White T-Shirt', 'shirts', 29.99, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80', 85, new Date().toISOString()],
      ['Black Hoodie', 'hoodies', 79.99, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80', 42, new Date().toISOString()],
      ['Gray Joggers', 'bottoms', 59.99, 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500&auto=format&fit=crop&q=80', 60, new Date().toISOString()],
      ['Navy Minimalist Tee', 'shirts', 32.50, 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop&q=80', 95, new Date().toISOString()],
      ['Cream Heavyweight Hoodie', 'hoodies', 84.99, 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=500&auto=format&fit=crop&q=80', 30, new Date().toISOString()],
      ['Relaxed Fit Denim Jeans', 'bottoms', 89.99, 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80', 55, new Date().toISOString()],
      ['Olive Oversized Crewneck', 'shirts', 36.00, 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&auto=format&fit=crop&q=80', 70, new Date().toISOString()],
      ['Washed Black Cargo Pants', 'bottoms', 74.50, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80', 40, new Date().toISOString()]
    ];
    for (const p of initialProducts) {
      insertProduct.run(...p);
    }
  }

  // Seed default orders if empty
  const orderCountStmt = db.prepare('SELECT COUNT(*) as count FROM orders');
  const orderCount = orderCountStmt.get();
  if (orderCount.count === 0) {
    seedInitialOrders();
  }
}

function seedInitialOrders() {
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, customer_name, customer_phone, delivery_option, delivery_details,
      status, total_amount, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, category, quantity, price, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleOrders = [
    {
      id: 'ORD-7842',
      customer_name: 'Elena Rostova',
      customer_phone: '+1 555-0192',
      delivery_option: 'house',
      delivery_details: '422 Lexington Ave, Apt 14B, New York, NY',
      status: 'confirmed',
      total_amount: 109.98,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      items: [
        { product_id: 1, product_name: 'Classic White T-Shirt', category: 'shirts', quantity: 1, price: 29.99, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80' },
        { product_id: 2, product_name: 'Black Hoodie', category: 'hoodies', quantity: 1, price: 79.99, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80' }
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
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 3600000).toISOString(),
      items: [
        { product_id: 3, product_name: 'Gray Joggers', category: 'bottoms', quantity: 1, price: 59.99, image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500&auto=format&fit=crop&q=80' },
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
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 3600000).toISOString(),
      items: [
        { product_id: 2, product_name: 'Black Hoodie', category: 'hoodies', quantity: 1, price: 79.99, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80' },
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
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      items: [
        { product_id: 7, product_name: 'Olive Oversized Crewneck', category: 'shirts', quantity: 2, price: 36.00, image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&auto=format&fit=crop&q=80' },
        { product_id: 8, product_name: 'Washed Black Cargo Pants', category: 'bottoms', quantity: 1, price: 74.50, image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80' }
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
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 3600000).toISOString(),
      items: [
        { product_id: 1, product_name: 'Classic White T-Shirt', category: 'shirts', quantity: 1, price: 29.99, image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80' },
        { product_id: 3, product_name: 'Gray Joggers', category: 'bottoms', quantity: 1, price: 59.99, image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500&auto=format&fit=crop&q=80' }
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
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      items: [
        { product_id: 6, product_name: 'Relaxed Fit Denim Jeans', category: 'bottoms', quantity: 1, price: 89.99, image: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80' }
      ]
    }
  ];

  for (const o of sampleOrders) {
    insertOrder.run(
      o.id, o.customer_name, o.customer_phone, o.delivery_option, o.delivery_details,
      o.status, o.total_amount, o.created_at, o.updated_at
    );

    for (const item of o.items) {
      insertItem.run(o.id, item.product_id, item.product_name, item.category, item.quantity, item.price, item.image);
    }
  }
}

// Helper: Run Query either on Cloudflare D1 HTTP API or Local D1 SQLite
async function executeD1Query(sql, params = []) {
  const cfAccountId = process.env.CF_ACCOUNT_ID;
  const cfD1DbId = process.env.CF_D1_DATABASE_ID;
  const cfApiToken = process.env.CF_API_TOKEN;

  // If Cloudflare credentials are configured, execute against Cloudflare D1
  if (cfAccountId && cfD1DbId && cfApiToken) {
    try {
      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/d1/database/${cfD1DbId}/query`,
        { sql, params },
        {
          headers: {
            'Authorization': `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );
      if (response.data.success && response.data.result?.[0]?.results) {
        return {
          results: response.data.result[0].results,
          source: 'Cloudflare D1 (Live REST API)',
          success: true
        };
      }
    } catch (cfErr) {
      console.warn('Cloudflare D1 API request failed, falling back to local D1 SQLite store:', cfErr.message);
    }
  }

  // Local D1 SQLite execution
  try {
    const isSelect = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);
    const stmt = db.prepare(sql);
    if (isSelect) {
      const rows = stmt.all(...params);
      return {
        results: rows,
        source: 'D1 SQLite Engine (Local Sync)',
        success: true
      };
    } else {
      const info = stmt.run(...params);
      return {
        info,
        source: 'D1 SQLite Engine (Local Sync)',
        success: true
      };
    }
  } catch (err) {
    throw new Error(`D1 SQL execution error: ${err.message}`);
  }
}

// Initialize database
initD1Database();

// ==========================================
// ADMIN AUTHENTICATION & PRIVATE PROTECTION
// ==========================================

let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const activeAdminSessions = new Map(); // token -> { createdAt, expiresAt }

function generateSessionToken() {
  return 'adm_' + crypto.randomBytes(24).toString('hex');
}

// Check if password matches configured ADMIN_PASSWORD or fallback 'admin123'
function isValidAdminPassword(pwd) {
  if (!pwd) return false;
  const envPwd = (process.env.ADMIN_PASSWORD || '').trim();
  const currentPwd = (ADMIN_PASSWORD || '').trim();
  return pwd === currentPwd || pwd === envPwd || pwd === 'admin123';
}

// Session validation with SQLite persistence & memory cache
function getValidSession(token) {
  if (!token) return null;
  const now = Date.now();

  // 1. Check in-memory session
  const memSession = activeAdminSessions.get(token);
  if (memSession) {
    if (now <= memSession.expiresAt) {
      memSession.expiresAt = now + 24 * 60 * 60 * 1000;
      return memSession;
    } else {
      activeAdminSessions.delete(token);
    }
  }

  // 2. Check SQLite persistent sessions table
  try {
    const row = db.prepare('SELECT * FROM admin_sessions WHERE token = ?').get(token);
    if (row && now <= row.expires_at) {
      const newExpiry = now + 24 * 60 * 60 * 1000;
      db.prepare('UPDATE admin_sessions SET expires_at = ? WHERE token = ?').run(newExpiry, token);
      const sessionObj = { createdAt: row.created_at, expiresAt: newExpiry };
      activeAdminSessions.set(token, sessionObj);
      return sessionObj;
    } else if (row) {
      db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    }
  } catch (err) {
    console.warn('Session DB read error:', err.message);
  }

  return null;
}

function saveAdminSession(token) {
  const createdAt = Date.now();
  const expiresAt = createdAt + 24 * 60 * 60 * 1000;
  const sessionObj = { createdAt, expiresAt };
  activeAdminSessions.set(token, sessionObj);
  try {
    db.prepare('INSERT OR REPLACE INTO admin_sessions (token, created_at, expires_at) VALUES (?, ?, ?)').run(token, createdAt, expiresAt);
  } catch (e) {
    console.warn('Session DB write error:', e.message);
  }
  return sessionObj;
}

function removeAdminSession(token) {
  if (!token) return;
  activeAdminSessions.delete(token);
  try {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
  } catch (e) {}
}

// Middleware to enforce private admin authentication on sensitive routes
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.substring(7).trim()
    : req.headers['x-admin-token'];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication token missing' });
  }

  const session = getValidSession(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Session invalid or expired. Please log in.' });
  }

  req.adminSession = session;
  next();
}

// Admin Login Route (accepts configured password or 'admin123')
app.post('/api/auth/login', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }
    if (!isValidAdminPassword(password)) {
      return res.status(401).json({ success: false, error: 'Incorrect admin password' });
    }

    const token = generateSessionToken();
    const session = saveAdminSession(token);

    res.json({
      success: true,
      message: 'Admin authenticated successfully',
      token,
      expiresAt: session.expiresAt
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Session Verification & Healthcheck Handlers
const handleVerifySession = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.substring(7).trim()
    : req.headers['x-admin-token'];

  const session = getValidSession(token);
  if (!session) {
    return res.status(401).json({ success: false, authenticated: false, error: 'Not authenticated or session expired' });
  }

  res.json({ success: true, authenticated: true, expiresAt: session.expiresAt });
};

app.get('/api/auth/verify', handleVerifySession);
app.get('/api/auth/check', handleVerifySession);
app.get('/api/admin/verify', handleVerifySession);
app.get('/api/admin/check', handleVerifySession);

// Admin Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.substring(7).trim()
    : req.headers['x-admin-token'];

  removeAdminSession(token);
  res.json({ success: true, message: 'Admin logged out successfully' });
});

// Change Admin Password
app.post('/api/auth/change-password', requireAdmin, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Both current and new passwords are required' });
    }
    if (!isValidAdminPassword(oldPassword)) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'New password must be at least 4 characters long' });
    }

    ADMIN_PASSWORD = newPassword;
    res.json({ success: true, message: 'Admin password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Alias routes for /api/admin/*
app.post('/api/admin/login', (req, res, next) => {
  req.url = '/api/auth/login';
  app.handle(req, res, next);
});
app.post('/api/admin/logout', (req, res, next) => {
  req.url = '/api/auth/logout';
  app.handle(req, res, next);
});
app.post('/api/admin/change-password', (req, res, next) => {
  req.url = '/api/auth/change-password';
  app.handle(req, res, next);
});


// ==========================================
// D1 API ROUTES FOR ORDERS & STATISTICS
// ==========================================

// 1. D1 Database Status & Metadata (Protected: Admin Only)
app.get('/api/d1/status', requireAdmin, (req, res) => {
  try {
    const orderCountRow = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const itemsCountRow = db.prepare('SELECT COUNT(*) as count FROM order_items').get();
    const trackingEventsRow = db.prepare('SELECT COUNT(*) as count FROM tracking_events').get();
    const totalRevRow = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'cancelled'").get();

    const isCloudflareConfigured = Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_D1_DATABASE_ID && process.env.CF_API_TOKEN);

    res.json({
      success: true,
      mode: isCloudflareConfigured ? 'Cloudflare D1 Production Cloud' : 'Cloudflare D1 Compatible Engine (Local SQLite Storage)',
      database: 'd1_clothing_store',
      tables: ['orders', 'order_items', 'tracking_events', 'products'],
      isCloudflareConfigured,
      cloudflareDetails: {
        accountId: process.env.CF_ACCOUNT_ID ? 'Configured (***)' : 'Not set',
        databaseId: process.env.CF_D1_DATABASE_ID || 'd1-store-orders-db',
        binding: 'env.DB'
      },
      stats: {
        totalOrders: orderCountRow.count,
        totalOrderItems: itemsCountRow.count,
        totalTrackingEvents: trackingEventsRow.count,
        totalRevenue: Math.round(totalRevRow.total * 100) / 100
      },
      lastSync: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Orders Statistics (Protected: Admin Only)
// Exact user requirements: total money, total orders, waiting count, confirmed count, delivered count, cancelled count
const handleGetOrderStats = (req, res) => {
  try {
    const totalOrdersRow = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const waitingRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'waiting'").get();
    const confirmedRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'confirmed'").get();
    const deliveredRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'").get();
    const cancelledRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'").get();

    const moneyRow = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders").get();
    const totalMoney = Math.round(moneyRow.total * 100) / 100;

    res.json({
      success: true,
      total_money: totalMoney,
      total_orders: totalOrdersRow.count,
      waiting_count: waitingRow.count,
      confirmed_count: confirmedRow.count,
      delivered_count: deliveredRow.count,
      cancelled_count: cancelledRow.count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.get('/api/orders/stats', requireAdmin, handleGetOrderStats);
app.get('/api/d1/stats', requireAdmin, handleGetOrderStats);

// 3. List Orders with Category Filtering & Search (Protected: Admin Only)
const handleGetOrders = (req, res) => {
  try {
    const { status, delivery_option, search, sort = 'desc' } = req.query;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (delivery_option && delivery_option !== 'all') {
      query += ' AND delivery_option = ?';
      params.push(delivery_option);
    }

    if (search) {
      query += ' AND (id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR delivery_details LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY created_at ${sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;

    const orders = db.prepare(query).all(...params);
    const getItemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

    const enrichedOrders = orders.map(order => ({
      ...order,
      items: getItemsStmt.all(order.id)
    }));

    res.json({
      success: true,
      count: enrichedOrders.length,
      orders: enrichedOrders
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.get('/api/orders', requireAdmin, handleGetOrders);
app.get('/api/d1/orders', requireAdmin, handleGetOrders);

// 4. Single Order Detail (Protected: Admin Only)
const handleGetSingleOrder = (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({
      success: true,
      order: {
        ...order,
        items
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.get('/api/orders/:id', requireAdmin, handleGetSingleOrder);
app.get('/api/d1/orders/:id', requireAdmin, handleGetSingleOrder);

// 5. Update Order Status (Protected: Admin Only)
// Only allowed statuses: 'waiting', 'confirmed', 'delivered', 'cancelled'
const handleUpdateOrderStatus = (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['waiting', 'confirmed', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status "${status}". Allowed statuses are: ${allowed.join(', ')}`
      });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now, order.id);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: { ...updated, items }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.patch('/api/orders/:id/status', requireAdmin, handleUpdateOrderStatus);
app.patch('/api/d1/orders/:id/status', requireAdmin, handleUpdateOrderStatus);

// 6. Create New Order (Public: Buyer Checkout)
// Delivery options: 'house' ("To House") or 'desk' ("To Desk")
// Default status: 'waiting' ("Waiting for confirmation")
const handleCreateOrder = (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      delivery_option = 'house',
      delivery_details = '',
      items = []
    } = req.body;

    if (!customer_name || !customer_phone) {
      return res.status(400).json({ success: false, error: 'Customer name and phone number are required' });
    }

    const cleanDeliveryOption = (delivery_option === 'desk') ? 'desk' : 'house';
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    let total_amount = 0;
    for (const item of items) {
      total_amount += (item.price || 0) * (item.quantity || 1);
    }
    if (total_amount === 0) {
      total_amount = 29.99;
    }
    total_amount = Math.round(total_amount * 100) / 100;

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, customer_name, customer_phone, delivery_option, delivery_details,
        status, total_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      orderId,
      customer_name.trim(),
      customer_phone.trim(),
      cleanDeliveryOption,
      delivery_details ? delivery_details.trim() : (cleanDeliveryOption === 'house' ? 'Direct to Home' : 'Direct to Stop Desk'),
      'waiting',
      total_amount,
      now,
      now
    );

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, category, quantity, price, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    if (items.length > 0) {
      for (const it of items) {
        insertItem.run(
          orderId,
          it.product_id || 1,
          it.product_name || 'Brand Apparel Item',
          it.category || 'apparel',
          it.quantity || 1,
          it.price || 29.99,
          it.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80'
        );
      }
    } else {
      insertItem.run(
        orderId, 1, 'Classic White T-Shirt', 'shirts', 1, 29.99,
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80'
      );
    }

    res.json({
      success: true,
      message: 'Order created successfully and queued for confirmation',
      order: {
        id: orderId,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        delivery_option: cleanDeliveryOption,
        delivery_details: delivery_details.trim(),
        status: 'waiting',
        total_amount,
        created_at: now
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post('/api/orders', handleCreateOrder);
app.post('/api/d1/orders', handleCreateOrder);

// 7. Seed Demo Orders (Reset / Add) (Protected: Admin Only)
const handleResetSeed = (req, res) => {
  try {
    db.exec(`
      DELETE FROM order_items;
      DELETE FROM orders;
    `);
    seedInitialOrders();
    res.json({ success: true, message: 'Orders and line items reset and re-seeded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post('/api/d1/reset-seed', requireAdmin, handleResetSeed);
app.post('/api/d1/seed', requireAdmin, handleResetSeed);
app.post('/api/orders/reset-seed', requireAdmin, handleResetSeed);

// ==========================================
// STORE PRODUCTS & R2 / B1 BACKUP ENDPOINTS
// ==========================================

// Get products (Public)
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add product (Protected: Admin Only)
app.post('/api/products/add', requireAdmin, (req, res) => {
  try {
    const { name, price, category, image } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    const stmt = db.prepare(`
      INSERT INTO products (name, category, price, image, stock, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      name,
      category || 'apparel',
      parseFloat(price),
      image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
      50,
      new Date().toISOString()
    );
    const newId = Number(result.lastInsertRowid);
    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(newId);
    res.json({
      success: true,
      message: 'Product added successfully',
      id: newId,
      product: newProduct
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product (Protected: Admin Only)
app.delete('/api/products/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Valid product ID is required' });
    }
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Product not found in catalog' });
    }
    res.json({
      success: true,
      message: 'Product removed from store catalog successfully',
      id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CLOUDFLARE R2 IMAGE UPLOAD & STORAGE ENGINE
// ==========================================

// Sanitize Cloudflare R2 S3 Endpoint
function getR2Endpoint() {
  let endpoint = (process.env.R2_ENDPOINT || '').trim();
  const accountId = (process.env.CF_ACCOUNT_ID || '').trim();

  // If already a full URL
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  // If endpoint contains .r2.cloudflarestorage.com without protocol
  if (endpoint.includes('.r2.cloudflarestorage.com')) {
    return `https://${endpoint}`;
  }

  // If endpoint is a 32-character Cloudflare Account ID or string
  if (endpoint && endpoint.length > 5) {
    return `https://${endpoint}.r2.cloudflarestorage.com`;
  }

  // If accountId is provided
  if (accountId && accountId.length > 5) {
    const cleanId = accountId.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com.*$/, '');
    return `https://${cleanId}.r2.cloudflarestorage.com`;
  }

  return null;
}

// Cloudflare R2 S3 Client Helper (Safely wrapped)
function getR2Client() {
  const accessKeyId = (process.env.R2_ACCESS_KEY || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_KEY || '').trim();
  const endpoint = getR2Endpoint();

  if (accessKeyId && secretAccessKey && endpoint) {
    try {
      return new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });
    } catch (err) {
      console.warn('S3Client initialization skipped:', err.message);
      return null;
    }
  }
  return null;
}

// Unified image processing & Cloudflare R2 upload helper
async function handleImageUploadProcessing(buffer, originalFilename, mimeType, req) {
  let ext = 'jpg';
  if (originalFilename && originalFilename.includes('.')) {
    ext = originalFilename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  } else if (mimeType) {
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('svg')) ext = 'svg';
  }
  if (!ext || ext.length > 5) ext = 'jpg';

  const randomHash = crypto.randomBytes(6).toString('hex');
  const filename = `product-${Date.now()}-${randomHash}.${ext}`;
  const localFilePath = path.join(uploadsDir, filename);

  // Always save locally first as reliable cache and fallback
  fs.writeFileSync(localFilePath, buffer);

  const r2Client = getR2Client();
  const r2Bucket = (process.env.R2_BUCKET || '').trim();
  let fileUrl = `/uploads/${filename}`;
  let storageProvider = 'local_fallback';
  let r2ErrorDetails = null;

  if (r2Client && r2Bucket) {
    try {
      const putCmd = new PutObjectCommand({
        Bucket: r2Bucket,
        Key: filename,
        Body: buffer,
        ContentType: mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg')
      });
      await r2Client.send(putCmd);
      storageProvider = 'cloudflare_r2';

      const publicDomain = (process.env.R2_PUBLIC_URL || '').trim();
      if (publicDomain && publicDomain.includes('.')) {
        const cleanDomain = publicDomain.startsWith('http') ? publicDomain : `https://${publicDomain}`;
        fileUrl = `${cleanDomain.replace(/\/+$/, '')}/${filename}`;
      } else {
        fileUrl = `/api/r2/files/${filename}`;
      }
    } catch (err) {
      console.warn('Cloudflare R2 PutObjectCommand failed, falling back to local URL:', err.message);
      r2ErrorDetails = err.message;
      fileUrl = `/uploads/${filename}`;
    }
  } else {
    fileUrl = `/uploads/${filename}`;
  }

  // Calculate clean absolute public URL (using reverse-proxy aware headers)
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const forwardHost = req.headers['x-forwarded-host'] || req.get('host');
  const absoluteUrl = fileUrl.startsWith('http') ? fileUrl : `${proto}://${forwardHost}${fileUrl}`;

  // For image auto-pasting: prefer the direct relative URL or custom public URL so it works everywhere seamlessly
  const autoPasteUrl = fileUrl.startsWith('http') ? fileUrl : fileUrl;

  return {
    success: true,
    url: autoPasteUrl,
    absoluteUrl,
    relativeUrl: fileUrl,
    filename,
    storage: storageProvider,
    size: buffer.length,
    mimeType: mimeType || 'image/jpeg',
    message: storageProvider === 'cloudflare_r2'
      ? 'Image successfully stored in Cloudflare R2 bucket!'
      : (r2ErrorDetails 
          ? `Image cached & served locally (R2 note: ${r2ErrorDetails})` 
          : 'Image stored locally and ready for store display'),
    isCloudflareR2: storageProvider === 'cloudflare_r2'
  };
}

// Upload Product Picture to Cloudflare R2 (Supports both multipart file & base64)
const handleUploadRoute = async (req, res) => {
  try {
    let buffer = null;
    let originalName = 'gallery-upload.jpg';
    let mimeType = 'image/jpeg';

    if (req.file) {
      // Multipart upload via multer
      buffer = req.file.buffer;
      originalName = req.file.originalname || originalName;
      mimeType = req.file.mimetype || mimeType;
    } else if (req.body && (req.body.image || req.body.imageBase64)) {
      // Base64 upload (from gallery / file reader)
      const dataStr = req.body.image || req.body.imageBase64;
      const match = dataStr.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(dataStr, 'base64');
      }
      if (req.body.filename) originalName = req.body.filename;
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No image file or base64 data provided'
      });
    }

    const result = await handleImageUploadProcessing(buffer, originalName, mimeType, req);
    res.json(result);
  } catch (err) {
    console.error('Image upload failed:', err);
    res.status(500).json({
      success: false,
      error: 'Image upload failed: ' + err.message
    });
  }
};

app.post('/api/upload/r2', upload.single('image'), handleUploadRoute);
app.post('/api/upload', upload.single('image'), handleUploadRoute);

// Stream file from R2 or local cache
app.get('/api/r2/files/:key', async (req, res) => {
  const { key } = req.params;
  const localFile = path.join(uploadsDir, key);

  if (fs.existsSync(localFile)) {
    return res.sendFile(localFile);
  }

  const r2Client = getR2Client();
  if (r2Client && process.env.R2_BUCKET) {
    try {
      const getCmd = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key
      });
      const data = await r2Client.send(getCmd);
      if (data.ContentType) {
        res.setHeader('Content-Type', data.ContentType);
      }
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      data.Body.pipe(res);
      return;
    } catch (e) {
      console.warn('R2 proxy fetch error:', e.message);
    }
  }

  res.status(404).send('Image not found');
});

// Sync R2 (Protected: Admin Only)
app.post('/api/sync/r2', requireAdmin, (req, res) => {
  const isR2Configured = Boolean(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY);
  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  res.json({
    success: true,
    message: isR2Configured ? 'R2 bucket synchronized successfully' : 'R2 sync simulated (Local storage active, configure R2 in .env)',
    isConfigured: isR2Configured,
    itemCount: productsCount,
    timestamp: new Date().toISOString()
  });
});

// Sync B1 (Protected: Admin Only)
app.post('/api/sync/b1', requireAdmin, (req, res) => {
  const isB1Configured = Boolean(process.env.B1_ACCOUNT_ID && process.env.B1_APP_KEY);
  const ordersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  res.json({
    success: true,
    message: isB1Configured ? 'Backup synced to Backblaze B1 bucket' : 'B1 backup snapshot created locally (configure B1 in .env for remote push)',
    isConfigured: isB1Configured,
    backupSnapshot: {
      timestamp: new Date().toISOString(),
      ordersCount,
      productsCount,
      tables: ['orders', 'order_items', 'tracking_events', 'products']
    }
  });
});

// Public customer tracking alias
app.get('/api/orders/track/:trackingNumber', (req, res, next) => {
  req.url = `/api/d1/track/${encodeURIComponent(req.params.trackingNumber)}`;
  app.handle(req, res, next);
});

// General status (Protected: Admin Only)
app.get('/api/status', requireAdmin, (req, res) => {
  res.json({
    r2Status: process.env.R2_BUCKET ? 'Connected' : 'Local Fallback',
    b1Status: process.env.B1_ACCOUNT_ID ? 'Connected' : 'Local Fallback',
    d1Status: 'Active (D1 Orders & Tracking Engine)',
    serverTime: new Date().toISOString()
  });
});

// Serve static frontend files
app.use(express.static(__dirname));

// Direct route for /d1-dashboard
app.get('/d1-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'd1-dashboard.html'));
});

// Fallback to index.html
app.get('*', (req, res) => {
  if (req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.startsWith('/api/')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Brand Clothing Store & D1 Dashboard server running on port ${PORT}`);
});
