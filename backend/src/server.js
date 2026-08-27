require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('./models');

// Fail loudly and immediately if required config is missing, instead of
// letting the server start and crash later (e.g. the confusing
// "secretOrPrivateKey must have a value" error on the first login attempt
// when JWT_SECRET is blank because .env was never created).
if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  console.error(
    '\nMissing JWT_SECRET.\n' +
    'Did you create backend/.env? Run:\n' +
    '  cp .env.example .env    (Mac/Linux)\n' +
    '  copy .env.example .env  (Windows)\n' +
    'from inside the backend folder, then restart.\n'
  );
  process.exit(1);
}

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const itemRoutes = require('./routes/itemRoutes');
const parameterRoutes = require('./routes/parameterRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const documentRoutes = require('./routes/documentRoutes');
const userRoutes = require('./routes/userRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

const app = express();
// CORS_ORIGIN lets you lock this down to your actual frontend URL once
// deployed (e.g. CORS_ORIGIN=https://your-app.vercel.app) — comma-
// separate multiple origins if needed. Left unset, it allows any origin,
// which is fine for local/LAN use but worth tightening once this is
// reachable from the internet.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportsRoutes);

// Centralized error handler as a safety net for anything not caught locally.
// Multer (file upload) errors — bad file type, oversized file — are surfaced
// as 400s with their actual message instead of a generic 500.
app.use((err, req, res, next) => {
  if (err && (err.name === 'MulterError' || /only \.xlsx|only \.xls|only \.csv/i.test(err.message || ''))) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 = reachable from other computers on the network, not just this one

// Creates the first login automatically from ADMIN_EMAIL/ADMIN_PASSWORD
// env vars if no users exist yet. This matters for hosted deployments
// where you may not have easy shell access to run `npm run seed` —
// setting those two env vars and restarting is enough to get in the
// first time. Safe to leave these vars set permanently; it only acts
// when the users table is empty, so it never runs again after that.
async function ensureBootstrapAdmin() {
  const existingCount = await User.count();
  if (existingCount > 0) return;

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.warn(
      '\nNo user accounts exist yet, and ADMIN_EMAIL/ADMIN_PASSWORD are not set.\n' +
      'Set those two environment variables and restart to create your first login automatically —\n' +
      'or run `npm run seed` if you have shell access to this server.\n'
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name, email, passwordHash, role: 'admin' });
  console.log(`Bootstrap admin account created: ${email}`);
}

async function start() {
  // alter: true lets Sequelize add new columns (like the salesperson
  // tracking added in this update) to an existing database automatically,
  // instead of requiring a manual migration or a fresh database file.
  // Safe for this app's size; if you ever hand-edit the schema outside
  // Sequelize, back up backend/data/database.sqlite first.
  await sequelize.sync({ alter: true });
  await ensureBootstrapAdmin();
  app.listen(PORT, HOST, () => {
    console.log(`Invoicing API listening on http://localhost:${PORT} (and on your LAN IP)`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
