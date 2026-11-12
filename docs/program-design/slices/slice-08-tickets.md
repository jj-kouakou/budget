# Slice 08 Tickets — Record transfers

- **Gate:** Ticket Breakdown (workflow step 6).
- **Sources:** `docs/program-design/slices/slice-08-spec.md` (cited as
  "Spec §…"), `docs/architecture/slices/slice-08-architecture.md`,
  `docs/product/slices/slice-08-scope.md`, `docs/architecture/north-star.md`,
  ADRs 0001/0005, `CONTEXT.md`.
- **Branch:** `slice-08`, cut from `master` after the gate docs are committed.
  Slices 3–5 are merged and deployed as of 2026-11-11.
- **Status:** built and closed 2026-11-12. All seven tickets implemented
  test-first and merged; the suite is green. The flagged boundary decisions
  were confirmed by the build and are recorded below.

Each ticket is one build session, test-first, and one commit when its tests
pass. Every ticket leaves the suite green for the surface it has shipped.

---

## Ticket order at a glance

| # | Ticket | Blocked by |
|---|---|---|
| 1 | Transfer ledger: record and list | — |
| 2 | Transfer ledger: correct and remove | 1 |
| 3 | Transfer route contract | — |
| 4 | Transfers list and home entry point | 1, 3 |
| 5 | Add transfer screen and shared transfer fields | 1, 3, 4 |
| 6 | Correct and remove a transfer | 1, 2, 3, 4, 5 |
| 7 | Spending, backup, and manual acceptance | 1, 2, 4, 5, 6 |

**Frontier:** tickets 1 and 3 can start immediately. After 1, ticket 2. After
1 and 3, ticket 4. After 4, ticket 5. After 2 and 5, ticket 6. After 6,
ticket 7. If you build serially, use the numeric order; if you have two
sessions, 1 and 3 can run in parallel, then 2 and 4.

**Critical path:** 1 → 3 → 4 → 5 → 6 → 7. Ticket 2 runs beside 3/4 and must
finish before 6.

**Why this order.** The list cannot render a transfer until the ledger can
write and read one, so the record/list data contract is first. Correction and
removal are a second data contract over the same row, so they follow the
record path and gate only the editor. Routing is pure and independent of the
ledger, but every screen needs the three `Route` members, so it lands before
the first screen. The list comes before add because it is the home entry point
and the screen the add flow returns to; add comes before the editor because it
creates the shared transfer form. The invariant ticket is last because it
proves cross-layer behaviour that no single screen ticket can prove and runs
the manual acceptance pass.

---

## Standing rules for every ticket

- Failing test first, then the minimum implementation, same session. A ticket
  that changes a runnable surface is not done on tests alone — run it.
- Cross the existing seams only: `createLedger(db)` for data, the screen
  components with a real ledger for presentation. No new seam, no mocked
  ledger, no test-only export.
- A real `BudgetDatabase(\`budget-test-${crypto.randomUUID()}\`)` per test,
  deleted in `afterEach`; `fake-indexeddb` is the only boundary.
- Assert `LedgerError.code`, not message text. Assert external behaviour:
  returned rows, rendered text, accessible names, focus, disabled state, and
  route changes. Do not assert private helper names, call counts, or Dexie
  internals.
- Build expected money strings with `formatAmount` / `formatAmountInput` and
  expected account labels with `accountWithTypeLabel` /
  `ACCOUNT_TYPE_LABELS`. Never hardcode a currency symbol or a locale name.
- Fixed dates: `2026-11-02`, `2025-01-15`, `2027-01-01`. Use
  `todayLocalDate()` only where the default is the behaviour under test.
- UI tests use RTL and `waitFor` for live-query updates; no sleeps, no fake
  timers.
- No schema, index, backup-version, backup-parser, or settings-write change.
  `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` stay `1`.
- Module direction holds: no UI import of `data/db` or `dexie`; the UI never
  sorts, filters, merges, or totals the transfer list.
- Only the three routes in Spec §6.1 are added. No route on an existing
  screen, no month filter, no pagination, no transfer total, no category,
  tag, note, payee, fee, exchange rate, schedule, statement link, split, or
  expense/transfer conversion.
- If the build contradicts the spec, fix the spec in the same commit. Do not
  diverge silently.
- Do not deploy or merge to `master` mid-slice. The slice is one release after
  ticket 7.

---

## Boundary decisions

