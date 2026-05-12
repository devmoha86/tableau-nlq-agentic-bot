# tableau-nlq-agentic-bot
Intelligent analytics bot for open-source embedded reporting experiences

## Architecture Baseline

- Frontend integration uses micro frontend modules styled with Tailwind CSS.
- Embedded analytics uses `@superset-ui/embedded-sdk`.
- Authentication uses a server-side Guest Token broker handshake.
- Superset runtime is hosted in Codespaces through Docker Compose.

## Non-Negotiable Quality Priorities

- High performance with explicit p95 latency budgets.
- Zero iframe vulnerabilities through strict origin and messaging controls.
