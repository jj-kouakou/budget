# Handoff — Slice 08 Build and Review

## Gate

Combined Build + Review (workflow steps 7–8). Slice 8 — Record transfers.
Close-out (step 9) is deliberately left for its own pass.

## Branch and commits

`slice-08` was cut from `master` at the docs-only gate commit.

| Commit | Contents |
|---|---|
| `24fc448` | `docs: slice 08 gate docs (scope, architecture, spec, tickets)` — committed on `master` before any code, then branch cut |
| `224a19f` | `ticket 1: transfer ledger record and list` |
| `ded0cd9` | `ticket 2: transfer ledger correct and remove` |
| `add4f00` | `ticket 3: transfer route contract` |
| `748ae45` | `ticket 4: transfers list and home entry point` |
| `35251f4` | `ticket 5: add transfer screen and shared transfer fields` |
| `083eb75` | `ticket 6: correct and remove a transfer` |
| `d32cf02` | `ticket 7: transfer spending backup and manual acceptance` |
| handoff commit | this report |

Build order followed the dependency frontier: 1 → 2, 3 in parallel in
sequence, 4, 5, 6, 7. Every ticket was test-first, committed only after its
test file, the full suite, and typecheck were green.

## Baseline

- `npm test`: **427 passed**, 16 files.
- `npm run typecheck`: clean.
- Baseline was green before any code changed.

## Ticket results

### Ticket 1 — transfer ledger record and list (`224a19f`)

- Added `TransferInput`, `TransferListItem`, the two new error codes, private
  `insertEntry`, private `requireTransferFields`, `addTransfer`, and
  `listTransfers`.
- `addExpense` now calls `insertEntry`; its validation, settings write, return
  value, and transaction tables are unchanged.
- 23 tests cover the row shape, credit on either side, same-account refusal,
  amount/date validation, unknown source vs destination, normative precedence,
  no `settings.lastAccountId` write, the `insertEntry` switch, kind filtering,
  date/id ordering, both-side joins, missing-account degradation, renames,
  empty table, corrupt `toAccountId`, and cross-month inclusion.

### Ticket 2 — transfer ledger correct and remove (`ded0cd9`)

- Added `updateTransfer` and `deleteTransfer`.
- Update reads and kind-checks before validation, writes exactly the four
  editable fields, preserves a stray `categoryId`, and maps `0` updated to
  `unknown-entry`. Delete removes one row and returns the snapshot.
- 9 tests cover correction, both-sides update, unknown/non-transfer ids,
  validation parity, settings non-write, stray category preservation, date
  reordering, removal, delete guards, and unchanged spending reads.

### Ticket 3 — transfer route contract (`add4f00`)

- Added the three `Route` members, two exact path checks, the id branch with
  the exact fallbacks, and three `routeToHash` cases. `App` untouched.
- 10 new parse/hash/round-trip cases, including query strings, trailing and
  raw slashes, encoded slash, decode failure, and `new` never parsed as an id.

### Ticket 4 — transfers list and home entry point (`748ae45`)

- Added `accountWithTypeLabel` and switched `ExpenseFields` to it with
  byte-identical output.
- Added `TransfersScreen` with the normative loading → needs-accounts → empty
  → list precedence, exact copy, ledger-order rows, accessible names, and the
  Back/Add/Accounts actions.
- Added the first home action, `Transfers`, present in every home state, and
  the `transfers` App case.
- Added the scoped transfer-list CSS with dark-mode overrides.
- 12 screen tests plus one HomeScreen action test and one App route test.

### Ticket 5 — add transfer screen and shared fields (`35251f4`)

- Added `src/app/transferForm.tsx` with `TransferFieldErrors`,
  `transferFieldErrors`, and the shared `TransferFields`, reusing
  `ChoiceGroup`.
- Added `AddTransferScreen` with the two-account gate, exact defaults, the
  `keep` same-account policy, local validation, the double-submit guard, error
  mapping, and Cancel.
- Added the `add-transfer` App case.
- 15 screen tests plus one App route test.

### Ticket 6 — correct and remove a transfer (`083eb75`)

- Added `TransferEditorScreen` with loading, not-found for missing and
  non-transfer ids, keyed seeding, missing-side and restored self-transfer
  errors, shared `TransferFields`, correction, stored-value removal
  confirmation, focus to Cancel, and both double-action guards.
- Added the `transfer` App case.
- 16 screen tests plus two App route tests.

### Ticket 7 — spending, backup, and manual acceptance (`d32cf02`)

