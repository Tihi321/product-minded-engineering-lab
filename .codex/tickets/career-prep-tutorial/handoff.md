# Handoff — RB2 Order Intake Lab

Implemented the authorized plan in the empty workspace.

## Delivered

- npm workspace with Node 24/TypeScript ESM, shared Zod domain contracts and ports.
- Fastify API with `POST /api/orders`, order list/detail, review, export, metrics, and health routes.
- Node 24 built-in SQLite persistence, source-id idempotency, safe failure states, structured Fastify logs, metrics, and mock ERP.
- Deterministic SKU/EAN matching before reviewable description matching; mock LLM default plus OpenAI-compatible proxy and LM Studio adapters.
- React/Vite review UI showing original text, confidence, correction, explicit approval, and export gate.
- Lambda-shaped handler plus local invocation; production mapping is documented without AWS tooling or deployment.
- Offline sample catalog/orders, env template, 10–14 hour tutorial, cited official RB2 research brief, and interview/application kit.

## Verification

`npm run verify` passed on 2026-09-21. It runs typecheck, API/domain tests (10 passing total: 8 API/service and 2 domain), production builds, offline demo, and local Lambda invocation. The demo ingested a known order, routed ambiguous text to review, persisted a correction, approved/exported through the mock ERP, and printed metrics. Lambda health returned status 200.

## Notes and deviations

- Node emitted the expected experimental warning for `node:sqlite`.
- npm reported two moderate dependency advisories; no forced audit fix was applied.
- The workspace's native `apply_patch` update helper failed with a Windows sandbox refresh error after initial creation. Exact, limited PowerShell rewrites were used for three configs, one async error-handling fix, the readable UI source, and the plan checklist/handoff. This is the only process deviation.
- Optional proxy/LM Studio modes are documented and intentionally not part of deterministic verification. No network provider was called by the demo or tests.
- No AWS account, credentials, Docker, AWS CLI, deployment, RB2 account, or real customer data was used.

## Useful entry points

- `README.md`
- `docs/tutorial.md`
- `docs/research-brief.md`
- `docs/interview-kit.md`
- `packages/domain/src/types.ts`
- `packages/api/src/workflow.ts`
- `packages/api/src/server.ts`
- `packages/ui/src/main.tsx`

The final deterministic-path demo reports 2 deterministic matches and 1 LLM call (only the ambiguous sample), matching the acceptance criterion.

## Refinement pass

- `LLM_MODEL=gpt-5.6-sol` is the shared proxy default; LM Studio uses its own `LM_STUDIO_MODEL` setting. Exact proxy and LM Studio commands are in README/tutorial.
- Final test result: API 8/8 and domain 2/2 (10 tests total) passed. These cover malformed/unavailable LLM safe failure, injection-like text, invalid input 400s, corrections, ERP retry/idempotency, duplicate source IDs, and exact SKU zero-call behavior.
- `npm run verify` passed after the refinement pass. Demo reports deterministicMatches 2 and llmCalls 1; local Lambda health is 200.
- Research/tutorial/interview materials were expanded with official vacancy compensation/benefits, role/AI-first claims, public technology signals, diagrams, project map, expected outputs, provider setup, AWS mapping, and exercise hints.
- No UI component test was added: introducing jsdom/testing-library would expand the agreed lightweight lab; manual UI flow plus API/service reviewer-control tests and Vite production build cover the documented surface.
- Removed `.codex/temp/patch-test.txt` and package-local TypeScript build metadata; build metadata now targets `.codex/temp`.

