# Handoff — Slice 05 Architecture

## Gate

Slice Architecture (workflow step 4) for slice 5 — complete.

## Artifacts

- `docs/architecture/slices/slice-05-architecture.md` — new.

No other file changed. `CONTEXT.md` is unchanged (the scope handoff already
decided "the month before" is ordinary language, not a domain term).

## Decisions recorded

- **The comparison is a read-model change only.** `monthSummary(month)` now
  returns `previousMonth`, `previousMonthHasSpending`, and a
  `previousAmountMinor` on every row. No new `Ledger` method.
- **`previousMonth` is `addMonths(month, -1)`**, and `null` only at
  `MIN_MONTH` (`0001-01`), whose predecessor is outside the representable
  range.
- **Both months are read in one Dexie `r` transaction** over `entries` and
  `categories`, so the two columns are one snapshot. Two `date` prefix
  queries; no new index, no cache, no stored aggregate.
- **Rows are the union of grouped expense totals**, zero-filled per side. A
  category with no expense in either month has no row. `totalMinor` sums the
  month-on-screen column only.
- **Ordering:** current spending first, amount desc then name asc then id
  asc (unchanged); previous-only rows after, previous amount desc then name
  asc then id asc.
- **`previousMonthHasSpending` is computed by the same expense-only grouping**
  and returned by the ledger; the UI does not infer it.
- **Home has four states:** both empty → existing empty state; `MIN_MONTH` →
  current month only; previous month has spending → two columns; previous
  month empty → current rows plus `No spending recorded in {month}.` and no
  zero column.
- **Only rows with current spending are tappable.** Previous-only rows are
  disabled buttons showing `$0.00` for the month on screen; they open
  nothing.
- **Month labels are actual month names** via `formatMonth`, in a visible
  column header and in each row's accessible name, so a screen reader
  announces which month each amount belongs to.
- **No schema change** (`SCHEMA_VERSION` stays `1`), **no backup change**
  (`BACKUP_SCHEMA_VERSION` stays `1`), **no route or screen change**, **no
  write-path change**.
- **Rename and archive carry forward from slice 4:** names are joined at read
  time in both columns; archive state never filters reads.
- **Live updates are unchanged:** existing entry and category writes
  invalidate the home live query; no manual refresh.

## Flag raised

**None.** The slice stores nothing new, so there is no durable contract to
change later. The only expensive thing this slice could have introduced is a
stored monthly aggregate or comparison cache; it deliberately does not. The
scope's "month immediately before, not previous month with data" rule is a
read-model rule and is reversible without a migration. No ADR is warranted.

## Next gate

Slice Program Design (`to-spec`), then ticket breakdown. Read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-05-architecture.md`
3. `docs/product/slices/slice-05-scope.md`
4. `docs/architecture/slices/slice-01-architecture.md` (home read model and
   screen states)
5. `CONTEXT.md`

## Suggested skills

- `to-spec` for the program design doc.
- `codebase-design` for the `MonthSummary` extension and the private
  `expenseTotals` helper.
- `domain-modeling` only if a term shifts; the current decision adds none.
- `prototype` only if the two-column row layout needs a sanity check before
  the spec fixes copy and CSS.

## Repo state

- Docs-only gate. No `src/` changes, no tests run, no build.
- Slices 3 and 4 are built on branches but not merged or deployed; the
  deployed site is slice 2. Slice 5 must branch from `master` after those
  merges.

## Open items for the spec

- Exact screen copy and layout: header markup, column widths, the
  previous-empty message's placement, and disabled-row styling.
- The spec should fix the exact `aria-label` format and whether the visible
  column header is plain text or a small grid.
- Build must intentionally update every exact `monthSummary` `toEqual`
  assertion in `src/data/ledger.test.ts` (grouping, ordering, empty month,
  missing category, non-expense, update/move, delete) to include
  `previousMonth`, `previousMonthHasSpending`, and
  `previousAmountMinor`. No test is deleted; intent is unchanged.
- `HomeScreen.test.tsx` keeps its existing assertions and gains the four
  state tests, the previous-only disabled-row test, the year-boundary test,
  and the accessible-name test.
- Do not add percentage change, deltas, arrows, charts, a previous-month
  total, an arbitrary comparison month, comparison on other screens, or any
  stored aggregate.
