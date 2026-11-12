# Slice 07 Tickets — Record income

- **Gate:** Ticket Breakdown (workflow step 6).
- **Sources:** `docs/program-design/slices/slice-07-spec.md` (cited as
  "Spec §…"), `docs/architecture/slices/slice-07-architecture.md`,
  `docs/product/slices/slice-07-scope.md`,
  `docs/architecture/north-star.md`, ADRs 0001/0005, `CONTEXT.md`, and the
  current `src/`.
- **Branch:** `slice-07`, cut from `master` after the gate docs are committed.
  Slices 1–5 and 8 are merged and deployed as of 2026-11-12; slice 6 is
  deferred behind income.
- **Status:** built and reviewed 2026-11-12. All eight tickets were implemented
  test-first and the suite is green. Boundary decisions 2, 3, 5, and 6 were
  confirmed: routing landed before the screens, intermediate commits are not
  standalone releases, the editor did not depend on the add screen, and App
  wiring was built serially.

Each ticket is one build session, test-first, and one commit when its tests
pass. Every ticket leaves the suite green for the surface it has shipped.

---

## Ticket order at a glance

| # | Ticket | Blocked by |
|---|---|---|
| 1 | Income ledger: record and list | — |
| 2 | Income ledger: correct and remove | 1 |
| 3 | Shared categorized-entry form extraction | — |
| 4 | Income route contract | — |
| 5 | Income list and home entry point | 1, 2, 4 |
| 6 | Add income screen | 1, 3, 4, 5 |
| 7 | Correct and remove income | 2, 3, 4, 5 |
| 8 | Spending, backup, and manual acceptance | 1–7 |

**Frontier:** tickets 1, 3, and 4 can start immediately. After 1, ticket 2.
After 1, 2, and 4, ticket 5. After 5, tickets 6 and 7 (7 also needs 3). After
6 and 7, ticket 8.

**Critical path:** 1 → 2 → 5 → 7 → 8. Ticket 4 runs beside 1/2; ticket 3 runs
beside 1/2/4; ticket 6 runs beside 7. If you build serially, use numeric
order.

**Why this order.**

- The ledger is the whole application API. No screen can render or write an
  income until `addIncome` and `listIncome` exist, so the record/list contract
  is first.
- Correction and removal are a second data contract over the same row. They
  follow record/list and gate only the editor.
- The shared form extraction is independent of the ledger and the router, but
  both the add and editor screens need `CategorizedEntryFields`. It lands
  before either screen so no second form convention appears.
- Routing is pure and independent, but every screen imports `Route` and calls
  `navigate`. The route contract lands before the first screen.
- The list lands before add and the editor because it is the home entry point
  and the destination after save, cancel, correction, and removal. It follows
  the full ledger contract because its live-update tests exercise
  `updateIncome` and `deleteIncome`, not just `listIncome`.
- The editor lands after the ledger's correct/remove methods and the shared
  form. It does not depend on the add screen.
- The invariant ticket is last because it proves cross-layer behaviour no
  single screen ticket can prove and runs the manual acceptance pass.

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
  sorts, filters, merges, or totals the income list.
- Only the three routes in Spec §6.1 are added. No income total, month
  control, filter, pagination, payee, note, tax, source, split, or
  expense/income conversion.
- If the build contradicts the spec, fix the spec in the same commit. Do not
  diverge silently.
- Do not deploy or merge to `master` mid-slice. The slice is one release after
  ticket 8.

---

## Boundary decisions

1. **Decided — split the ledger contract into two tickets.** Spec §12 proposed
   one ledger ticket carrying the rename, four public methods, three private
   helpers, and 41 test cases. Split along the two user capabilities:
   record/list (ticket 1) and correct/remove (ticket 2). No new seam; ticket 2
   is blocked by 1 and reuses `requireCategorizedEntryFields`. If ticket 1
   runs short, merge 2 into it; no other ticket changes.
2. **Flagged — routing and `App` wiring are separate.** Spec §12 proposed
   "routing and App" as one ticket. `App`'s switch imports the three screens,
   so a single ticket cannot add those cases before the screens exist without
   creating stubs. Decision: ticket 4 adds the `Route` union and
   `parseHash`/`routeToHash` only; each screen ticket adds its own `App` case
   (ticket 5 `income`, 6 `add-income`, 7 `income-entry`). Alternative: keep
   one final wiring ticket blocked by 5–7, which adds all three cases and all
   App route tests at the end. Confirm the distributed split.
3. **Flagged — intermediate tickets are not standalone releases.** Ticket 5
   ships the list with row buttons pointing at `#/income/<id>` before the
   editor exists; ticket 6's save and cancel navigate to `#/income` only
   after ticket 5. This is safe on a slice branch with green tests, but not a
   deployable state. Decision: do not deploy or merge to `master` until
   ticket 8 passes. Alternative: merge 5–7 into one ticket, which is too
   large for a comfortable session. Confirm you accept intermediate commits
   that are not standalone releases.
