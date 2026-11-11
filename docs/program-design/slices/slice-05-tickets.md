# Slice 05 Tickets — Compare with last month

- **Gate:** Ticket Breakdown (workflow step 6).
- **Sources:** `docs/program-design/slices/slice-05-spec.md` (cited as
  "Spec §…"), `docs/architecture/slices/slice-05-architecture.md`,
  `docs/product/slices/slice-05-scope.md`, ADRs 0001/0005, `CONTEXT.md`.
- **Branch:** `slice-05`, cut at `faf2a97` after slices 3 and 4 merged into
  `master`. Deploying slices 3 and 4 did **not** happen first; the merge half
  of boundary decision 6 was done and the deploy half is still open.
- **Status:** completed 2026-11-10. Boundary decisions 1 and 6 were confirmed
  by the user before the build; the rest are recorded so the build does not
  re-litigate them. Tickets 1–3 are implemented, tested, and reviewed.

Each ticket is one build session, test-first, and one commit when its tests
pass. Every ticket leaves the suite green and the home screen correct for the
states it has shipped.

---

## Ticket order at a glance

| # | Ticket | Blocked by |
|---|---|---|
| 1 | Comparison read model in `monthSummary` | — |
| 2 | Home comparison: header, two columns, previous-only rows | 1 |
| 3 | Previous-month-empty note and `MIN_MONTH` current-only | 2 |

**Frontier:** ticket 1 alone, then 2, then 3. The chain is linear.

**Critical path:** 1 → 2 → 3.

**Why this order.** The UI cannot render a previous amount until the read
model returns one, so the data contract is first. The comparison render is
second because it is the slice's headline behavior and the largest diff. The
previous-empty note is third because it is a second presentation state over
the same derivation, and it is the only state whose copy is not exercised by
the comparison tests. The spec's own test list puts the note cases (4, 7)
before the comparison cases (1–3); this order deliberately follows the
dependency, not the test numbering.

---

## Standing rules for every ticket

- Failing test first, then the minimum implementation, same session. A ticket
  that changes a runnable surface is not done on tests alone — run it.
- Cross the existing seams only: `createLedger(db).monthSummary` for data,
  `HomeScreen` with a real ledger for presentation. No new exported helper, no
  test-only seam, no mocked ledger.
- A real `BudgetDatabase(\`budget-test-${crypto.randomUUID()}\`)` per test,
  deleted in `afterEach`; `fake-indexeddb` is the only boundary.
- Build expected month labels with `formatMonth(...)` and expected money
  strings with `formatAmount(...)`. Never hardcode a currency symbol or a
  locale month name.
- Fixed dates: `2026-10`, `2026-11`, `2027-01`. UI tests use RTL, `waitFor`
  for live-query updates, no sleeps, no fake timers.
- No schema, index, backup-version, route, settings, or write-path change.
  `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` stay `1`.
- Module direction holds: no UI import of `data/db` or `dexie`; the UI never
  sorts, merges, or filters `summary.rows`.
- The UI never calls `addMonths` to derive the previous month and never sums
  `previousAmountMinor` into the total.
- If the build contradicts the spec, fix the spec in the same commit. Do not
  diverge silently.

---

## Boundary decisions

1. **Decided — three tickets, not two.** Ticket 3 is the previous-empty note
   and the `MIN_MONTH` no-note state; it is the thinnest ticket here. The
   alternative was to merge 3 into 2 and build the whole presentation in one
   session. Kept separate: ticket 2 already carries the derivation, the
   comparison markup, the CSS, and ten UI tests, and the note has its own copy
   and its own state. If ticket 2 runs short, merge 3 into it; no other ticket
   changes.
2. **Decided — ticket 1 is a data-layer slice, not a UI tracer bullet.** The
   to-tickets default is a vertical slice through every layer, but this slice
   has two layers and the data contract is atomic: the UI cannot show a
   previous amount before the ledger returns one. A true vertical first ticket
   would be the whole slice. Slices 2–4 already shipped ledger-first tickets
   verified at the `Ledger` seam; ticket 1 follows that precedent and is
   demoable through `monthSummary` results.
