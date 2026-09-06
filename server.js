import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const realPath = join(__dirname, 'server.runtime.js');

async function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function applyPatches(src) {
  if (!src.includes('registerPublishRoutes')) {
    src = src.replace(
      "import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';",
      "import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';\nimport { registerPublishRoutes } from './publish-catalog.js';"
    );
    src = src.replace(
      '// Serve static frontend files\napp.use(express.static(__dirname));',
      '// Publish Catalog routes (admin Publish button)\nregisterPublishRoutes(app, { db, dataDir, requireAdmin, getR2Client });\n\n// Serve static frontend files\napp.use(express.static(__dirname));'
    );
  }

  if (!src.includes('BASE64_IMAGE_BLOCKED')) {
    const needle = "app.post('/api/products/add', requireAdmin, (req, res) => {\n  try {\n    const { name, price, category, image } = req.body;\n    if (!name || !price) {\n      return res.status(400).json({ error: 'Name and price are required' });\n    }";
    const insert = "app.post('/api/products/add', requireAdmin, (req, res) => {\n  try {\n    const { name, price, category, image } = req.body;\n    if (!name || !price) {\n      return res.status(400).json({ error: 'Name and price are required' });\n    }\n    // BASE64_IMAGE_BLOCKED — never store data:image in products (site stays small; use R2 /uploads URL)\n    if (typeof image === 'string' && /^data:image\\//i.test(image.trim())) {\n      return res.status(400).json({ success: false, error: 'Base64 images are not allowed. Upload the file to Cloudflare R2 / server storage and use the returned URL.' });\n    }";
    if (src.includes(needle)) {
      src = src.replace(needle, insert);
    }
  }

  return src;
}

async function main() {
  const needsRebuild = !existsSync(realPath) || readFileSync(realPath, 'utf8').length < 1000
    || !readFileSync(realPath, 'utf8').includes('BASE64_IMAGE_BLOCKED')
    || !readFileSync(realPath, 'utf8').includes('registerPublishRoutes');

  if (needsRebuild) {
    const url = 'https://raw.githubusercontent.com/adel202000/ADEM/340eb78a82d3ac585afb69776966fcfe25b683d7/server.js';
    let src = await download(url);
    src = applyPatches(src);
    writeFileSync(realPath, src);
    console.log('Restored server.runtime.js (Publish Catalog + no base64 product images)');
  }
  await import('./server.runtime.js');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
