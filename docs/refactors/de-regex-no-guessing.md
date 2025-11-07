# Regex and Key-Guessing Inventory

This document captures every place in the frontend that currently relies on regular expressions or guessed key paths when working with worker payloads. It also records the canonical schema information to replace those heuristics and notes any mismatches between the schema and observed responses.

## Validation sources

- **Worker schema:** The generated TypeScript definitions in `src/api/types.ts` mirror the live OpenAPI document and are treated as the single source of truth for field names and enums.【F:src/api/types.ts†L1022-L1079】【F:src/api/types.ts†L1260-L1304】【F:src/api/types.ts†L1360-L1379】【F:src/api/types.ts†L431-L460】【F:src/api/types.ts†L900-L947】
- **Test fixtures:** Unit tests exercise realistic payload shapes and expose where responses diverge from the documented schema.【F:src/domain/orders/__tests__/normalizeOrders.test.js†L65-L132】【F:src/domain/orders/__tests__/computeOrdersDebugDiff.test.ts†L8-L88】

## 1. Fulfillment status matching

**Location:** `src/domain/status/fulfillmentFilters.js`【F:src/domain/status/fulfillmentFilters.js†L1-L79】

- **Current heuristic:** Filters and badge styles match fulfillment strings with `\bNEW\b`, `\bHOLD\b`, `\bSENT\b`, `\bREADY\b`, plus a loose `PREP`/`COOK` fallback for "in preparation".
- **Schema guidance:** Both the `OrdersDetailedFulfillmentStatus` parameter and `ToastSelection.fulfillmentStatus` enum only allow `NEW`, `HOLD`, `SENT`, and `READY` in normalized responses.【F:src/api/types.ts†L1360-L1379】【F:src/api/types.ts†L1260-L1304】
- **Response discrepancies:** Debug-diff tests surface raw payloads where the order and its items report `IN_PROGRESS`, a state not modeled in the schema; the UI also expects `PREP`/`COOK` fragments for legacy KDS feeds.【F:src/domain/orders/__tests__/computeOrdersDebugDiff.test.ts†L8-L88】
- **Schema-aligned replacement:** Derive filter sets from the schema enum and drive UI class names off the same enum. Document and escalate any additional upstream states (`IN_PROGRESS`, `PREP`, `COOK`) so the worker can publish them formally; until then, confine stop-gap handling to a clearly separated compatibility layer rather than inline regex checks.

## 2. Order normalization utilities

### 2.1 Normalized keys and numeric parsing

**Location:** `src/domain/orders/normalizeOrders.ts` (`normalizeLookupKey`, `toNumber`, `isLikelyGuid`).【F:src/domain/orders/normalizeOrders.ts†L86-L158】【F:src/domain/orders/normalizeOrders.ts†L343-L358】

- **Current heuristic:**
  - `normalizeLookupKey` strips non-alphanumerics with `/[^a-z0-9]+/g` to build matching keys across payloads.
  - `toNumber` removes everything but digits, dots, and hyphens using `/[^0-9.-]+/g` before coercing to a number.
  - `isLikelyGuid` accepts any string that matches `/^[0-9a-f-]+$/i` and either contains a hyphen or hexadecimal letter.
- **Schema guidance:** Identifiers such as `ToastOrder.guid`, `ToastMenusDocument` entity GUIDs, and numeric totals/quantities are already typed in the schema as strings or numbers, so downstream code can depend on their declared types instead of sanitizing arbitrary strings.【F:src/api/types.ts†L1022-L1079】【F:src/api/types.ts†L900-L947】
- **Schema-aligned replacement:** Replace regex sanitization with direct usage of the strongly typed fields—e.g., rely on `guid` and numeric properties as delivered, and treat any non-conforming payload as a schema violation surfaced through diagnostics rather than normalizing it silently.
- **Response discrepancies:** Tests still construct payloads where GUIDs are present but other guessed identifiers (for example `itemGuid` vs. `guid`) exist in nested objects, which suggests that selectors should continue to accept both the canonical field and the alternate forms until the worker guarantees a single identifier surface.【F:src/domain/orders/__tests__/normalizeOrders.test.js†L101-L128】 Document these alternates so the worker can either formalize them or normalize upstream.

### 2.2 Order GUID extraction

