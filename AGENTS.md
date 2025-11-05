# Agent Instructions
- Always fetch the latest schema documentation from the worker before beginning any task so the available API surface, field definitions, and enumerated values remain accurate. To retrieve the raw JSON document directly, use `https://doughmonster-worker.thedoughmonster.workers.dev/api/docs/openapi.json`.
- Consult the remotely hosted schema whenever touching data normalization or API-driven features so field names (e.g., `displayNumber`) and optional fields stay aligned with the worker payloads. Cross-check field availability against the OpenAPI definitions instead of relying on assumptions.
- Do not rely on local copies of schema docs; they are intentionally absent.
- For any changes affecting the frontend, always capture and share a screenshot of the rendered UI to accompany your summary.
- When taking screenshots with Playwright, always wait for the UI data to hydrate first—prefer waiting on a reliable selector or state that indicates content is loaded, but in all cases wait at least 3 seconds before capturing the image.
- When investigating order regressions, capture both the normalized and raw diffs using the debug diff tooling so we can compare transformations accurately.
- Before submitting code, run the diff diagnostics via the `Debug ▸ Diff Inspector` UI (or `pnpm debug:diff -- --normalized --raw` on the command line) and attach the captured output to your findings to keep the workflow consistent.

## Live schema docs

- Agents may (and should) retrieve the live OpenAPI schema directly from the worker service when they need up-to-date API details.
- Use the production base URL `https://doughmonster-worker.thedoughmonster.workers.dev` with the `/api/docs/openapi.json` endpoint (and `/api/docs/openapi.js` if desired) to download the schema documentation.
