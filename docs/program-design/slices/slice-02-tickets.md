# Slice 02 Tickets — Inspect and correct entries

- **Gate:** Ticket Breakdown (workflow step 6)
- **Sources:** `docs/program-design/slices/slice-02-spec.md` (the contract;
  sections are cited per ticket), `docs/architecture/slices/slice-02-architecture.md`,
  `docs/standards.md`
- **Branch:** `slice-02`
- **Status:** ready to build

Each ticket is one build session, test-first, and one commit when its tests
pass. Tickets are ordered by dependency, not by spec section order. Tickets 1
and 2 add no UI; they ship green and are verified at the ledger seam, as
slice 1 did for its read and write tickets.

---

## Ticket order at a glance

| # | Ticket | Blocked by |
|---|---|---|
| 1 | Ledger read models and shared vocabulary | — |
| 2 | Ledger writes for correction and removal | 1 |
| 3 | Shared expense fields prefactor | — |
| 4 | Category entries list | 1 |
| 5 | Entry editor and correction save | 1, 2, 3, 4 |
| 6 | Removal with confirmation | 2, 5 |

Frontier: 1 and 3 can start immediately and in either order. After 1, ticket 4
is unblocked; 2 is also unblocked but 5 needs both. Ticket 6 is the tail.

Why not spec order: the spec's §17 order (reads → writes → primitives → screens)
is the right *build* order inside the slice, but ticket 3 is independent of the
ledger entirely and ticket 4 needs only the read models, so both can run before
the write path is finished. Tickets are sequenced by what actually gates them.

---

## Standing rules for every ticket

- Failing test first, then the minimum implementation, same session. A ticket
  that changes a runnable surface is not done on tests alone — run it.
- Assert `LedgerError.code`, never `message` text. Assert accessible text at
  the UI seam.
- Known-good literals; never recompute the expected value the way the
  implementation does.
- Real `BudgetDatabase` per test (`budget-test-${crypto.randomUUID()}`), deleted
  in `afterEach`; `fake-indexeddb` is the only boundary.
- Raw `db.entries.add` fixtures only for rows no write path can produce
  (non-expense kinds, missing category).
- `waitFor` for live-query updates; no sleeps, no fake timers.
- No new dependency, no schema change, no new test seam, no mocked ledger.
- Module direction holds: no UI import of `data/db` or `dexie`; no domain
  import of `data/` or `app/`.
- If the build contradicts the spec, fix the spec in the same commit. Do not
  diverge silently.

---

## Boundary decisions

These are the calls the spec left open or stated inconsistently. Each is
resolved here; challenge them before building if you disagree.

1. **Add-form error ids.** §12.1 defines error ids as
   `${idPrefix}-amount-error` / `${idPrefix}-date-error` but also says the add
   screen keeps "its existing ids and tests". The current add form uses
   `amount-error` / `date-error` (input ids are already `expense-amount`).
   Resolution: adopt the prefixed form for all four fields
   (`expense-amount-error`, `expense-category-error`,
   `expense-account-error`, `expense-date-error`; `entry-…` in the editor).
   No test queries an error id — they query labels, `aria-pressed`, and text —
   so "existing tests" still pass unchanged. The spec's two named rules win;
   the "existing ids" sentence describes the *input* ids.
2. **A route variant lands with the screen that renders it.** `tsconfig` has no
   `noImplicitReturns`, so adding a `Route` member without an `App` case still
   typechecks and renders `undefined` at runtime for that hash. Co-locating the
   variant, its `App` case, and its screen (tickets 4 and 5) means no commit
   ever leaves a reachable hash unrendered.
3. **`unknown-entry` / `unsupported-entry-kind` land in ticket 1**, before any
   thrower exists. Both writes need them; putting them in ticket 2 would make
   removal a fake blocker on correction. They are contract members, not dead
   code.
4. **Correction and removal share ticket 2.** `deleteExpense` alone is a
   20-minute ticket; splitting it costs more in review overhead than it buys.
   If you want finer review granularity, split at `deleteExpense` and nothing
   else in this file changes.
5. **Ticket 5 is the largest.** It is roughly the size of slice 1's
   add-expense ticket, with the seed-once form as the added risk. If it
   overruns, the split line is "open + prefill + Back + not-found" versus
   "save" — but that split ships a form with no commit path, so prefer one
   session.
6. **Same-day order stays `id` desc**, which is deterministic but not insertion
   order (§17). No ticket tries to fix it; that needs `createdAt` and is out of
   scope.

---

## 1. Ledger read models and shared vocabulary