1. **Decided — split the ledger contract into two tickets.** The handoff
   proposed one ledger ticket. One ticket would carry six public methods and
   26 ledger cases. Split along the two user capabilities: record/list
   (ticket 1) and correct/remove (ticket 2). No new seam; ticket 2 is blocked
   by 1 and reuses `requireTransferFields`. If ticket 1 runs short, merge 2
   into it; no other ticket changes.
2. **Flagged — routing and App wiring are separate.** The handoff proposed
   "routing and App" as one ticket. `App`'s switch imports the three screens,
   so a single ticket cannot be green before those screens exist unless it
   creates stubs. Decision: ticket 3 adds the `Route` union and
   `parseHash`/`routeToHash` only; each screen ticket adds its own `App` case
   (ticket 4 `transfers`, 5 `add-transfer`, 6 `transfer`). Alternative: keep
   the handoff's single ticket as a final wiring ticket blocked by 4–6, but
   the route contract must still land before the screens, so the split
   remains. Confirm this split is acceptable.
   **Confirmed by the build:** ticket 3 edited only the router and its tests;
   each screen ticket added its own `App` case, and `App` was not touched in
   ticket 3.
3. **Flagged — intermediate tickets are not standalone releases.** Ticket 4
   ships the list with Add and row buttons pointing at routes whose screens
   land in 5 and 6. Ticket 5 completes the core record-and-see moment but the
   editor is still absent. This is safe on a slice branch with green tests,
   but not a deployable state. Decision: do not deploy or merge to `master`
   until ticket 7 passes. Alternative: merge 4–6 into one ticket, which is
   too large for a comfortable session. Confirm you accept intermediate
   commits that are not standalone releases.
   **Confirmed by the build:** tickets 4–6 landed as intermediate commits on
   `slice-08`; nothing was merged or deployed until ticket 7 passed.
4. **Decided — `insertEntry` is the first step of ticket 1.** Spec §5.2. It is
   not a separate ticket; the existing `addExpense` tests prove the call-site
   switch is behaviour preserving.
5. **Decided — `TransferFields` is created in ticket 5 and reused by ticket
   6.** The add screen is the first consumer; no separate prefactor ticket.
6. **Decided — `accountWithTypeLabel` lands in ticket 4 as a
   behaviour-preserving prefactor.** It switches `ExpenseFields` to the shared
   helper; existing AddExpense and EntryEditor tests must stay green. A
   separate prefactor ticket would be too small.
7. **Decided — ticket 7 is test/manual-only.** It proves cross-layer
   invariants and runs the manual acceptance pass. It is not padding: it
   covers behaviour no single screen ticket can prove (spending unchanged,
   backup round-trip, zero-account gate, offline, 320px, screen reader). If
   you prefer no test-only ticket, fold §8.3 27–36 into tickets 1/2 and §8.5
   41 into ticket 4, and keep ticket 7 as manual verification only.
8. **Decided — no ADR, glossary, schema, backup, settings, or close-out
   ticket.** Spec §5.9 and §11. The north-star `fromAccountId` prose was
   corrected at close-out, not here.
9. **Flagged — editor correction and removal stay in one ticket.** Ticket 6
   carries 16 screen cases, but removal is a small delta on the same
   component and shares seeding, stored values, and the not-found path. If
   the session runs long, split removal (confirmation, focus, delete, guards;
   Spec §8.5 35–37, 39–40) into 6b blocked by 6a. No other ticket changes.
   **Confirmed by the build:** ticket 6 shipped correction and removal in one
   session; no 6b was needed.

---

## Existing tests that must change, and where

| Existing test / assertion | File | Ticket | Becomes |
|---|---|---|---|
| Transfer groups | `src/data/ledger.test.ts` | 1, 2, 7 | new `describe` blocks; no existing assertion re-pinned |
| `addExpense` one-row assertions | `src/data/ledger.test.ts` | 1 | unchanged; must stay green after the `insertEntry` switch |
| `monthSummary`, `categoryEntries`, backup assertions | `src/data/ledger.test.ts` | 7 | unchanged; transfer invariants are added beside them |
| Transfer route cases | `src/app/router.test.ts` | 3 | new `it.each` rows and round-trip cases; existing rows unchanged |
| Transfer route render and home action | `src/app/App.test.tsx` | 4, 5, 6, 7 | new cases; existing cases unchanged |
| Home transfer invariant | `src/app/screens/HomeScreen.test.tsx` | 7 | one new test; existing expense/comparison tests unchanged |
| Home Transfers button | `src/app/screens/HomeScreen.test.tsx` | 4 | one new test; existing empty-state tests unchanged |
| AddExpense and EntryEditor label assertions | `src/app/screens/AddExpenseScreen.test.tsx`, `src/app/screens/EntryEditorScreen.test.tsx` | 4 | unchanged; must stay green after `ExpenseFields` uses `accountWithTypeLabel` |
| Backup parser | `src/domain/backup.test.ts` | none | unchanged; it already accepts transfers |

