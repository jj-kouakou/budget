# Handoff — Slice 05 Build and Review

## Gate
Combined Build + Review (workflow steps 7–8). Slice 5 — Compare with last
month. Close-out (step 9) is deliberately left for its own pass.

## Branch and commits

| Commit | Contents |
|---|---|
| `75d1b01` | `docs: slice 05 gate docs (scope, architecture, spec, tickets)` — the previously untracked slice-05 gate docs plus the backlog status edit, committed before any code |
| `faf2a97` | `merge: slice 04 — manage categories` — `--no-ff` merge of `slice-04` into `master` |
| `7462530` | `ticket 1: comparison read model in monthSummary` |
| `22e26ae` | `ticket 2: home comparison header, two columns, previous-only rows` |
| `2dfb55a` | `ticket 3: previous-month-empty note and MIN_MONTH current-only` |

`slice-05` was cut from `master` at `faf2a97`. Branch head is `2dfb55a`.

**Preflight deviation, recorded.** At the start of the session `master` did
not contain the slice-4 code (`slice-04` was 11 commits ahead and unmerged).
Tickets boundary decision 6 requires slices 3 and 4 to be merged before
cutting slice-05. `master` already contained slice 3. I committed the slice-05
gate docs on `slice-04`, merged `slice-04` into `master` with `--no-ff`, and
then cut `slice-05` from that merge. Deployment was **not** performed; the
release precondition in the tickets doc is still "merge and deploy", and only
the merge half is done.

## Baseline

- `npm test`: **400 passed**, 16 files.
- `npm run typecheck`: clean.
- `npm run build`: not run before the build; run repeatedly afterwards, clean.

## Ticket results

### Ticket 1 — comparison read model in `monthSummary`

- Added `previousAmountMinor` to `CategorySpend`; added `previousMonth` and
  `previousMonthHasSpending` to `MonthSummary`.
- Extracted module-local `expenseTotals` and `compareSummaryRows` next to the
  sentinel constants; neither is exported.
- `monthSummary` now validates before opening one `'r'` transaction over
  `entries` and `categories`, derives the predecessor before either read,
  skips the previous read at `MIN_MONTH`, unions and zero-fills both totals,
  joins names with `bulkGet`, sorts with the comparator, and sums
  `totalMinor` from the rows.
- Added 14 comparison tests covering both months, current-only, previous-only,
  neither, ordering with name and id tie-breaks in both groups, January,
  `MIN_MONTH`/`MAX_MONTH`, total invariant, non-expense kinds and an
  income-only predecessor, missing-category vs sentinel rows, rename/archive,
  corrections/removals, `categoryEntries` agreement, and both version
  constants.
- Updated every existing exact `MonthSummary` assertion to add the new fields.
  Amounts and order assertions are unchanged. No test was deleted.
- Commit `7462530`.

### Ticket 2 — home comparison

- Added module-local `homeBreakdown` with the normative order
  empty → current-only → comparison, and the comparison variant narrowing
  `previousMonth` to a non-null `MonthKey`.
- Added the `.home-comparison` subtree: plain header with both
  `formatMonth` labels, three-column rows in ledger order, formatted current
  and previous amounts, native `disabled` and no `onClick` for
  `amountMinor === 0`, exact per-row accessible names, and `Add expense`.
- Kept the existing single-column and empty-state markup.
- Added the scoped comparison CSS: fixed `5.75rem` amount columns, shared
  header/row grid, `nowrap`, tabular numerals, wrapping names, and a dark
  scheme override after the existing base rules.
- Added 10 UI tests covering the header and both amounts, previous-only row
  order/disabled/no-route, enabled navigation, current-empty/previous-
  populated, neither-month empty state, year boundary, accessible names,
  live rename/archive, live boundary correction/removal, and month
  navigation.
- Commit `22e26ae`.

### Ticket 3 — previous-empty note and `MIN_MONTH`

- `homeBreakdown` now returns
  `No spending recorded in ${formatMonth(previousMonth)}.` when the
  predecessor exists and has no spending; `MIN_MONTH` keeps `note: null`.
- Rendered the note as a plain `<p className="comparison-note">` below the
  `Spent` line and above the list.
