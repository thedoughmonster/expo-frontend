# Agent Instructions
- Review `docs/doughmonster-worker.openapi.yaml` before beginning any task so the available API surface and field definitions remain top of mind.
- Always read the worker API documentation at https://doughmonster-worker.thedoughmonster.workers.dev/api/docs/openapi.json before starting any work to stay aligned with the live endpoint contracts.
- Always consult the schema when touching data normalization or API-driven features so field names (e.g., `displayNumber`) stay aligned with the worker payloads.
- For any changes affecting the frontend, always capture and share a screenshot of the rendered UI to accompany your summary.
- When taking screenshots with Playwright, always wait for the UI data to hydrate first—prefer waiting on a reliable selector or state that indicates content is loaded, but in all cases wait at least 3 seconds before capturing the image.
