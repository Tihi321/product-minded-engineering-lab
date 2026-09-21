# RB2 Order Intake Lab

A weekend-sized, original learning project for exploring a lead-weighted Node.js/TypeScript role: turn messy wholesale order text into a reviewable order, keep a person in charge of uncertainty, and export only after explicit approval. It is inspired by a public problem domain, not RB2 software, customer data, or an RB2 integration.

## 5-minute run

Requires Node 24+ and npm. From an empty checkout:

```bash
npm install
npm run verify
npm run dev
# in another terminal: npm run dev:ui, then open http://localhost:5173
```

`verify` is offline by default. It type-checks, runs tests, builds both workspaces, exercises sample ingestion/review/export, and invokes the Lambda-shaped handler locally. The API uses Node's built-in `node:sqlite` driver; no Docker, AWS account, credentials, CLI, or deployment is needed.

Useful commands: `npm run demo`, `npm run lambda:invoke`, `npm run typecheck`, `npm test`, `npm run build`.

## What to try

The demo sends one known-SKU order and one ambiguous description. In the UI select the review order, enter `MIL-004` if needed, click Approve, then Export. Re-running the same `sourceId` returns the existing order rather than creating a duplicate. `/api/metrics` shows review, export, deterministic-match, LLM-call, and ERP-failure counters.

## Modes

Copy `.env.example` to `.env` if desired. `LLM_MODE=mock` is the deterministic default. `LLM_MODE=proxy` calls `LLM_PROXY_URL` with an OpenAI-compatible JSON-only request (for example a local `api-acp-proxy`); `LLM_MODE=lmstudio` uses `LM_STUDIO_URL` and `LM_STUDIO_MODEL`. Live modes are smoke tests only and are intentionally excluded from verification.

## Boundaries

This is a local teaching lab. It has no authentication, real inbox ingestion, ERP credentials, cloud deployment, or real customer data. The model output is treated as untrusted input: it is schema-validated, prompt-injection-like text is not executed, uncertain matches remain reviewable, and the ERP port is mock-only.

Continue with [`docs/tutorial.md`](docs/tutorial.md), [`docs/research-brief.md`](docs/research-brief.md), and [`docs/interview-kit.md`](docs/interview-kit.md).

## Optional local model smoke tests

The default is offline `LLM_MODE=mock`. For a local `api-acp-proxy` OpenAI-compatible endpoint, configure the proxy model explicitly (the default is `gpt-5.6-sol`):

```powershell
$env:LLM_MODE='proxy'
$env:LLM_MODEL='gpt-5.6-sol'
$env:LLM_PROXY_URL='http://127.0.0.1:8787/v1/chat/completions'
$env:LLM_PROXY_API_KEY='local'
npm run dev
```

For LM Studio, load a model and use its exact model ID:

```powershell
$env:LLM_MODE='lmstudio'
$env:LM_STUDIO_URL='http://127.0.0.1:1234/v1/chat/completions'
$env:LM_STUDIO_MODEL='your-loaded-model-id'
npm run dev
```

These live-provider checks are optional and excluded from `npm run verify`.