4. **Decided — the shared form extraction is its own ticket.** The rename
   fans across `expenseForm.tsx`, `transferForm.tsx`, `AddExpenseScreen`, and
   `EntryEditorScreen`, and moves `ChoiceGroup`. It is a wide mechanical
   refactor whose only proof is the existing suite staying green. It could be
   folded into ticket 6 (the first consumer), but then the editor ticket
   inherits an already-renamed module without its own green checkpoint.
5. **Flagged — the editor does not depend on the add screen.** Spec §12 lists
   add before editor. The editor's real dependencies are the ledger's
   correct/remove methods, the shared form, the routes, and the list. Ticket
   7 is therefore blocked by 2, 3, 4, and 5, not 6. Serial numeric order still
   builds add first. If you want strict spec order, add 6 as a blocker; no
   other ticket changes.
6. **Flagged — tickets 6 and 7 both edit `App.tsx` and `App.test.tsx`.**
   They have no data dependency on each other, so the frontier allows them in
   parallel. If you run two sessions, one must own the App wiring for both, or
   run them serially. Recommended: serial numeric order.
7. **Decided — ticket 8 is test/manual-only.** It proves spending and backup
   invariants, the zero-account gate, and the browser/offline/320px/screen-
   reader pass. It is not padding: no single screen ticket can prove that
   income never enters a spending total or survives a backup round-trip. If
   you prefer no test-only ticket, fold §8.3 31–41 into tickets 1/2 and §8.5
   46 and §8.4 8 into tickets 5/7, and keep ticket 8 as manual verification
   only.
8. **Decided — `listTransfers` is refactored onto
   `entriesOfKindNewestFirst` in ticket 1.** The helper is introduced with
   `listIncome`; a separate prefactor ticket would be too small, and the
   existing transfer tests prove the ordering is unchanged.
9. **Decided — the home `Income` button lands in ticket 5.** Spec §6.3 and
   §12. It is part of the list's entry point, not a separate home ticket.
10. **Decided — no ADR, glossary, schema, backup, settings, or close-out
    ticket.** Spec §5.10, §7, §12. The durable income semantics are already in
    the north-star and `CONTEXT.md`; close-out is the slice checklist at the
    end of this file.

---

## Existing tests that must change, and where

| Existing test / assertion | File | Ticket | Becomes |
|---|---|---|---|
| `addExpense` one-row assertions | `src/data/ledger.test.ts` | 1 | unchanged; must stay green after the `ExpenseInput` and `requireCategorizedEntryFields` renames |
| `listTransfers` order and join assertions | `src/data/ledger.test.ts` | 1 | unchanged; must stay green after the `entriesOfKindNewestFirst` refactor |
| `monthSummary`, `categoryEntries`, backup assertions | `src/data/ledger.test.ts` | 1, 2, 8 | unchanged; income cases are added beside them |
| Income ledger groups | `src/data/ledger.test.ts` | 1, 2, 8 | new `describe` blocks; no existing assertion re-pinned |
| `parseHash` / `routeToHash` cases | `src/app/router.test.ts` | 4 | new `it.each` rows and round-trip cases; existing rows unchanged |
| App route render cases | `src/app/App.test.tsx` | 5, 6, 7, 8 | new cases; existing cases unchanged |
| Home Income button | `src/app/screens/HomeScreen.test.tsx` | 5 | one new test; existing expense/comparison tests unchanged |
| Home income invariant | `src/app/screens/HomeScreen.test.tsx` | 8 | one new test; existing tests unchanged |
| AddExpense and EntryEditor imports | `src/app/screens/AddExpenseScreen.tsx`, `EntryEditorScreen.tsx` | 3 | import paths and names only; no assertion changes |
| Transfer form `ChoiceGroup` import | `src/app/transferForm.tsx` | 3 | import path only; transfer screen tests unchanged |
| Transfer screen tests | `src/app/screens/TransfersScreen.test.tsx`, `TransferEditorScreen.test.tsx`, `AddTransferScreen.test.tsx` | 1, 3 | unchanged; must stay green after the ordering refactor and form move |
| Backup parser | `src/domain/backup.test.ts` | none | unchanged; it already accepts income and optional categories |

No test is deleted. No existing assertion is re-pinned to incidental
behaviour.

---

## Test coverage map

| Spec test case | Ticket |
|---|---|
| §8.3 ledger 1–9 (income writes, validation, precedence, settings) | 1 |
| §8.3 ledger 10–19 (`listIncome`) | 1 |
| §8.3 ledger 20–27 (`updateIncome`) | 2 |
| §8.3 ledger 28–30 (`deleteIncome`) | 2 |
| §8.3 ledger 31–35 (spending invariants) | 8 |
| §8.3 ledger 36–41 (backup round-trip, versions) | 8 |
| §8.4 router 1–4 | 4 |
| §8.4 App 5, 10 | 5 |
| §8.4 App 6 | 6 |
| §8.4 App 7, 9 | 7 |
| §8.4 App 8 (zero-account gate, all three routes) | 8 |
| §8.5 list 1–12 | 5 |
| §8.5 add 13–28 | 6 |
| §8.5 editor 29–45 | 7 |
| §8.5 home 46 (income invariant) | 8 |
| §8.5 home 47 (Income button) | 5 |
| §8.7 manual verification | 8 |

