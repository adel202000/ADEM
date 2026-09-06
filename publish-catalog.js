// publish-catalog.js - loaded by server for Publish Catalog feature
import fs from 'fs';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export function registerPublishRoutes(app, { db, dataDir, requireAdmin, getR2Client }) {
  app.get('/products-catalog.json', (req, res) => {
    const catalogPath = path.join(dataDir, 'products-catalog.json');
    if (fs.existsSync(catalogPath)) {
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.sendFile(catalogPath);
    }
    try {
      const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
      res.setHeader('Cache-Control', 'public, max-age=30');
      return res.json(products);
    } catch (e) {
      return res.status(404).json({ error: 'Catalog not published yet' });
    }
  });

  app.post('/api/products/publish', requireAdmin, async (req, res) => {
    try {
      const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
      const payload = {
        published_at: new Date().toISOString(),
        count: products.length,
        products
      };
      const catalogPath = path.join(dataDir, 'products-catalog.json');
      fs.writeFileSync(catalogPath, JSON.stringify(payload, null, 2), 'utf8');

      let r2Uploaded = false;
      let r2Key = null;
      let r2Error = null;

      const r2Client = typeof getR2Client === 'function' ? getR2Client() : null;
      const bucket = (process.env.R2_BUCKET || '').trim();
      if (r2Client && bucket) {
        try {
          r2Key = 'catalog/products.json';
          await r2Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: r2Key,
            Body: JSON.stringify(payload),
            ContentType: 'application/json',
            CacheControl: 'public, max-age=60'
          }));
          r2Uploaded = true;
        } catch (e) {
          r2Error = e.message;
          console.warn('R2 catalog publish failed:', e.message);
        }
      }

      res.json({
        success: true,
        message: r2Uploaded
          ? ('Published ' + products.length + ' products to local catalog + Cloudflare R2')
          : ('Published ' + products.length + ' products to local catalog' + (r2Error ? (' (R2 skipped: ' + r2Error + ')') : ' (configure R2 in .env for edge deploy)')),
        count: products.length,
        published_at: payload.published_at,
        local_path: '/products-catalog.json',
        r2: { uploaded: r2Uploaded, key: r2Key, error: r2Error }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
