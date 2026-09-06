# Link Cloudflare R2 (product images stay off the website)

Images upload as **binary files** to R2. The site only stores a **short URL** — no base64, site stays small.

## 1. Create a bucket

1. Open [Cloudflare Dashboard → R2](https://dash.cloudflare.com/?to=/:account/r2)
2. **Create bucket** → name e.g. `brand-products`
3. (Optional) Enable **Public access** or attach a custom domain for `R2_PUBLIC_URL`

## 2. Create an R2 API token

1. R2 → **Manage R2 API Tokens** → **Create API token**
2. Permissions: **Object Read & Write** (include **Admin Read** if you want status checks)
3. Apply to your bucket (or all buckets)
4. Copy:
   - **Access Key ID** → `R2_ACCESS_KEY`
   - **Secret Access Key** → `R2_SECRET_KEY` (shown only once)
5. Note your **Account ID** (dashboard sidebar) → used in `R2_ENDPOINT`

## 3. Local `.env` (do this on your computer)

```bash
cd /path/to/ADEM
cp .env.example .env
```

Edit `.env`:

```env
ADMIN_PASSWORD=your_secure_password

R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=brand-products
R2_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# Optional but recommended — public image base URL
# R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

Replace `YOUR_ACCOUNT_ID` with the 32-character hex from Cloudflare.

## 4. Start the server

```bash
npm install
npm start
```

You should see the server listening. Upload a product image in **Admin** → it should report **Cloudflare R2** storage (not base64).

## 5. Quick test

```bash
# Health
curl http://localhost:3000/api/health

# After logging in as admin in the browser, upload an image on the dashboard.
# The image field should get a short URL like:
#   https://pub-….r2.dev/product-….jpg
# or /api/r2/files/product-….jpg
```

## Security

| Do | Don't |
|----|--------|
| Keep secrets only in local `.env` | Commit `.env` to GitHub |
| Use R2 API tokens with least privilege | Paste keys into frontend JS |
| Rotate keys if they leak | Share Secret Access Key in chat |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Upload fails / “configure R2” | Check all 4 vars: `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY` |
| 403 from R2 | Token needs Object Write on that bucket |
| Images work but broken on shop | Set `R2_PUBLIC_URL` to a public r2.dev or custom domain URL |
| Endpoint error | Use `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (EU jurisdiction: `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`) |

## What the app already does

- `POST /api/upload/r2` → PutObject to your bucket
- Product rows store **URL only** (base64 blocked)
- **Publish Catalog** can also write `catalog/products.json` to R2
