const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3100);

const requiredConfig = [
  'TABLEAU_SITE_NAME',
  'TABLEAU_JWT_CLIENT_ID',
  'TABLEAU_JWT_SECRET',
  'TABLEAU_USER',
];

for (const key of requiredConfig) {
  if (!process.env[key]) {
    throw new Error('Missing required configuration: ' + key);
  }
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' },
}));

app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  const incoming = req.headers['x-correlation-id'];
  const correlationId = typeof incoming === 'string' && incoming.length > 0
    ? incoming
    : crypto.randomBytes(8).toString('hex');

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.indexOf(origin) >= 0) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed'));
  },
  methods: ['GET', 'POST'],
  credentials: false,
}));

app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/tableau/token', (req, res) => {
  const started = Date.now();
  const requestedScopes = Array.isArray(req.body && req.body.scopes) ? req.body.scopes : [];
  const allowedScopes = (process.env.TABLEAU_JWT_SCOPES || 'tableau:views:embed,tableau:content:read')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

  const scopes = requestedScopes.length > 0
    ? requestedScopes.filter((scope) => allowedScopes.indexOf(scope) >= 0)
    : allowedScopes;

  if (scopes.length === 0) {
    res.status(400).json({ error: 'No valid scopes requested.' });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = Math.min(Number(process.env.TABLEAU_JWT_TTL_SECONDS || '300'), 600);

  const payload = {
    iss: process.env.TABLEAU_JWT_CLIENT_ID,
    sub: process.env.TABLEAU_USER,
    aud: 'tableau',
    scp: scopes,
    iat: now,
    exp: now + ttlSeconds,
    jti: crypto.randomBytes(12).toString('hex'),
  };

  let token;
  try {
    token = jwt.sign(payload, process.env.TABLEAU_JWT_SECRET, {
      algorithm: 'HS256',
      keyid: process.env.TABLEAU_JWT_SECRET_ID,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to issue token.' });
    return;
  }

  const issuedInMs = Date.now() - started;
  res.status(200).json({
    token,
    expiresInSeconds: ttlSeconds,
    tokenType: 'Bearer',
    issuedInMs,
    correlationId: req.correlationId,
    siteName: process.env.TABLEAU_SITE_NAME,
  });
});

app.use((err, req, res, next) => {
  if (err && err.message === 'Origin not allowed') {
    res.status(403).json({ error: 'Forbidden origin', correlationId: req.correlationId });
    return;
  }

  next(err);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', correlationId: req.correlationId });
});

app.listen(port, () => {
  console.log('broker listening on port ' + port);
});