---

## 1. Income ledger: record and list

**Goal:** `createLedger` can write one income row and read the whole income
history with category and account labels joined. No UI changes. The shared
categorized-entry input and validation names are in place, and transfer
ordering uses the same helper income will use.

**Blocked by:** none — can start immediately.

**Spec:** §5.1–5.5, §5.8, §7, §8.1–8.3 cases 1–19, §8.6.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- Rename `ExpenseInput` to `CategorizedEntryInput` exactly as Spec §5.1.
  Update `Ledger.addExpense` and `Ledger.updateExpense` parameter types.
  Delete `ExpenseInput`; no compatibility alias and no second input type.
- Add `IncomeListItem` exactly as Spec §5.1. It deliberately has no
  `categoryId`.
- Rename the private `requireExpenseFields` to
  `requireCategorizedEntryFields`, change its parameter type, and keep the
  body and rule order unchanged. Update both expense call sites.
- Add the private `entriesOfKindNewestFirst(kind: EntryKind)` helper exactly
  as Spec §5.4. Import `EntryKind` from `../domain/types`.
- Refactor `listTransfers` onto the helper. Observable transfer ordering does
  not change; the existing account join and row mapping are unchanged.
- Extend `Ledger` with `listIncome()` and `addIncome(input)` only. Ticket 2
  adds `updateIncome` and `deleteIncome`.
- Implement `addIncome` exactly as Spec §5.5: one `rw` transaction over
  `accounts`, `categories`, and `entries`; validate with the shared helper;
  write one `kind: 'income'` row with a fresh UUID; no `toAccountId`; no
  settings read or write; return the stored entry through `insertEntry`.
- Implement `listIncome` exactly as Spec §5.8: one `r` transaction over
  `entries`, `accounts`, and `categories`; newest first by `date` then `id`
  descending; join names at read time; missing category → `"Uncategorized"`;
  missing account → `"Unknown account"` / `null`; never drop a row; never
  filter archived categories; return `[]` when empty; no `categoryId` in the
  result.
- No schema, index, backup, or settings change.

**Tests** — add `describe('income')` groups for Spec §8.3 cases 1–19:

1. `addIncome` writes exactly one row with the right kind, amount, category,
   account, and date; no `toAccountId`; returns the stored entry; count is 1.
2. Checking, savings, and credit accounts are all accepted.
3. Zero, negative, and non-safe-integer amounts → `invalid-amount`; nothing
   written.
4. Empty, impossible, and malformed dates → `invalid-date`; nothing written.
5. Unknown account → `unknown-account`; unknown category →
   `unknown-category`; nothing written.
6. Archived category → `archived-category`; nothing written.
7. Precedence: invalid amount plus invalid date → `invalid-amount`; invalid
   date plus unknown account → `invalid-date`; unknown account plus unknown
   category → `unknown-account`; unknown category plus archived category →
   `unknown-category`.
8. `addIncome` leaves `settings.lastAccountId` unchanged.
9. `addIncome`, `addExpense`, and `addTransfer` each still write one row after
   the shared helper rename.
10. `listIncome` returns only `kind: 'income'`; expenses, transfers, and
    openings are absent.
11. Date descending, then id descending; same-date ids `'b'` and `'a'` order
    as `['b', 'a']`; a later date sorts first.
12. Category name and account name/type are joined; a credit account reports
    `accountType: 'credit'`.
13. A missing category row and a raw income with no `categoryId` both yield
    `categoryName: 'Uncategorized'` and the row remains.
14. A missing account yields `accountName: 'Unknown account'`,
    `accountType: null`, and the row remains.
15. Renaming a category or account changes later reads without rewriting the
    entry.
16. An archived category still resolves to its name; the list never filters
    it.
17. Empty table yields `[]`.
18. Incomes from different months all appear in one array; no month filter.
19. The returned row has no `categoryId` property.

**Acceptance criteria**

- [x] `addIncome` writes exactly one `entries` row with `kind: 'income'`, the
      input amount/category/account/date, no `toAccountId`, and returns it.
- [x] `requireCategorizedEntryFields` enforces the five checks in the
      normative order; each failure throws the specified `LedgerErrorCode` and
      writes nothing.
- [x] `addIncome` never reads or writes `settings`.
- [x] `CategorizedEntryInput` replaces `ExpenseInput` with no alias; existing
      expense behaviour and tests are unchanged.
- [x] `listIncome` returns only income, newest first by date then id, joins
      names, degrades missing references without dropping the row, and never
      filters archived categories.
- [x] `listTransfers` uses `entriesOfKindNewestFirst` and its observable order
      is unchanged.
- [x] No schema, index, backup, or settings change.
- [x] `npm test` and `npm run typecheck` pass.

---

## 2. Income ledger: correct and remove

**Goal:** `createLedger` can correct the one income row and remove it,
returning the removed snapshot. The stored archived category is allowed on
correction; switching to a different archived category is refused. Removal is
final.

