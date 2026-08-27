# Customer-Support-Agent

Standalone proof of concept for the SpreadBliss Help & Contact page: a customer-support chat UI backed by a server-side Lyzr SuperFlow integration with grounded answers, inline email collection, and asynchronous human-review escalation. Built with Next.js 16 (App Router), React 19.2, strict TypeScript, and Tailwind CSS.

**Live deployment (Vercel):** https://customer-support-agent-sand.vercel.app

## How It Works

1. The `/help` page submits customer questions to `POST /api/support/messages`, which triggers the Lyzr Chat Response SuperFlow server-side and returns `202` with a `ticketId` and `executionId`.
2. The UI polls `GET /api/support/executions/[executionId]` until a terminal status is reached.
3. Public statuses: `processing`, `answered`, `needs_email`, `awaiting_human_review`, `failed`.
4. When a question needs human review, the UI collects the customer's email inline, resubmits with the same session-bound ticket ID, and shows an escalation acknowledgement. The Lyzr Human Review SuperFlow then delivers the reviewed outcome by email asynchronously — the app never waits for it.

The frontend consumes only the normalized internal API contract (`src/lib/support/api-contract.ts`); raw Lyzr payloads never reach the browser, and Lyzr credentials stay server-side.

## Requirements

- Node.js 24
- npm

## Local Setup

```bash
npm install
cp .env.example .env.local   # fill in Lyzr values
npm run dev
```

Open http://localhost:3000 — the root page redirects to `/help`.

## Environment Variables

Names only; values are never committed. See `.env.example`:

- `LYZR_API_KEY` — Lyzr API key (server-side only)
- `LYZR_CHAT_WORKFLOW_ID` — Chat Response SuperFlow workflow ID
- `LYZR_API_BASE_URL` — optional; defaults to `https://inference.studio.lyzr.ai/api`

In production these are configured as Vercel project environment variables.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Unit/component tests (Vitest + React Testing Library) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright e2e tests (builds and serves the app) |

First-time Playwright setup: `npx playwright install chromium`.

## CI & Deployment

- GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and build on every push to `main` and every pull request.
- The app is deployed on Vercel; production deployments build from `main`.

## Structure

```
src/app                 App Router pages and root layout (root redirects to /help)
src/app/help            Help & Contact page
src/app/api/support     Route Handlers: POST /messages, GET /executions/[executionId]
src/components/support  Support UI components (chat, composer, escalation, email form)
src/lib/support         Support domain types, internal API contract/client, validation, ticket IDs
src/lib/api/support     Route Handler logic (dependency-injected for tests)
src/lib/lyzr            Server-only Lyzr client, config, and response adapter
src/test                Test setup and mock support client
e2e                     Playwright tests
```

See `AGENTS.md` for the full project rules and architecture constraints.
