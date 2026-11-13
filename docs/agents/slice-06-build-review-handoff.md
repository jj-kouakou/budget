# Handoff — Slice 06 Build and Review

## Gate

Combined Build + Review (workflow steps 7–8). Slice 6 — Track account
balances. Close-out (step 9) follows in its own pass.

## Branch and commits

`slice-06` was cut from `master` after merging the completed `slice-07`
(income), per tickets boundary decision 0. The gate docs were committed
before any code.

| Commit | Contents |
|---|---|
| `58bbae6` | `docs: slice 06 gate docs (scope, architecture, spec, tickets)` |
| `987339f` | baseline repair: pin deleted-destination transfer fixture |
| `fce8667` | ticket 1: `parseSignedAmount` domain helper |
| `8a11d0b` | ticket 2: `RowEditor` union prefactor (rename only) |
| `36344e7` | ticket 3: `listAccountBalances` read model |
| `483d0d8` | ticket 4: `addAccount` with an optional opening |
| `5162ee6` | ticket 5: `setOpeningBalance`, duplicates, invariants, backup |
| `ca5ad4e` | ticket 6: Accounts screen balance read and row display |
| `e03e01c` | ticket 7: invitation, set/edit button, inline opening form |
| `ddef098` | baseline repair: pin transfer source fixtures |
| `d7a0b05` | ticket 8: add-form starting-point field and final empty-state copy |
| `a875117` | review fixes: hoist `rowFor`, order-agnostic stale-account test |

Build order followed the dependency frontier: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.
Each ticket was implemented test-first and committed after its own test file,
full suite, and typecheck were green. Two pre-existing `AddTransferScreen`
fixtures were repaired on the branch because they fail under full-suite load;
see “Baseline” below.

## Baseline

`master` at the cut point (after slice 07) was **red under full-suite load**:
640 tests, 1 failure in `AddTransferScreen.test.tsx`, while the same test
passed in isolation.

Root cause: `AddTransferScreen` chooses the initial source/destination from
`listAccounts()` order (`createdAt`, then `id`). Three rapid `addAccount`
calls can share a millisecond `createdAt`, so the UUID tie-break can choose a
different account than the test assumed. The DOM at failure showed the
alternative account selected and a valid transfer written. This is a test
fixture assumption, not a production defect.

Repairs: `987339f`, `ddef098`, and the stale-account case in `a875117` now
select or compare the account the test intends, using the same
`listAccounts()`/`accountWithTypeLabel` source of truth. After repair the
baseline was **640 passed**, typecheck clean.

## Test count

| Point | Files | Tests |
|---|---|---|
| Baseline after fixture repair | 22 | 640 |
| After ticket 8 | 22 | 755 |
| After review fixes, run twice | 22 | 755 |

115 new tests; no test deleted. Existing assertions were changed only where
the tickets documented a migration (Accounts order test now compares
`listAccountBalances`; add-account tests leave the new optional field empty).

## Ticket results

### Ticket 1 — `parseSignedAmount` (`fce8667`)

- Added `parseSignedAmount` exactly per Spec §5.2: trim, one optional leading
  `-`, reuse `parseAmount`, reject a sign with no digit immediately after it,
  normalize `-0` to positive zero, inherit `parseAmount`'s `RangeError` for an
  invalid exponent.
- `parseAmount`, `formatAmount`, and `formatAmountInput` are unchanged.
- 44 tests cover positive/negative/zero, commas, whitespace, `-0`,
  malformed signs, unsafe magnitudes, exponent 0, and exponent errors.

### Ticket 2 — `RowEditor` union prefactor (`8a11d0b`)

- Replaced the rename booleans with one screen-level `RowEditor | null`,
  `rowError`, `rowBusy`, and `rowBusyRef`. Only the rename variant is
  reachable; the opening variant is declared for ticket 7.
- Rename Save, Enter/Escape, empty-name, stale-rename, and disabled states are
  unchanged. No copy, markup, or CSS change.

### Ticket 3 — `listAccountBalances` (`36344e7`)

- Added `AccountBalanceListItem` and the read model: one `'r'` transaction
  over `accounts` and `entries`, shared `compareAccountsByCreation`, one
  effect table, each transfer side applied independently to known accounts,
  opening sums and `hasOpeningBalance` tracked separately, `-0` normalized.
- Unknown accounts, unknown kinds, and missing destinations contribute no
  effect and create no phantom row.
- 12 tests cover order, all four effects, credit repayment, missing
  source/destination, orphan entries, zero openings, movement-only accounts,
  duplicates, future dates, rename, and `-0`.

### Ticket 4 — `addAccount` with an opening (`483d0d8`)

- `AddAccountInput.openingBalanceMinor` is ledger-signed and optional;
  `undefined` writes no entry, `0` writes an opening of zero.
- Validation order is name → type → opening. Added
  `invalid-opening-amount`; zero and negative safe integers are valid.
- Account and opening are one `'rw'` transaction. `openingDateFor` derives the
  account's creation local date with a today fallback for a non-date or
  out-of-range `createdAt`.
- No `settings`, `categoryId`, or `toAccountId` write.
- 13 tests cover omitted/positive/zero/negative openings, credit sign, `-0`,
  invalid values, precedence, identity, and settings.

### Ticket 5 — `setOpeningBalance` and invariants (`5162ee6`)

- Set creates one opening; change updates the lowest-id opening in place and
  deletes duplicates; clear deletes every opening; clear with none is a
  no-op. Validation runs before the transaction. Stray fields are preserved.