**Blocked by:** 1.

**Spec:** §5.6–5.7, §5.9, §7, §8.3 cases 20–30, §8.6.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- Extend `Ledger` with `updateIncome(id, input)` and `deleteIncome(id)`.
- Implement `updateIncome` exactly as Spec §5.6: one `rw` transaction over
  `accounts`, `categories`, and `entries`; read the row and check `kind`
  before field validation; pass
  `{ allowArchivedCategoryId: existing.categoryId }`; update only `date`,
  `amountMinor`, `accountId`, and `categoryId`; `0` updated → `unknown-entry`;
  return the merged entry with the original `id` and `kind`; preserve any
  stray `toAccountId`; no settings read or write.
- Implement `deleteIncome` exactly as Spec §5.7: one `rw` transaction over
  `entries`; missing → `unknown-entry`; non-income →
  `unsupported-entry-kind`; delete the one row and return the snapshot; no
  tombstone, no settings write.
- Reuse `requireCategorizedEntryFields`; do not duplicate validation.

**Tests** — add Spec §8.3 cases 20–30:

20. Update amount, category, account, and date on one row; count stays 1;
    returned entry keeps the original `id` and `kind`; `listIncome` reflects
    the change.
21. Missing id → `unknown-entry`; non-income id → `unsupported-entry-kind`;
    nothing written.
22. Invalid amount, invalid date, unknown account, unknown category, and
    archived category use the same codes as add; nothing written.
23. An income keeps its stored archived category while the amount, account, or
    date changes.
24. Switching to a different archived category → `archived-category`.
25. A restored income with a stray `toAccountId` keeps it after update; only
    the four editable fields change.
26. Changing the date moves the row in `listIncome` order.
27. `updateIncome` leaves `settings.lastAccountId` unchanged.
28. Delete removes the one row, returns the snapshot, and `listIncome` is
    empty.
29. Delete missing id → `unknown-entry`; non-income id →
    `unsupported-entry-kind`; nothing written.
30. Removing an income leaves `monthSummary` and `categoryEntries` unchanged.

**Acceptance criteria**

- [x] `updateIncome` reads and kind-checks before field validation, updates
      exactly the four editable fields on one row, and never creates a second
      row.
- [x] A missing row between read and update yields `unknown-entry`.
- [x] The stored archived category is allowed on correction; a different
      archived category is refused with `archived-category`.
- [x] A stray `toAccountId` is preserved and never written by the app.
- [x] `deleteIncome` removes the one row, returns the snapshot, and leaves no
      tombstone.
- [x] Both mutations leave `settings.lastAccountId` unchanged.
- [x] `npm test` and `npm run typecheck` pass.

---

## 3. Shared categorized-entry form extraction

**Goal:** The expense form becomes the shared categorized-entry form, and the
generic `ChoiceGroup` moves to its own module. Expense and transfer behaviour
is unchanged. The income screens can now use one form for amount, category,
account, and date.

**Blocked by:** none — can start immediately.

**Spec:** §4.1, §6.7, §7, §8.6.

**Files:** `src/app/choiceGroup.tsx` (new),
`src/app/categorizedEntryForm.tsx` (renamed from `expenseForm.tsx`),
`src/app/transferForm.tsx`, `src/app/screens/AddExpenseScreen.tsx`,
`src/app/screens/EntryEditorScreen.tsx`.

**Build**

- Move `ChoiceGroup` verbatim to `src/app/choiceGroup.tsx`, exporting exactly
  the signature in Spec §6.7.
- Rename `src/app/expenseForm.tsx` to `src/app/categorizedEntryForm.tsx`.
- Rename the exports: `ExpenseFieldErrors` → `CategorizedEntryFieldErrors`,
  `expenseFieldErrors` → `categorizedEntryFieldErrors`, and `ExpenseFields` →
  `CategorizedEntryFields`. Keep the mapper body and field order unchanged.
- Extend the `CategorizedEntryFields` `idPrefix` type to
  `'expense' | 'entry' | 'income'`. The body, field order, error ids, and
  `aria-describedby` wiring are unchanged.
- Import `ChoiceGroup` from `./choiceGroup` in `categorizedEntryForm.tsx`.
- Update `transferForm.tsx` to import `ChoiceGroup` from `./choiceGroup`.
- Update `AddExpenseScreen` and `EntryEditorScreen` imports and type usages to
  the renamed module and names. Pass the same `idPrefix` values as today.
- Delete the old `expenseForm.tsx` path. No compatibility re-export, no second
  form module, and no second `ChoiceGroup`.
- No copy, validation, navigation, delete-confirmation, or behaviour change.

**Tests**

- No new assertions. The refactor is proven by the existing suite:
  `AddExpenseScreen.test.tsx`, `EntryEditorScreen.test.tsx`,
  `AddTransferScreen.test.tsx`, `TransferEditorScreen.test.tsx`, and
  `TransfersScreen.test.tsx` must stay green with no changes.
- `npm run typecheck` proves every import moved.

**Acceptance criteria**