No test is deleted. No existing assertion is re-pinned to incidental
behaviour.

---

## Test coverage map

| Spec test case | Ticket |
|---|---|
| §8.3 ledger 1–17 (add, validation, `listTransfers`) | 1 |
| §8.3 ledger 18–26 (update, delete) | 2 |
| §8.3 ledger 27–36 (spending invariants, backup round-trip, versions) | 7 |
| §8.4 router 1–4 | 3 |
| §8.4 App 5, 10 | 4 |
| §8.4 App 6 | 5 |
| §8.4 App 7, 9 | 6 |
| §8.4 App 8 (zero-account gate, all three routes) | 7 |
| §8.5 list 1–11 | 4 |
| §8.5 add 12–24 | 5 |
| §8.5 editor 25–40 | 6 |
| §8.5 home 41 | 7 |
| §8.5 home 42 (Transfers button) | 4 |
| §8.7 manual verification | 7 |

---

## 1. Transfer ledger: record and list

**Goal:** `createLedger` can write one transfer row and read the whole
transfer history with both account sides joined. No UI changes.

**Blocked by:** none — can start immediately.

**Spec:** §5.1–5.4, §5.7–5.8, §7, §8.1–8.3 cases 1–17, §8.6.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- Add `TransferInput` and `TransferListItem` exactly as Spec §5.1. Extend
  `LedgerErrorCode` with `unknown-to-account` and `same-transfer-account`.
- Extend `Ledger` with `listTransfers` and `addTransfer` only. Ticket 2 adds
  `updateTransfer` and `deleteTransfer`.
- Add private `insertEntry` beside `requireExpenseFields`; switch
  `addExpense`'s `db.entries.add(entry)` to `await insertEntry(entry)`.
  `addExpense` validation, settings write, return value, and transaction
  tables are unchanged. Restore keeps `entries.bulkAdd`.
- Add private `requireTransferFields` with the normative order: amount, date,
  same account, source exists, destination exists. Same-account runs before
  the account reads.
- Implement `addTransfer` and `listTransfers` exactly as Spec §5.4 and §5.7:
  one `rw` transaction over `accounts` and `entries`; one row with a fresh
  UUID; no category; no settings write. `listTransfers` uses one `r`
  transaction over `entries` and `accounts`, the `date` index, an in-memory
  kind filter, explicit date/id descending sort, union `bulkGet`, and
  `"Unknown account"` / `null` for missing accounts. A corrupt row with no
  `toAccountId` is returned with `''`, not dropped.
- No schema, index, backup, or settings change.

**Tests** — add `describe('transfers')` groups for Spec §8.3 cases 1–17:

1. One row with the right kind, amount, source, destination, date; no
   `categoryId`; returns the stored entry; count is 1.
2. Credit account accepted on either side.
3. Same account rejected with `same-transfer-account`; nothing written.
4. Zero, negative, and non-safe-integer amounts rejected with
   `invalid-amount`; nothing written.
5. Empty, impossible, and malformed dates rejected with `invalid-date`;
   nothing written.
6. Unknown source → `unknown-account`; unknown destination →
   `unknown-to-account`; nothing written.
7. Precedence: same account plus two unknown ids → `same-transfer-account`;
   invalid amount plus invalid date → `invalid-amount`; invalid date plus same
   account → `invalid-date`; unknown source plus unknown destination →
   `unknown-account`.
8. `addTransfer` leaves `settings.lastAccountId` unchanged.
9. `addTransfer` and `addExpense` each still write one row after the
   `insertEntry` switch.
10. `listTransfers` returns only `kind: 'transfer'`; expenses, income, and
    openings are absent.
11. Date descending, then id descending; same-date ids `'b'` and `'a'` order
    as `['b', 'a']`; a later date sorts first.
12. Source and destination names and types are joined; a credit destination
    reports `accountType: 'credit'`.
