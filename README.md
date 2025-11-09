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

Application polling and worker endpoints are centralized in [`src/config/appSettings.json`](src/config/appSettings.json). The file is loaded at runtime by [`src/config/appSettings.ts`](src/config/appSettings.ts), which validates the expected shape and exports a typed `APP_SETTINGS` object for the rest of the app.

Each entry in `appSettings.json` is an object with a `value`, a human-readable `description`, and—when the setting represents a duration—a `unit` chosen from `milliseconds`, `seconds`, `minutes`, `hours`, or `days`. The validator normalizes these records so the rest of the codebase never hardcodes the settings.

```json
{
  "pollIntervalMs": {
    "value": 5000,
    "unit": "milliseconds",
    "description": "Delay between successive polling requests for orders. Lower this value for faster updates at the cost of additional network load; raise it to reduce traffic."
  }
}
```

You can edit `appSettings.json` to change the default behavior. The table below summarizes the bundled defaults:

| Setting | Default value | Unit (if applicable) | Description |
| --- | --- | --- | --- |
| `orderPollingWindowMinutes` | `180` | minutes | Controls how far back to request orders when no pagination cursor is available. Increase to capture more historical orders; decrease to limit queries to recent activity. |
| `pollIntervalMs` | `5000` | milliseconds | Delay between successive polling requests for orders. Lower this value for faster updates at the cost of additional network load; raise it to reduce traffic. |
| `pollLimit` | `50` | — | Maximum number of orders requested per poll. Increase to fetch more orders at once; decrease to shrink payload sizes. |
| `driftBufferMs` | `120000` | milliseconds | Amount of time subtracted from the latest cursor to account for clock drift. Increase to guard against missed orders; decrease to minimize duplicate retrievals. |
| `staleActiveRetentionMs` | `7200000` | milliseconds | Retention window for active orders kept in memory before pruning. Increase to keep orders visible longer; decrease to reclaim memory sooner. |
| `staleReadyRetentionMs` | `21600000` | milliseconds | Retention window for ready orders before they are pruned. Increase to keep fulfilled orders available longer; decrease to clear them out more quickly. |
| `targetedFetchConcurrency` | `3` | — | Number of targeted fetch requests that may run in parallel. Increase to fan out more aggressively; decrease to limit concurrent load. |
| `targetedFetchMaxRetries` | `2` | — | Maximum retry attempts for targeted fetches when they fail. Increase to make the system more persistent; decrease to fail faster. |
| `targetedFetchBackoffMs` | `400` | milliseconds | Delay applied between targeted fetch retry attempts. Increase for a gentler retry cadence; decrease to retry more rapidly. |
| `ordersEndpoint` | `https://doughmonster-worker.thedoughmonster.workers.dev/api/orders` | — | Worker endpoint used for fetching orders. Point this to a different worker origin to change the orders source. |
| `menusEndpoint` | `https://doughmonster-worker.thedoughmonster.workers.dev/api/menus` | — | Worker endpoint used for fetching menu data. Update this if the menus API location changes. |
| `configSnapshotEndpoint` | `https://doughmonster-worker.thedoughmonster.workers.dev/api/config/snapshot` | — | Worker endpoint used for fetching configuration snapshots. Modify this when the configuration API location changes. |

Changes to `appSettings.json` are picked up automatically by Vite during development; restart the dev server if you edit the file while a production build is running.
