# Testing

## End-to-end (Playwright)

Smoke tests live in `e2e/` and cover the landing page, `/os` shell, DOOM demo modal, create-agent overlay, and a non-fatal shell command.

### Prerequisites

- Node.js 20+
- Dependencies installed (`npm ci`)

Install Playwright browsers once:

```bash
npx playwright install chromium
```

### Run locally

Start the dev server automatically (default):

```bash
npm run test:e2e
```

Playwright boots `npm run dev` on port 3000 unless a server is already running.

Interactive UI mode:

```bash
npx playwright test --ui
```

View the last HTML report:

```bash
npx playwright show-report
```

### Notes

- Tests use `prefers-reduced-motion: reduce` to avoid animation flakes.
- `/os` tests seed localStorage to skip the hero boot sequence.
- The DOOM modal test uses `/e2e-fixtures/doom-demo` until the demo is linked from the main OS UI.
- Shell `status` is used for command smoke tests — it streams a response even when API keys are unset.

### CI

GitHub Actions workflow `.github/workflows/ci.yml` runs on push/PR to `main`:

1. `npm ci`
2. `npm run lint`
3. `npm run build`

E2E tests are local-only for now; run them before opening a PR.
