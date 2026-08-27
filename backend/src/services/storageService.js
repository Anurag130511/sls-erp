const fs = require('fs');
const path = require('path');

// STORAGE_DRIVER=local (default) saves PDFs to backend/storage/pdfs on
// whatever machine runs this server. If that machine is a cloud VM
// (Render, Railway, EC2, etc.) that IS your cloud storage — the files
// persist there across restarts as long as the disk isn't ephemeral.
//
// STORAGE_DRIVER=s3 switches to true object storage (AWS S3 or any
// S3-compatible service like Cloudflare R2 / Backblaze B2). Requires
// the optional @aws-sdk/client-s3 package and the S3_* env vars below —
// see the README for setup steps. Nothing else in the app needs to
// change when you switch drivers; every caller just uses save/read/getUrl.

const DRIVER = process.env.STORAGE_DRIVER || 'local';
// Configurable so it can be pointed at a mounted persistent disk's path
// on hosts that require one (e.g. Render/Railway volumes) — same pattern
// as DB_STORAGE in config/database.js. Defaults to a folder inside the
// project, which is fine for local use and any host with a plain
// persistent filesystem.
const LOCAL_DIR = process.env.PDF_STORAGE_DIR || path.join(__dirname, '../../storage/pdfs');

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

// ---- local disk driver ----
const localDriver = {
  async save(key, buffer) {
    ensureLocalDir();
    const filePath = path.join(LOCAL_DIR, key);
    fs.writeFileSync(filePath, buffer);
    return key;
  },
  async read(key) {
    const filePath = path.join(LOCAL_DIR, key);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  },
  async exists(key) {
    return fs.existsSync(path.join(LOCAL_DIR, key));
  },
};

// ---- S3-compatible driver (lazy-loaded so @aws-sdk/client-s3 is only
// required when you actually opt into it) ----
let s3Client = null;
function getS3Client() {
  if (s3Client) return s3Client;
  // eslint-disable-next-line global-require
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined, // set for R2/B2; omit for real AWS
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

const s3Driver = {
  async save(key, buffer) {
    // eslint-disable-next-line global-require
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await getS3Client().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }));
    return key;
  },
  async read(key) {
    // eslint-disable-next-line global-require
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    try {
      const result = await getS3Client().send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      }));
      const chunks = [];
      for await (const chunk of result.Body) chunks.push(chunk);
      return Buffer.concat(chunks);
    } catch (err) {
      if (err.name === 'NoSuchKey') return null;
      throw err;
    }
  },
  async exists(key) {
    const buf = await this.read(key);
    return buf !== null;
  },
};

const driver = DRIVER === 's3' ? s3Driver : localDriver;

module.exports = {
  driverName: DRIVER,
  save: (key, buffer) => driver.save(key, buffer),
  read: (key) => driver.read(key),
  exists: (key) => driver.exists(key),
};
