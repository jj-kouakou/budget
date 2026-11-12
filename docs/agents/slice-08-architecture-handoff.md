# Handoff — Slice 08 Architecture

## Gate

Slice Architecture (workflow step 4) for slice 8 — complete.

## Artifacts

- `docs/architecture/slices/slice-08-architecture.md` — new.
- This handoff.

No other file changed. `CONTEXT.md` is unchanged: **Transfer** is already
defined as money moving between two of the user's own accounts, and
"source/destination account" are ordinary descriptions, not new terms.

## Decisions recorded

- **A transfer is one `entries` row**, `kind: 'transfer'`, with a positive
  `amountMinor`, `accountId` as the source, `toAccountId` as the destination,
  and no category. No `transfers` table, no second posting, no stored balance.
- **The source field stays `accountId`.** The north-star table's
  `fromAccountId` is stale prose; its ER diagram and the slice-01 spec already
  use `accountId`. No Dexie migration and no backup bump. The north-star table
  should be corrected at close-out or the next drift check.
- **No storage change:** `SCHEMA_VERSION` stays `1`; no new table, index,
  migration, or aggregate. The transfer list reads `entries` and filters
  `kind === 'transfer'` in memory; the `date` index supplies newest-first
  order.
- **No backup change:** `BACKUP_SCHEMA_VERSION` stays `1`. v1 already accepts
  `kind: 'transfer'` with `accountId` + `toAccountId`; `readBackupData` and
  `restoreBackup` already carry every entry.
- **One read model:** `listTransfers(): Promise<TransferListItem[]>` — newest
  first by date, then id, joining both accounts; missing accounts degrade to
  "Unknown account" without dropping the row.
- **Three mutations:** `addTransfer`, `updateTransfer`, `deleteTransfer`.
  Validation lives in a private `requireTransferFields`: positive safe-integer
  amount, valid date, different accounts, both accounts exist.
- **One entry insert helper:** `insertEntry` is the only `entries.add` call in
  the add paths; `addExpense` and `addTransfer` share it. Restore keeps using
  `entries.bulkAdd`.
- **New error codes:** `unknown-to-account` (destination gone) and
  `same-transfer-account` (source equals destination). `unknown-account` keeps
  its existing source/primary meaning.
- **Spending reads do not change.** `monthSummary` and `categoryEntries`
  already skip every non-expense kind. A transfer in the current or previous
  month leaves the home total, rows, and `previousMonthHasSpending` unchanged.
- **No settings write.** `addTransfer`/`updateTransfer` do not write
  `settings.lastAccountId`. The add form may read it to preselect the source.
- **Routes:** `#/transfers` (list), `#/transfers/new` (add), and
  `#/transfers/<entryId>` (correct/remove). Home gains one Transfers action.
- **Screens:** `TransfersScreen`, `AddTransferScreen`, and
  `TransferEditorScreen`, sharing `app/transferForm.tsx` (`TransferFields`,
  `TransferFieldErrors`, `transferFieldErrors`). The list row's accessible
  name states direction, amount, and date.
- **Fewer than two accounts:** the list explains and links to Accounts; the
  add screen renders no form.
- **Correction and removal mirror slice 2:** update the one row and both
  sides together; removal is confirmed naming amount, date, and both accounts,
  then final.

## Flag raised

The transfer source field was flagged as the one durable, expensive-to-reverse
decision. The user chose **keep `accountId`**, so no migration and no
`BACKUP_SCHEMA_VERSION` bump. The north-star table's `fromAccountId` remains a
documentation mismatch to correct at close-out. No ADR is added: the choice is
already recorded in `docs/program-design/slices/slice-01-spec.md`.

## Next gate

Slice Program Design (`to-spec`), then ticket breakdown. Read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-08-architecture.md`
3. `docs/product/slices/slice-08-scope.md`
4. `docs/architecture/slices/slice-01-architecture.md` (accounts, entries,
   write path)
5. `docs/architecture/slices/slice-02-architecture.md` (correction and removal)
6. `docs/program-design/slices/slice-02-spec.md` (editor and confirmation
   behavior)
7. `CONTEXT.md`

## Suggested skills

- `to-spec` for the program design doc.
- `codebase-design` for the `Ledger` additions, the private
  `requireTransferFields`/`insertEntry` helpers, and the shared transfer form.
- `domain-modeling` only if a term shifts; this gate adds none.
- `prototype` only if the list row or two-account form needs a layout sanity
  check before the spec fixes copy and CSS.

## Repo state

- Docs-only gate. No `src/` changes, no tests run, no build.
- Slices 3–5 are merged and deployed as of 2026-11-11 per the slice-05
  close-out. Slice 8 branches from `master`.

## Open items for the spec

- Exact screen copy and layout: list row markup, empty-state wording,
  add/edit headings, confirmation text, and the exact accessible-name format.
- Decide whether the `insertEntry` refactor of `addExpense` lands in the
  transfer ticket or a separate small ticket. The invariant is one add helper,
  not a new public API.
- Tests to add or update: transfer CRUD and validation; `listTransfers`
  ordering and missing-account degradation; home summary unchanged by
  transfers in current and previous months; `categoryEntries` excludes
  transfers; backup round-trip includes transfers; router parsing for
  `#/transfers/new` vs `#/transfers/<id>`; list/add/edit/remove screen states;
  accessible direction/amount/date.
- Do not add a transfers total, month navigation, filtering, pagination,
  category/tag/note/payee, fees, exchange rates, multi-currency, scheduled or
  recurring transfers, statement linking, splitting, or conversion between
  expense and transfer.
- Correct the north-star entry-kind table's `fromAccountId` to `accountId`
  (source) at close-out or the next drift check.
