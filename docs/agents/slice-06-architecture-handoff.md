# Handoff — Slice 06 Architecture

## Gate

Slice 6 Architecture (workflow step 4) — complete. The gate extended the
existing architecture; it did not restart it.

## Artifacts

- `docs/architecture/slices/slice-06-architecture.md` — new.
- This handoff.

No `src/` changes, no tests run, no build. `AGENTS.md` needs no update: the new
doc lives in `docs/architecture/slices/`, already listed, and no ADR was added.

## Decisions

- **No storage change.** An opening balance is one `entries` row with
  `kind: 'opening'`, a signed `amountMinor`, and `accountId`.
  `SCHEMA_VERSION` stays `1`; no new table, index, or migration.
- **No backup change.** `BACKUP_SCHEMA_VERSION` stays `1`. `parseEntry`
  already accepts opening with a signed amount (zero and negative included);
  restore already bulk-replaces entries. Older v1 files without openings
  restore with movement-only balances.
- **One account-balance read model:** `listAccountBalances()`. It reads
  `accounts` and `entries` in one `r` transaction, applies one effect table
  (expense `−`, income `+`, transfer `−source/+destination`, opening signed),
  and returns rows in `listAccounts` order with `balanceMinor`,
  `openingBalanceMinor`, and `hasOpeningBalance`.
- **No stored balance and no balance field on `Account`.** `Account` is the
  backup shape; a derived field there would risk serialization and would make
  every picker read the entries table. `listAccounts()` is unchanged.
- **Two write paths, one entry inserter.** `addAccount` gains optional
  `openingBalanceMinor` and writes the account plus its opening atomically.
  `setOpeningBalance(accountId, amountMinor | null)` sets, changes, or clears
  the one opening for an existing account. Both insert new rows through the
  private `insertEntry`; a change updates the existing opening in place.
- **One opening per account is a write-path invariant.** A second set updates
  the existing entry in place (same id and date); a clear deletes every
  opening for the account. The read still sums whatever openings exist, so a
  hand-edited backup with duplicates cannot make the balance wrong; the next
  set/clear collapses them.
- **Opening date is the account's creation local date.** `openingDateFor`
  derives it from `createdAt`; a non-date `createdAt` from a restored file
  falls back to today so the write path never produces an invalid date. No
  read filters on the opening date.
- **Signed amount entry.** `parseSignedAmount` is added to `domain/money`;
  `parseAmount` stays positive-only. The Accounts form converts the user's
  presentation value (positive = held for checking/savings, owed for credit)
  to the ledger-signed stored amount, and back for prefill.
- **New error code:** `invalid-opening-amount`. It is separate from
  `invalid-amount` because opening may be zero or negative while entry
  amounts must be positive. `unknown-account` is reused.
- **Accounts screen only.** No route change, no new screen. Rows gain name,
  type, balance, the invitation when `!hasOpeningBalance`, and an inline
  set/edit form. The add form gains an optional starting-point field. No
  combined total.
- **No settings write.** Neither path touches `settings.lastAccountId`.
- **No home or list change.** `monthSummary`, `categoryEntries`,
  `listIncome`, and `listTransfers` already filter kinds, so openings never
  appear in spending, income, transfers, or a category's entries.

## Durable-question check

No new decision is expensive to change after opening-balance data exists.
The durable semantics — balance derived from entries, opening as an entry,
signed opening with credit negative, creation-date dating, one starting
point — were already settled in the north-star. The remaining choices (read
model name, write-path shape, sign conversion location, copy) are internal.
The one thing that would be expensive — a stored balance total or an opening
field on `Account` — is deliberately not done. **No stop was required, no ADR
is warranted.**

## Wayfinder check

The destination is unchanged: the user can use the app as their only ledger.
The 2026-11-12 scope gate confirmed slice 6 (balances) as the next slice; this
architecture does not move it. No new fog, no new ticket. The only route-level
fact is a release precondition: slice 7 (income) is built and reviewed but
must be merged, pushed, and deployed before slice 6 ships.

## Domain-model check

`CONTEXT.md` already defines **Balance** and **Opening balance**; this slice
renames neither and broadens neither. "Starting point" is UI copy for the
same concept, not a second domain term. No new term, no ADR.

## Next gate

Slice 6 Program Design (`to-spec`), then ticket breakdown. Read, in order:

1. `docs/architecture/slices/slice-06-architecture.md`
2. `docs/architecture/north-star.md`
3. `docs/architecture/slices/slice-01-architecture.md` (account write path
   and the deferred opening balance)
4. `docs/architecture/slices/slice-03-architecture.md` (backup shape and
   validation)
5. `docs/architecture/slices/slice-07-architecture.md` (latest list/add/edit
   pattern)
6. `docs/product/slices/slice-06-scope.md`
7. `CONTEXT.md`

The spec must settle exact screen copy, inline-form state transitions, the
field-error wiring, and the test plan. It must not reopen the storage, backup,
sign, or one-opening decisions above.

## Open items carried forward

- Release slice 7: merge `slice-07` into `master`, push, deploy, and verify
  the live bundle before slice 6 ships.
- Slice 5's comparison cannot be validated against real data until December
  2026 at the earliest.
- Physical-phone install, real offline use, and real screen-reader output
  remain unexercised.
- Single-tab assumption; no cross-tab coordination.
- No per-account movement list or drill-down. If balance trust becomes a
  problem, that is a future slice, not a silent addition to this one.
- The opening-date fallback for a malformed restored `createdAt` is accepted
  and documented; the parser is not tightened.

## Repo state

- Docs-only gate. No `src/` changes, no tests run, no build.
- Slice 7 is built and reviewed on its branch, not yet merged or deployed.
  Slice 6 must branch from `master` after that release.
