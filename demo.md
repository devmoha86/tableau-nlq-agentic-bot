# Tableau MFE Demo Script

## 30-Second Opening
We are embedding Tableau using Tableau Embedding API v3 through the `tableau-viz` web component, not by hand-coding iframe integration.
Authentication is handled through a backend JWT broker, so secrets never reach the browser.
The frontend only receives a short-lived token and then uses API-driven controls like get filters, refresh data, export PDF, and sheet navigation.

## Demo Steps (What To Show + What To Say)

### 1. Start with architecture
Say:
We have two services. Angular MFE renders the dashboard, and a Node broker issues short-lived Tableau JWTs.

Show:
- `tableau-mfe-poc/README.md`
- `tableau-mfe-poc/broker/src/server.js`
- `tableau-mfe-poc/frontend/src/app/app.component.ts`

### 2. Explain the no-iframe point
Say:
In our code, we use the Tableau Embedding API v3 web component (`tableau-viz`).
So we are not manually wiring raw iframe embed logic in application code.
We interact through supported APIs and events.

Show:
- `tableau-mfe-poc/frontend/src/app/app.component.html`

### 3. Walk through auth flow live
Say:
On app load, Angular requests a token from our broker.
The broker signs a JWT using Connected App credentials and approved scopes, then returns it to the frontend.

Show:
- `tableau-mfe-poc/frontend/src/app/tableau-token.service.ts`
- `tableau-mfe-poc/broker/src/server.js`

### 4. Highlight security controls
Say:
Security is enforced server-side: CORS allowlist, Helmet headers, scope filtering, and short token TTL.
The frontend also validates allowed message origins.

Show:
- `tableau-mfe-poc/broker/src/server.js`
- `tableau-mfe-poc/frontend/src/environments/environment.ts`
- `tableau-mfe-poc/frontend/src/app/app.component.ts`

### 5. Show runtime behavior and performance
Say:
We track token issuance latency and time to first interactive, so we can monitor user-perceived embed performance.

Show:
- `tableau-mfe-poc/frontend/src/app/app.component.ts`
- `tableau-mfe-poc/frontend/src/app/app.component.html`

### 6. Demonstrate Embedding API controls
Say:
After the viz is interactive, the MFE can call Tableau APIs: get filters, refresh data, export PDF, and switch sheets.
This demonstrates API-level integration, not static embedding.

Show and click buttons:
- Get Filters
- Refresh Data
- Export PDF
- Sheet switcher buttons

Code references:
- `tableau-mfe-poc/frontend/src/app/app.component.html`
- `tableau-mfe-poc/frontend/src/app/app.component.ts`

### 7. Close with enterprise value
Say:
This pattern keeps secrets off the client, centralizes policy enforcement, supports richer interactions, and is production-friendly for micro frontends.

## 2-Minute Voiceover (Ready To Read)
Today I am showing a secure Tableau dashboard integration in an Angular micro frontend using Tableau Embedding API v3.
The key point is we are not manually embedding with iframe code.
We use the Tableau web component and control it with events and API methods.
When the app starts, it calls our broker for a short-lived JWT.
The broker validates origin, applies allowed scopes, signs the token, and returns it.
The frontend passes this token to `tableau-viz` with the view URL, then waits for first interactive.
After load, we can programmatically read filters, refresh data, export PDF, and switch sheets.
This gives stronger security, better observability, and richer UX than a basic static embed.

## Likely Q&A

### Q1: Why not store PAT or secrets in frontend?
Answer:
Frontend secrets are high risk. Broker-based JWT keeps credentials server-side only.

### Q2: Is this truly iframe-free?
Answer:
Tableau renders through its supported embed component internals, but our app does not manually implement iframe integration.
Our integration surface is the official web component and API.

### Q3: How do you prevent token misuse?
Answer:
Short TTL, restricted scopes, origin allowlist, and controlled broker endpoint.

### Q4: How do you troubleshoot failures?
Answer:
Use correlation ID, frontend event logs, viz load error handlers, and broker health/token diagnostics.

## Optional 1-Line Closing
Secure token broker plus Embedding API v3 gives us safe, controllable, and demo-friendly Tableau integration for micro frontends.