3. **Decided — the note ships after the comparison.** Ticket 2 leaves the
   previous-empty state rendering today's single column with no note. That is
   the pre-slice behavior, not a regression, and the state is correct; ticket
   3 adds the explanation. The alternative — note first, comparison second —
   would ship the note while the comparison does not exist, which is less
   coherent.
4. **Decided — existing-test migration belongs to ticket 1.** Spec §8.5
   requires every exact `MonthSummary` assertion to gain the new fields. That
   edit cannot be deferred without leaving the suite red, so it is part of the
   ticket that changes the contract. No assertion about amounts or order
   changes.
5. **Decided — live-write, rename, archive, and `categoryEntries` consistency
   are acceptance criteria, not tickets.** They exercise existing write paths
   and need no production code. A ticket whose only deliverable is a test is
   padding; they are folded into tickets 1 and 2.
6. **Decided — wait for slices 3 and 4, then cut from `master`.** The working
   tree is on `slice-04`, which is complete but not merged, and the slice-05
   docs are untracked on it. Cut `slice-05` from `master` only after slices 3
   and 4 merge and deploy, as the spec header requires. Do not start ticket 1
   on the current branch. **Build deviation, recorded:** `master` already held
   slice 3 but not slice 4, so the slice-05 docs were committed on `slice-04`,
   `slice-04` was merged into `master` with `--no-ff` (`faf2a97`), and
   `slice-05` was cut from that merge. Deployment was not performed; slices
   3 and 4 are merged locally, slice 5 is not yet merged, and the deployed
   site is still slice 2.
7. **Decided — no backup, offline, or glossary ticket.** The comparison is
   never serialized and `CONTEXT.md` gains no term (Spec §11). Backup/restore
   and offline are manual acceptance checks in ticket 3 and the slice
   close-out, not code.
8. **Decided — no ADR.** Spec §11: the slice adds no expensive-to-change
   contract, no storage, and no module boundary.

---

## Existing tests that must change, and where

| Existing test / assertion | File | Ticket | Becomes |
|---|---|---|---|
| Every exact `toEqual` on a `MonthSummary` | `src/data/ledger.test.ts` | 1 | gains `previousMonth`, `previousMonthHasSpending`, and `previousAmountMinor` per row |
| The October→November move test | `src/data/ledger.test.ts` | 1 | also asserts the previous amount, because October is populated |
| Home screen single-amount rows | `src/app/screens/HomeScreen.test.tsx` | none | still valid: their fixtures seed only the current month, so they render the previous-empty state |
| `CategoriesScreen` total assertion | `src/app/screens/CategoriesScreen.test.tsx` | none | unchanged; it reads only `totalMinor` |
| App total assertions | `src/app/App.test.tsx` | none | unchanged |

No test is deleted. No new test file is created.

---

## Test coverage map

| Spec test case | Ticket |
|---|---|
| §8.3 ledger 1–15 | 1 |
| §8.4 UI 1, 2, 3, 5, 6, 8, 9, 10, 11, 12 | 2 |
| §8.4 UI 4, 7 | 3 |
| §8.6 manual verification | 3, then slice close-out |

---

## 1. Comparison read model in `monthSummary`

**Goal:** `monthSummary(month)` also describes the calendar month immediately
before it, so a caller can render both columns from one read. The home screen
does not change in this ticket.

**Blocked by:** none — can start immediately.

**Spec:** §5.1–5.7 (types, algorithm, helpers, field semantics, ordering,
edge cases, bounds), §7 (invariants), §8.1–8.3, §8.5.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- `CategorySpend` gains required `previousAmountMinor: number`.
  `MonthSummary` gains `previousMonth: MonthKey | null` and
  `previousMonthHasSpending: boolean`. The `Ledger` interface and
  `monthSummary` signature do not change.