- Added ledger invariants for current/previous/earlier months, stray
  `categoryId`, correction/removal snapshots, backup round-trip, no-transfer
  v1 files, missing accounts, self-transfers, and both version constants.
- Added the HomeScreen invariant: transfer amounts and account labels never
  appear in the total, rows, or comparison.
- Added the zero-account gate for all three transfer routes.
- No production code was needed; no defect was exposed.

## Review

Fresh `reviewer` subagents on a different model from the build. Build model:
`DeepInfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`. Review model, session-only
through `task.agentModelOverrides.reviewer`: `deepseek-ai/DeepSeek-V4-Pro`.
Neither reviewer saw the build transcript or conclusions.

Sources given to both: `git diff master...HEAD`, `docs/standards.md`, the
slice-08 spec, architecture, and tickets, the slice-05 close-out handoff,
`north-star.md`, and `CONTEXT.md`.

- **Axis A — standards:** every applicable section of `docs/standards.md`,
  including all `pj-*` rules and the OMP `ts-*` corpus. **Zero findings.**
  The reviewer noted the deliberate validation/`clearError` duplication
  between the two transfer forms mirrors the existing expense-form
  convention; it is not an unintentional regression.
- **Axis B — spec and acceptance:** every ticket criterion, cited spec
  section, copy string, route fallback, invariant, and test-coverage map
  entry. **Zero findings.**

No review-fixes commit was needed. No hard violation, real bug, or missing
test was found.

## Verification after review

- `npm test`: **534 passed**, 19 files (107 new tests, none deleted).
- `npm run typecheck`: clean.
- `npm run build`: clean; PWA precache 12 entries.
- Browser, production build via `vite preview`, managed Chromium:
  - Recorded Checking → Visa for `CA$240.00`; one row in the list; row
    accessible name exactly
    `Transfer from Checking · Checking to Visa · Credit card, CA$240.00, 2026-11-11`;
    home total stayed `CA$0.00` and the transfer did not appear on home.
  - Recorded a `2025-01-15` transfer; it appeared in the list and January
    2025 spending stayed `CA$0.00` with no transfer amount.
  - Corrected amount, both accounts, and date; one row remained and the row
    moved to `2025-01-16`, `Visa · Credit card → Checking · Checking`,
    `CA$55.00`.
  - Removal panel read `Remove CA$55.00 on 2025-01-16 from Visa · Credit card
    to Checking · Checking? This cannot be undone.`; focus was on Cancel;
    Cancel kept the row; Remove deleted it; January 2025 spending stayed
    `CA$0.00`; removing the last transfer showed `No transfers yet.`
  - Cleared IndexedDB, restored a v1 backup through the UI; list and home
    reproduced the transfer exactly. Restored a fixture omitting the
    destination account; the list showed `Unknown account`, the editor showed
    the destination error with no destination selected, and Save was blocked.
  - Offline: recorded `CA$7.77`, corrected it to `CA$8.88`, and removed it;
    the list updated after each step and the remaining transfer stayed
    visible after an offline reload from the service worker cache.
  - 320px and 1280px: `scrollWidth === clientWidth` on the list, add form,
    and editor; no horizontal scroll. The 320px add form's two fieldsets
    measured 284px inside a 320px viewport.
  - `ariaSnapshot` of the list announced the row as
    `Transfer from Checking · Checking to Visa · Credit card, CA$12.34,
    2026-11-11`; the confirmation panel announced amount, date, and both
    account labels.

## Not verified

- Physical phone install and real offline use after install; real screen
  reader output. Headless Chromium covered the service-worker reload and the
  accessibility tree, not a device or assistive technology.
- A truly fresh browser profile. The manual backup/restore and offline checks
  cleared IndexedDB inside the shared managed profile instead of launching a
  separate `--user-data-dir`; the data state was empty, but the profile was
  not new.
- The real save-file picker. The manual backup capture replaced
  `showSaveFilePicker` with a fake handle that recorded the Blob text; the
  produced v1 file was then parsed and restored through the real UI.
- Deployment. This gate did not push, merge to `master`, or deploy.

## Spec and architecture drift

None found. No production divergence was found in any ticket, so no spec
correction was needed. `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain
`1`; no table, index, backup field, route on an existing screen, setting, or
spending read changed.

## Next

Step 9 — slice close-out: reconcile the tickets' acceptance boxes, correct the
north-star `fromAccountId` prose to `accountId`, mark slice 8 done in the
backlog, fold this report into `docs/agents/slice-08-closeout-handoff.md`, and
merge/deploy.
