# RB2 Career Preparation and Order-Intake Tutorial

## Goal

Create a weekend-sized, lead-weighted learning project that prepares for both RB2's Lead Engineer role and a senior engineering role. The result must combine an evidence-based company/role brief, a runnable Node.js/TypeScript application, a guided tutorial, and interview/application preparation.

Research must distinguish published facts from inference and use current RB2 primary sources. The tutorial must be in English, assume an experienced developer, and add short PHP/WordPress-to-Node mental-model notes.

## Agreed constraints and defaults

- Target both roles, weighted toward the Lead Engineer vacancy.
- Build one realistic project: an original "Order Intake Lab" inspired by the public problem domain, not RB2 proprietary software.
- Include a Fastify API and small React review UI.
- Use Node 24, TypeScript ESM, npm workspaces, Zod, SQLite via Node's built-in driver, and Vitest.
- Use mock LLM mode by default and support both the local `api-acp-proxy` and OpenAI-compatible LM Studio endpoints through environment variables.
- Teach AWS Lambda/serverless concepts without AWS accounts, credentials, Docker, AWS CLI, SAM, or deployment.
- Size the tutorial for approximately 10-14 hours.
- Prepare the user to apply soon and treat Purmerend hybrid work/relocation as viable.
- Authentication, real inbox ingestion, real ERP credentials, cloud deployment, and real customer data are out of scope.

## Implementation checklist

- [x] Write a cited RB2 research brief covering business, public products and cases, culture, hiring, role expectations, public technology signals, logistical considerations, and unknowns to clarify.
- [x] Create an npm-workspace TypeScript project with shared domain/contracts, Fastify API, and React/Vite review UI.
- [x] Implement order ingestion, deterministic SKU/EAN matching, structured LLM extraction, confidence handling, human correction/approval, idempotency, mock ERP export, retries, metrics, and structured logging.
- [x] Define clean ports for LLM, catalog, repository, ERP, clock, and ID generation, with local adapters.
- [x] Make model output JSON-only and Zod-validated; invalid, uncertain, or unavailable model results must remain safe and reviewable.
- [x] Add a Lambda-shaped handler and local event invocation plus an AWS production-reference explanation, without requiring a cloud account.
- [x] Write a step-by-step 10-14 hour tutorial with setup, runnable examples, exercises, expected outcomes, PHP/WordPress comparison notes, and troubleshooting.
- [x] Provide root scripts for install-time-independent `dev`, `demo`, `test`, `typecheck`, `build`, `lambda:invoke`, and `verify` workflows.
- [x] Add application/interview material: skills matrix, technical drills, system-design prompt, demo script, product trade-off story, CV evidence checklist, application-story template, leadership scenarios, and recruiter questions.
- [x] Add sample catalog/orders and an environment template. Mock mode must work offline; document optional proxy and LM Studio smoke tests.
- [x] Verify typecheck, tests, production builds, demo flow, and local Lambda invocation.
- [x] Record verification evidence and any deviations in this plan and create a handoff in this ticket folder.

## Public interfaces

Core types include `Order`, `OrderLine`, `Product`, `MatchCandidate`, `ExtractionResult`, `ReviewDecision`, `WorkflowStatus`, `DomainEvent`, and `OperationalMetrics`.

Ports include `LlmExtractor`, `ProductCatalog`, `OrderRepository`, `ErpGateway`, `Clock`, and `IdGenerator`.

