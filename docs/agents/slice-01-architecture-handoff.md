# Handoff — Slice 01 Architecture

## Gate
Slice Architecture (workflow step 4) — complete.

## Artifact
`docs/architecture/slices/slice-01-architecture.md`

## Decisions recorded
- No endpoints. Static PWA, Dexie v1: `accounts`, `categories`, `entries`,
  `settings`.
- One persistence seam: `createLedger(db)` → `Ledger`. One entry write path:
  `addExpense`. One read model: `monthSummary`.
- `entries.date` is the only filter index; `accounts.createdAt` orders the
  account picker.
- Hash routes, `useLiveQuery` for immediate updates, PWA precache plus
  `navigator.storage.persist()` at boot (no storage warning until slice 3).
- Default currency: **CAD, exponent 2** — flagged to the user and resolved.
  Changing it later is a data migration.
- Nine starter categories with stable ids, seeded idempotently by
  `initialize()`.

## Next gate
Slice Program Design (`to-spec`), then ticket breakdown. Read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-01-architecture.md`
3. `docs/product/slices/slice-01-scope.md`

## Suggested skills
- `to-spec` for the program design doc.
- `domain-modeling` if any term shifts; `codebase-design` for module shape.
- `prototype` only if the add-form/live-query state needs a sanity check.

## Repo state
- `src/` is empty (`.gitkeep` only). No `package.json`, `tsconfig.json`, or
  tooling yet.
- No tests run; this gate was docs-only.

## Open items
- None blocking.
- Starter category names are content and can change without architectural
  impact.
- Do not add edit/delete, export, category management, balances, income, or
  transfers; they belong to slices 2–8.
