# Customer-Support-Agent

Standalone proof of concept for the SpreadBliss Help & Contact page. Built with Next.js 16 (App Router), React 19.2, strict TypeScript, and Tailwind CSS.

## Requirements

- Node.js 24
- npm

## Local Setup

```bash
npm install
cp .env.example .env.local   # fill in values when Lyzr integration lands
npm run dev
```

Open http://localhost:3000 — the root page redirects to `/help`.

## Environment Variables

Names only; values are never committed. See `.env.example`:

- `LYZR_API_KEY`
- `LYZR_CHAT_WORKFLOW_ID`
- `LYZR_API_BASE_URL`

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

## Structure

```
src/app                 App Router pages and root layout
src/app/help            Help & Contact page
src/app/api             Route Handlers (server-side Lyzr integration, later phase)
src/components/support  Support UI components
src/lib/support         Support domain types
src/lib/lyzr            Lyzr adapters (later phase)
src/test                Test setup
e2e                     Playwright tests
```

See `AGENTS.md` for the full project rules and architecture constraints.