- [x] `choiceGroup.tsx` is the only `ChoiceGroup`; both the categorized-entry
      form and the transfer form import it.
- [x] `categorizedEntryForm.tsx` is the only categorized-entry form module and
      exports the three renamed symbols.
- [x] `ExpenseFields`, `ExpenseFieldErrors`, and `expenseFieldErrors` no
      longer exist anywhere.
- [x] `idPrefix` accepts `'expense'`, `'entry'`, and `'income'`.
- [x] Existing expense and transfer screen tests are unchanged and green.
- [x] `npm test` and `npm run typecheck` pass.

---

## 4. Income route contract

**Goal:** `parseHash` and `routeToHash` understand the three income hashes
with the exact fallbacks in the spec. `App` is intentionally untouched.

**Blocked by:** none — can start immediately.

**Spec:** §6.1, §8.4 cases 1–4.

**Files:** `src/app/router.ts`, `src/app/router.test.ts`.

**Build**

- Add `{ name: 'income' }`, `{ name: 'add-income' }`, and
  `{ name: 'income-entry'; entryId: string }` to `Route`.
- Add the two exact checks after `/transfers/new` and before the
  requested-month computation: `/income` and `/income/new`. `new` must be
  checked before the id branch.
- Add the `/income/` id branch after the existing `/transfers/` branch:
  reject an empty id, a raw slash, and a decode failure; accept an encoded
  slash after decoding; fall back to `currentMonth`, not the requested month.
- Add the three `routeToHash` cases with the exact hashes.
- Do not touch `App`. The new routes render nothing until their screen
  tickets add the switch cases; existing routes are unchanged.

**Tests** — Spec §8.4 cases 1–4:

1. `#/income` and `#/income?x=1` → `{ name: 'income' }`.
2. `#/income/new` and `#/income/new?x=1` → `{ name: 'add-income' }`.
3. `#/income/new/`, `#/income/`, `#/income//`, `#/income/a/b`, and
   `#/income/%E0%A4%A` → home at `currentMonth`.
4. `#/income/abc` and `#/income/abc?m=2026-11` →
   `{ name: 'income-entry', entryId: 'abc' }`; `#/income/abc%2Fdef` →
   `{ name: 'income-entry', entryId: 'abc/def' }`.
5. `routeToHash` returns `#/income`, `#/income/new`, and the encoded entry
   hash.
6. An income id containing reserved characters round-trips.
7. `#/income/new` is never parsed as an id.

**Acceptance criteria**

- [x] The three routes parse exactly as Spec §6.1, including query strings,
      trailing slashes, raw slashes, encoded slashes, and decode failure.
- [x] `routeToHash` is exhaustive and returns the three exact hashes.
- [x] Existing routes and their tests are unchanged.
- [x] `App` is not edited in this ticket.
- [x] `npm test` and `npm run typecheck` pass.

---

## 5. Income list and home entry point

**Goal:** From home, the user opens Income and sees every income newest first
with category, account label, amount, and date. The empty state offers the
first-income action, rows open the editor route, and Back returns home.

**Blocked by:** 1, 2, 4.

**Spec:** §4.5–4.6, §6.3–6.4, §6.9–6.10, §8.5 cases 1–12 and 47, §8.4 cases
5 and 10.

**Files:** `src/app/screens/IncomeScreen.tsx` (new),
`src/app/screens/IncomeScreen.test.tsx` (new), `src/styles.css`,
`src/app/screens/HomeScreen.tsx`, `src/app/screens/HomeScreen.test.tsx`,
`src/app/App.tsx`, `src/app/App.test.tsx`.

**Build**

- Add `IncomeScreen` with the loading, empty, and list states from Spec §6.4.
  It subscribes to `ledger.listIncome()` and `ledger.getSettings()`.
- Render rows in ledger order. Each row is a button whose accessible name is
  exactly `Income: <category>, <amount>, <account label>, <date>`; visible
  fields are category, amount, account, date in that DOM order. Use
  `formatAmount` and `accountWithTypeLabel`. Missing category renders
  `Uncategorized`; missing account renders `Unknown account` with no type
  suffix. Rows with missing references stay rendered and clickable.
- Empty state: `No income yet.` and `Add your first income`; non-empty:
  `Add income`. Both navigate to `#/income/new`.
- Back navigates to home at the current month.
- Add the `.income-list` styles from Spec §6.4: two-row grid, tabular
  right-aligned amount, muted date. Existing styles unchanged. Check no
  horizontal scroll at 320px.
- Add the `Income` button first in the home bottom actions row. The resulting
  order is Income, Transfers, Accounts, Categories, Backup.
- Add the `App` case for `income` importing `IncomeScreen`.
- Do not add the add or editor screens; their App cases land in tickets 6 and
  7. This ticket's row and Add buttons point at routes that are not handled
  yet; see boundary decision 3.
- The screen never sorts, filters, merges, or totals rows.

**Tests** — Spec §8.5 cases 1–12 and 47, §8.4 cases 5 and 10:

1. No income: `No income yet.`, `Add your first income`, Back; clicking the
   first-income button navigates to `#/income/new`.
