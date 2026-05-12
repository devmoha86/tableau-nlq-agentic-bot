# Tableau MFE POC

Angular micro frontend proof of concept that embeds Tableau using Embedding API v3 with authentication through a Node.js JWT broker.

## Architecture

- frontend: Angular application hosting Tableau embed component.
- broker: Node.js service that mints short-lived Tableau JWT tokens.
- specs/001-secure-tableau-embed: feature specification, plan, and tasks.

## Security and Performance Baseline

- No PAT or JWT signing secret in frontend code.
- CORS allowlist and security headers enabled in broker.
- Message origin validation in frontend.
- Performance metrics captured for token issuance and first interactive render.

## Required Environment

Create broker environment file from broker/.env.example and set values:

- TABLEAU_SITE_NAME
- TABLEAU_JWT_CLIENT_ID
- TABLEAU_JWT_SECRET
- TABLEAU_USER
- ALLOWED_ORIGINS
- TABLEAU_JWT_TTL_SECONDS

## Run Locally

1. Start broker:

   cd broker
   npm install
   npm run start

2. Start frontend:

   cd frontend
   npm install
   npm start

3. Open http://localhost:4200