13. Missing source and missing destination each yield
    `"Unknown account"` / `null` and the row remains.
14. Renaming an account changes both sides on later reads without rewriting
    the entry.
15. Empty table yields `[]`.
16. A corrupt transfer with no `toAccountId` yields `''`,
    `"Unknown account"`, `null`, and is not dropped.
17. Transfers from different months all appear in one array; no month filter.

**Acceptance criteria**

- [x] `addTransfer` writes exactly one `entries` row with `kind: 'transfer'`,
      the input amount/source/destination/date, no category, and returns it.
- [x] `requireTransferFields` enforces the five checks in the normative order;
      each failure throws the specified `LedgerErrorCode` and writes nothing.
- [x] `addTransfer` never writes `settings.lastAccountId`.
- [x] `insertEntry` is the only `entries.add` call on the add paths;
      `addExpense` behaviour and all existing tests are unchanged.
- [x] `listTransfers` returns only transfers, newest first by date then id,
      joins both accounts, and degrades missing accounts without dropping the
      row.
- [x] A corrupt transfer with no `toAccountId` is returned, not dropped.
- [x] No schema, index, backup, or settings change.
- [x] `npm test` and `npm run typecheck` pass.

---

## 2. Transfer ledger: correct and remove

**Goal:** `createLedger` can correct the one transfer row and remove it,
returning the removed snapshot. Both sides change together; removal is final.

**Blocked by:** 1.

**Spec:** §5.5–5.6, §5.8, §7, §8.3 cases 18–26, §8.6.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- Extend `Ledger` with `updateTransfer(id, input)` and
  `deleteTransfer(id)`.
- Implement `updateTransfer` exactly as Spec §5.5: one `rw` transaction over
  `accounts` and `entries`; read the entry and check `kind` before field
  validation; update only `date`, `amountMinor`, `accountId`, `toAccountId`;
  `0` updated → `unknown-entry`; return the merged entry with the original
  `id` and `kind`; preserve a stray `categoryId`.
- Implement `deleteTransfer` exactly as Spec §5.6: one `rw` transaction over
  `entries`; missing → `unknown-entry`; non-transfer →
  `unsupported-entry-kind`; delete the one row and return the snapshot; no
  tombstone, no settings write.
- Reuse `requireTransferFields`; do not duplicate validation.

**Tests** — add Spec §8.3 cases 18–26:

18. Update amount, source, destination, and date on one row; count stays 1;
    returned entry keeps the original `id` and `kind`; `listTransfers`
    reflects the change.
19. Missing id → `unknown-entry`; non-transfer id →
    `unsupported-entry-kind`; nothing written.
20. Same account, invalid amount, invalid date, unknown source, and unknown
    destination use the same codes as add; nothing written.
21. `updateTransfer` leaves `settings.lastAccountId` unchanged.
22. A restored transfer with a stray `categoryId` keeps it after update; only
    the four editable fields change.
23. Changing the date moves the row in `listTransfers` order.
24. Delete removes the one row, returns the snapshot, and `listTransfers` is
    empty.
25. Delete missing id → `unknown-entry`; non-transfer id →
    `unsupported-entry-kind`; nothing written.
26. Deleting a transfer leaves `monthSummary` and `categoryEntries`
    unchanged.

**Acceptance criteria**

- [x] `updateTransfer` reads and kind-checks before field validation, updates
      exactly the four editable fields on one row, and never creates a second
      row.
- [x] A missing row between read and update yields `unknown-entry`.
- [x] A stray `categoryId` is preserved and never written by the app.
- [x] `deleteTransfer` removes the one row, returns the snapshot, and leaves
      no tombstone.
- [x] Both mutations leave `settings.lastAccountId` unchanged.
- [x] `npm test` and `npm run typecheck` pass.

---

## 3. Transfer route contract

**Goal:** `parseHash` and `routeToHash` understand the three transfer hashes
with the exact fallbacks in the spec. `App` is intentionally untouched.

**Blocked by:** none — can start immediately.

**Spec:** §6.1, §8.4 cases 1–4.

**Files:** `src/app/router.ts`, `src/app/router.test.ts`.

**Build**

- Add `{ name: 'transfers' }`, `{ name: 'add-transfer' }`, and
  `{ name: 'transfer'; entryId: string }` to `Route`.
- Add the two exact checks after `/categories` and before the requested-month
  computation: `/transfers` and `/transfers/new`.