**Goal:** the ledger can answer "what is in this category this month" and "what
is this entry", using one shared set of category literals — the two reads both
new screens need.

**Blocked by:** none.

**Spec:** §5.1, §5.3, §9.1, §9.6, §9.7, §9.8, §13.4.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- Rename `AddExpenseInput` to `ExpenseInput`; no alias, no re-export. Its only
  reference is the `addExpense` signature.
- Export `UNCATEGORIZED_CATEGORY_ID` and `UNCATEGORIZED_LABEL`. Replace the
  four literals in `monthSummary`; its output is unchanged.
- Add `EntryListItem` and `CategoryEntries` to the ledger's public types, and
  `getEntry` / `categoryEntries` to `Ledger`.
- `getEntry`: primary-key read; return `entry ?? null`. The `?? null` is
  mandatory — `useLiveQuery` treats `undefined` as "not loaded". No kind
  filter, no joins.
- `categoryEntries` exactly as §9.7: month prefix, expense-only, category
  filter including the sentinel, `bulkGet` accounts into a map, category name
  resolution with `Uncategorized` fallback, sort `date` desc then `id` desc
  *before* mapping, `totalMinor` as the row sum. Invalid month throws
  `RangeError`.
- Add `unknown-entry` and `unsupported-entry-kind` to `LedgerErrorCode` with
  the §5.3 messages. Nothing throws them yet.

**Tests** (§13.4, read-model and `getEntry` lists)

- Category-month filtering, month filtering, credit-card inclusion.
- Sort: date desc, then id desc for same-day rows (insert fixtures out of
  order so the assertion is not insertion order).
- `totalMinor` equals the row sum; the total equals the matching
  `monthSummary` row for every row of a mixed month.
- Empty category-month: zero rows, resolved name, `totalMinor: 0`.
- Invalid month → `RangeError`.
- Raw entry with no `categoryId` lands under the sentinel with
  `Uncategorized`; a missing account row yields `Unknown account` /
  `accountType: null`; a missing category row yields `Uncategorized`; both
  retain their amount in the total.
- Archived category still resolves its name.
- `getEntry`: known id returns the row; unknown id returns `null` (assert
  `null`, not `undefined`); a non-expense row comes back unchanged.

**Acceptance criteria**

- [ ] `npm run test` and `npm run typecheck` pass, including every existing
      slice-1 ledger and UI test unchanged.
- [ ] `monthSummary` output is identical before and after the literal
      replacement (existing tests are the proof).
- [ ] No UI file changed.

---

## 2. Ledger writes for correction and removal

**Goal:** one entry can be corrected in place or hard-deleted, with the same
validation the add path uses and no other row touched.

**Blocked by:** 1 (input type name, shared error codes).

**Spec:** §9.2, §9.3, §9.4, §9.5, §9.9, §13.4.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- Extract the private `requireExpenseFields(input)` inside `createLedger`:
  amount → date → account → category, first failure wins, returns `void`.
  `addExpense` calls it inside its existing `rw` transaction; behaviour and
  error codes are unchanged.
- `updateExpense(id, input)`: one `rw` transaction over `accounts`,
  `categories`, `entries`; read the row, `unknown-entry`, then
  `unsupported-entry-kind`, then `requireExpenseFields`, then
  `entries.update` with the four fields; `updated === 0` → `unknown-entry`;
  return the merged row. Never touch `settings`.
- `deleteExpense(id)`: one `rw` transaction over `entries`; read, `unknown-entry`,
  `unsupported-entry-kind`, delete, return the snapshot. Hard delete.
- Keep `id`, `kind`, and `toAccountId` untouched by both.

**Tests** (§13.4, `updateExpense` and `deleteExpense` lists)

- Update changes the four fields, preserves `id`/`kind`, leaves every other
  row byte-identical.
- Moving amount/category/date is reflected in `monthSummary` rows and months.
- Each rejection code, including the precedence case (invalid amount + unknown
  account → `invalid-amount`) and update-on-unknown-id with an invalid amount →
  `unknown-entry`.
- Non-expense row rejected with `unsupported-entry-kind` on both operations.
- `settings.lastAccountId` unchanged by both.
- Saving identical values succeeds and returns the merged row.
- Delete removes exactly one row, returns the snapshot, and empties the month
  when it was the last entry.

**Acceptance criteria**

- [ ] Every `addExpense` test from slice 1 passes with no edits.
- [ ] Update and delete never write `settings`.
- [ ] No schema, index, or version change.

---

## 3. Shared expense fields prefactor

**Goal:** the add form's fields, choice group, and error mapping become one
reusable module so the editor does not fork the add form. Add-expense behaviour
is byte-for-byte unchanged.

