const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || (!isProduction ? crypto.randomBytes(32).toString('hex') : '');

if (isProduction && sessionSecret.length < 32) {
  throw new Error('Configure SESSION_SECRET with at least 32 characters before starting in production.');
}

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { requests: [], users: [] };
  }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const separator = storedPassword.indexOf(':');
  if (separator > 0) {
    const salt = storedPassword.slice(0, separator);
    const storedHash = Buffer.from(storedPassword.slice(separator + 1), 'hex');
    const hash = crypto.scryptSync(password, salt, 64);
    return storedHash.length === hash.length && crypto.timingSafeEqual(storedHash, hash);
  }

  const legacyHash = Buffer.from(storedPassword, 'hex');
  if (legacyHash.length !== 32) return false;

  const hash = crypto.createHash('sha256').update(password).digest();
  return crypto.timingSafeEqual(legacyHash, hash);
}

let data = loadData();

function configureAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password || password.length < 12) {
    const error = 'Set ADMIN_USERNAME and ADMIN_PASSWORD (at least 12 characters) to configure the admin account.';
    if (isProduction) throw new Error(error);
    console.warn(`${error} No default admin account was created.`);
    return;
  }

  const adminId = data.users.length ? data.users[0].id : 1;
  data.users = [{ id: adminId, username, password: hashPassword(password) }];
  saveData(data);
  console.log('Admin account configured from environment variables.');
}

configureAdmin();

// Middleware
app.set('trust proxy', 1);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: isProduction }
}));
app.use(express.static(path.join(__dirname)));

// API: recibir solicitudes
app.post('/api/requests', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Campos faltantes' });

  const nextId = data.requests.length ? data.requests[data.requests.length - 1].id + 1 : 1;
  const request = {
    id: nextId,
    name,
    email,
    subject: subject || '',
    message,
    status: 'new',
    created_at: new Date().toISOString()
  };

  data.requests.unshift(request);
  saveData(data);
  res.json({ ok: true, id: request.id });
});

// Admin auth
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Credenciales faltantes' });

  const user = data.users.find((entry) => entry.username === username);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  if (!verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (!user.password.includes(':')) {
    user.password = hashPassword(password);
    saveData(data);
  }

  req.session.authenticated = true;
  res.json({ ok: true });
});

// Middleware de protección
function ensureAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: 'no autorizado' });
}

// Obtener solicitudes (admin)
app.get('/api/admin/requests', ensureAuth, (req, res) => {
  res.json({ ok: true, requests: data.requests });
});

// Actualizar estado
app.post('/api/admin/requests/:id/status', ensureAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const request = data.requests.find((entry) => entry.id === id);

  if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (!['new', 'resolved'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  request.status = status;
  saveData(data);
  res.json({ ok: true });
});

// Health check for deploy platforms
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'norman-digital-solutions' });
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
