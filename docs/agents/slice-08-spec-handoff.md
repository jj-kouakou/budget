# Handoff — Slice 08 Program Design

## Gate

Slice Program Design (workflow step 5) for slice 8 — complete.

## Artifacts

- `docs/program-design/slices/slice-08-spec.md` — new.
- This handoff.

No other file changed. `CONTEXT.md` is unchanged: **Transfer** is already
defined as money moving between two of the user's own accounts. No ADR is
added; the durable source-field decision was already recorded in
`docs/program-design/slices/slice-01-spec.md` and confirmed by the slice-08
architecture.

## What the spec fixed

The architecture settled the product and storage shape; this gate resolved the
implementation-level questions it left open:

- **Exact data types.** `TransferInput`, `TransferListItem`, the two new
  `LedgerErrorCode` members, and the four new `Ledger` methods. `Entry`,
  `Account`, `Category`, `Settings`, and every existing read model are
  unchanged.
- **Exact write paths.** `addTransfer`, `updateTransfer`, and `deleteTransfer`
  with their transaction tables, validation order, error precedence, and
  returned values. `requireTransferFields` runs amount → date → same-account →
  source exists → destination exists. `updateTransfer` reads the entry and
  checks its kind before field validation.
- **Exact shared insert.** Private `insertEntry` is the only `entries.add` call
  on the add paths; `addExpense` switches to it in the same ticket. Restore
  stays on `entries.bulkAdd`.
- **Exact read model.** One `r` transaction over `entries` and `accounts`;
  date-index read, in-memory kind filter, explicit date/id descending sort,
  union `bulkGet`, missing accounts degrade to `"Unknown account"` / `null`.
  A corrupt transfer with no `toAccountId` is returned with `''` and
  `"Unknown account"`, not dropped.
- **Exact routes.** `#/transfers`, `#/transfers/new`, and
  `#/transfers/<id>`, with `new` checked before the id branch, raw-slash and
  decode-failure fallbacks to home, encoded-slash acceptance matching
  `#/entry/<id>`, and query strings ignored.
- **Exact list state model.** `transfersListState` returns `loading`,
  `needs-accounts` (existing rows still render), `empty`, or `list`. The
  warning replaces the empty state; the Add button appears only with at least
  two accounts and a non-empty list.
- **Exact add form.** Source from `settings.lastAccountId` when valid, else the
  first account; destination the first different account in `listAccounts`
  order; date today; amount blank; no category. No settings write.
- **Exact editor.** Seed from the stored row; missing source/destination starts
  with a field error and blocks save; a restored self-transfer starts with the
  form-level same-account error; not-found for a missing or non-transfer entry;
  removal uses stored values, names amount/date/both accounts, focuses Cancel,
  and is final.
- **Exact shared form.** `TransferFields`, `TransferFieldErrors`, and
  `transferFieldErrors`; `ChoiceGroup` is reused from `expenseForm`; the exact
  field-error clearing map is in the spec.
- **Exact copy and CSS.** All screen copy, the row accessible-name template,
  the two-line transfer row grid, and dark-mode overrides.
- **Exact tests.** Ledger cases, router/App cases, three new screen test files,
  one home invariant test, and the existing tests that must stay green. No test
  is deleted or re-pinned.
- **Known edges.** A stored id of `new` is unreachable by URL; a restored
  self-transfer and a restored stray `categoryId` are accepted and handled;
  identical account labels remain possible by design.

## Prototype results

One throwaway state-model reducer was run and removed; the spec records it in
§9. It compared three policies for changing one account picker to the account
already selected on the other side:

- `keep`: both selections remain; same-account error on submit. Chosen.
- `clearOther`: the other selection is discarded. Rejected.
- `autoAdvance`: the other side is silently rewritten to the first different
  account. Rejected; with three accounts it picked Checking, not the previous
  source.

No UI prototype was needed: the architecture already fixed the row's
information and accessible-name template, and the only open display choice
(always include the account type) is resolved by matching the expense pickers.

No prototype code remains in the workspace.

## Next gate

Ticket Breakdown (`to-tickets`). Read, in order:

1. `docs/program-design/slices/slice-08-spec.md`
2. `docs/architecture/slices/slice-08-architecture.md`
3. `docs/product/slices/slice-08-scope.md`
4. `docs/architecture/north-star.md`
5. `docs/architecture/slices/slice-01-architecture.md` (entry model, write path)
6. `docs/architecture/slices/slice-02-architecture.md` (correction/removal)

Cut tickets along the seam, not the file list:

1. Ledger contract: types, error codes, `insertEntry` + `addExpense` switch,
   `requireTransferFields`, the four methods, and ledger tests.
2. Routing and App: three routes, switch cases, and router/App tests.
3. List screen: state model, rows, labels, CSS, home action, and list tests.
4. Add screen: gates, defaults, form, validation, and add tests.
5. Editor screen: seeding, correction, removal, not-found, and editor tests.
6. Spending/backup invariants: ledger and home tests, then manual verification.

The `insertEntry` refactor is **not** a separate ticket; it is the first step of
the ledger-contract ticket. The invariant is one add helper, not a new public
API.

Do not create a ticket for a transfers table, an index, a schema version, a
backup version, an endpoint, a settings write, a transfer total, month
navigation, filtering, pagination, or a swap button.

## Repo state

- Docs-only gate. No `src/` changes, no tests run, no build.
- Slices 3–5 are merged and deployed as of 2026-11-11 per the slice-05
  close-out. Slice 8 branches from `master`.

## Open items for the build

- Add the transfer groups to `src/data/ledger.test.ts`; keep every existing
  `addExpense`, `monthSummary`, `categoryEntries`, and backup assertion green
  after the `insertEntry` call-site switch.
- Add the router cases and App route/gate cases.
- Add the three screen test files and the one home invariant test.
- Verify the list and forms at 320px and one desktop width; no horizontal
  scroll.
- Verify backup/restore in a fresh profile, and offline record/view/correct/
  remove manually.
- With a screen reader, verify a row announces direction, amount, and date,
  and the confirmation panel announces amount, date, and both accounts.
- Do not tighten the backup parser, bump either version constant, add a new
  index, or write `settings.lastAccountId` from a transfer path.
- Correct the north-star entry-kind table's `fromAccountId` to `accountId`
  (source) at close-out or the next drift check. This slice does not edit the
  north star.