- Extract two module-level, unexported helpers beside
  `UNCATEGORIZED_CATEGORY_ID`: `expenseTotals(entries)` and
  `compareSummaryRows(left, right)` (Spec §5.3). The current inline grouping
  and comparator are replaced by them; do not duplicate the logic.
- Rewrite `monthSummary` as Spec §5.2:
  - validate before opening the transaction (`RangeError('Invalid month key')`,
    unchanged);
  - one `db.transaction('r', db.entries, db.categories, …)`;
  - derive `previousMonth` before either read, `null` exactly at `MIN_MONTH`;
    never call `addMonths` at that bound;
  - two `where('date').startsWith(...)` reads; skip the second when
    `previousMonth` is `null`;
  - union the two totals maps, `bulkGet` current names for every non-sentinel
    id in the union, zero-fill both amounts;
  - sort with `compareSummaryRows`;
  - `totalMinor` from `rows[].amountMinor` after zero-fill.
- No schema, index, backup, or write-path edit.

**Tests** — add a comparison group inside the existing
`describe('monthSummary')`, using its `setup()` and fixed dates:

1. Both months populated: one row per category, both amounts,
   `previousMonth` set, `previousMonthHasSpending: true`, `totalMinor` equals
   current amounts only.
2. Current month only: every `previousAmountMinor` is `0`,
   `previousMonthHasSpending: false`.
3. Previous month only: rows with `amountMinor: 0`, `totalMinor: 0`,
   `previousMonthHasSpending: true`.
4. Neither month: `rows: []`, `totalMinor: 0`,
   `previousMonthHasSpending: false`, non-null `previousMonth`.
5. Ordering: current rows by amount desc, then name, then id; previous-only
   rows after every current row, by previous amount desc, then name, then id.
   Use two equal current amounts and two equal previous amounts so both
   tie-breaks run.
6. January compares with the previous December.
7. `MIN_MONTH` → `previousMonth: null`, flag false, no throw; `MAX_MONTH` →
   non-null predecessor.
8. `totalMinor` equals the sum of row `amountMinor`; a previous-only row does
   not change it.
9. Income, transfer, and opening entries are ignored in both months; a
   previous month containing only income sets the flag false.
10. A missing category id keeps its id and is labelled `Uncategorized`; an
    entry with no `categoryId` lands on the sentinel; the two are distinct
    rows.
11. Rename shows the new name in both columns with unchanged amounts; an
    archived category with spending still appears in both.
12. `updateExpense` across the month boundary changes both summaries; changing
    the category moves the amount; `deleteExpense` removes it from both
    columns.
13. `categoryEntries(month, id).totalMinor` equals the matching row's
    `amountMinor`; a previous-only category returns 0 rows and 0 total.
14. A malformed month still throws `RangeError`.
15. `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`.

Update the existing exact assertions per the table above.

**Acceptance criteria**

- [x] `monthSummary` returns the three new fields and every row carries
      `previousAmountMinor`.
- [x] Both month reads and the name join happen in one `'r'` transaction over
      `entries` and `categories`; `bulkGet` is inside it.
- [x] `previousMonth` is the calendar month immediately before, or `null`
      exactly at `MIN_MONTH`; January and `MAX_MONTH` are covered.
- [x] Rows are the union of expense categories in both months, zero-filled on
      the missing side; no zero/zero row exists for reachable data.
- [x] Current-month ordering is byte-for-byte the pre-slice order; previous
      amounts never reorder two current rows.
- [x] `totalMinor` is the sum of current amounts only.
- [x] `previousMonthHasSpending` is true iff the previous month has at least
      one expense; false at `MIN_MONTH` and for income-only previous months.
- [x] Renames, archives, corrections, and removals are reflected without any
      write-path change.
- [x] Existing assertions change only to include the new fields.
- [x] `npm test` and `npm run typecheck` pass; the home screen is unchanged.

---

## 2. Home comparison: header, two columns, previous-only rows