2. Income exists: rows render in ledger order; each shows category, account
   label, formatted amount, and ISO date.
3. The row's accessible name is exactly the §6.4 template; build it with
   `formatAmount` and `accountWithTypeLabel`.
4. Clicking a row navigates to `#/income/<id>`.
5. A missing category renders `Uncategorized`; a missing account renders
   `Unknown account`; the row remains clickable.
6. After `ledger.addIncome`, the list updates through `waitFor`.
7. After `ledger.renameCategory`, the list shows the new category name.
8. After `ledger.renameAccount`, the list shows the new account name.
9. After `ledger.updateIncome`, the row changes; after `ledger.deleteIncome`,
   the row disappears.
10. The Add income button is present only when the list is non-empty; the
    empty state uses the first-income label.
11. Back navigates to `#/?m=<current month>`.
12. The list shows no total, no month controls, and no filters.
13. With one account, `#/income` renders the `Income` heading (App).
14. The home `Income` button is present in the empty state and navigates to
    `#/income` (App and HomeScreen).

**Acceptance criteria**

- [x] The list state precedence is exactly loading → empty → list.
- [x] Rows are in ledger order and are never sorted, filtered, merged, or
      summed by the UI.
- [x] Each row shows category, amount, account label, and date; the accessible
      name states all four in the exact template.
- [x] Missing categories and accounts render `Uncategorized` and
      `Unknown account`; the row remains clickable.
- [x] Empty and non-empty states use the exact spec copy and actions.
- [x] The home `Income` button is first in the actions row and present in
      every state.
- [x] The list does not scroll horizontally at 320px.
- [x] `npm test` and `npm run typecheck` pass.

---

## 6. Add income screen

**Goal:** The user records an income with the exact defaults and validation,
saves it, and returns to the list. With no active category, the screen
explains the fix and links to Categories instead of rendering a form.

**Blocked by:** 1, 3, 4, 5.

**Spec:** §4.2, §6.5, §6.8–6.10, §8.5 cases 13–28, §8.4 case 6.

**Files:** `src/app/screens/AddIncomeScreen.tsx` (new),
`src/app/screens/AddIncomeScreen.test.tsx` (new), `src/app/App.tsx`,
`src/app/App.test.tsx`.

**Build**

- Create `AddIncomeScreen` with the loading gate and the no-active-category
  gate from Spec §6.5. The gate wins when the category table is empty or every
  category is archived; it renders the exact message and a Categories button
  and no form fields.
- Create `AddIncomeForm` with the exact state initialization: amount blank,
  category unselected, account from a valid `settings.lastAccountId` else the
  first account else `null`, date `todayLocalDate()`.
- Use `CategorizedEntryFields` from ticket 3 with `idPrefix="income"`.
- Implement the submit algorithm from Spec §6.5: `preventDefault`; guard
  `submittingRef`; parse the amount; build local errors in the normative
  order; return without writing when any check fails; call
  `ledger.addIncome`; on success navigate to `#/income` with `replace: true`;
  map `LedgerError` with `categorizedEntryFieldErrors`, falling back to
  `Could not save the income. Try again.`; reset the guard in `finally`.
- `clearError(field)` removes only that field's error and leaves
  `errors.form` untouched.
- Actions: `Save` (submit, primary, disabled while submitting) and `Cancel`
  (navigate to `#/income` with `replace: true`, no write).
- Add the `App` case for `add-income` importing `AddIncomeScreen`.
- No zero-account branch; the App first-run gate owns that. No settings write.

**Tests** — Spec §8.5 cases 13–28 and §8.4 case 6:

13. Every category archived: no-category message, Categories button, no form
    fields.
14. No categories at all: the same no-category state.
15. Active categories: amount blank, category unselected, account preselected
    from `settings.lastAccountId`, date today.
16. A missing or stale `lastAccountId` falls back to the first account.
17. Saves one row with the right kind, amount, category, account, and date;
    navigates to `#/income`; `settings.lastAccountId` unchanged.
18. Accepts a comma decimal separator.
19. Zero and negative amounts show the amount error; no row.
20. A missing category shows `Choose a category.`; no row.
21. A missing account shows `Choose an account.`; no row. Cover by rendering
    with zero accounts directly, outside the App gate.
22. A cleared date shows the date error; no row.
23. An earlier-month date is stored and the list shows it.
24. A credit card can be the account.
25. A rapid double submit writes one row and disables Save.
26. Deleting the chosen account or category after render and saving maps the
    ledger's `unknown-account` or `unknown-category` to the correct field.
27. An archived category is not offered.
28. Cancel returns to `#/income` without writing.
29. With one account, `#/income/new` renders the `Add income` heading (App).

**Acceptance criteria**

- [x] The no-active-category gate renders the exact message and Categories
      action with no form, whether the table is empty or fully archived.
- [x] Defaults are exactly: amount blank; category unselected; account from a
      valid `lastAccountId` else the first account else `null`; date today.
- [x] Amount, category, account, and date validation match Spec §6.5 and map
      ledger codes to the correct fields.
