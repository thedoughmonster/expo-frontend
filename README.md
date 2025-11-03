# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Configuration

Application polling and worker endpoints are now centralized in [`src/config/appSettings.json`](src/config/appSettings.json). The file is loaded at runtime by [`src/config/appSettings.ts`](src/config/appSettings.ts), which validates the expected shape and exports a typed `APP_SETTINGS` object for the rest of the app.

You can edit `appSettings.json` to change the default behavior:

| Field | Description | Default |
| --- | --- | --- |
| `orderPollingWindowMinutes` | Number of minutes included when no cursor is available. Mirrors the previous `FALLBACK_MINUTES` constant in `useOrdersData`. | `30` |
| `pollIntervalMs` | Delay between background refresh attempts (was `POLL_INTERVAL_MS`). | `5000` |
| `pollLimit` | Maximum orders requested per poll (formerly `POLL_LIMIT`). | `50` |
| `driftBufferMs` | Milliseconds subtracted from the cursor timestamp to account for clock drift (`DRIFT_BUFFER_MS`). | `120000` |
| `staleActiveRetentionMs` | How long to retain active orders in memory before pruning (`STALE_ACTIVE_RETENTION_MS`). | `7200000` |
| `staleReadyRetentionMs` | How long to retain ready orders before pruning (`STALE_READY_RETENTION_MS`). | `21600000` |
| `targetedFetchConcurrency` | Parallel targeted fetches allowed (`TARGETED_CONCURRENCY`). | `3` |
| `targetedFetchMaxRetries` | Retry attempts for targeted fetches (`TARGETED_MAX_RETRIES`). | `2` |
| `targetedFetchBackoffMs` | Delay between targeted fetch retries (`TARGETED_BACKOFF_MS`). | `400` |
| `ordersEndpoint` | Worker endpoint used for fetching orders. | `https://doughmonster-worker.thedoughmonster.workers.dev/api/orders` |
| `menusEndpoint` | Worker endpoint used for fetching menu data. | `https://doughmonster-worker.thedoughmonster.workers.dev/api/menus` |
| `configSnapshotEndpoint` | Worker endpoint used for fetching config snapshots. | `https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot` |

Changes to `appSettings.json` are picked up automatically by Vite during development; restart the dev server if you edit the file while a production build is running.