**Goal:** when the previous month has spending, the home breakdown shows each
category's amount for the month on screen beside its amount for the month
before, under a header naming both months. A category with no current spending
shows `0` for the current month, sits after every current row, and is not
tappable.

**Blocked by:** 1.

**Spec:** §6.1 (derivation), §6.2 (comparison markup), §6.3 (copy), §6.4
(layout and CSS), §6.5 (tappability), §6.6 (accessibility), §6.7 (UI
prohibitions), §8.4 cases 1–3, 5, 6, 8–12.

**Files:** `src/app/screens/HomeScreen.tsx`,
`src/app/screens/HomeScreen.test.tsx`, `src/styles.css`.

**Build**

- Add module-local `homeBreakdown(summary)` with the normative order:
  empty → `current-only` → `comparison`. In this ticket `current-only` always
  carries `note: null`; the note is ticket 3. The comparison variant carries
  the narrowed non-null `previousMonth`, so the render needs no assertion.
- Render the comparison subtree when `breakdown.kind === 'comparison'`:
  - a plain `div.comparison-header` with an empty first cell,
    `formatMonth(month)`, and `formatMonth(breakdown.previousMonth)`;
  - one `li` per row, in ledger order, with name, formatted current amount,
    formatted previous amount;
  - `disabled={row.amountMinor === 0}`, no `onClick` when disabled, native
    `disabled` only (no `aria-disabled`, no no-op handler);
  - accessible name exactly
    `{name}, {formatMonth(month)}: {current}, {formatMonth(previousMonth)}: {previous}`
    for enabled and disabled rows;
  - the existing `Add expense` action row.
- Keep the empty state and today's single-column markup for `current-only`.
  Do not add the note here.
- CSS per Spec §6.4: `.home-comparison` fixed `--amount-column: 5.75rem`,
  shared three-column grid on the header and each row button,
  `white-space: nowrap` on amounts and header, tabular numerals, name wrapping.
  Put the dark-scheme override after the existing base rules; the existing
  dark block appears earlier in the file and would lose on source order.
- Do not call `addMonths`, sort or merge rows, sum the previous column, infer
  the empty previous month from amounts, filter rows, or read Dexie.

**Tests**

1. Comparison header contains both `formatMonth` labels; a category with both
   amounts shows both; a current-only category shows the formatted zero on the
   previous side; a previous-only category shows the formatted zero on the
   current side plus its previous amount.
2. A previous-only row renders after every current row, is `toBeDisabled()`,
   and a `fireEvent.click` leaves `window.location.hash` unchanged.
3. An enabled row navigates to `#/category?m=2026-11&c=cat_groceries`.
5. Current month empty, previous populated: total is the formatted zero, the
   header and both columns render, every row is disabled, `Add expense` is
   present, and the empty state is absent.
6. Neither month populated: the existing empty state and `Add your first
   expense` render; no comparison UI.
8. Home at `2027-01` shows the December 2026 previous amounts.
9. Accessible names contain both month labels and both formatted amounts for
   an enabled row and for a disabled previous-only row.
10. After `renameCategory`, both columns show the new name; after
    `setCategoryArchived`, a spending category remains.
11. After `updateExpense` moves an entry across the boundary, both columns
    update through `waitFor`; after `deleteExpense`, the row disappears.
12. Moving to the previous month moves the comparison with it.

**Acceptance criteria**

- [x] With previous-month spending, the header names both months and every row
      shows both amounts; the missing side reads as a formatted zero.
- [x] Previous-only rows follow all current rows, are disabled, stay in the
      list and accessibility tree, and cannot navigate.
- [x] Enabled rows navigate to the category entries route for the displayed
      month; no row navigates to the previous month.
- [x] The total is unchanged by the previous column and still reads as the
      month on screen.
- [x] The current-empty/previous-populated state renders the header, both
      columns, all-disabled rows, and `Add expense`, with no empty state.
