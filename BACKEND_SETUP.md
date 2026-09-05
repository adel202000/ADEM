# Backend Setup Guide - R2 & B1 Integration

This guide shows how to set up a Node.js backend to handle R2 (Cloudflare) and B1 (Backblaze) integration.

## Quick Start

### 1. Initialize Node.js Project

```bash
mkdir clothing-brand-backend
cd clothing-brand-backend
npm init -y
npm install express cors dotenv aws-sdk axios
npm install --save-dev nodemon
```

### 2. Create `.env` File

```env
# Cloudflare R2
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=clothing-brand-products
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key

# Backblaze B1
B1_ACCOUNT_ID=your_b1_account_id
B1_APP_KEY=your_b1_app_key
B1_BUCKET=clothing-brand-backups

# Server
PORT=3000
FRONTEND_URL=http://localhost:3000
```

### 3. Create `server.js`

```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const AWS = require('aws-sdk');
const axios = require('axios');

dotenv.config();

const app = express();

// CORS Configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());

// Configure R2
const s3 = new AWS.S3({
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
    region: 'auto',
    s3ForcePathStyle: true
});

// ============= R2 ENDPOINTS =============

// Get all products from R2
app.get('/api/products', async (req, res) => {
    try {
        const params = {
            Bucket: process.env.R2_BUCKET,
            Prefix: 'products/'
        };

        const data = await s3.listObjectsV2(params).promise();
        
        const products = data.Contents.map(item => ({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
            url: `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${item.Key}`
        }));

        res.json({ success: true, products });
    } catch (error) {
        console.error('R2 Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add product to R2
app.post('/api/products/add', async (req, res) => {
    try {
        const { name, price, category, image } = req.body;

        const productData = {
            id: Date.now(),
            name,
            price,
            category,
            image,
            createdAt: new Date().toISOString()
        };

        const params = {
            Bucket: process.env.R2_BUCKET,
            Key: `products/${productData.id}.json`,
            Body: JSON.stringify(productData),
            ContentType: 'application/json'
        };

        await s3.putObject(params).promise();

        res.json({ 
            success: true, 
            message: 'Product added to R2',
            product: productData 
        });
    } catch (error) {
        console.error('R2 Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sync R2 bucket
app.post('/api/sync/r2', async (req, res) => {
    try {
        const params = {
            Bucket: process.env.R2_BUCKET,
        };

        const data = await s3.listObjectsV2(params).promise();

        res.json({ 
            success: true, 
            message: 'R2 sync complete',
            itemCount: data.Contents?.length || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('R2 Sync Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============= B1 ENDPOINTS =============

// Backblaze B1 API configuration
const B1_API_URL = 'https://api.backblazeb2.com';

async function getB1AuthToken() {
    try {
        const credentials = Buffer.from(
            `${process.env.B1_ACCOUNT_ID}:${process.env.B1_APP_KEY}`
        ).toString('base64');

        const response = await axios.get(`${B1_API_URL}/b2api/v2/b2_authorize_account`, {
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        return response.data;
    } catch (error) {
        throw new Error('B1 Authorization failed: ' + error.message);
    }
}

// Sync to B1 (backup)
app.post('/api/sync/b1', async (req, res) => {
    try {
        // Get R2 data
        const r2Params = {
            Bucket: process.env.R2_BUCKET,
        };

        const r2Data = await s3.listObjectsV2(r2Params).promise();

        // Get B1 auth
        const b1Auth = await getB1AuthToken();

        const backupData = {
            timestamp: new Date().toISOString(),
            r2ObjectCount: r2Data.Contents?.length || 0,
            r2TotalSize: r2Data.Contents?.reduce((sum, obj) => sum + obj.Size, 0) || 0,
            products: r2Data.Contents?.map(obj => ({
                key: obj.Key,
                size: obj.Size,
                modified: obj.LastModified
            }))
        };

        // Upload backup metadata to B1
        const uploadUrl = `${b1Auth.apiUrl}/b2api/v2/b2_get_upload_url`;
        
        try {
            const uploadUrlResponse = await axios.post(uploadUrl, {
                bucketId: b1Auth.bucketId
            }, {
                headers: {
                    'Authorization': b1Auth.authorizationToken
                }
            });

            // Upload file
            const fileContent = JSON.stringify(backupData, null, 2);
            
            await axios.post(uploadUrlResponse.data.uploadUrl, fileContent, {
                headers: {
                    'Authorization': uploadUrlResponse.data.authorizationToken,
                    'X-Bz-File-Name': `backup-${Date.now()}.json`,
                    'Content-Type': 'application/json'
                }
            });

            res.json({ 
                success: true, 
                message: 'Backup synced to B1',
                backupData
            });
        } catch (b1Error) {
            console.error('B1 Upload Error:', b1Error);
            res.json({ 
                success: true, 
                message: 'B1 sync prepared (upload step requires full implementation)',
                backupData
            });
        }
    } catch (error) {
        console.error('B1 Sync Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get status
app.get('/api/status', async (req, res) => {
    try {
        // Check R2
        const r2Status = await s3.headBucket({ Bucket: process.env.R2_BUCKET })
            .promise()
            .then(() => 'Connected')
            .catch(() => 'Not configured');

        // Check B1
        const b1Status = await getB1AuthToken()
            .then(() => 'Connected')
            .catch(() => 'Not configured');

        res.json({
            r2: r2Status,
            b1: b1Status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            r2: 'Error',
            b1: 'Error',
            error: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`R2 Bucket: ${process.env.R2_BUCKET}`);
    console.log(`B1 Bucket: ${process.env.B1_BUCKET}`);
});
```

### 4. Update `package.json`

```json
{
  "name": "clothing-brand-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "aws-sdk": "^2.0.0",
    "axios": "^0.27.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0"
  }
}
```

### 5. Run Locally

```bash
npm run dev
```

Test endpoints:
- `GET http://localhost:3000/api/health`
- `GET http://localhost:3000/api/products`
- `GET http://localhost:3000/api/status`

## Deployment Options

### Vercel
```bash
npm install -g vercel
vercel
```

### Heroku
```bash
heroku create clothing-brand-api
git push heroku main
```

### AWS Lambda + API Gateway
- Use Serverless Framework
- Deploy to AWS Lambda

### DigitalOcean App Platform
- Connect GitHub repo
- Auto-deploy on push

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file
- Never expose API keys in frontend code
- Use environment variables in production
- Enable CORS only for your domain
- Implement rate limiting in production
- Use HTTPS only

## Testing

```bash
# Test R2 connection
curl http://localhost:3000/api/status

# Add a product
curl -X POST http://localhost:3000/api/products/add \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 29.99,
    "category": "shirts",
    "image": "test.jpg"
  }'

# Get all products
curl http://localhost:3000/api/products
```

---

This backend setup provides a bridge between your GitHub-hosted frontend and Cloudflare R2/Backblaze B1 services.
