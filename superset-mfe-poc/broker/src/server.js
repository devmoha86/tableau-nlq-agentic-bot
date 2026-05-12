const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3101);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4201')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(express.json({ limit: '64kb' }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow if no origin (for same-origin requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Allow if in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // Allow Codespaces forwarded URLs (*.app.github.dev)
    if (origin.includes('.app.github.dev')) {
      callback(null, true);
      return;
    }
    
    // Allow localhost variants for dev
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
      return;
    }
    
    callback(new Error('Origin not allowed'));
  },
}));

app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

async function fetchSupersetAccessToken() {
  const url = `${process.env.SUPERSET_BASE_URL}/api/v1/security/login`;
  const payload = {
    username: process.env.SUPERSET_USERNAME,
    password: process.env.SUPERSET_PASSWORD,
    provider: process.env.SUPERSET_PROVIDER || 'db',
    refresh: String(process.env.SUPERSET_REFRESH || 'true').toLowerCase() === 'true',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Superset login failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const rawSetCookie = response.headers.raw()['set-cookie'] || [];
  const cookieHeader = rawSetCookie.map((value) => value.split(';')[0]).join('; ');

  let csrfToken = null;
  try {
    const csrfResponse = await fetch(`${process.env.SUPERSET_BASE_URL}/api/v1/security/csrf_token/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (csrfResponse.ok) {
      const csrfData = await csrfResponse.json();
      csrfToken = csrfData.result;
    }
  } catch (error) {
    csrfToken = null;
  }

  return {
    accessToken: data.access_token,
    csrfToken,
    cookies: cookieHeader,
  };
}

async function fetchGuestToken(session, dashboardId) {
  const url = `${process.env.SUPERSET_BASE_URL}/api/v1/security/guest_token/`;
  // Use the embed UUID if provided, otherwise fall back to dashboardId
  const embedId = process.env.SUPERSET_EMBED_UUID || dashboardId;
  const payload = {
    resources: [{ type: 'dashboard', id: embedId }],
    rls: [],
    user: {
      username: process.env.GUEST_USERNAME || 'embedded-user',
      first_name: process.env.GUEST_FIRST_NAME || 'Embedded',
      last_name: process.env.GUEST_LAST_NAME || 'User',
      roles: [{ id: 4, name: 'Gamma' }],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...(session.csrfToken ? { 'X-CSRFToken': session.csrfToken } : {}),
      ...(session.cookies ? { Cookie: session.cookies } : {}),
      Referer: process.env.SUPERSET_BASE_URL,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Guest token request failed (${response.status}): ${text}`);
  }

  return response.json();
}

function signGuestTokenLocally(dashboardId) {
  const secret = process.env.SUPERSET_GUEST_TOKEN_JWT_SECRET;
  const audience = process.env.SUPERSET_GUEST_TOKEN_JWT_AUDIENCE || 'superset';

  if (!secret) {
    throw new Error('Missing SUPERSET_GUEST_TOKEN_JWT_SECRET for local signing mode');
  }

  const payload = {
    user: {
      username: process.env.GUEST_USERNAME || 'embedded-user',
      first_name: process.env.GUEST_FIRST_NAME || 'Embedded',
      last_name: process.env.GUEST_LAST_NAME || 'User',
    },
    resources: [{ type: 'dashboard', id: String(dashboardId) }],
    rls: [],
    type: 'guest',
    aud: audience,
  };

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '5m',
  });
}

app.post('/api/superset/guest-token', async (req, res) => {
  try {
    const dashboardId = req.body.dashboardId || process.env.SUPERSET_DASHBOARD_ID;
    if (!dashboardId) {
      res.status(400).json({ error: 'Missing dashboardId' });
      return;
    }

    const localSignMode = String(process.env.LOCAL_SIGN_GUEST_TOKEN || 'false').toLowerCase() === 'true';

    if (localSignMode) {
      const token = signGuestTokenLocally(dashboardId);
      res.status(200).json({
        token,
        dashboardId,
        supersetBaseUrl: process.env.SUPERSET_BASE_URL,
        mode: 'local-sign',
      });
      return;
    }

    const session = await fetchSupersetAccessToken();
    const guestTokenResponse = await fetchGuestToken(session, dashboardId);

    res.status(200).json({
      token: guestTokenResponse.token,
      dashboardId,
      supersetBaseUrl: process.env.SUPERSET_BASE_URL,
      mode: 'superset-api',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  if (err && err.message === 'Origin not allowed') {
    res.status(403).json({ error: 'Forbidden origin' });
    return;
  }
  next(err);
});

app.listen(port, () => {
  console.log(`Superset broker listening on ${port}`);
});