**Blocked by:** none.

**Spec:** §12.1, §12.6, §12.7.

**Files:** `src/app/expenseForm.tsx` (new), `src/app/screens/AddExpenseScreen.tsx`.

**Build**

- Export `ExpenseFieldErrors`, `expenseFieldErrors(code)`, `ChoiceGroup`, and
  `ExpenseFields` with the §12.1 signatures.
- Move `ChoiceGroup` unchanged. `ExpenseFields` renders amount, category,
  account, date in that order with the current markup.
- Add screen passes `idPrefix="expense"`; its copy, defaults, submit flow,
  navigation, and first-run guards are unchanged. Its error fallback becomes
  `expenseFieldErrors(code) ?? { form: 'Could not save the expense. Try again.' }`
  so the slice-1 fallback text survives.
- Error ids follow boundary decision 1.

**Tests**

- No new test file. The proof is that `AddExpenseScreen.test.tsx` passes
  unchanged: every label, `aria-pressed` state, error text, default, and
  destination still holds.

**Acceptance criteria**

- [ ] `AddExpenseScreen.test.tsx` passes with zero edits.
- [ ] No duplicated field markup remains in `AddExpenseScreen.tsx`.
- [ ] `expenseFieldErrors` maps the four field codes and returns `null` for
      everything else (observed through the add tests and later the editor).

---

## 4. Category entries list

**Goal:** tapping any home category row — including `Uncategorized` — opens
that category's entries for the displayed month, newest first, with a total
that equals the row that was tapped, and Back returns to the same month.

**Blocked by:** 1 (`categoryEntries`, sentinel constant).

**Spec:** §10.1 (category rows), §10.2 step 5, §10.3, §10.4 (home row, list
Back, list row), §11.1, §12.2, §12.3, §12.8, §13.5, §13.6 (list bullets).

**Files:** `src/app/router.ts`, `src/app/router.test.ts`, `src/app/App.tsx`,
`src/app/screens/HomeScreen.tsx`, `src/app/screens/HomeScreen.test.tsx`,
`src/app/screens/CategoryEntriesScreen.tsx` (new),
`src/app/screens/CategoryEntriesScreen.test.tsx` (new), `src/styles.css`.

**Build**

- Add the `category` route variant; parse per §10.2 step 5 (missing/empty `c`
  → home for the parsed month); serialize with `m` then `c`, encoding `c`.
- `App` case rendering the screen; the variant and case land together.
- Home rows become buttons with the explicit `aria-label` from §12.2, wrapping
  the existing two spans. Ordering, month controls, total, empty state, and
  actions unchanged.
- `CategoryEntriesScreen`: live queries for entries and settings; loading
  state; heading; `Spent` total; `entry-list` rows with explicit
  `aria-label`; row → entry route; Back → home for the list's month; empty
  copy; `ambiguousNames` type suffix; date rendered as the stored string.
- Styles: `entry-list` row layout and the button form of a category row.

**Tests**

- Router: every `category` row of §10.1, plus round-trip for an id containing
  `&`, `?`, `#`, and a space.
- Home: each row is a button with the deterministic accessible name; clicking
  opens the list.
- List: heading names category and month; total equals the home row's amount;
  rows newest first with amount, date, account; `Uncategorized` reachable;
  Back keeps the month; empty copy plus working Back; duplicate account names
  get suffixes, a unique name does not.

**Acceptance criteria**

- [ ] In `npm run dev`, home → list → Back round-trips the same month in a real
      browser, including a month reached with the month arrows.
- [ ] The list total is asserted equal to the tapped home row, not to a
      separately computed sum.
- [ ] No entry row offers an edit affordance beyond the row itself.

---

## 5. Entry editor and correction save

**Goal:** tapping a listed entry opens it prefilled; changing any of the four
fields and saving corrects the stored entry in place and lands on the list that
now holds it, with home and list totals already updated. A stale link says the
entry is gone.

**Blocked by:** 1 (`getEntry`), 2 (`updateExpense`), 3 (`ExpenseFields`),
4 (the list is the Back and save destination, and the route tests share the
file).

**Spec:** §6.1, §10.1 (entry rows), §10.2 step 6, §10.3, §10.4 (editor Back,
save, not-found), §11.2, §11.3, §11.5, §11.6, §11.7, §12.4, §12.6, §12.7,
§13.3, §13.5, §13.6 (editor bullets except removal).

**Files:** `src/domain/money.ts`, `src/domain/money.test.ts`,
`src/app/router.ts`, `src/app/router.test.ts`, `src/app/App.tsx`,
`src/app/screens/EntryEditorScreen.tsx` (new),
`src/app/screens/EntryEditorScreen.test.tsx` (new), `src/styles.css`.

