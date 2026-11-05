# Handoff — Slice 02 Program Design

## Gate
Slice Program Design (workflow step 5) for slice 2 — complete.

## Artifact
`docs/program-design/slices/slice-02-spec.md`

## Decisions recorded
- **No endpoints, no schema change.** `Ledger` remains the whole API;
  `SCHEMA_VERSION` stays `1`, with no table, index, migration, `updatedAt`, or
  tombstone.
- **Types fixed.** `AddExpenseInput` is renamed to `ExpenseInput` with no
  alias. New `EntryListItem` and `CategoryEntries`; exported
  `UNCATEGORIZED_CATEGORY_ID` and `UNCATEGORIZED_LABEL`. `Entry` is unchanged.
- **Read models fixed.** `categoryEntries(month, categoryId)` uses the `date`
  prefix, filters `kind === 'expense'` and the sentinel-aware category in
  memory, resolves accounts with one `bulkGet`, sorts date desc then id desc,
  and derives `totalMinor` from the rows. `getEntry` is a primary-key read that
  **must normalize `undefined` to `null`**; otherwise a stale id renders
  `Loading…` forever under `useLiveQuery`.
- **Writes fixed.** `requireExpenseFields` is the single private rule set
  (amount → date → account → category), called inside both write transactions.
  `updateExpense` reads the row, rejects non-expenses, validates, overwrites
  the four fields, preserves `id`/`kind`, and returns the merged row.
  `deleteExpense` hard-deletes and returns the snapshot. Neither touches
  `settings.lastAccountId`.
- **Routes fixed.** `#/category?m=YYYY-MM&c=<id>` and `#/entry/<id>`; parsing,
  encoding, fallbacks, and history mode are specified per case. The editor
  carries only the id; the stored row supplies its origin.
- **Navigation fixed.** Save and remove use `replace` and land on the returned
  entry's category/month, or that month's home when the category list is
  empty. Editor Back pushes to the entry's stored category/month. Stale ids
  show not-found; no silent redirect.
- **UI fixed.** Category rows become buttons. The list shows amount, date, and
  account with deterministic `aria-label`s; duplicate account names get a type
  suffix only when 2+ distinct account ids share the name. The editor seeds
  its form once in a component keyed by `entry.id`; live updates do not
  clobber typed text. Removal is an inline labelled confirmation naming the
  stored amount, date, and account, with focus on Cancel. Exact headings,
  button labels, error copy, and the `formatAmountInput` contract are in the
  spec.
- **Testing fixed.** The three slice-1 seams, no new seam; real
  `BudgetDatabase` on `fake-indexeddb`; raw `db.entries.add` fixtures for
  non-expense and orphan rows; assert `LedgerError.code`; no mocks, sleeps, or
  fake timers.

## Prototype
Throwaway Vitest file `src/prototype/slice02.prototype.test.tsx`, deleted after
the spec was written. Six checks across three areas:

1. `formatAmountInput` round-trip through the real `parseAmount` at exponents
   0/2/6, including zero, trailing zeros, large safe integers, and the
   `RangeError` path.
2. Seed-once editor form under `useLiveQuery`: typed text survived a direct
   IndexedDB update, the form reseeded on an id change, and a missing id showed
   not-found.
3. Post-delete category-month read returned empty.

All passed after the prototype exposed the `undefined` vs `null` ambiguity in
`getEntry`; that finding is now a hard contract in §9.6 and a ledger test in
§13.4. No visual UI prototype was built; copy and structure are settled in the
spec.

## Flags raised
None blocking. Two documented risks: same-day order is `id` desc (arbitrary
but deterministic) and a cross-tab change can leave a stale form seed, which
the next write rejects with a visible error rather than overwriting.

## Next gate
Ticket Breakdown (`to-tickets`). Read, in order:

1. `docs/program-design/slices/slice-02-spec.md`
2. `docs/architecture/slices/slice-02-architecture.md`
3. `docs/product/slices/slice-02-scope.md`

## Repo state
- Docs-only gate. No `src/` changes; the throwaway prototype was removed.
- Slice 1 remains built and deployed; `SCHEMA_VERSION` is still `1`.
- `npm test` after removing the prototype: 9 files, 153 tests passed. Nothing
  they cover changed.

## Open items
- None blocking.
- Ticket breakdown should cite the spec section each ticket implements.
- Do not add an all-entries feed, search, bulk actions, undo/history, custom
  categories, backup, balances, income, or transfers.
