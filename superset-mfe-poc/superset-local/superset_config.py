import os

SECRET_KEY = os.getenv('SUPERSET_SECRET_KEY', 'change-me-local-secret')
SQLALCHEMY_DATABASE_URI = os.getenv('SUPERSET_DATABASE_URI', 'sqlite:////home/vscode/.superset/superset.db')
WTF_CSRF_ENABLED = False
TALISMAN_ENABLED = False
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False

FEATURE_FLAGS = {
    'EMBEDDED_SUPERSET': True,
}

GUEST_TOKEN_JWT_SECRET = os.getenv('SUPERSET_GUEST_TOKEN_JWT_SECRET', 'change-me-guest-token-secret')
GUEST_TOKEN_JWT_ALGO = 'HS256'
GUEST_TOKEN_JWT_AUDIENCE = os.getenv('SUPERSET_GUEST_TOKEN_JWT_AUDIENCE', 'superset')

# CORS configuration for embedded dashboards
ENABLE_CORS = True
CORS_OPTIONS = {
    'supports_credentials': True,
    'allow_headers': ['Content-Type', 'Authorization', 'X-CSRFToken'],
    'origins': [
        'http://localhost:4201',
        'http://127.0.0.1:4201',
        'https://musical-guacamole-wrx5rvp76pvr3946j-4201.app.github.dev',
    ],
}

HTTP_HEADERS = {
    'X-Frame-Options': 'ALLOWALL',
    'Content-Security-Policy': "frame-ancestors *",
}

