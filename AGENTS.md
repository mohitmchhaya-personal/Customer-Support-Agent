# AGENTS.md — SpreadBliss Customer Support Agent (Standalone PoC)

Read this file before every task. Inspect existing files before modifying them.

## Project Purpose

A standalone proof-of-concept SpreadBliss Help & Contact page, implemented and deployed to Vercel (production: https://customer-support-agent-sand.vercel.app). It consists of:

- A customer-support chatbot UI.
- Server-side integration with a Lyzr SuperFlow.
- Grounded answers for questions supported by the SpreadBliss knowledge base.
- Inline email collection when human review is required.
- Immediate escalation acknowledgement to the customer.
- A separate asynchronous Lyzr Human Review SuperFlow that sends the reviewed outcome by email.

This is a **standalone page**. Do NOT integrate it with the existing SpreadBliss application, repositories, authentication, profiles, navigation, or backend.

## Current Architecture

- `/help` (root `/` redirects to it) renders the support chat UI (`src/components/support`, entry point `SupportChat.tsx`).
- `POST /api/support/messages` validates the request, mints or verifies a session-bound HMAC ticket ID (`src/lib/support/ticket.ts`), triggers the Lyzr Chat Response SuperFlow, and returns `202` with `{ status: "processing", ticketId, executionId }`.
- `GET /api/support/executions/[executionId]` fetches the Lyzr execution and maps it to a public status via `src/lib/lyzr/adapter.ts`; the UI polls this endpoint.
- Route Handler logic lives in `src/lib/api/support` as dependency-injected factories for testability; the `src/app/api` routes are thin wrappers.
- `src/lib/lyzr` is server-only (enforced by `server-only.ts`): client, config (`LYZR_API_KEY`, `LYZR_CHAT_WORKFLOW_ID`, optional `LYZR_API_BASE_URL`), errors, and adapter.
- The frontend talks only to the normalized internal contract in `src/lib/support/api-contract.ts` through `HttpSupportApiClient` (`src/lib/support/api-client.ts`).
- Escalation is fire-and-forget: after email collection, the Human Review SuperFlow runs asynchronously in Lyzr and emails the customer; the app never waits for it.

## Target Stack

- Node.js 24
- Next.js 16 (App Router)
- React 19.2
- TypeScript (strict mode)
- Tailwind CSS
- npm as the package manager
- Next.js server Route Handlers for all backend/API integration
- Vitest + React Testing Library for unit/component tests
- Playwright for browser-level (e2e) tests

## Architectural Constraints

- Use a single Next.js project for the proof of concept.
- Do NOT create a NestJS application.
- Do NOT introduce a database, authentication system, AWS services, queues, Docker, or Terraform.
- Hosting is Vercel (production builds from `main`, with Lyzr credentials set as Vercel project environment variables). Do NOT add other deployment infrastructure.
- Never expose the Lyzr API key or webhook secrets in browser code.
- Do NOT create environment variables beginning with `NEXT_PUBLIC_` for Lyzr credentials.
- All Lyzr communication must go through server-side Route Handlers.
- The frontend must consume a normalized internal API contract and must NOT depend directly on raw Lyzr response structures.
- Treat the Lyzr Chat Response SuperFlow as the customer-facing workflow.
- Human approval and customer email delivery occur asynchronously inside a separate Lyzr Human Review SuperFlow.
- The application does NOT wait for the Human Review SuperFlow to complete.

## Public Support Statuses

The canonical, customer-facing support statuses are:

- `processing`
- `answered`
- `needs_email`
- `awaiting_human_review`
- `failed`

## Design Rules

- Figma is the visual source of truth.
- Brand colors:
  - `#111111`
  - `#FFFFFF`
  - `#2563EB`
  - `#B08D57`
- Use the Inter typeface.
- No gradients.
- Use generous whitespace, thin borders, minimal animation, and accessible contrast.
- Do NOT display AI confidence, escalation reasons, internal notes, raw Lyzr output, or stack traces to customers.

## Figma Implementation Rules

When asked to implement the Figma design:

1. Inspect the repository and existing components first.
2. Use the configured Figma MCP server.
3. Call `get_design_context` on the exact node-specific Figma URL before writing UI code.
4. Do NOT substitute a screenshot-only implementation when design context is available.
5. Treat Figma-generated React/Tailwind code as reference material, not code to paste verbatim.
6. Adapt the result to this repository's architecture and components.
7. Reuse existing tokens and components.
8. Download and commit the exact Figma assets needed by the page.
9. Do NOT hotlink temporary Figma MCP asset URLs.
10. If the URL lacks a `node-id`, stop and request a node-specific link.

## Engineering Rules

- Prefer small reusable components and explicit TypeScript types.
- Separate UI components, support-domain types, API clients, and Lyzr adapters.
- Validate every public API request.
- Set input length limits.
- Use timeouts for external requests.
- Redact secrets, email addresses, and raw external responses from logs.
- Return customer-safe errors.
- Prevent duplicate submissions in the UI.
- Preserve accessibility, keyboard use, and responsive behavior.
- Do NOT add production dependencies without explaining why they are needed.
- Do NOT weaken TypeScript, ESLint, or test settings to make checks pass.

## Expected Commands

All implementation PRs must run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

UI integration PRs must also run:

```bash
npm run test:e2e
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and build on every push to `main` and every pull request.

## Change Discipline

- Read AGENTS.md before every task.
- Inspect existing files before modifying them.
- Preserve unrelated user changes.
- Keep each PR limited to its requested scope.
- Include a concise PR summary, testing evidence, assumptions, and known limitations.
- Do NOT proceed to a later implementation phase in the same PR.