HTTP API:

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/review`
- `POST /api/orders/:id/export`
- `GET /api/metrics`
- `GET /health`

Ingestion accepts a caller-supplied `sourceId`, source type, and text content. Reusing a `sourceId` is idempotent. High-confidence deterministic matches may become ready for approval, but export always requires explicit approval.

## Tutorial sequence

1. Understand RB2 and define one workflow plus one KPI.
2. Model orders, products, confidence, exceptions, and workflow states.
3. Implement and test deterministic SKU/EAN matching.
4. Add ingestion API, persistence, idempotency, and error handling.
5. Add structured LLM extraction and security boundaries.
6. Build the reviewer UI and mock ERP integration.
7. Explore Lambda/serverless architecture locally without deploying.
8. Harden, measure, demo, and convert the work into interview stories.

## Acceptance and verification

- A new user can follow the README from an empty checkout, start the application, process supplied sample orders, review an exception, export an approved order, and inspect metrics.
- Duplicate ingestion does not create duplicate orders or exports.
- Known identifiers avoid an LLM call; ambiguous descriptions use the configured extractor.
- Malformed model output, provider outages, prompt-injection-like document text, and missing fields fail safely.
- Reviewer corrections persist and only approved orders can be exported.
- Transient ERP failures can be retried without duplicate exports.
- Mock mode passes build, typecheck, tests, demo, and Lambda invocation without network access or external accounts.
- Optional live proxy and LM Studio tests are documented but excluded from deterministic verification.
- The user can explain the architecture, major trade-offs, AWS production mapping, and a concise application story.

## Research basis

Verify public facts as of 2026-09-21 using RB2's official [company overview](https://www.rb2.nl/en/about), [current vacancy](https://www.rb2.nl/en/careers/product-minded-lead-engineer), [careers process](https://www.rb2.nl/en/jobs?from=careers), [OrderPilot description](https://www.rb2.nl/en/ai-agents/orderpilot), and [technical architecture guidance](https://www.rb2.nl/en/insights/the-technical-foundation-for-a-successful-start-of-a-development-project), plus relevant official product and case pages.

## Verification record

Implementation and verification results will be appended here.

### Verification record (2026-09-21)

- `npm install` completed successfully (169 audited packages; npm reported two moderate advisories, not auto-fixed because that could introduce breaking changes).
- `npm run typecheck` passed for domain, API, and UI after making the root workflow build the shared domain package first.
- `npm test` passed: API 1/1 and domain 2/2 tests. Coverage includes duplicate source-id ingestion, explicit approval before export, and deterministic matching.
- `npm run build` passed: API/domain TypeScript builds and Vite production UI build.
- `npm run demo` passed offline: known identifiers reached ready, ambiguous text reached review, correction/approval/export completed, and metrics printed.
- `npm run lambda:invoke` passed with HTTP 200 health response from the local Lambda-shaped adapter.
- `npm run verify` passed end to end (typecheck, tests, build, demo, Lambda invocation).
- No AWS account, credentials, deployment, Docker, AWS CLI, RB2 account, or real customer data used.
- Deviation: the native `apply_patch` update helper repeatedly failed with a Windows sandbox refresh error after initial file creation; narrowly scoped PowerShell rewrites were used for config/source/doc checklist updates and this is recorded for handoff.
- Follow-up verification: the final demo metrics report deterministicMatches: 2 and llmCalls: 1, proving known identifiers use the deterministic path while ambiguous text uses the configured extractor.

### Refinement verification (2026-09-21)

- Proxy mode now uses shared `LLM_MODEL`, default `gpt-5.6-sol`; LM Studio retains `LM_STUDIO_MODEL`. README/tutorial include exact PowerShell startup commands.
- Expanded API/service acceptance coverage: 8 API tests plus 2 domain tests pass. Coverage includes provider failure persistence, prompt-injection-like unresolved text, 400 validation, correction persistence, transient ERP retry/idempotency, duplicate source IDs, and zero-LLM exact SKU extraction.
- `npm run verify` passed after all refinements: typecheck, 10 tests, production builds, offline demo, and Lambda invocation. Demo metrics remain deterministicMatches 2 / llmCalls 1.
- Research brief now covers current vacancy responsibilities, stated AI-assisted-development percentage, compensation/benefits, products/cases, culture/locations, and public technology signals with direct official links and fact/claim/inference labels.
- Tutorial now includes architecture diagram, project map, expected outputs, provider setup, AWS no-account mapping, exercise hints/solutions, and troubleshooting. UI browser tests remain intentionally omitted because no browser/jsdom harness is installed; UI behavior is manually documented and API/service reviewer controls are tested.
- Backend adapters/server/tests were reformatted for teaching readability. Temporary patch-test file removed; compiler build metadata is configured under `.codex/temp` and package-local `*.tsbuildinfo` artifacts removed.