**Location:** `src/domain/orders/normalizeOrders.ts` (`ORDER_GUID_KEYS`, `extractOrderGuid`).【F:src/domain/orders/normalizeOrders.ts†L361-L393】

- **Current heuristic:** Iterates over a long list of camelCase, snake_case, and nested keys (`order_guid`, `payload.uuid`, etc.) to find something that looks like a GUID via the regex above.
- **Schema guidance:** Orders published by the worker expose a single `guid` field on the `ToastOrder` object; expanded debug payloads expose `orderId` for flattened diagnostics.【F:src/api/types.ts†L1022-L1059】【F:src/api/types.ts†L495-L514】
- **Schema-aligned replacement:** Read the order GUID from `order.guid` (or `orderData.orderId` inside expanded diagnostics) without iterating over guessed keys. If upstream needs to support legacy payloads, add explicit translation at ingestion and capture it in the worker contract rather than keeping a sprawling guess list in the UI.
- **Response discrepancies:** Historical integrations apparently produced payloads where identifiers were nested under `data.*` and `payload.*`; no current fixtures cover those variants, indicating they may be obsolete. Confirm with API logs before dropping support and update the worker schema accordingly.

## 3. Menu and config lookup heuristics

**Location:** `src/domain/menus/menuLookup.js` (collection paths, identifier/label key lists, outstanding detection regex).【F:src/domain/menus/menuLookup.js†L19-L161】

- **Current heuristic:**
  - Guesses at dozens of possible paths for dining option collections (`data.diningOptions`, `dining_option_id`, etc.) and menu identifiers (`guid`, `sku`, `menu_item_id`, `modifier_guid`, ...).
  - Applies `ORDER_CONTEXT_REGEX = /(order|ticket)/i` and keyword fragments to decide whether a structure represents outstanding orders.
- **Schema guidance:**
  - `ConfigSnapshotResponse.data.diningOptions` is currently typed as an opaque object/array union, so there is no authoritative list of keys in the published schema.【F:src/api/types.ts†L431-L460】
  - Menu payloads (`ToastMenusDocument`, `ToastMenuItem`, modifier references) provide structured fields with stable names such as `guid`, `displayName`, `prepStations`, and numeric `referenceId` values.【F:src/api/types.ts†L900-L947】
- **Schema-aligned replacement:**
  - Extend the worker schema to expose explicit `DiningOption` and outstanding-order document shapes so the frontend can rely on `guid`, `displayName`, `code`, and similar canonical fields instead of traversing guessed paths. The existing tests already assume those canonical keys, which matches observed worker responses.【F:src/domain/orders/__tests__/normalizeOrders.test.js†L65-L132】
  - Once the schema is authoritative, replace the regex/fragment checks with precise field reads (e.g., a boolean `outstanding` flag or a documented collection name) and remove the keyword lists.
- **Response discrepancies:** Because the schema currently leaves dining options untyped, the UI code must keep a compatibility layer until the worker publishes stricter definitions. Capture any additional fields seen in responses during the refactor so the contract can be tightened without breaking deployments.

## 4. UI status slug generation

**Location:** `src/components/OrderCard/utils.js` (`statusToClassName`).【F:src/components/OrderCard/utils.js†L159-L164】

- **Current heuristic:** Builds CSS class names by lowercasing the status string and replacing non-alphanumerics with hyphens via `/[^a-z0-9]+/g`.
- **Schema guidance:** If fulfillment statuses come exclusively from the enum in section 1, class names can be derived from that canonical set without regex (for example, mapping `READY` → `ready`).【F:src/api/types.ts†L1260-L1304】
- **Schema-aligned replacement:** Generate class names from the enum values (e.g., `status.toLowerCase()` constrained to the schema list) or centralize the mapping in a typed helper so arbitrary strings never reach this formatter.
- **Response discrepancies:** None beyond the extra fulfillment states already noted in section 1; addressing those upstream will also stabilize the set of class name inputs.

---

### Next steps

1. Coordinate with the worker team to document any additional fulfillment states and dining-option fields observed in responses so the OpenAPI contract (and generated types) match reality.
2. Update the frontend to replace the regex and key-guessing sites with schema-derived constants or explicit translation layers, removing each compatibility shim once the worker guarantees the canonical shapes.