- Add the id branch after `/entry/` and before the final home return:
  reject empty, raw slash, and decode failure; accept an encoded slash after
  decoding; fall back to `currentMonth`, not the requested month.
- Add the three `routeToHash` cases.
- Do not touch `App`. The new routes render nothing until their screen
  tickets add the switch cases; existing routes are unchanged.

**Tests** — Spec §8.4 cases 1–4:

1. `#/transfers` and `#/transfers?x=1` → `{ name: 'transfers' }`.
2. `#/transfers/new` and `#/transfers/new?x=1` → `{ name: 'add-transfer' }`.
3. `#/transfers/new/`, `#/transfers/`, `#/transfers//`, `#/transfers/a/b`,
   and `#/transfers/%E0%A4%A` → home at `currentMonth`.
4. `#/transfers/abc` and `#/transfers/abc?m=2026-11` →
   `{ name: 'transfer', entryId: 'abc' }`; `#/transfers/abc%2Fdef` →
   `{ name: 'transfer', entryId: 'abc/def' }`.
5. `routeToHash` returns the three exact hashes.
6. A transfer id containing reserved characters round-trips.
7. `#/transfers/new` is never parsed as an id.

**Acceptance criteria**

- [x] The three routes parse exactly as Spec §6.1, including query strings,
      trailing slashes, raw slashes, encoded slashes, and decode failure.
- [x] `routeToHash` is exhaustive and returns the three exact hashes.
- [x] Existing routes and their tests are unchanged.
- [x] `App` is not edited in this ticket.
- [x] `npm test` and `npm run typecheck` pass.

---

## 4. Transfers list and home entry point

**Goal:** From home, the user opens Transfers and sees every transfer newest
first with both account labels, amount, and date. The empty and
fewer-than-two-accounts states work, rows open the editor route, and the Add
action opens the add route.

**Blocked by:** 1, 3.

**Spec:** §4.5–4.6, §6.3–6.5, §6.9–6.10, §8.5 cases 1–11 and 42, §8.4 cases
5 and 10.

**Files:** `src/app/screens/TransfersScreen.tsx` (new),
`src/app/screens/TransfersScreen.test.tsx` (new), `src/app/labels.ts`,
`src/app/expenseForm.tsx`, `src/app/screens/HomeScreen.tsx`,
`src/app/screens/HomeScreen.test.tsx`, `src/app/App.tsx`,
`src/app/App.test.tsx`, `src/styles.css`.

**Build**

- Add `accountWithTypeLabel(name, type)` to `src/app/labels.ts`. Switch
  `ExpenseFields`'s inline account label to it. Output is byte-for-byte
  identical; existing AddExpense and EntryEditor tests must stay green.
- Add `TransfersScreen` with the module-local `transfersListState` precedence
  from Spec §6.4: loading → needs-accounts (existing rows still render) →
  empty → list. Render the exact copy, rows, Add/Accounts/Back actions, and
  `TransferRows` markup from Spec §6.4–6.5. The screen never sorts, filters,
  merges, or totals rows.
- Every row is a button with the exact accessible name from Spec §6.10:
  `Transfer from {source} to {destination}, {amount}, {date}`. The visible
  line uses `→`; the accessible name uses “from” and “to”.
- Add the `.transfer-list` CSS and dark-mode overrides from Spec §6.5. Check
  no horizontal scroll at 320px.
- Add the first `Transfers` button to the home bottom actions row, before
  `Accounts`, present in every home state.
- Add the `App` case for `transfers` importing `TransfersScreen`.
- Do not add the add or editor screens; their App cases land in tickets 5
  and 6. This ticket's Add and row buttons point at routes that are not
  handled yet; see boundary decision 3.

**Tests** — Spec §8.5 cases 1–11 and 42, §8.4 cases 5 and 10:

1. Fewer than two accounts, no transfers: warning, Accounts, Back; no Add;
   no empty-state message.
2. Fewer than two accounts, existing transfers: warning plus rows; no Add; a
   row opens the editor route.
3. At least two accounts, no transfers: `No transfers yet.` and
   `Add your first transfer`; clicking navigates to `#/transfers/new`.
4. Transfers exist: rows in ledger order; each shows both labels, formatted
   amount, and ISO date.
