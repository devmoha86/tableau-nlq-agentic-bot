import React, { useEffect, useMemo, useRef, useState } from 'react';
import { embedDashboard } from '@superset-ui/embedded-sdk';

function App() {
  const mountRef = useRef(null);
  const [status, setStatus] = useState('Requesting guest token...');
  const [error, setError] = useState('');

  // Intelligently construct URLs for Codespaces or local development
  const resolveUrls = useMemo(() => {
    const protocol = window.location.protocol; // http: or https:
    const hostname = window.location.hostname;
    
    // Check if we're in Codespaces (hostname contains .app.github.dev)
    if (hostname.includes('.app.github.dev')) {
      // Extract host prefix: musical-guacamole-wrx5rvp76pvr3946j-4201 -> musical-guacamole-wrx5rvp76pvr3946j
      const parts = hostname.split('-');
      const portIndex = parts.length - 1;
      const hostPrefix = parts.slice(0, portIndex).join('-');
      
      return {
        supersetBaseUrl: `${protocol}//${hostPrefix}-8088.app.github.dev`,
        tokenEndpoint: `${protocol}//${hostPrefix}-3101.app.github.dev/api/superset/guest-token`,
      };
    }
    
    // Fall back to localhost for local development
    return {
      supersetBaseUrl: 'http://localhost:8088',
      tokenEndpoint: 'http://localhost:3101/api/superset/guest-token',
    };
  }, []);

  const supersetBaseUrl = useMemo(
    () => import.meta.env.VITE_SUPERSET_BASE_URL || resolveUrls.supersetBaseUrl,
    [resolveUrls]
  );
  const dashboardId = useMemo(
    () => import.meta.env.VITE_SUPERSET_DASHBOARD_ID || '',
    []
  );
  const embedId = useMemo(
    () => import.meta.env.VITE_SUPERSET_EMBED_ID || dashboardId,
    [dashboardId]
  );
  const tokenEndpoint = useMemo(
    () => import.meta.env.VITE_GUEST_TOKEN_ENDPOINT || resolveUrls.tokenEndpoint,
    [resolveUrls]
  );

  useEffect(() => {
    let cancelled = false;

    async function mountDashboard() {
      if (!dashboardId) {
        setError('Missing VITE_SUPERSET_DASHBOARD_ID');
        setStatus('Configuration error');
        return;
      }

      if (!embedId) {
        setError('Missing VITE_SUPERSET_EMBED_ID or VITE_SUPERSET_DASHBOARD_ID');
        setStatus('Configuration error');
        return;
      }

      try {
        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dashboardId }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Guest token endpoint failed (${response.status}): ${text}`);
        }

        const data = await response.json();
        if (!data.token) {
          throw new Error('Guest token response did not include token');
        }

        if (cancelled || !mountRef.current) {
          return;
        }

        setStatus('Embedding Superset dashboard...');

        await embedDashboard({
          id: embedId,
          supersetDomain: supersetBaseUrl,
          mountPoint: mountRef.current,
          fetchGuestToken: async () => data.token,
          dashboardUiConfig: {
            hideTitle: false,
            hideChartControls: false,
            hideTab: false,
            filters: {
              expanded: false,
            },
          },
        });

        if (!cancelled) {
          setStatus('Dashboard embedded successfully');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setStatus('Embed failed');
        }
      }
    }

    mountDashboard();

    return () => {
      cancelled = true;
    };
  }, [dashboardId, embedId, supersetBaseUrl, tokenEndpoint]);

  return (
    <main className="min-h-screen bg-shell-bg text-shell-text p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-xl border border-shell-border bg-shell-panel p-4">
          <p className="text-sm uppercase tracking-[0.2em] text-shell-accent">Superset MFE POC</p>
          <h1 className="mt-2 text-2xl font-semibold">Guest Token + Embedded SDK</h1>
          <p className="mt-1 text-sm text-shell-muted">{status}</p>
          <details className="mt-3 text-xs text-shell-muted">
            <summary className="cursor-pointer">Configuration</summary>
            <pre className="mt-2 bg-black/20 p-2 rounded overflow-auto">
Superset: {supersetBaseUrl}
Token Endpoint: {tokenEndpoint}
Dashboard ID: {dashboardId}
Embed ID: {embedId}
            </pre>
          </details>
          {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
        </header>

        <section className="rounded-xl border border-shell-border bg-shell-panel p-2">
          <div ref={mountRef} className="h-[75vh] w-full overflow-hidden rounded-lg bg-black/10" />
        </section>
      </div>
    </main>
  );
}

export default App;