- [x] Saving writes exactly one row, navigates to the list, and does not
      change `settings.lastAccountId`.
- [x] The double-submit guard allows one write and disables Save.
- [x] Archived categories are never offered.
- [x] Cancel returns to the list without writing.
- [x] `npm test` and `npm run typecheck` pass.

---

## 7. Correct and remove income

**Goal:** Opening a row lets the user change the amount, category, account, or
date, or remove the income after a confirmation naming all four. Missing
references start unselected with an error and block saving. An archived stored
category stays selectable as `(archived)`; a different archived category is
refused.

**Blocked by:** 2, 3, 4, 5.

**Spec:** §4.3–4.4, §6.6, §6.9–6.10, §8.5 cases 29–45, §8.4 cases 7 and 9.

**Files:** `src/app/screens/IncomeEditorScreen.tsx` (new),
`src/app/screens/IncomeEditorScreen.test.tsx` (new), `src/app/App.tsx`,
`src/app/App.test.tsx`.

**Build**

- Create `IncomeEditorScreen` with loading; `IncomeNotFound` for a missing or
  non-income entry; and the form keyed by `entry.id`.
- Seed exactly as Spec §6.6: amount via `formatAmountInput`; category from the
  stored id when the row still exists, otherwise `null` with an initial
  category error; category options are active categories plus the stored
  category when archived, labelled `${name} (archived)`; account from the
  stored id when it still exists, otherwise `null` with an initial account
  error; date from the entry.
- Use `CategorizedEntryFields` from ticket 3 with `idPrefix="income"` and pass
  `archivedCategoryId={entry.categoryId}`.
- Submit: same local validation and double-submit guard as add; call
  `ledger.updateIncome(entry.id, …)`; on success navigate to `#/income` with
  `replace: true`; on `unknown-entry` or `unsupported-entry-kind` switch to
  `IncomeNotFound`; otherwise map with `categorizedEntryFieldErrors`, falling
  back to `Could not save the changes. Try again.`; reset the guard in
  `finally`.
- Removal: `Remove income` reveals a `role="group"` panel labelled
  `Confirm removal`. The panel names the stored amount, date, category, and
  account label from stored values, not unsaved form state. Focus moves to
  the panel's Cancel via a ref and `useEffect`. Cancel closes without writing.
  Remove guards `deletingRef`, clears errors, calls
  `ledger.deleteIncome(entry.id)`, navigates to `#/income` on success, switches
  to `IncomeNotFound` on `unknown-entry` / `unsupported-entry-kind`, and
  otherwise shows `Could not remove the income. Try again.` while leaving the
  row in place. Reset the guard in `finally`.
- `clearError(field)` removes only that field's error and leaves
  `errors.form` untouched.
- Add the `App` case for `income-entry` importing `IncomeEditorScreen`.
- No account-count gate on the editor. A missing category or account must
  require a replacement before saving.
- If this session runs long, split removal (confirmation, focus, delete,
  guards; Spec §8.5 40–45) into 7b blocked by 7a. No other ticket changes.

**Tests** — Spec §8.5 cases 29–45 and §8.4 cases 7 and 9:

29. Opens from a list row with amount, category, account, and date prefilled.
30. Saves an amount correction; one row remains; `listIncome` shows the new
    amount.
31. Changes category, account, and date; saves; one row remains; the list
    updates.
32. Changes the date to an earlier month; the row moves in the list and home
    spending is unchanged.
33. Back leaves the row unchanged and returns to `#/income`.
34. A stale id renders `Income not found` with `Back to income`.
35. An expense id renders `Income not found`.
36. A missing stored category starts with the category error and blocks saving
    until a replacement is chosen; the list still shows `Uncategorized`.
37. A missing stored account starts with the account error and blocks saving
    until a replacement is chosen; the list still shows `Unknown account`.
38. An archived stored category is offered as `Name (archived)` and can be
    kept while changing the amount, account, or date; saving succeeds.
39. Switching from an archived stored category to an active category
    succeeds.
40. Remove reveals the group, names the stored amount, date, category, and
    account label, and focuses Cancel.
41. Cancel keeps the row and closes the panel without writing.
42. Remove deletes the row, returns to `#/income`, and leaves home spending
    unchanged.
43. A rapid double submit writes once and disables Save changes.
44. A rapid double Remove calls delete once.
45. Removing the last income shows the empty state.
46. With one account and a stored income, `#/income/<id>` renders the
    `Correct income` heading (App).
47. An unknown income id renders `Income not found` (App).

**Acceptance criteria**

- [x] The editor seeds from the stored row; missing category/account start
      with the correct errors and block saving until replaced.
- [x] An archived stored category is offered as `(archived)` and kept on
      save; switching to a different archived category is refused.
- [x] A correction updates the one row; no second row; the list reflects the
      change immediately; a date change moves the row.
- [x] Back and Cancel leave the row unchanged.
- [x] Removal names the stored amount, date, category, and account label;
      focus moves to Cancel; Cancel writes nothing; Remove deletes and returns
      to the list.