5. Accessible name is exactly the §6.10 template.
6. Clicking a row navigates to `#/transfers/<id>`.
7. A missing account renders `Unknown account` and the row stays clickable.
8. After `ledger.addTransfer`, the list updates through `waitFor`.
9. After `ledger.renameAccount`, both sides show the new name.
10. Add transfer is present only with at least two accounts and a non-empty
    list; the empty state uses the first-transfer label.
11. Back navigates to `#/?m=<current month>`.
12. With one account, `#/transfers` renders the `Transfers` heading (App).
13. The home `Transfers` button is present in the empty state and navigates
    to `#/transfers` (App and HomeScreen).

**Acceptance criteria**

- [x] The list state precedence is exactly loading → needs-accounts → empty →
      list; the warning replaces the empty state and existing rows still
      render.
- [x] Rows are in ledger order and are never sorted, filtered, merged, or
      summed by the UI.
- [x] Each row shows the date, both account labels, and the formatted amount;
      the accessible name states direction, amount, and date.
- [x] Missing accounts render `Unknown account` and the row remains.
- [x] Empty and fewer-than-two-accounts states use the exact spec copy and
      actions.
- [x] The home `Transfers` button is first in the actions row and present in
      every state.
- [x] `accountWithTypeLabel` is shared with `ExpenseFields` with identical
      output; existing screen tests stay green.
- [x] The list does not scroll horizontally at 320px.
- [x] `npm test` and `npm run typecheck` pass.

---

## 5. Add transfer screen and shared transfer fields

**Goal:** The user records a transfer with the exact defaults and validation,
saves it, and returns to the list. Fewer than two accounts renders the gate
instead of a form.

**Blocked by:** 1, 3, 4.

**Spec:** §4.2, §6.6, §6.8–6.10, §8.5 cases 12–24, §8.4 case 6.

**Files:** `src/app/transferForm.tsx` (new),
`src/app/screens/AddTransferScreen.tsx` (new),
`src/app/screens/AddTransferScreen.test.tsx` (new), `src/app/App.tsx`,
`src/app/App.test.tsx`.

**Build**

- Create `src/app/transferForm.tsx` with `TransferFieldErrors`,
  `transferFieldErrors`, and `TransferFields` exactly as Spec §6.8. Reuse
  `ChoiceGroup` from `expenseForm`; use `accountWithTypeLabel` for both
  pickers. Do not reuse `ExpenseFields`.
- Create `AddTransferScreen` with the loading gate, the fewer-than-two
  accounts gate, the exact form initialization, the `keep` same-account
  policy, the submit validation block, the ledger call, and the error mapping
  from Spec §6.6.
- The form clears its own field error and the form-level error on every
  change, per the exact mapping in §6.8.
- Add the `App` case for `add-transfer` importing `AddTransferScreen`.
- No settings write; no category/tag/note/payee field; no swap button; no
  auto-change between pickers.

**Tests** — Spec §8.5 cases 12–24 and §8.4 case 6:

12. Fewer than two accounts: no form, warning, Accounts button.
13. At least two accounts: amount blank, source from `settings.lastAccountId`,
    destination first different, date today.
14. Missing or stale `lastAccountId` falls back to the first account.
15. Saves one row with the right kind/amount/accounts/date; navigates to
    `#/transfers`; `settings.lastAccountId` unchanged.
16. Accepts a comma decimal separator.
17. Zero and negative amounts show the amount error; no row.
18. Same account on both sides shows `Choose two different accounts.`; no
    row.
19. Cleared date shows the date error; no row.
20. An earlier-month date is stored and the list shows it.
21. A credit card can be either side.
22. Rapid double submit writes one row and disables Save.
23. Deleting an account after render maps `unknown-account` /
    `unknown-to-account` to the correct picker.
24. Cancel returns to `#/transfers` without writing.
25. With two accounts, `#/transfers/new` renders the `Add transfer` heading
    (App).

**Acceptance criteria**

- [x] The fewer-than-two-accounts gate renders heading, warning, and Accounts
      action with no form.
- [x] Defaults are exactly: source from valid `lastAccountId` else first
      account; destination first different in `listAccounts()` order; date
      today; amount blank.
- [x] Changing one picker never changes the other; a same-account selection
      remains visible and is rejected on submit with the form-level error.
- [x] Amount, date, and account validation match Spec §6.6 and map ledger
      codes to the correct fields.
- [x] Saving writes exactly one row, navigates to the list, and does not
      change `settings.lastAccountId`.