- Added spending/list invariant tests (openings never enter `monthSummary`,
  `categoryEntries`, `listIncome`, or `listTransfers`) and full backup
  round-trips: opening preserved exactly, older v1 file without openings,
  duplicate openings summed then collapsed, restore replaces, versions stay
  `1`.
- 24 tests in this ticket.

### Ticket 6 — balance display (`ca5ad4e`)

- `AccountsScreen` now reads `listAccountBalances` and `getSettings`; loading
  waits for both. `balanceText` implements the type table: checking/savings
  show the signed amount and `overdrawn`; credit shows absolute amount plus
  `owed` or `in credit`, including explicit zero owed.
- Added `.account-balance { font-variant-numeric: tabular-nums; }`.
- No invitation, starting-point affordance, combined total, home change, or
  empty-state copy change. The order test now compares
  `listAccountBalances()`.
- 4 new screen tests plus the migrated order test.

### Ticket 7 — invitation and inline form (`e03e01c`)

- Added the set/edit button with the account name, the non-blocking
  invitation, and the inline opening form: exact label/hint/copy, prefilled
  presented amount, Save/Clear/Cancel, Escape, busy guards, one-editor rule,
  shared `row-error`, and accessible names.
- Added module-local `ledgerSignedAmount`, `presentedAmount`, `openingHint`,
  and `invalid-opening-amount` copy mapping.
- Added `.account-hint`. The add form is unchanged in this ticket.
- 12 screen tests cover invitation toggle, set/change/clear, prefill in both
  credit directions, empty and invalid saves, Clear visibility, Cancel/Escape,
  double submit, one-editor exclusivity, and accessible names.

### Ticket 8 — add-form field and final copy (`d7a0b05`)

- Added the optional `Starting point (optional)` field between type and form
  error, with type-dependent hint, field error, and reset on success. An empty
  value writes no entry; an invalid value blocks the account write.
- Credit presentation is converted to ledger-signed before storage.
- Zero-account copy is now “Add the accounts you spend from. You can set a
  starting point now or later.” `Start logging` and `Restore from backup` are
  unchanged.
- 6 screen tests.

## Review

Fresh reviewers read only `git diff master...HEAD` and the docs; they did not
receive the build transcript. The `reviewer` role is configured to
`deepseek-ai/DeepSeek-V4-Pro` in `config.yml`, so both axis reviews ran on a
different model from the build model.

- **Axis A — standards:** one P3 finding: identical `rowFor` helpers duplicated
  in two `describe` blocks of `AccountsScreen.test.tsx`. Resolved in `a875117`
  by hoisting one module-level helper. All `rule://ts-*`, `pj-*`, module
  direction, and Fowler checks otherwise clean.
- **Axis B — spec and acceptance:** zero findings. Every ticket acceptance
  criterion and architecture invariant verified against the code and tests.
- **Security and data integrity:** zero findings. Checked safe-integer
  parsing, `-0`, transaction boundaries, duplicate collapse, restore
  replacement, malformed restored data, React escaping, and confirmed no new
  dependency, network call, route, schema version, backup version, or settings
  write. The first `security-reviewer` attempt failed with a provider `402`
  (no balance) on its default model; the review was re-run on the `reviewer`
  role and completed.

One review-fixes commit: `a875117`.

## Verification after review

- `npm test`: **755 passed**, 22 files — run twice consecutively, both green.
- `npm run typecheck`: clean.
- `npm run build`: clean; PWA precache 12 entries.
- Browser, `npm run dev`, managed Chromium:
  - Added `Slice6 Checking` with no opening: `CA$0.00` and the invitation.
  - Set `100.00`: `CA$100.00`, invitation gone; Edit button appeared.
  - Added a `CA$12.34` expense through the home form: Accounts updated live to
    `CA$87.66`; home total moved from `CA$5.00` to `CA$17.34`.
  - Changed to `200.00` → `CA$187.66`; cleared → `-CA$12.34 overdrawn` and the
    invitation returned; reset to `100.00` → `CA$87.66`.
  - Added `Slice6 Visa` with a `240.00` opening: `CA$240.00 owed`.
  - Transferred `100.00` to the card: `CA$140.00 owed`; transferred `300.00`:
    `CA$160.00 in credit`.
  - Moved home to October 2026: balances unchanged; comparison rows showed
    October's spending.
  - Offline (`offline: true`): set `500.00` → `CA$87.66`, cleared, reset to
    `100.00`; all writes completed through IndexedDB.
  - 320px viewport: `scrollWidth === clientWidth` (320).
  - Accessibility tree announced each row's name, type, and balance
    qualifier (`overdrawn`, `owed`, `in credit`) and the account-specific
    set/edit names.

## Not verified

- Backup save/restore through the browser UI. The ledger round-trip tests
  cover serialize → parse → restore, older files, duplicates, and replacement.
  The browser download/upload path was not exercised.
- Physical phone install, real service-worker offline reload, and a real
  screen reader. Offline was exercised in an already-loaded page; the manual
  pass used a managed Chromium profile.
- Merge, push, and deployment. This gate did not touch `master`.

## Spec and architecture drift

None found. No production change contradicts the spec. `SCHEMA_VERSION` and
`BACKUP_SCHEMA_VERSION` remain `1`; no table, index, migration, backup field,
settings write, route, home read, or endpoint changed. The plan docs still
carry their pre-build status lines; close-out will reconcile them.

## Next

Step 9 — slice close-out: reconcile the architecture/spec status lines and
ticket acceptance boxes, update the backlog, and write
`docs/agents/slice-06-closeout-handoff.md`.
