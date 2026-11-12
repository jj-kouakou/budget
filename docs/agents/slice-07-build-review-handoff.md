# Handoff — Slice 07 Build and Review

## Gate

Combined Build + Review (workflow steps 7–8). Slice 7 — Record income.
Close-out (step 9) follows in the same session and is recorded in
`docs/agents/slice-07-closeout-handoff.md`.

## Branch and commits

`slice-07` was cut from `master` after the gate docs were committed.

| Commit | Contents |
|---|---|
| `5849256` | `docs: slice 07 scope, architecture, spec, and tickets` |
| `3c12ea3` | tickets 1–4: income ledger, shared categorized-entry form, income routes |
| `123aaa3` | tickets 5–8: income list, add screen, editor, invariants and manual acceptance |
| close-out commit | docs reconciliation and this report |

Build order followed the dependency frontier: 1 → 2, 3, 4, 5, 6, 7, 8.
Every ticket was implemented test-first and committed only after the full
suite and typecheck were green.

## Baseline

- `npm test`: **534 passed**, 19 files.
- `npm run typecheck`: clean.
- `npm run build`: clean.

## Ticket results

### Ticket 1 — income ledger record and list (`3c12ea3`)

- Renamed `ExpenseInput` to `CategorizedEntryInput` with no alias and
  `requireExpenseFields` to `requireCategorizedEntryFields`; the five checks
  and their order are unchanged.
- Added `IncomeListItem`, private `entriesOfKindNewestFirst`, `listIncome`,
  and `addIncome`. `listTransfers` was refactored onto the shared ordering
  helper with no observable change.
- 19 ledger tests cover row shape, account types, amount/date/reference
  validation, precedence, settings non-write, kind filtering, date/id
  ordering, joins, missing references, renames, archived labels, empty lists,
  cross-month inclusion, and the absence of `categoryId` in the result.

### Ticket 2 — income ledger correct and remove (`3c12ea3`)

- Added `updateIncome` and `deleteIncome`. Update reads and kind-checks before
  validation, allows the stored archived category, writes only the four
  editable fields, preserves a stray `toAccountId`, and maps `0` updated to
  `unknown-entry`.
- 8 correction/removal tests cover the single-row update, missing and
  non-income ids, validation parity, archived-category keep/switch, stray
  `toAccountId`, date reordering, settings non-write, snapshot removal, and
  delete guards.

### Ticket 3 — shared categorized-entry form extraction (`3c12ea3`)

- Moved `ChoiceGroup` to `src/app/choiceGroup.tsx`.
- Renamed `expenseForm.tsx` to `categorizedEntryForm.tsx` and its three
  exports to the kind-neutral names; extended `idPrefix` with `'income'`.
- Updated both expense screens and the transfer form to the new imports.
- No new assertions; the existing 77 expense/transfer screen tests stayed
  green, and typecheck proves the cutover.

### Ticket 4 — income route contract (`3c12ea3`)

- Added `income`, `add-income`, and `income-entry` to `Route`, the two exact
  path checks before the id branch, the `/income/` fallback branch, and the
  three `routeToHash` cases.
- 12 new parse/hash/round-trip cases cover query strings, trailing and raw
  slashes, encoded slash, decode failure, and `new` never parsed as an id.

### Ticket 5 — income list and home entry point (`123aaa3`)

- Added `IncomeScreen` with loading → empty → list precedence, exact copy,
  ledger-order rows, the exact accessible-name template, missing-reference
  degradation, Back, and both add actions.
- Added the first home action, `Income`, present in every home state, and the
  `income` App case.
- Added scoped `.income-list` styles with dark-mode overrides.
- 10 screen tests, one HomeScreen action test, and one App route test.

### Ticket 6 — add income screen (`123aaa3`)

- Added `AddIncomeScreen` with the no-active-category gate, exact defaults,
  archived-category exclusion, local validation, double-submit guard, ledger
  code mapping, Save/Cancel navigation, and the `add-income` App case.
- 17 screen tests plus one App route test.

### Ticket 7 — correct and remove income (`123aaa3`)

- Added `IncomeEditorScreen` with loading, not-found for missing and
  non-income ids, keyed seeding, missing-reference errors, archived stored
  category option, correction, stored-value removal confirmation, focus to
  Cancel, and both double-action guards.
- 15 screen tests plus three App tests, including the zero-account gate for
  all three income routes and the last-income removal returning to the empty
  list.

### Ticket 8 — spending, backup, and manual acceptance (`123aaa3`)

- Added ledger invariants for current/previous/earlier months, shared
  categories, correction/removal snapshots, and backup round-trips with
  missing references and a stray `toAccountId`.
- Added the HomeScreen invariant: income never enters the total, breakdown, or
  comparison.
- No production defect was exposed; no production file changed in this ticket.

## Review

Fresh `reviewer` and `security-reviewer` subagents reviewed
`git diff master...HEAD` independently, without the build transcript.
Per-call model override is disabled in this environment (`task.perCallModel:
off`), so each agent ran on its configured profile rather than a
session-selected model.

- **Quality and spec conformance:** zero findings. The reviewer checked the
  ledger contract, transaction tables, validation precedence, router
  fallbacks, form cutover, all three screens, exact copy, accessible names,
  focus, and guard behavior.
- **Security:** zero findings. The security reviewer checked React rendering
  of untrusted backup strings, the `Ledger` seam, settings mutation,
  validation bypass, cross-kind corruption, route ids, schema/backup
  compatibility, and fail-open behavior. It noted only a pre-existing
  `domain/backup.ts` currency/exponent validation gap outside this slice; the
  slice is forbidden from tightening the v1 parser.

No review-fixes commit was needed.

## Verification after review

- `npm test`: **640 passed**, 22 files (106 new tests, none deleted).
- `npm run typecheck`: clean.
- `npm run build`: clean; PWA precache 12 entries.
- Browser, production build via `vite preview`, managed Chromium:
  - Recorded `CA$2,400.00` on Checking under Other; one row appeared with
    accessible name
    `Income: Other, CA$2,400.00, Checking · Checking, 2026-11-12`; home stayed
    `CA$0.00` with no income row.
  - Corrected the amount to `CA$2,500.00`; one row remained and the list
    updated.
  - Archived Other; the list kept the label and the editor offered
    `Other (archived)` selected, while active categories remained available.
  - Removal panel read
    `Remove CA$2,500.00 on 2026-11-12 for Other in Checking · Checking? This
    cannot be undone.`; focus was on Cancel; Remove deleted the row and the
    list returned to `No income yet.`.
  - 320px: `scrollWidth === clientWidth` on the list and add form (320px
    viewport). The accessibility tree announced the row's four facts.
  - Offline: saved `CA$100.00` under Bills with `navigator.onLine === false`;
    the list updated through IndexedDB.

## Not verified

- Physical phone install, real service-worker offline reload, and a real
  screen reader. The manual pass used a managed Chromium profile whose old
  service worker was unregistered before the new bundle loaded; offline was
  exercised in an already-loaded page.
- Backup restore through the browser UI. The ledger round-trip tests cover
  serialize → parse → restore and the missing-reference cases.
- Deployment. This gate did not merge to `master`, push, or deploy.

## Spec and architecture drift

None found. `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`; no table,
index, backup field, settings write, existing route, or spending read changed.

## Next

Step 9 — slice close-out: reconcile acceptance boxes, update the plan docs and
backlog, and write `docs/agents/slice-07-closeout-handoff.md`.