- [x] A failed removal leaves the row and shows the error; a double removal
      deletes once.
- [x] Missing and non-income ids render the not-found state.
- [x] `npm test` and `npm run typecheck` pass.

---

## 8. Spending, backup, and manual acceptance

**Goal:** Prove that income never enters spending, that backup/restore
reproduces income exactly, that the zero-account gate covers all three routes,
and that the slice works in a real browser, offline, at 320px, and with a
screen reader. No production code is expected; fix a real bug in this ticket
and record it.

**Blocked by:** 1–7.

**Spec:** §5.9–5.11, §7, §8.3 cases 31–41, §8.5 case 46, §8.4 case 8, §8.7.

**Files:** `src/data/ledger.test.ts`, `src/app/screens/HomeScreen.test.tsx`,
`src/app/App.test.tsx`. No production file unless a test exposes a defect.

**Tests**

- Add the `describe('income spending invariants')` ledger group:
  31. Snapshot `monthSummary('2026-11')` with one current-month expense; add a
      current-month income; summary is `toEqual` the snapshot.
  32. With a current-month expense and no previous expenses, add a
      previous-month income; `previousMonthHasSpending` stays `false` and rows
      are unchanged.
  33. An income in an earlier month is absent from that month's
      `monthSummary` and `categoryEntries`.
  34. An income sharing a category with an expense is absent from
      `categoryEntries`; the category total is unchanged.
  35. Correcting and removing an income leave the current and previous month
      summaries `toEqual` to their pre-income snapshots.
- Add the backup round-trip group:
  36. `readBackupData()` includes the income; create → serialize → parse →
      restore into a fresh database reproduces it exactly; `listIncome`
      returns the same amount, date, category, and account.
  37. A v1 file with no income restores an empty income list.
  38. A restored income without a `categoryId` is listed as `Uncategorized`.
  39. A restored income with a stray `toAccountId` round-trips; spending reads
      ignore it.
  40. A restored income with a missing account is listed with
      `"Unknown account"`.
  41. `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`; the existing
      schema table/index assertion is unchanged.
- Add the HomeScreen invariant:
  46. Seed an expense in the current month and income in the current month, in
      the previous month, and in the same category as the expense; the
      `Spent` total, category rows, and previous-month comparison are exactly
      what the expenses alone produce. No income row or amount appears.
- Add the App zero-account gate:
  8. With zero accounts, `#/income`, `#/income/new`, and `#/income/<id>`
      redirect to `#/accounts`, like the existing `#/add` gate test.

**Manual verification** — Spec §8.7:

1. Record a paycheck with a Salary category on Checking; it appears once,
   newest first; the home total, category rows, and last-month comparison do
   not move.
2. Record an earlier-month income; it is absent from that month's spending and
   present in the list.
3. Tap a category with both expenses and income; only expenses appear and the
   category total is unchanged.
4. Correct amount, then category, then account, then date; the row updates in
   place and the list reorders on a date change.
5. Archive the income's category; the list keeps the label and the editor
   offers `Name (archived)`; change the amount and save; the category is
   preserved.
6. Try to switch to another archived category; it is not offered and a direct
   attempt is refused.
7. Remove an income; the panel names amount, date, category, and account;
   Cancel keeps it; Remove deletes it; spending stays unchanged.
8. Restore a fixture referencing a missing account or category; the list shows
   `Unknown account` or `Uncategorized` and the editor requires a replacement.
9. Restore a backup containing income in a fresh profile; list and spending
   match.
10. Go offline; repeat record, view, correct, and remove.
11. Check the list and forms at 320px and one desktop width; no horizontal
    scroll.
12. With a screen reader, confirm a row announces category, account, amount,
    and date, and the confirmation panel announces amount, date, category, and
    account.

**Acceptance criteria**

- [x] Adding, correcting, and removing income in the current or previous month
      leaves `monthSummary`, `categoryEntries`, and `previousMonthHasSpending`
      unchanged.
- [x] An income sharing a category with an expense never appears in
      `categoryEntries`.
- [x] A backup/restore round-trip reproduces income exactly under
      `BACKUP_SCHEMA_VERSION = 1`; a no-income v1 file restores an empty list.
- [x] Missing-reference and stray-`toAccountId` rows survive restore and are
      handled by the list/editor.
- [x] The zero-account gate redirects all three income routes to Accounts.
- [x] The manual checklist above passes in a real browser, offline, at 320px
      and one desktop width, with the screen-reader checks recorded.
- [x] `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`.
- [x] `npm test` and `npm run typecheck` pass.

---

## Slice close-out

- [x] All eight tickets pass their tests; `npm test` and `npm run typecheck`
      are green on `slice-07`.
- [x] The architecture, spec, and these tickets reflect what was built; no
      production divergence; both version constants remain `1`.
- [x] No table, index, backup field, settings write, endpoint, or ADR was
      added.
- [x] `docs/product/backlog.md` marks slice 7 complete and confirms slice 6
      (balances) is still the next slice.
- [x] Slice handoff written to `docs/agents/slice-07-closeout-handoff.md`.