- [x] The double-submit guard allows one write and disables Save.
- [x] `TransferFields` is shared and ready for ticket 6; no second form
      convention is introduced.
- [x] `npm test` and `npm run typecheck` pass.

---

## 6. Correct and remove a transfer

**Goal:** Opening a row lets the user change the amount, either account, or
the date, or remove the transfer after a confirmation naming the amount, date,
and both accounts. Missing accounts and a restored self-transfer are flagged
and block saving until corrected.

**Blocked by:** 1, 2, 3, 4, 5.

**Spec:** §4.3–4.4, §6.7, §6.9–6.10, §8.5 cases 25–40, §8.4 cases 7 and 9.

**Files:** `src/app/screens/TransferEditorScreen.tsx` (new),
`src/app/screens/TransferEditorScreen.test.tsx` (new), `src/app/App.tsx`,
`src/app/App.test.tsx`.

**Build**

- Create `TransferEditorScreen` with loading, not-found for a missing or
  non-transfer entry, and the form keyed by `entry.id`.
- Seed exactly as Spec §6.7: amount via `formatAmountInput`; source and
  destination from stored ids when the accounts still exist, otherwise
  `null` with the field error; date from the entry; a restored self-transfer
  seeds both sides and the form-level error; `''` is treated as missing.
- Reuse `TransferFields` from ticket 5 with `idPrefix="transfer-edit"`.
- Submit uses the same local validation and double-submit guard as add;
  `updateTransfer`; on success navigate to `#/transfers`; `unknown-entry` /
  `unsupported-entry-kind` switch to not-found; other failures show
  `Could not save the changes. Try again.`
- Removal uses stored values, not unsaved form state, for the sentence and
  the delete call. The `role="group"` panel has `aria-label="Confirm
  removal"`; focus moves to Cancel; Cancel closes without writing; Remove
  deletes and navigates to `#/transfers`; failures keep the row and show
  `Could not remove the transfer. Try again.`; the delete guard prevents a
  double removal.
- Add the `App` case for `transfer` importing `TransferEditorScreen`.
- No account-count gate on the editor; a transfer can be opened with one
  account or a missing account and must require a replacement before saving.

**Tests** — Spec §8.5 cases 25–40 and §8.4 cases 7 and 9:

25. Opens from a list row with amount, source, destination, and date
    prefilled.
26. Saves an amount correction; one row remains; `listTransfers` shows the
    new amount.
27. Changes both accounts; saves; both sides update; no second row.
28. Changes the date to an earlier month; the row moves in the list and home
    spending is unchanged.
29. Back leaves the row unchanged and returns to `#/transfers`.
30. A stale id renders `Transfer not found` with `Back to transfers`.
31. An expense id renders `Transfer not found`.
32. A missing stored source starts with the source error and blocks saving
    until a replacement is chosen; the list still shows `Unknown account`.
33. A missing stored destination does the same.
34. A restored self-transfer starts with `Choose two different accounts.` and
    blocks saving; correcting one side saves successfully.
35. Remove reveals the group, names the stored amount, date, and both labels,
    and focuses Cancel.
36. Cancel keeps the row and closes the panel without writing.
37. Remove deletes the row, returns to `#/transfers`, and leaves home
    spending unchanged.
38. Rapid double submit writes once and disables Save changes.
39. Rapid double Remove calls delete once.
40. Removing the last transfer shows the empty state.
41. With two accounts and a stored transfer, `#/transfers/<id>` renders the
    `Correct transfer` heading (App).
42. An unknown transfer id renders `Transfer not found` (App).

**Acceptance criteria**

- [x] The editor seeds from the stored row; missing source/destination and a
      restored self-transfer start with the correct errors and block saving.
- [x] A correction updates the one row and both sides; no second row; the
      list reflects the change immediately.
- [x] A date correction moves the row in the list.
- [x] Back and Cancel leave the row unchanged.
- [x] Removal names the stored amount, date, and both account labels; focus
      moves to Cancel; Cancel writes nothing; Remove deletes and returns to
      the list.
- [x] A failed removal leaves the row and shows the error; a double removal
      deletes once.
- [x] Missing and non-transfer ids render the not-found state.
- [x] `npm test` and `npm run typecheck` pass.

---

## 7. Spending, backup, and manual acceptance

**Goal:** Prove that transfers never enter spending, that backup/restore
reproduces them exactly, that the zero-account gate covers all three routes,
and that the slice works in a real browser, offline, at 320px, and with a
screen reader. No production code is expected; fix a real bug in this ticket
and record it.