- [x] The neither-month state is the unchanged empty state.
- [x] Renames, archives, corrections, and removals update both columns live.
- [x] Rows render in ledger order; the UI does not sort, merge, or filter.
- [x] Columns align across rows at 320px and 360px; no horizontal page scroll.
- [x] `npm test` and `npm run typecheck` pass.

---

## 3. Previous-month-empty note and `MIN_MONTH` current-only

**Goal:** when the previous month has no spending, the screen says so in one
plain line and keeps the current month's single amount per row. At
`MIN_MONTH`, the screen shows the current month alone with no note.

**Blocked by:** 2.

**Spec:** §6.1 (derivation order), §6.2 (current-only markup), §6.3 (copy),
§8.4 cases 4 and 7, §8.6.

**Files:** `src/app/screens/HomeScreen.tsx`,
`src/app/screens/HomeScreen.test.tsx`, `src/styles.css`.

**Build**

- Extend `homeBreakdown`: when `previousMonth !== null` and
  `previousMonthHasSpending === false`, return
  `{ kind: 'current-only', note: \`No spending recorded in ${formatMonth(previousMonth)}.\` }`.
  At `MIN_MONTH`, keep `note: null`.
- Render the note as a plain `<p className="comparison-note">` directly below
  the `Spent` line and above the list. It is not a live region.
- Keep the current-only rows exactly as today: one amount per row, enabled,
  existing `{name}, {current}` accessible name.
- Add `.comparison-note` styles and the dark-scheme color per Spec §6.4,
  after the base rules.
- The note must not render in the comparison or empty states.

**Tests**

4. Previous month empty: the note names the previous month; no
   `.comparison-header`; current rows keep their single amount.
7. `MIN_MONTH`: current rows render with the single-amount label and no note;
   no header.
- Also assert the note is absent in the comparison state and in the empty
  state.

**Acceptance criteria**

- [x] Previous-month-empty shows exactly
      `No spending recorded in {formatMonth(previousMonth)}.` including the
      final period, above the list, with no column of zeros and no header.
- [x] `MIN_MONTH` shows the current month alone with no note and no header,
      and does not throw.
- [x] The note appears in no other state.
- [x] `Add expense` remains available whenever rows exist.
- [x] Manual pass (Spec §8.6): build and preview, install, go offline; check
      both columns, the note, current-empty with `Add expense`, a previous-only
      row that does not navigate, rename, archive, a correction across the
      month boundary, and backup/restore in a fresh profile; one phone width
      and one desktop width with no horizontal scroll. **Close-out evidence:**
      production build via `vite preview`; backup downloaded through the UI
      from a populated ledger and restored into a brand-new browser profile
      (fresh `--user-data-dir`), reproducing the comparison exactly;
      `Page.getInstallabilityErrors` returned none with an active service
      worker and a valid manifest; offline reload rendered the comparison;
      column x-positions matched exactly at 320/360/390/1280 px with
      `scrollWidth === clientWidth`. Rename, archive, cross-boundary
      correction, and the previous-only non-navigation row were verified in
      the build session's browser pass. A physical phone install and
      screen-reader output were not exercised.
- [x] `npm test` and `npm run typecheck` pass.

---

## Slice close-out

- [x] All three tickets pass their tests; `npm test` (427 passed, 16 files)
      and `npm run typecheck` are green on `slice-05`.
- [x] `code-review` approved with zero findings on both axes (standards and
      spec/acceptance); no review-fixes commit was needed.
- [x] The architecture, spec, and these tickets reflect what was built; no
      production divergence was found, and both version constants remain `1`.
- [x] `AGENTS.md` needs no change: this slice added no doc path — the scope,
      architecture, spec, tickets, and handoffs all live in folders it already
      lists.
- [x] `docs/product/backlog.md` marks slice 5 complete and confirms slice 6
      (account balances) as the next slice to pull, with deployment of slices
      3–5 as the outstanding release step.
- [x] Slice handoff written to `docs/agents/slice-05-closeout-handoff.md`.
