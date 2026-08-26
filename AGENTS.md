# AGENTS.md — SpreadBliss Customer Support Agent (Standalone PoC)

Read this file before every task. Inspect existing files before modifying them.

## Project Purpose

Build a standalone proof-of-concept SpreadBliss Help & Contact page consisting of:

- A customer-support chatbot UI.
- Server-side integration with a Lyzr SuperFlow.
- Grounded answers for questions supported by the SpreadBliss knowledge base.
- Inline email collection when human review is required.
- Immediate escalation acknowledgement to the customer.
- A separate asynchronous Lyzr Human Review SuperFlow that sends the reviewed outcome by email.

This is a **standalone page**. Do NOT integrate it with the existing SpreadBliss application, repositories, authentication, profiles, navigation, or backend.

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
- Do NOT introduce a database, authentication system, AWS services, queues, Docker, Terraform, or deployment infrastructure.
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

Once scaffolding exists, all implementation PRs must run:

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

## Change Discipline

- Read AGENTS.md before every task.
- Inspect existing files before modifying them.
- Preserve unrelated user changes.
- Keep each PR limited to its requested scope.
- Include a concise PR summary, testing evidence, assumptions, and known limitations.
- Do NOT proceed to a later implementation phase in the same PR.