- Added 3 tests: the exact note copy and single-amount rows, `MIN_MONTH`
  current-only with no note, and note absence in the comparison and empty
  states.
- Commit `2dfb55a`.

## Review

Fresh `reviewer` subagents on a different model from the build. Build model:
`DeepInfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`. Review model, set
session-only through `task.agentModelOverrides.reviewer`:
`deepseek-ai/DeepSeek-V4-Pro`. Neither reviewer saw this session's transcript
or conclusions.

Sources given to both: `git diff master...HEAD`, `docs/standards.md`, the
slice-05 spec, architecture, and tickets, and the slice-04 close-out handoff.

- **Axis A — standards:** every applicable section of `docs/standards.md`,
  including all `pj-*` rules and the OMP `ts-*` corpus. **Zero findings.**
- **Axis B — spec and acceptance:** every ticket acceptance criterion, every
  cited spec section, and the architecture invariants (schema/version
  unchanged, write boundaries, totals, ordering, module direction, existing
  tests unchanged). **Zero findings.**

No review-fixes commit was needed. The reviewers' only qualification was that
the manual pass in ticket 3 is a close-out item, not a code defect.

## Verification after review

- `npm test`: **427 passed**, 16 files (27 new tests, none deleted).
- `npm run typecheck`: clean.
- `npm run build`: clean; PWA precache 12 entries.
- Browser, Vite dev server, headless Chromium at 390×844:
  - November 2026 with October data: header `November 2026` / `October 2026`;
    Groceries `CA$20.00` / `CA$15.00`, Transport `CA$5.00` / `CA$0.00`,
    Health `CA$0.00` / `CA$3.00`; total `CA$25.00`; Health disabled and a
    dispatched click left the hash unchanged; Groceries navigated to
    `#/category?m=2026-11&c=cat_groceries`.
  - December 2026 (current empty, previous populated): header and both
    columns rendered, total `CA$0.00`, every row disabled, `Add expense`
    present, no empty state.
  - September 2026 (neither month): unchanged empty state and
    `Add your first expense`; no comparison UI.
  - October 2026 after correction: note `No spending recorded in September
    2026.` rendered above single-amount rows; no header.
  - `MIN_MONTH` with one expense: single-amount row, no note, no header,
    `Previous month` disabled.
  - 320/360/390 px: header and row column x-positions matched exactly at each
    width; `scrollWidth === clientWidth`, so no horizontal page scroll.
  - Live UI: renamed Groceries to Food and both columns showed Food with the
    unchanged amounts; archived Food and it stayed in the comparison; moved a
    November entry to October via the editor and both months updated; removed
    it and both months updated.
- Browser, production build via `vite preview` at 390×844:
  - Comparison header, both amounts, disabled previous-only rows, and total
    reproduced.
  - Previous-empty note reproduced on October 2026.
  - Reload with the network emulated offline rendered the comparison from the
    service worker cache and IndexedDB.
  - Column alignment and no horizontal scroll rechecked at 320/360 px.

## Not verified

- **Backup/restore in a fresh profile.** The preview backup button did not
  produce a downloadable file in the headless session, so I did not complete a
  fresh-profile restore. The ledger backup round-trip tests and the fact that
  the comparison is derived from `entries` cover the data contract, but the
  ticket-3 manual item remains open for close-out.
- Physical phone install, real offline use after install, and screen-reader
  output. Browser checks used headless Chromium, not a device or assistive
  technology.
- Deployment. `slice-04` and `slice-05` are merged into local `master` but not
  pushed or deployed; the deployed site is still slice 2.
- The `MIN_MONTH` heading renders as `January 1` through the existing
  `formatMonth`; that is pre-existing calendar formatting, not changed by this
  slice, but it is visibly ambiguous and worth a close-out note.

## Spec and architecture drift

None found. The build matched the spec and architecture; no spec correction
was needed in any ticket commit. `SCHEMA_VERSION` and
`BACKUP_SCHEMA_VERSION` remain `1`; no table, index, backup field, route,
setting, or write path changed.

## Next

Step 9 — slice close-out: reconcile the tickets' acceptance boxes, mark slice
5 done in the backlog, fold this report into the slice close-out handoff,
merge/deploy, and run the remaining manual checks above.
