# Handoff — Slice 06 Program Design

## Gate

Slice Program Design (workflow step 5) for slice 6 — complete.

## Artifacts

- `docs/program-design/slices/slice-06-spec.md` — new.
- This handoff.

No other file changed. `CONTEXT.md` is unchanged: **Balance** and **Opening
balance** already cover this slice. No ADR is added; the durable decisions were
already recorded in the north-star. `AGENTS.md` needs no update: the new doc
lives in an already-listed folder.

## What the spec fixed

The architecture settled the product, storage, and backup shape; this gate
resolved the implementation-level questions it left open:

- **Exact domain grammar.** `parseSignedAmount(input, exponent)` trims outer
  whitespace, accepts one optional leading `-`, rejects whitespace after the
  sign, reuses `parseAmount` for the magnitude grammar, normalizes `-0` to
  `0`, returns `null` for every invalid form, and throws `RangeError` for an
  invalid exponent exactly as `parseAmount`. `parseAmount` is unchanged.
- **Exact data types.** `AddAccountInput.openingBalanceMinor`,
  `AccountBalanceListItem`, the new `invalid-opening-amount` code, and the two
  new `Ledger` methods. `Entry`, `Account`, `Category`, `Settings`, and every
  existing read model are unchanged.
- **Exact read model.** One `r` transaction over `accounts` and `entries`;
  the `listAccounts` comparator extracted once; one effect table; per-side
  transfer effects; unknown accounts ignored without phantom rows; openings
  summed; `hasOpeningBalance` true for an opening of zero; `-0` normalized;
  account order preserved.
- **Exact write paths.** `addAccount` validates name → type → opening, writes
  the account and optional opening in one `rw` transaction through
  `insertEntry`, and never writes settings. `setOpeningBalance` validates the
  amount before the transaction, reads the account, filters openings, creates
  one when none exist, updates the lowest-id opening and deletes extras when
  duplicates exist, and deletes all on `null`.
- **Exact opening date.** `openingDateFor(account)` derives the local calendar
  date from `createdAt`; a non-date or out-of-range date falls back to today.
  An existing opening keeps its stored date.
- **Exact screen state.** A `RowEditor` union replaces the separate rename
  booleans; at most one of rename and starting-point is open. `rowError` is one
  screen-level alert; `rowBusyRef` guards both save paths; a stale rename keeps
  its existing form, while a stale opening form is cleared.
- **Exact row and form behaviour.** Name, type, balance, Rename, set/edit
  button, invitation when no opening; inline form prefilled with the presented
  opening; type-aware sign conversion; explicit Clear; empty-save error;
  Escape/Cancel; add-form optional field with type-dependent hint.
- **Exact copy and accessibility.** All visible strings, the set/edit button
  names, the input labels, hint association, error roles, and the balance
  qualifiers.
- **Exact tests.** `parseSignedAmount` cases, ledger balance/write/backup
  cases, Accounts-screen cases, existing tests that must stay green, manual
  verification, and deliberately unasserted edges.

## Prototype results

One throwaway Node reducer/balance simulator was run and removed; the spec
records it in §9. It modelled the `RowEditor` transitions (rename ↔ opening,
busy double-submit, save error, cancel), the balance effect table (checking and
credit, zero and negative openings, transfers in, overpayment, duplicate
openings), the credit prefill/parse/store round trip, and the
`parseSignedAmount` cases.

- One editor at a time is unambiguous; opening either form discards the other
  draft.
- The second save while busy is a no-op.
- The effect table produces the architecture's expected balances.
- `owed 240` round-trips as `240.00 → 240 → -240`; `in credit 60` as
  `-60.00 → +60`.
- `-0` returns positive `0`; `- 5`, `--5`, `+5`, and `1,234.50` are rejected.

No UI prototype was needed: the architecture already fixed the row content,
the display table, the copy, and the accessible names; the only open question
was the state model.

No prototype code remains in the workspace.

## Next gate

Ticket Breakdown (`to-tickets`). Read, in order:

1. `docs/program-design/slices/slice-06-spec.md`
2. `docs/architecture/slices/slice-06-architecture.md`
3. `docs/product/slices/slice-06-scope.md`
4. `docs/architecture/north-star.md`
5. `docs/architecture/slices/slice-01-architecture.md` (account write path and
   the deferred opening balance)
6. `docs/architecture/slices/slice-03-architecture.md` (backup shape and
   validation)
7. `docs/architecture/slices/slice-07-architecture.md` (latest list/add/edit
   pattern)

Cut tickets along the seam:

1. Domain money: `parseSignedAmount` and its tests.
2. Ledger contract: types, error code, `compareAccountsByCreation`,
   `openingDateFor`, `listAccountBalances`, the extended `addAccount`,
   `setOpeningBalance`, and ledger tests.
3. Accounts screen: balance read, row display, invitation, row-editor union,
   inline form, add-form field, copy, accessibility, CSS, and screen tests.
4. Invariants and backup: spending/list invariant tests, backup round-trip
   tests, and manual verification.

Do not create a ticket for a stored balance, an opening field on `Account`, a
new table, an index, a schema version, a backup version, a route, an endpoint,
a settings write, a combined total, a home balance, or a per-account movement
list.

## Repo state

- Docs-only gate. No `src/` changes, no tests run, no build.
- Slice 7 is built and reviewed on its branch, not yet merged or deployed.
  Slice 6 must branch from `master` after that release.

## Open items for the build

- Add the new `parseSignedAmount` cases and keep every existing `parseAmount`
  test green.
- Add the account-balance ledger groups and keep every existing
  `addExpense`, `monthSummary`, `categoryEntries`, transfer, income, and backup
  assertion green.
- Add the Accounts-screen cases and update the existing order test to compare
  against `listAccountBalances()`.
- Verify the screen at 320px and one desktop width; no horizontal scroll.
- Verify backup/restore with openings, an older backup without openings, and
  an offline add/set/change/clear/view manually.
- With a screen reader, verify name, type, balance, owed/in credit/overdrawn,
  the starting-point form, and the errors.
- Release slice 7 (merge, push, deploy, verify the live bundle) before slice 6
  ships.
- Do not bump `SCHEMA_VERSION` or `BACKUP_SCHEMA_VERSION`, add an index, store
  a balance, or write `settings.lastAccountId` from an opening path.
