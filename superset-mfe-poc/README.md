# Superset MFE POC

This folder contains a new micro frontend baseline for Apache Superset embedding.

## Included

- Docker Compose runtime for Superset in Codespaces.
- Node.js broker for the Guest Token handshake.
- Tailwind-based frontend MFE using @superset-ui/embedded-sdk.

## Structure

- docker-compose.yml: Superset runtime.
- .env.example: Compose environment template.
- broker/: Guest token broker service.
- mfe/: Tailwind + embedded SDK frontend.

## Quick Start

1. Duplicate env templates:
   - cp .env.example .env
   - cp broker/.env.example broker/.env
   - cp mfe/.env.example mfe/.env
2. Start Superset:
   - docker compose up -d
3. Install and run broker:
   - cd broker && npm install && npm run dev
4. Install and run frontend:
   - cd mfe && npm install && npm run dev

## Fallback: Run Superset Without Docker

Use this when Docker daemon or container namespaces are restricted in your Codespace.

1. Prepare local Superset env:
   - cp superset-local/.env.example superset-local/.env
2. Install Superset in the existing Python venv:
   - /workspaces/tableau-nlq-agentic-bot/.venv/bin/pip install -r superset-local/requirements.txt
3. Initialize Superset metadata and admin user:
   - chmod +x superset-local/init.sh superset-local/start.sh
   - PATH="/workspaces/tableau-nlq-agentic-bot/.venv/bin:$PATH" ./superset-local/init.sh
4. Start Superset:
   - PATH="/workspaces/tableau-nlq-agentic-bot/.venv/bin:$PATH" ./superset-local/start.sh

This serves Superset at http://localhost:8088, which matches default broker and MFE env files.

## Required Configuration

1. Create/publish a Superset dashboard and set its id in:
   - broker/.env: SUPERSET_DASHBOARD_ID
   - mfe/.env: VITE_SUPERSET_DASHBOARD_ID
2. Ensure broker ALLOWED_ORIGINS includes the MFE URL.
3. Ensure Superset allows embedding and Guest Token usage for your dashboard.
