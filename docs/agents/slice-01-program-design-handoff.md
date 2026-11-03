# Handoff — Slice 01 Program Design

## Gate
Slice Program Design (workflow step 5) — complete.

## Artifact
`docs/program-design/slices/slice-01-spec.md`

## Decisions recorded
- **No endpoints.** The `Ledger` operations are the whole API; static PWA,
  IndexedDB only.
- **Module map and dependency direction** fixed: UI → `data/ledger` →
  `data/db`/`domain`; no UI Dexie imports; no repository interface.
- **Money grammar** fixed: one `.` or `,` decimal separator, at most
  `currencyExponent` fraction digits, no signs/grouping, zero parses but
  `addExpense` rejects it. `formatAmount` uses `Intl` with explicit
  min/max fraction digits.
- **Calendar** fixed: local dates, Gregorian validation without `Date.parse`,
  month bounds `0001-01`..`9999-12`, `addMonths` throws outside, month labels
  via local noon + `setFullYear` + `Intl`. Added `isValidMonthKey`.
- **Storage** fixed: Dexie v1 tables/indexes exactly as architecture; starter
  categories seeded idempotently; existing/archived rows never overwritten.
- **Ledger** fixed: validation order amount → date → account → category;
  `addExpense` transaction spans accounts/categories/entries/settings;
  `lastAccountId` updated only there; `monthSummary` expense-only, no account
  filter, rows sorted amount desc/name asc/id asc, missing categories labelled
  `Uncategorized`.
- **Routing** fixed: `#/`, `#/?m=YYYY-MM`, `#/add`, `#/accounts`; malformed
  month/unknown route falls back to home/current without URL rewrite; first-run
  gate uses `location.replace`; after save goes to the entry's month.
- **UI state** fixed: add form mounts only after accounts/categories/settings
  resolve, initializes via `useState`, preselects `lastAccountId` or the first
  account, defaults date to today, no category default; `submitting` guard;
  per-surface error copy.
- **PWA** fixed: `autoUpdate`, precached shell, no runtime caching, 192/512/
  maskable 512/apple-touch 180 icons, `navigator.storage.persist()` requested
  and result ignored.
- **Testing** fixed: domain unit, `createLedger` integration on
  `fake-indexeddb`, UI through `App` with a real ledger; no mocks of ledger or
  Dexie; unique DB per test.

## Prototype
Throwaway logic prototype at `/tmp/slice-01-prototype.ts` (Bun, not committed).
It exercised 31 checks: zero-account gate, add-form defaults, zero-amount
rejection, backdated save/month handoff, double-submit guard, year-boundary
month stepping, malformed route/month fallback, and the amount grammar. All
passed. No visual UI prototype was needed; visual choices are ticket-level.

## Next gate
Ticket Breakdown (`to-tickets`). Read, in order:

1. `docs/program-design/slices/slice-01-spec.md`
2. `docs/architecture/slices/slice-01-architecture.md`
3. `docs/product/slices/slice-01-scope.md`

## Repo state
- Docs-only. `src/` is still `.gitkeep`; no `package.json`, `tsconfig.json`, or
  tests.
- No code was built or run beyond the throwaway prototype.

## Open items
- `CONTEXT.md` says `Entry` has three kinds; the spec follows the north star
  and includes `opening`. Update the glossary at the next domain-modeling pass.
- North-star prose says `fromAccountId`; the spec uses `accountId` as the
  transfer source, matching the ER diagram and slice architecture.
- No runtime React error boundary in slice 1; only boot failure is handled.
- Single-tab assumption; cross-tab live-query coordination is out of scope.
- No schema migration yet; slice 3 pairs upgrades with export `schemaVersion`.
