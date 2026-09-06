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

async function main() {
  if (!existsSync(realPath) || readFileSync(realPath, 'utf8').length < 1000) {
    const url = 'https://raw.githubusercontent.com/adel202000/ADEM/340eb78a82d3ac585afb69776966fcfe25b683d7/server.js';
    let src = await download(url);
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
    writeFileSync(realPath, src);
    console.log('Restored server.runtime.js with Publish Catalog support');
  }
  await import('./server.runtime.js');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
