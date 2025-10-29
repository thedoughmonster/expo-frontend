# Agent Instructions
- Always fetch the latest schema documentation from the worker before beginning any task so the available API surface and field definitions remain accurate. The interactive OpenAPI explorer lives at `https://doughmonster-worker.thedoughmonster.workers.dev/openapi`, and the raw JSON document is available at `https://doughmonster-worker.thedoughmonster.workers.dev/api/docs/openapi.json`.
- Consult the remotely hosted schema whenever touching data normalization or API-driven features to keep field names (e.g., `displayNumber`) aligned with the worker payloads.
- Do not rely on local copies of schema docs; they are intentionally absent.
- For any changes affecting the frontend, always capture and share a screenshot of the rendered UI to accompany your summary.
- When taking screenshots with Playwright, always wait for the UI data to hydrate first—prefer waiting on a reliable selector or state that indicates content is loaded, but in all cases wait at least 3 seconds before capturing the image.