**Build**

- `formatAmountInput` per §6.1, reusing `parseAmount`'s exponent guard, plus
  the round-trip property test.
- Add the `entry` route variant; parse per §10.2 step 6 (empty segment, extra
  `/`, malformed escape, empty decoded id → home for the current month);
  serialize with `encodeURIComponent`. `App` case lands with the screen.
- Loader: four live queries; `Loading…` while any is `undefined`; not-found
  when `entry === null` or `kind !== 'expense'`.
- `EntryForm key={entry.id}` seeded once in `useState` initializers, including
  the missing-reference cases: selection `null` plus the matching unknown-
  reference error, so saving is blocked until a real row is chosen.
- Submit per §11.3: client checks, ref guard, `updateExpense`, navigate with
  `replace` to `monthOf(updated.date)` + the validated `categoryId`; map
  `unknown-entry` / `unsupported-entry-kind` to not-found; other codes to field
  or form errors.
- Back per §11.5: navigate to the stored category and month, no write, no
  prompt.
- Action row: `Save changes` and `Back`, both disabled while submitting.
  `Remove entry` arrives in ticket 6.

**Tests**

- `formatAmountInput`: the §6.1 table at exponents 0, 2, 6; round-trip for
  `0`, `1`, values shorter than the exponent, a large safe integer; trailing
  zeros kept; negative renders `-`; invalid exponent and unsafe amount throw.
- Router: every `entry` row of §10.1 plus the round-trip id with reserved
  characters.
- Editor: prefill of all four fields with a plain decimal amount; amount edit
  updates list, home row, home total; category change moves the amount and
  lands on the new list; date change lands on the new month and the old month
  loses it; Back writes nothing; stale id shows not-found and `Go home` works;
  missing stored category starts with the error and blocks save; double Save
  writes once.

**Acceptance criteria**

- [ ] In `npm run dev`, open a real entry, change only the amount, save, and
      observe the new list total and the home row without a refresh.
- [ ] The save destination uses the validated category, not
      `updated.categoryId`.
- [ ] The editor never reads or writes `settings.lastAccountId`; the ledger
      guarantee is asserted in ticket 2.

---

## 6. Removal with confirmation

**Goal:** an opened entry can be removed after an inline confirmation that
names the stored amount, date, and account; removal lands on the remaining
category list, or on that month's home when the category is now empty.

**Blocked by:** 2 (`deleteExpense`), 5 (the editor and its action row).

**Spec:** §10.4 (remove destinations), §11.4, §11.6 (stale on remove), §12.5,
§12.6, §12.7, §13.6 (removal bullets).

**Files:** `src/app/screens/EntryEditorScreen.tsx`,
`src/app/screens/EntryEditorScreen.test.tsx`, `src/styles.css`.

**Build**

- `Remove entry` button in the action row; opening the panel replaces the row,
  moves focus to `Cancel`, and writes nothing.
- Panel per §12.5: labelled group, copy built from the **stored** entry, no
  Escape handler, no trap, no backdrop.
- Confirm per §11.4: ref guard, `deleteExpense`, post-delete
  `categoryEntries` read, navigate `replace` to the list or to home when no
  rows remain; `unknown-entry` / `unsupported-entry-kind` → not-found; other
  errors → `Could not remove the entry. Try again.`
- `submitting || deleting` disables the action row; destructive styling only if
  the panel needs it.

**Tests**

- Cancel keeps the entry and closes the panel.
- Confirm removes it; list and home totals update without a refresh.
- Removing the category's last entry lands on home for that month without the
  category; removing the month's last entry shows the home empty state.
- A credit-card entry removes like a checking one.
- The confirmation names the stored values after the form fields were changed
  without saving.
- Double-clicking `Remove` deletes once.
- Stale entry on remove → not-found.

**Acceptance criteria**

- [ ] In `npm run dev`, remove an entry, then confirm the home total, the
      category row, and the month's empty state all match expectations.
- [ ] The confirmation never reads form state.
- [ ] No undo, tombstone, or history row exists after removal.

---

## Slice close-out

Per workflow step 9: every ticket's tests pass, a fresh-session `code-review`
against `docs/standards.md` and this spec approves, this file and the spec
reflect what was built, `docs/product/backlog.md` marks slice 2 done, and a
slice-level `handoff` is written.

Not in these tickets (spec §16): undo, audit history, soft delete, bulk
operations, category management, export/import, account deletion, income or
transfers, multi-currency, any schema or Dexie version change, and any visual
redesign.
