# Handoff — Slice 05 Program Design

## Gate

Slice Program Design (workflow step 5) for slice 5 — complete.

## Artifacts

- `docs/program-design/slices/slice-05-spec.md` — new.

No other file changed. `CONTEXT.md` is unchanged; the scope handoff already
decided "the month before" is ordinary language. No ADR.

## What the spec fixed

The architecture resolved the product rules; this gate resolved the
implementation-level questions the architecture left open:

- **Exact types.** `CategorySpend` gains `previousAmountMinor`; `MonthSummary`
  gains `previousMonth` (`MonthKey | null`) and `previousMonthHasSpending`.
  `Ledger.monthSummary(month)` keeps its signature.
- **Exact read path.** One `r` transaction over `entries` and `categories`;
  two `date` prefix reads; `expenseTotals` grouping; union; `bulkGet` names;
  zero-fill; comparator; `totalMinor` summed from the finished rows. The
  `MIN_MONTH` guard runs before `addMonths`.
- **Exact ordering.** Current rows by amount desc/name/id; previous-only rows
  after, by previous amount desc/name/id. The comparator is in the spec.
- **Exact state model.** `homeBreakdown(summary)` returns `empty`,
  `current-only` (with an optional note), or `comparison` (carrying a non-null
  `previousMonth`). Precedence is normative: empty wins, then `MIN_MONTH`,
  then previous-empty, then comparison.
- **Exact presentation.** Header markup (plain `div`, empty first cell, two
  month labels), the note's copy and placement above the list, native
  `disabled` previous-only rows with no `onClick`, and the exact per-row
  `aria-label` template.
- **Exact CSS contract.** Fixed shared amount columns (`5.75rem`), nowrap
  header labels, tabular numerals, name wrapping, and the dark-mode override
  placement.
- **Corrupt-data edge.** A missing category id keeps its id and is a distinct
  row from the sentinel; both are labelled `Uncategorized`. This preserves
  today's behaviour and is unreachable through product paths.
- **Test surface.** Ledger cases, UI cases, and the exact existing assertions
  that must be updated (every exact `MonthSummary` `toEqual` in
  `src/data/ledger.test.ts`). No test is deleted; `HomeScreen.test.tsx`
  existing tests survive because their fixtures hit the previous-empty state.

## Prototype results

Two throwaway prototypes were run and removed; the spec records what they
settled (§9).

- **Read model:** ten vitest cases against pure grouping/ordering/state
  functions plus a real Dexie `r` transaction on `fake-indexeddb`. Confirmed
  the union/zero-fill/order/flags, the `MIN_MONTH` guard, two prefix reads and
  `bulkGet` in one transaction, and the missing-id-vs-sentinel split.
- **UI:** three structural variants at 360px and 320px. Rejected stacked
  labels and cards; per-row `max-content` columns misaligned, so the spec locks
  fixed shared columns. Confirmed disabled buttons stay in the accessibility
  tree with their full label and `[disabled]`, and that the previous-empty
  note reads better above the list.

No prototype code remains in the workspace.

## Next gate

Ticket Breakdown (`to-tickets`). Read, in order:

1. `docs/program-design/slices/slice-05-spec.md`
2. `docs/architecture/slices/slice-05-architecture.md`
3. `docs/product/slices/slice-05-scope.md`
4. `docs/architecture/north-star.md`

Cut tickets along the seam, not the file list:

1. Ledger read model: types, helpers, `monthSummary` comparison, and the
   ledger tests.
2. Home comparison presentation: state helper, header, note, rows,
   tappability, accessible names, CSS, and the UI tests.
3. Intentional updates to existing `monthSummary` `toEqual` assertions (can
   ride with ticket 1).
4. Manual/offline/backup verification.

Do not create a ticket for a new route, screen, table, index, schema version,
backup version, or write path; the spec forbids all of them.

## Suggested skills

- `to-tickets` for the breakdown.
- `tdd` + `implement` for the build.
- `code-review` against `docs/standards.md` and the spec's invariants.

## Repo state

- Docs-only gate. No `src/` changes, no tests run, no build.
- Slices 3 and 4 are built on branches but not merged or deployed; the
  deployed site is slice 2. Slice 5 must branch from `master` after those
  merges.

## Open items for the build

- Add the comparison fields to every exact `MonthSummary` assertion in
  `src/data/ledger.test.ts`; do not change the existing amounts or orders.
- Keep `HomeScreen.test.tsx`'s existing tests; add the four state tests, the
  disabled-row test, the year-boundary test, and the accessible-name test.
- Verify the real screen at 360px and one desktop width; the comparison must
  not scroll horizontally.
- Do not add percentage change, deltas, arrows, charts, a previous-month
  total, an arbitrary comparison month, comparison on other screens, or any
  stored aggregate.
