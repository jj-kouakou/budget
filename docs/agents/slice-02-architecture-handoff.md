# Handoff — Slice 02 Architecture

## Gate
Slice Architecture (workflow step 4) for slice 2 — complete.

## Artifacts
- `docs/architecture/slices/slice-02-architecture.md` — new.
- `CONTEXT.md` — `Entry` corrected from three kinds to four (opening was
  missing); `Correction` and `Removal` added to the glossary.

## Decisions recorded
- **No schema change.** `SCHEMA_VERSION` stays `1`; no table, key, index, or
  migration. The category list uses the existing `entries.date` prefix and
  filters `kind`/`categoryId` in memory.
- **No endpoints.** `Ledger` remains the whole application API.
- **Two read models:** `categoryEntries(month, categoryId)` returns the
  category's month rows newest first plus a total that must equal the home
  row; `getEntry(id)` returns `Entry | null`.
- **Two lifecycle mutations:** `updateExpense(id, input)` and
  `deleteExpense(id)`. `addExpense` remains the only entry **creation** path;
  all three share one private `requireExpenseFields` validation rule set.
- **Correction is in place:** the four editable fields are overwritten;
  `id` and `kind` never change; no history row. **Removal is a hard delete**
  returning the removed snapshot. Both are settled by the slice scope.
- **Routes:** `#/category?m=YYYY-MM&c=<categoryId>` and `#/entry/<entryId>`.
  The editor carries only the entry id; the stored entry supplies its origin.
  Save lands in the returned entry's category/month; removal lands in the
  remaining category list or that month's home when empty.
- **Confirmation stays in the editor** as an inline panel; no route or modal
  dependency.
- `updateExpense`/`deleteExpense` do **not** touch `settings.lastAccountId`.
- `UNCATEGORIZED_CATEGORY_ID` is exported and reused by `monthSummary`; the
  uncategorized row is reachable and its total invariant holds.
- `domain/money` gains `formatAmountInput(amountMinor, exponent)` to prefill
  the editor's amount field.
- Same-day order is `date` desc then `id` desc; `createdAt` is deferred.

## Flags raised
None. No new north-star-level decision. The only hard-to-reverse choices —
in-place correction and final removal — were already fixed by
`docs/product/slices/slice-02-scope.md`, so they are recorded, not re-decided.

## Next gate
Slice Program Design (`to-spec`), then ticket breakdown. Read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-02-architecture.md`
3. `docs/product/slices/slice-02-scope.md`

## Suggested skills
- `to-spec` for the program design doc.
- `domain-modeling` only if a term shifts; `codebase-design` for the editor
  form state and list/editor seams.
- `prototype` only if the editor's seed-once form state or the post-delete
  destination needs a sanity check.

## Repo state
- Docs-only gate. No `src/` changes, no tests run, no build.
- Slice 1 remains built and deployed; `SCHEMA_VERSION` is still `1`.

## Open items
- None blocking.
- The slice spec must decide the editor's exact field layout and the
  confirmation panel's copy; architecture fixes only the seams and
  destinations.
- Do not add an all-entries feed, search, bulk actions, undo/history, custom
  categories, backup, balances, income, or transfers.