**Blocked by:** 1, 2, 4, 5, 6 (3 via 4).

**Spec:** §5.9–5.10, §7, §8.3 cases 27–36, §8.5 case 41, §8.4 case 8, §8.7.

**Files:** `src/data/ledger.test.ts`, `src/app/screens/HomeScreen.test.tsx`,
`src/app/App.test.tsx`. No production file unless a test exposes a defect.

**Tests**

- Add the `describe('transfer spending invariants')` ledger group:
  27. Snapshot `monthSummary('2026-11')` with one current-month expense; add a
      current-month transfer; summary is `toEqual` the snapshot.
  28. With a current-month expense and no previous expenses, add a
      previous-month transfer; `previousMonthHasSpending` stays `false` and
      rows are unchanged.
  29. A transfer in an earlier month is absent from that month's
      `monthSummary` and `categoryEntries`; a transfer with a stray
      `categoryId` is also absent from `categoryEntries`.
  30. Correcting and removing a transfer leave the current and previous month
      summaries `toEqual` to their pre-transfer snapshots.
- Add the backup round-trip group:
  31. `readBackupData()` includes the transfer; create → serialize → parse →
      restore into a fresh database reproduces the transfer exactly;
      `listTransfers` returns the same amount, date, source, and destination.
  32. A v1 file with no transfers restores an empty transfers list.
  33. A restored transfer with a stray `categoryId` round-trips; spending
      reads ignore it.
  34. A restored transfer with a missing account is listed with
      `"Unknown account"`.
  35. A restored self-transfer is listed; the editor's initial error is
      covered by ticket 6.
  36. `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`; the existing
      schema table/index assertion is unchanged.
- Add the HomeScreen invariant:
  41. Seed an expense in the current month and a transfer in the current month
      and the previous month; the `Spent` total, category rows, and
      previous-month comparison are exactly what the expenses alone produce.
      No transfer row or amount appears.
- Add the App zero-account gate:
  8. With zero accounts, `#/transfers`, `#/transfers/new`, and
      `#/transfers/<id>` redirect to `#/accounts`, like the existing `#/add`
      gate test.

**Manual verification** — Spec §8.7:

1. Record checking → credit card; it appears once, newest first; home total
   does not move.
2. Record an earlier-month transfer; it is absent from that month's spending
   and present in the list.
3. Correct amount, then each account, then date; the row updates in place and
   the list reorders on a date change.
4. Remove a transfer; the panel names amount, date, and both accounts; Cancel
   keeps it; Remove deletes it; spending stays unchanged.
5. Restore a fixture referencing a missing account; the list shows
   `Unknown account` and the editor requires a replacement.
6. Restore a backup with transfers in a fresh profile; list and spending
   match.
7. Go offline; repeat record, view, correct, and remove.
8. Check the list and forms at 320px and one desktop width; no horizontal
   scroll.
9. With a screen reader, confirm a row announces direction, amount, and date,
   and the confirmation panel announces amount, date, and both accounts.

**Acceptance criteria**

- [x] Adding, correcting, and removing a transfer in the current or previous
      month leaves `monthSummary`, `categoryEntries`, and
      `previousMonthHasSpending` unchanged.
- [x] A transfer with a stray `categoryId` never appears in spending.
- [x] A backup/restore round-trip reproduces transfers exactly under
      `BACKUP_SCHEMA_VERSION = 1`; a no-transfer v1 file restores an empty
      list.
- [x] Missing-account and self-transfer rows survive restore and are handled
      by the list/editor.
- [x] The zero-account gate redirects all three transfer routes to Accounts.
- [x] The manual checklist above passes in a real browser, offline, at 320px
      and one desktop width, with the screen-reader checks recorded.
- [x] `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`.
- [x] `npm test` and `npm run typecheck` pass.

---

## Slice close-out

- [x] All seven tickets pass their tests; `npm test` and `npm run typecheck`
      are green on `slice-08`.
- [x] The architecture, spec, and these tickets reflect what was built; no
      production divergence was found; both version constants remain `1`.
- [x] The north-star entry-kind table's `fromAccountId` is corrected to
      `accountId` at close-out or the next drift check.
- [x] `docs/product/backlog.md` marks slice 8 complete and names the next
      slice.
- [x] Slice handoff written to `docs/agents/slice-08-closeout-handoff.md`.
