# Schema verification workflow

The schema verifier can run in two distinct modes:

- **Verify** (default): Fetches each worker endpoint, validates the responses against
the OpenAPI schema, and compares the canonical payload structure to the committed
fixtures. This keeps CI deterministic even when high-churn data such as `/api/orders`
changes minute to minute.
- **Record**: Performs the full capture, sanitizes the responses, and overwrites the
fixtures stored in `fixtures/api/`. Use this when the schema evolves and the canonical
structure legitimately changes.

Run the verifier in CI (and locally for a quick check) with:

```sh
pnpm verify:schema -- --mode=verify
```

When you intentionally need to refresh the fixtures, switch to record mode:

```sh
pnpm verify:schema -- --mode=record
```

After recording, commit the updated snapshots so the integration tests continue to
exercise the latest payload shapes.
