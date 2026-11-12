# Slice 07 Program Design Spec — Record income

- **Gate:** Slice Program Design (workflow step 5).
- **Status:** specified 2026-11-12; not built.
- **Sources:** `docs/product/slices/slice-07-scope.md`,
  `docs/architecture/slices/slice-07-architecture.md`,
  `docs/architecture/north-star.md`,
  `docs/architecture/slices/slice-01-architecture.md`,
  `docs/architecture/slices/slice-02-architecture.md`,
  `docs/architecture/slices/slice-05-architecture.md`,
  `docs/architecture/slices/slice-08-architecture.md`,
  `docs/program-design/slices/slice-01-spec.md`,
  `docs/program-design/slices/slice-02-spec.md`,
  `docs/program-design/slices/slice-05-spec.md`,
  `docs/program-design/slices/slice-08-spec.md`, `CONTEXT.md`, and the current
  `src/` code.
- **Endpoints:** none. The app is static files plus IndexedDB (ADR 0001);
  `Ledger` is the whole application API. This slice adds no network call, no
  server validation, and no new persistence seam.
- **Prototype:** one throwaway state-model reducer. It settled the only
  implementation-level state question: how the income editor behaves when the
  stored category or account is missing, archived, or replaced. §9 records
  what was tried and what changed. No production code or prototype file
  remains.

---

## 1. Problem Statement

The app records spending and transfers between the user's own accounts, but it
cannot record money arriving from outside those accounts: a paycheck, interest,
or a cash gift. A checking account's history is therefore missing every
inflow, and the app cannot yet be the only ledger the product vision describes.

Recording a paycheck as an expense would be wrong: it would inflate the
month's spending and put money in a category breakdown that is meant to explain
outflows. Leaving income out keeps the ledger incomplete. The user needs one
place to record money coming in, see it, correct it, and remove it, without
changing the spending headline.

## 2. Solution

The user records one income: the account the money arrives in, one category,
a positive amount, and a date. The date defaults to today and can be changed,
including to an earlier month. The category list is the same flat list used for
expenses; there is no second income-category list. Archived categories are not
offered for new income, but an income already filed under a category that was
later archived keeps its label and can still be corrected.

Saving writes exactly one `entries` row with `kind: 'income'` and a positive
`amountMinor`. The effect is `+accountId`; no sign is stored, and no
`toAccountId` is written. The income list is one newest-first list reached from
home. It shows the date, category, account, and amount, and it has no total,
month filter, or pagination.

Opening an income lets the user change the amount, category, account, or date,
or remove it after a confirmation that names all four. Corrections update the
one row. Removal is final. Neither changes a spending total, because income is
never spending: the existing `kind === 'expense'` predicates already exclude
it from `monthSummary` and `categoryEntries`.

No table, index, Dexie schema version, backup version, or settings write
changes. A v1 backup already carries income and restores it exactly.

## 3. User Stories

### Recording income

1. As a user, I want to record money arriving from outside my own accounts, so
   that my ledger holds the paycheck.
2. As a user, I want to choose the account the money arrives in, so that the
   inflow is attached to the right account.
3. As a user, I want to choose one category, so that I can say why the money
   arrived.
4. As a user, I want to use the same category list as expenses, so that I do
   not manage two lists.
5. As a user, I want to add a category such as Salary in Categories and then
   use it for income, so that a new reason does not require a new feature.
6. As a user, I want the amount to be greater than zero, so that a zero or
   negative inflow is not recorded.
7. As a user, I want to enter the amount the same way as an expense, so that I
   do not learn a second amount format.
8. As a user, I want the date to default to today, so that the common case is
   one less step.
9. As a user, I want to change the date, including to an earlier month, so that
   I can record a past paycheck.
10. As a user, I want saving to show the income in the list, so that I know it
    was recorded.
11. As a user, I want the income to be one movement into one account, so that
    it is not confused with a transfer.
12. As a user, I want money moving between my own accounts to stay a transfer,
    so that income means money from outside.
13. As a user, I want no payee, employer, note, tax, gross/net, or withholding,
    so that the record stays simple.
14. As a user, I want no splitting across accounts or categories, so that one
    income stays one row.

### Categories

15. As a user, I want a category to be required, so that every income has a
    reason.
16. As a user, I want archived categories not to be offered for new income, so
    that retired labels do not come back.
17. As a user, I want an income already recorded under an archived category to
    keep its label, so that history is not rewritten.
18. As a user, I want to correct other fields of that income without changing
    its archived category, so that history remains editable.
19. As a user, I want switching to a different archived category to be
    refused, so that archived categories cannot be reintroduced.
20. As a user, I want renaming a category to change the label on income, so
    that the list reflects the current name.
21. As a user, I want a message when there is no category to file income under,
    so that I know what to fix.
22. As a user, I want that message to link to Categories, so that the fix is
    one tap away.

### Seeing income

23. As a user, I want an Income action on home, so that recording income is
    part of the same short flow as recording a purchase.
24. As a user, I want one income list, so that I do not hunt through months.
25. As a user, I want the list newest first, so that recent income is easy to
    find.
26. As a user, I want each row to show the date, category, account, and amount,
    so that I can identify the income.
27. As a user, I want account labels to include the account type, so that two
    accounts with the same name are distinguishable.
28. As a user, I want an empty list message, so that I know no income exists.
29. As a user, I want an “add your first income” action in the empty state, so
    that the empty state is actionable.
30. As a user, I want the list to show the whole income history, so that I do
    not navigate month by month.
31. As a user, I want no total on the list, so that income does not become a
    second headline.
32. As a user, I want no month controls or filters, so that the list stays one
    simple list.
33. As a user, I want a Back action from the list, so that I can return to home
    without relying on the browser.

### Correcting and removing income

34. As a user, I want to open an income from the list, so that I can correct
    it.
35. As a user, I want to change the amount, category, account, or date, so that
    the stored income matches reality.
36. As a user, I want a correction to update the one row, so that no duplicate
    is created.
37. As a user, I want the list to update immediately after a correction, so
    that I do not need to refresh.
38. As a user, I want Back and Cancel to leave the income unchanged, so that
    opening the editor is safe.
39. As a user, I want a missing category to show as unselected with an error,
    so that I must choose a replacement before saving.
40. As a user, I want a missing account to do the same, so that income is never
    saved to nowhere.
41. As a user, I want an archived stored category to remain selectable as
    “(archived)”, so that I can correct the amount without losing the label.
42. As a user, I want to remove an income, so that a mistaken income can be
    deleted.
43. As a user, I want removal to ask for confirmation naming the amount, date,
    category, and account, so that I do not delete the wrong row.
44. As a user, I want focus to move to Cancel when the confirmation opens, so
    that I can dismiss it without hunting.
45. As a user, I want removal to be final, so that the ledger keeps no hidden
    tombstones.
46. As a user, I want a failed removal to leave the row in place and show an
    error, so that I can retry.

### Spending, backups, and offline

47. As a user, I want income never to appear in the home total, so that a
    paycheck is not spending.
48. As a user, I want income never to appear in the category breakdown, so that
    spending categories stay clean.
49. As a user, I want income in the previous month not to create a comparison
    row, so that last-month spending is unchanged.
50. As a user, I want income dated in an earlier month not to affect that
    month's spending, so that history stays correct.
51. As a user, I want tapping a category to show only its expenses, so that
    income sharing the category does not pollute it.
52. As a user, I want correcting or removing income not to change a spending
    total, so that the headline is stable.
53. As a user, I want a backup to include income, so that my ledger is
    complete.
54. As a user, I want restore to reproduce income exactly, so that no inflow is
    lost.
55. As a user, I want income to work offline, so that the app works on a phone
    with no connection.

### Accessibility

56. As a screen-reader user, I want each row to announce the category, account,
    amount, and date, so that I do not rely on visual layout.
57. As a screen-reader user, I want the confirmation panel to name the amount,
    date, category, and account, so that I know what I am removing.
58. As a screen-reader user, I want field errors associated with their inputs,
    so that I know which field to correct.
59. As a screen-reader user, I want form-level errors announced, so that I know
    a save or removal failed.

## 4. Seams and Call Stacks

### 4.1 One seam

The slice crosses the existing `Ledger` seam only. There is no repository
interface, no fake adapter, no new persistence module, and no test-only export.

| Module | Responsibility in this slice |
|---|---|
| `src/data/ledger.ts` | Owns `CategorizedEntryInput`, `IncomeListItem`, `listIncome`, `addIncome`, `updateIncome`, `deleteIncome`, the renamed private `requireCategorizedEntryFields`, the private `insertEntry`, and the private `entriesOfKindNewestFirst`. `ExpenseInput` is renamed; `listTransfers` is refactored onto the shared ordering helper. |
| `src/domain/types.ts` | Unchanged. `Entry` already has `kind: 'income'` and an optional `categoryId`. |
| `src/domain/money.ts` | Unchanged. `parseAmount`, `formatAmount`, and `formatAmountInput` are reused. |
| `src/domain/calendar.ts` | Unchanged. `isValidLocalDate`, `todayLocalDate`, and `monthOf` are reused. |
| `src/domain/backup.ts` | Unchanged. v1 already accepts and carries income. |
| `src/data/db.ts` | Unchanged. Still not imported by the UI. |
| `src/app/router.ts` | Gains three `Route` members, three parse branches, and three `routeToHash` cases. Existing routes are unchanged. |
| `src/app/App.tsx` | Gains three `switch` cases. The first-run gate is unchanged. |
| `src/app/choiceGroup.tsx` | New home for the generic `ChoiceGroup`, moved verbatim from `expenseForm.tsx`. |
| `src/app/categorizedEntryForm.tsx` | Renamed from `expenseForm.tsx`; exports `CategorizedEntryFieldErrors`, `categorizedEntryFieldErrors`, and `CategorizedEntryFields`. |
| `src/app/transferForm.tsx` | Imports `ChoiceGroup` from `./choiceGroup`; no behaviour change. |
| `src/app/screens/AddExpenseScreen.tsx` | Imports the renamed categorized-entry module and types; no behaviour change. |
| `src/app/screens/EntryEditorScreen.tsx` | Imports the renamed categorized-entry module and types; no behaviour change. |
| `src/app/screens/IncomeScreen.tsx` | New: list states, rows, labels, and navigation. |
| `src/app/screens/AddIncomeScreen.tsx` | New: no-category gate, defaults, form, validation, save. |
| `src/app/screens/IncomeEditorScreen.tsx` | New: seeding, correction, removal, not-found. |
| `src/app/screens/HomeScreen.tsx` | Gains one Income button in the bottom actions row. No data read changes. |
| `src/styles.css` | Gains income-list styles. Existing styles are unchanged. |

No new dependency is added. No endpoint is added.

### 4.2 Add income call stack

| Step | Caller | Callee | Effect |
|---|---|---|---|
| 1 | user submits the form | `AddIncomeForm.submit` | `preventDefault`; returns immediately if `submittingRef.current` is true |
| 2 | `submit` | `parseAmount(amountText, settings.currencyExponent)` | integer minor units or `null` |
| 3 | `submit` | `isValidLocalDate(date)` | `boolean` |
| 4 | `submit` | local field checks | sets `CategorizedEntryFieldErrors`; returns when any check fails |
| 5 | `submit` | `ledger.addIncome(input)` | one public call |
| 6 | `addIncome` | `db.transaction('rw', db.accounts, db.categories, db.entries, …)` | opens one write transaction; `settings` is deliberately absent |
| 7 | transaction body | `requireCategorizedEntryFields(input)` | amount → date → account exists → category exists → category not archived |
| 8 | `requireCategorizedEntryFields` | `db.accounts.get(input.accountId)` | account existence |
| 9 | `requireCategorizedEntryFields` | `db.categories.get(input.categoryId)` | category existence and archived state |
| 10 | transaction body | `insertEntry(entry)` | the only `entries.add` call on the add path |
| 11 | `insertEntry` | `db.entries.add(entry)` | writes one row; returns the entry |
| 12 | `submit` | `navigate({ name: 'income' }, { replace: true })` | replaces the form with the list |
| 13 | `useHashRoute` → `App` | `IncomeScreen` | its live query re-runs after the `entries` write |

### 4.3 Update income call stack

| Step | Caller | Callee | Effect |
|---|---|---|---|
| 1 | user submits the form | `IncomeEditorForm.submit` | `preventDefault`; guard `submittingRef` |
| 2 | `submit` | `parseAmount`, `isValidLocalDate`, local checks | same validation as add |
| 3 | `submit` | `ledger.updateIncome(entry.id, input)` | one public call |
| 4 | `updateIncome` | `db.transaction('rw', db.accounts, db.categories, db.entries, …)` | one write transaction |
| 5 | transaction body | `db.entries.get(id)` | missing → `unknown-entry` |
| 6 | transaction body | `existing.kind !== 'income'` | `unsupported-entry-kind` |
| 7 | transaction body | `requireCategorizedEntryFields(input, { allowArchivedCategoryId: existing.categoryId })` | same five checks as add, with the stored archived category allowed |
| 8 | transaction body | `db.entries.update(id, { date, amountMinor, accountId, categoryId })` | updates the one row; `0` updated → `unknown-entry` |
| 9 | transaction body | return `{ ...existing, date, amountMinor, accountId, categoryId }` | merged entry with the original `id` and `kind` |
| 10 | `submit` | `navigate({ name: 'income' }, { replace: true })` | returns to the list |
| 11 | live query | `listIncome` | row order and values update through Dexie invalidation |

### 4.4 Delete income call stack

| Step | Caller | Callee | Effect |
|---|---|---|---|
| 1 | user confirms removal | `confirmRemove` | guard `deletingRef`; clears form errors |
| 2 | `confirmRemove` | `ledger.deleteIncome(entry.id)` | one public call |
| 3 | `deleteIncome` | `db.transaction('rw', db.entries, …)` | one write transaction |
| 4 | transaction body | `db.entries.get(id)` | missing → `unknown-entry` |
| 5 | transaction body | `existing.kind !== 'income'` | `unsupported-entry-kind` |
| 6 | transaction body | `db.entries.delete(id)` | removes the one row |
| 7 | transaction body | return `existing` | removed snapshot |
| 8 | `confirmRemove` | `navigate({ name: 'income' }, { replace: true })` | returns to the list |
| 9 | live query | `listIncome` | row disappears through Dexie invalidation |

### 4.5 List read call stack

| Step | Caller | Callee | Effect |
|---|---|---|---|
| 1 | `IncomeScreen` render | `useLiveQuery(() => ledger.listIncome(), [ledger])` | subscribes to `entries`, `accounts`, and `categories` |
| 2 | `listIncome` | `db.transaction('r', db.entries, db.accounts, db.categories, …)` | one consistent read snapshot |
| 3 | transaction body | `entriesOfKindNewestFirst('income')` | reads through the `date` index, filters the kind, then sorts by date desc, id desc |
| 4 | transaction body | unique `accountId` values | the accounts to join |
| 5 | transaction body | unique non-`undefined` `categoryId` values | the categories to join |
| 6 | transaction body | `db.accounts.bulkGet(accountIds)` | one account join read |
| 7 | transaction body | `db.categories.bulkGet(categoryIds)` | one category join read |
| 8 | transaction body | map rows; missing category → `"Uncategorized"`; missing account → `"Unknown account"` / `null` | never drops an income row |
| 9 | `IncomeScreen` | `useLiveQuery(() => ledger.getSettings(), [ledger])` | currency and exponent for display only |

The `r` transaction is required, not decorative: without it a rename landing
between the `entries` read and the account/category reads could render one row
with the old label and the next with the new one until the live query re-runs.
Dexie queues a write behind the read transaction and invalidates the query
afterwards.

### 4.6 Live invalidation

| Write | Tables touched | What re-runs | Visible effect |
|---|---|---|---|
| `addIncome` | `entries` | `listIncome`, `getEntry`, `monthSummary`, `categoryEntries` | the list gains one row; home totals and category rows are unchanged |
| `updateIncome` | `entries` | `listIncome`, `getEntry`, `monthSummary`, `categoryEntries` | the row moves/changes in the list; home totals are unchanged |
| `deleteIncome` | `entries` | `listIncome`, `getEntry`, `monthSummary`, `categoryEntries` | the row disappears; home totals are unchanged |
| `renameCategory` | `categories` | `listIncome`, `listCategories`, `monthSummary`, `categoryEntries` | income rows show the current category name; amounts unchanged |
| `renameAccount` | `accounts` | `listIncome`, `listAccounts`, `categoryEntries` | income rows show the current account name; amounts unchanged |
| `restoreBackup` | all four tables | every live query | the list is recomputed from the restored entries |

No manual cache, event bus, refresh button, or cross-tab coordination is added.
The single-tab assumption carries over: the editor seeds its form once from the
loaded entry, and a concurrent change from another tab is visible to live
queries but not merged into a half-edited form.

## 5. Implementation Decisions — Data Contract

### 5.1 Types

In `src/data/ledger.ts`, rename `ExpenseInput` to
`CategorizedEntryInput` and add `IncomeListItem`:

```ts
export interface CategorizedEntryInput {
  amountMinor: number;   // positive safe integer
  categoryId: string;    // required; active for new income, or the stored category on correction
  accountId: string;     // the account the money enters
  date: LocalDate;
}

export interface IncomeListItem {
  id: string;
  date: LocalDate;
  amountMinor: number;
  categoryName: string;           // "Uncategorized" if the row is gone or absent
  accountId: string;              // stored id; display uses the name
  accountName: string;            // "Unknown account" if the row is gone
  accountType: AccountType | null;
}
```

Extend `Ledger` immediately after `deleteTransfer`:

```ts
  listIncome(): Promise<IncomeListItem[]>;              // date desc, then id desc
  addIncome(input: CategorizedEntryInput): Promise<Entry>;
  updateIncome(id: string, input: CategorizedEntryInput): Promise<Entry>;
  deleteIncome(id: string): Promise<Entry>;             // returns the removed snapshot
```

`Ledger.addExpense` and `Ledger.updateExpense` change their parameter type from
`ExpenseInput` to `CategorizedEntryInput`. There is no compatibility alias and
no second input type. `ExpenseInput` is deleted.

`IncomeListItem` deliberately has no `categoryId`. The list never links by
category and a missing category has no meaningful id; the name is the only
category fact the row needs. The editor reads the full entry through
`getEntry(id)`.

`getEntry(id)` is unchanged and is the editor's lookup. The editor checks
`entry.kind === 'income'`; a different kind is treated as “income not found”,
exactly as the expense editor treats a non-expense entry.

No other public type changes. `Entry`, `Account`, `Category`, `Settings`,
`MonthSummary`, `CategorySpend`, `EntryListItem`, and `CategoryEntries` are
unchanged. `TransferInput` and `TransferListItem` are unchanged.

### 5.2 Shared categorized-entry validation

Rename the private `requireExpenseFields` to
`requireCategorizedEntryFields` and change its parameter type. The body and
the rule order are unchanged:

```ts
async function requireCategorizedEntryFields(
  input: CategorizedEntryInput,
  options?: { allowArchivedCategoryId?: string },
): Promise<void> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new LedgerError(
      'invalid-amount',
      'Enter an amount greater than zero.',
    );
  }
  if (!isValidLocalDate(input.date)) {
    throw new LedgerError('invalid-date', 'Choose a valid date.');
  }

  const account = await db.accounts.get(input.accountId);
  if (!account) {
    throw new LedgerError(
      'unknown-account',
      'That account no longer exists. Choose another.',
    );
  }

  const category = await db.categories.get(input.categoryId);
  if (!category) {
    throw new LedgerError(
      'unknown-category',
      'That category no longer exists. Choose another.',
    );
  }
  if (
    category.archived &&
    category.id !== options?.allowArchivedCategoryId
  ) {
    throw new LedgerError(
      'archived-category',
      'That category is archived. Choose another.',
    );
  }
}
```

The order is normative:

| Order | Check | Code |
|---|---|---|
| 1 | `amountMinor` is a safe integer and `> 0` | `invalid-amount` |
| 2 | `isValidLocalDate(input.date)` | `invalid-date` |
| 3 | account exists | `unknown-account` |
| 4 | category exists | `unknown-category` |
| 5 | category is active, or equals `allowArchivedCategoryId` | `archived-category` |

`addExpense` and `updateExpense` call the renamed helper at the same points as
before. `updateExpense` keeps passing
`{ allowArchivedCategoryId: existing.categoryId }`. The rename is an internal
clean cutover: no alias, no second validator, and no behaviour change for
expenses.

### 5.3 Shared entry insert

`insertEntry` is unchanged and remains private inside `createLedger`:

```ts
async function insertEntry(entry: Entry): Promise<Entry> {
  await db.entries.add(entry);
  return entry;
}
```

Contract:

- It must be called inside an already-open `rw` transaction. It does not open
  its own transaction.
- It is the only `entries.add` call on the add paths. `addExpense`,
  `addTransfer`, and `addIncome` all call it.
- `restoreBackup` deliberately stays on `entries.bulkAdd`.
- `addExpense` and `addTransfer` are unchanged; the helper is reused, not
  reimplemented.

### 5.4 Shared newest-first reader

Add one private helper inside `createLedger`, next to `insertEntry`:

```ts
async function entriesOfKindNewestFirst(kind: EntryKind): Promise<Entry[]> {
  const entries = await db.entries.orderBy('date').reverse().toArray();
  return entries
    .filter((entry) => entry.kind === kind)
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        right.id.localeCompare(left.id),
    );
}
```

`EntryKind` is added to the existing type import from `../domain/types`.
`listTransfers` is refactored to use it:

```ts
async listTransfers() {
  return db.transaction('r', db.entries, db.accounts, async () => {
    const transfers = await entriesOfKindNewestFirst('transfer');
    // …the existing account join and row mapping, unchanged…
  });
}
```

The observable transfer ordering does not change. The helper exists so the
tie-break rule cannot drift between the two lists. It is private, not part of
`Ledger`.

### 5.5 `addIncome(input)`

One `rw` transaction over `accounts`, `categories`, and `entries`:

```ts
async addIncome(input) {
  return db.transaction(
    'rw',
    db.accounts,
    db.categories,
    db.entries,
    async () => {
      await requireCategorizedEntryFields(input);

      const entry: Entry = {
        id: crypto.randomUUID(),
        kind: 'income',
        date: input.date,
        amountMinor: input.amountMinor,
        accountId: input.accountId,
        categoryId: input.categoryId,
      };

      return insertEntry(entry);
    },
  );
}
```

Contract:

- Exactly one row is written.
- The row has `kind: 'income'`, the input amount, account, category, and date.
- No `toAccountId` is written.
- No settings row is read or written. The transaction does not include
  `settings`, so an income write cannot change the expense form's default
  account.
- `settings.lastAccountId` keeps its slice-08 meaning: “the last account used
  when adding an expense”. Income follows the transfer rule and never writes
  it.

### 5.6 `updateIncome(id, input)`

One `rw` transaction over `accounts`, `categories`, and `entries`:

```ts
async updateIncome(id, input) {
  return db.transaction(
    'rw',
    db.accounts,
    db.categories,
    db.entries,
    async () => {
      const existing = await db.entries.get(id);
      if (!existing) {
        throw new LedgerError(
          'unknown-entry',
          'That entry no longer exists.',
        );
      }
      if (existing.kind !== 'income') {
        throw new LedgerError(
          'unsupported-entry-kind',
          'Only income can be corrected or removed.',
        );
      }

      await requireCategorizedEntryFields(input, {
        allowArchivedCategoryId: existing.categoryId,
      });

      const updated = await db.entries.update(id, {
        date: input.date,
        amountMinor: input.amountMinor,
        accountId: input.accountId,
        categoryId: input.categoryId,
      });
      if (updated === 0) {
        throw new LedgerError(
          'unknown-entry',
          'That entry no longer exists.',
        );
      }

      return {
        ...existing,
        date: input.date,
        amountMinor: input.amountMinor,
        accountId: input.accountId,
        categoryId: input.categoryId,
      };
    },
  );
}
```

Contract:

- The stored row is read before validation; `unknown-entry` and
  `unsupported-entry-kind` take precedence over invalid input.
- The one row is updated; no second row is created.
- `id`, `kind`, and any stray `toAccountId` are preserved. The app never writes
  a `toAccountId` on an income.
- The stored archived category is allowed on correction. Switching to a
  different archived category is refused by `archived-category`.
- Settings are never read or written.
- The returned entry is the merged row, with the original `id` and `kind`.

### 5.7 `deleteIncome(id)`

One `rw` transaction over `entries`:

```ts
async deleteIncome(id) {
  return db.transaction('rw', db.entries, async () => {
    const existing = await db.entries.get(id);
    if (!existing) {
      throw new LedgerError(
        'unknown-entry',
        'That entry no longer exists.',
      );
    }
    if (existing.kind !== 'income') {
      throw new LedgerError(
        'unsupported-entry-kind',
        'Only income can be corrected or removed.',
      );
    }

    await db.entries.delete(id);
    return existing;
  });
}
```

Contract:

- The row is read before the kind check; a missing id wins over a wrong kind.
- Exactly one row is removed.
- The removed snapshot is returned, so the caller can navigate from stored
  values rather than possibly stale form state.
- Removal is final: no tombstone, no soft delete, no audit row.
- Spending totals need no recalculation because every total is derived on read.

### 5.8 `listIncome()`

One `r` transaction over `entries`, `accounts`, and `categories`:

```ts
async listIncome() {
  return db.transaction(
    'r',
    db.entries,
    db.accounts,
    db.categories,
    async () => {
      const incomes = await entriesOfKindNewestFirst('income');

      const accountIds = [...new Set(incomes.map((entry) => entry.accountId))];
      const categoryIds = [
        ...new Set(
          incomes.flatMap((entry) =>
            entry.categoryId === undefined ? [] : [entry.categoryId],
          ),
        ),
      ];

      const accounts = await db.accounts.bulkGet(accountIds);
      const categories = await db.categories.bulkGet(categoryIds);

      const accountById = new Map<string, Account>();
      accounts.forEach((account, index) => {
        const accountId = accountIds[index];
        if (account && accountId !== undefined) {
          accountById.set(accountId, account);
        }
      });

      const categoryById = new Map<string, Category>();
      categories.forEach((category, index) => {
        const categoryId = categoryIds[index];
        if (category && categoryId !== undefined) {
          categoryById.set(categoryId, category);
        }
      });

      return incomes.map((entry) => {
        const account = accountById.get(entry.accountId);
        const category =
          entry.categoryId === undefined
            ? undefined
            : categoryById.get(entry.categoryId);

        return {
          id: entry.id,
          date: entry.date,
          amountMinor: entry.amountMinor,
          categoryName: category?.name ?? UNCATEGORIZED_LABEL,
          accountId: entry.accountId,
          accountName: account?.name ?? 'Unknown account',
          accountType: account?.type ?? null,
        };
      });
    },
  );
}
```

Properties, all normative:

- **Newest first.** An income dated later appears above an earlier one,
  regardless of when it was recorded. Same-day rows fall back to `id`
  descending for determinism.
- **No month filter and no pagination.** The whole income history is one list.
- **No total.** The list shows individual movements, not a sum.
- **Live category and account labels.** Renaming a category changes the label
  on income; renaming an account changes the account label. History is not
  rewritten.
- **Archived categories still resolve.** The join reads the category row
  regardless of `archived`; the list never filters categories.
- **Missing references degrade, they do not disappear.** The row keeps its
  amount and date. A missing `categoryId` or a `categoryId` whose row is gone
  becomes `"Uncategorized"`. A missing account becomes `"Unknown account"` with
  `accountType: null`.
- **Account type is display-only.** It disambiguates two accounts with the same
  name; it never filters the list.
- **Empty result is `[]`.** The screen decides between “no income yet” and the
  add action.
- **No `categoryId` in the result.** The list row does not carry one.

### 5.9 Error codes and UI mapping

No new codes. Income reuses:

| Code | Income meaning |
|---|---|
| `invalid-amount` | amount is not a positive safe integer |
| `invalid-date` | date is not a valid `YYYY-MM-DD` local date |
| `unknown-account` | the account does not exist |
| `unknown-category` | the category does not exist |
| `archived-category` | a new or changed category is archived |
| `unknown-entry` | the income id does not exist |
| `unsupported-entry-kind` | the id exists but is not an income |

Tests assert codes, not messages.

`src/app/categorizedEntryForm.tsx` exports the renamed mapper:

```ts
export interface CategorizedEntryFieldErrors {
  amount?: string;
  category?: string;
  account?: string;
  date?: string;
  form?: string;
}

export function categorizedEntryFieldErrors(
  code: LedgerErrorCode,
): CategorizedEntryFieldErrors | null {
  switch (code) {
    case 'invalid-amount':
      return { amount: 'Enter an amount greater than zero.' };
    case 'invalid-date':
      return { date: 'Choose a valid date.' };
    case 'unknown-account':
      return { account: 'That account no longer exists. Choose another.' };
    case 'unknown-category':
      return { category: 'That category no longer exists. Choose another.' };
    case 'archived-category':
      return { category: 'That category is archived. Choose another.' };
    default:
      return null;
  }
}
```

`unknown-entry` and `unsupported-entry-kind` are handled by the editor before
this helper and switch the screen to “Income not found”. Other codes return
`null`, and the screen uses its form-level fallback:

| Screen/action | Fallback |
|---|---|
| Add income save | `Could not save the income. Try again.` |
| Income editor save | `Could not save the changes. Try again.` |
| Income editor removal | `Could not remove the income. Try again.` |

### 5.10 Backup contract — unchanged v1

Nothing in `src/domain/backup.ts` changes. The income row is already part of
the v1 data model:

- `readBackupData` returns every entry, including income, sorted by id.
- `createBackupFile` serializes every entry.
- `parseEntry` already accepts `kind: 'income'`, requires a positive safe
  integer `amountMinor` for every non-opening kind, and accepts an optional
  `categoryId`.
- `restoreBackup` clears and bulk-adds the `entries` table, so a restored
  income is the same row it was before.
- `BACKUP_SCHEMA_VERSION` stays `1`.

Consequences the spec locks:

- A v1 file containing income restores without migration.
- A backup that omits income is still a valid v1 file and restores an empty
  income list.
- The parser accepts an income with no `categoryId`. This slice does not
  tighten that rule: the app never writes such a row, the income list degrades
  it to “Uncategorized”, and tightening would reject files v1 already accepts.
- A restored income with a stray `toAccountId` round-trips; `listIncome`
  ignores it, every spending read ignores it, and `updateIncome` preserves it
  because it writes only the four editable fields.
- A restored income whose account is missing is listed with
  `"Unknown account"`; the editor requires a replacement.
- A restored income whose category is missing is listed with
  `"Uncategorized"`; the editor requires a replacement.

### 5.11 Spending invariants — no read change

`monthSummary` and `categoryEntries` are not edited. They already exclude
every non-expense kind:

- `expenseTotals` skips every entry whose `kind !== 'expense'`. An income in
  the month on screen, or in the previous month, creates no row and adds
  nothing to `totalMinor`.
- `previousMonthHasSpending` is `previousTotals.size > 0`, where
  `previousTotals` is built by the same expense-only helper. An income in the
  previous month does not set it.
- `categoryEntries` filters `kind === 'expense'` before matching a category.
  An income labelled with the same category can never appear in a category
  list and never adds to its total.
- An income dated in an earlier month is invisible to that month's spending,
  because the same kind filter applies to every month.

This slice adds no field to `MonthSummary`, no income branch to
`expenseTotals`, and no new spending query.

## 6. Implementation Decisions — Routing and Presentation

### 6.1 Routes

Extend `src/app/router.ts`:

```ts
export type Route =
  | { name: 'home'; month: MonthKey }
  | { name: 'add' }
  | { name: 'accounts' }
  | { name: 'backup' }
  | { name: 'categories' }
  | { name: 'category'; month: MonthKey; categoryId: string }
  | { name: 'entry'; entryId: string }
  | { name: 'transfers' }
  | { name: 'add-transfer' }
  | { name: 'transfer'; entryId: string }
  | { name: 'income' }                         // new: list
  | { name: 'add-income' }                     // new: add form
  | { name: 'income-entry'; entryId: string }; // new: editor
```

`parseHash` checks the new paths in this order, after the existing
`/transfers/new` branch and before the generic `/income/` branch:

```ts
if (path === '/income') {
  return { name: 'income' };
}
if (path === '/income/new') {
  return { name: 'add-income' };
}
```

Then, alongside the existing `/entry/` and `/transfers/` branches:

```ts
if (path.startsWith('/income/')) {
  const raw = path.slice('/income/'.length);
  if (raw === '' || raw.includes('/')) {
    return { name: 'home', month: currentMonth };
  }
  let entryId: string;
  try {
    entryId = decodeURIComponent(raw);
  } catch {
    return { name: 'home', month: currentMonth };
  }
  if (entryId === '') {
    return { name: 'home', month: currentMonth };
  }
  return { name: 'income-entry', entryId };
}
```

Normative parse cases:

| Hash | Route |
|---|---|
| `#/income` | `{ name: 'income' }` |
| `#/income?x=1` | `{ name: 'income' }` |
| `#/income/new` | `{ name: 'add-income' }` |
| `#/income/new?x=1` | `{ name: 'add-income' }` |
| `#/income/new/` | home at `currentMonth` |
| `#/income/` | home at `currentMonth` |
| `#/income//` | home at `currentMonth` |
| `#/income/abc` | `{ name: 'income-entry', entryId: 'abc' }` |
| `#/income/abc?m=2026-11` | `{ name: 'income-entry', entryId: 'abc' }` |
| `#/income/a/b` | home at `currentMonth` |
| `#/income/%E0%A4%A` | home at `currentMonth` |
| `#/income/abc%2Fdef` | `{ name: 'income-entry', entryId: 'abc/def' }` |

`#/income/new` is checked before `#/income/<id>`, so `new` is never parsed as
an id. The `currentMonth` fallback is the month of `today ?? todayLocalDate()`,
matching the existing entry and transfer routes. The requested `m` query is
ignored by the editor route.

`routeToHash` emits:

```ts
case 'income':
  return '#/income';
case 'add-income':
  return '#/income/new';
case 'income-entry':
  return `#/income/${encodeURIComponent(route.entryId)}`;
```

The three income routes are the only new routes. Existing routes and screens
keep their current hashes.

### 6.2 App switch and first-run gate

`src/app/App.tsx` gains three imports and three switch cases:

```tsx
case 'income':
  return <IncomeScreen ledger={ledger} />;
case 'add-income':
  return <AddIncomeScreen ledger={ledger} />;
case 'income-entry':
  return <IncomeEditorScreen ledger={ledger} entryId={route.entryId} />;
```

The first-run gate is unchanged. With zero accounts, every income route
redirects to `#/accounts` exactly like `#/add`, `#/transfers`, and
`#/transfers/new`. The income screens therefore add no empty-accounts state of
their own. `pendingRestore` behaviour is unchanged.

### 6.3 Home

The existing bottom actions row gains one button, first in the row:

```tsx
<button type="button" onClick={() => navigate({ name: 'income' })}>
  Income
</button>
```

The resulting order is: Income, Transfers, Accounts, Categories, Backup.
Nothing else on home changes. The spending total, category breakdown,
comparison columns, month controls, storage warning, and add-expense actions
keep their current behaviour. Income is reached from home, but it never enters
home's data and never gets a total or a row there.

### 6.4 Income list

`src/app/screens/IncomeScreen.tsx`:

```tsx
export function IncomeScreen({ ledger }: { ledger: Ledger }) {
  const incomes = useLiveQuery(() => ledger.listIncome(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (incomes === undefined || settings === undefined) {
    return <p>Loading…</p>;
  }

  return (
    <section>
      <h1>Income</h1>
      {/* empty state or rows */}
      {/* add action */}
      {/* back action */}
    </section>
  );
}
```

State model:

| State | Condition | Rendering |
|---|---|---|
| Loading | `incomes === undefined` or `settings === undefined` | `Loading…` |
| Empty | `incomes.length === 0` | `No income yet.` + `Add your first income` button |
| List | `incomes.length > 0` | newest-first rows + `Add income` button |

The empty state uses the existing `empty-state` wrapper:

```tsx
<div className="empty-state">
  <p>No income yet.</p>
  <button
    type="button"
    className="button-primary"
    onClick={() => navigate({ name: 'add-income' })}
  >
    Add your first income
  </button>
</div>
```

The non-empty list renders:

```tsx
<ul className="income-list">
  {incomes.map((row) => {
    const amount = formatAmount(
      row.amountMinor,
      settings.currency,
      settings.currencyExponent,
    );
    const accountLabel = accountWithTypeLabel(
      row.accountName,
      row.accountType,
    );

    return (
      <li key={row.id}>
        <button
          type="button"
          aria-label={`Income: ${row.categoryName}, ${amount}, ${accountLabel}, ${row.date}`}
          onClick={() =>
            navigate({ name: 'income-entry', entryId: row.id })
          }
        >
          <span className="income-category">{row.categoryName}</span>
          <span className="income-amount">{amount}</span>
          <span className="income-account">{accountLabel}</span>
          <span className="income-date">{row.date}</span>
        </button>
      </li>
    );
  })}
</ul>
```

The list also renders an `Add income` button in the non-empty state and a
`Back` button in both states:

```tsx
<div className="actions">
  <button
    type="button"
    className="button-primary"
    onClick={() => navigate({ name: 'add-income' })}
  >
    Add income
  </button>
</div>

<div className="actions">
  <button
    type="button"
    onClick={() =>
      navigate({ name: 'home', month: monthOf(todayLocalDate()) })
    }
  >
    Back
  </button>
</div>
```

Normative list properties:

- Heading is `Income`.
- Rows are rendered in the order returned by `listIncome`; the screen does not
  re-sort.
- Each row is a button that navigates to `#/income/<id>`.
- The visible fields are category, amount, account, date, in that DOM order.
  The amount is visually right-aligned in the first row; the account and date
  form the second row.
- The accessible name is exactly
  `Income: <category>, <amount>, <account label>, <date>`.
  Example: `Income: Salary, $2,400.00, Everyday Checking · Checking, 2026-11-12`.
- The account label always uses `accountWithTypeLabel`; a missing account
  yields `Unknown account` with no type suffix.
- The amount always uses `formatAmount` with the settings currency and
  exponent.
- The date is the raw stored `YYYY-MM-DD` string.
- There is no total, no month control, no filter, no pagination, no category
  query, and no account query.
- A row with a missing category or account remains rendered and clickable.
- The empty state offers the first-income action; the add screen owns the
  “no category to file income under” explanation.

CSS: add `.income-list`, `.income-list li`, `.income-list button`,
`.income-category`, `.income-amount`, `.income-account`, and `.income-date` to
`src/styles.css`. The row uses a two-column grid (`minmax(0, 1fr) auto`) with
two rows: category + amount, then account + date. The amount uses tabular
numerals and right alignment; the date is muted. Existing transfer and
category list styles are unchanged.

### 6.5 Add income

`src/app/screens/AddIncomeScreen.tsx`:

```tsx
export function AddIncomeScreen({ ledger }: { ledger: Ledger }) {
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const categories = useLiveQuery(() => ledger.listCategories(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (
    accounts === undefined ||
    categories === undefined ||
    settings === undefined
  ) {
    return <p>Loading…</p>;
  }

  const activeCategories = categories.filter(
    (category) => !category.archived,
  );

  if (activeCategories.length === 0) {
    return (
      <section>
        <h1>Add income</h1>
        <p>
          There is no category to file income under. Add or unarchive one in
          Categories.
        </p>
        <button
          type="button"
          className="button-primary"
          onClick={() => navigate({ name: 'categories' })}
        >
          Categories
        </button>
      </section>
    );
  }

  return (
    <AddIncomeForm
      ledger={ledger}
      accounts={accounts}
      categories={activeCategories}
      settings={settings}
    />
  );
}
```

Normative gates and defaults:

- No zero-account branch. The App first-run gate redirects a zero-account
  income route to Accounts. Direct rendering with zero accounts is outside the
  screen's contract; if it happens, the form has no account option and the
  local account check blocks saving.
- The no-active-category state wins whenever `activeCategories.length === 0`,
  including when the category table is empty or every category is archived.
  It renders no form and no amount/category/account/date fields.
- The Categories button navigates to `#/categories`. A category added or
  unarchived there appears in the income form through the live query.
- The amount starts blank.
- The category starts unselected. The user must choose one; archived
  categories are not offered.
- The account starts at `settings.lastAccountId` when that account still
  exists, otherwise at the first account in `listAccounts()` order, otherwise
  `null`.
- The date starts at `todayLocalDate()` and is changeable to any valid date,
  including an earlier month.
- The account default is a convenience, not a rule: the user can change it, and
  income is valid on any account type.
- Because income never writes `lastAccountId`, the default reflects the last
  expense account, not the last income account.

`AddIncomeForm` state:

```ts
const [amountText, setAmountText] = useState('');
const [categoryId, setCategoryId] = useState<string | null>(null);
const [accountId, setAccountId] = useState<string | null>(() => {
  const lastAccountId = settings.lastAccountId;
  return lastAccountId !== undefined &&
    accounts.some((account) => account.id === lastAccountId)
    ? lastAccountId
    : (accounts[0]?.id ?? null);
});
const [date, setDate] = useState(() => todayLocalDate());
const [errors, setErrors] = useState<CategorizedEntryFieldErrors>({});
const [submitting, setSubmitting] = useState(false);
const submittingRef = useRef(false);
```

Submit algorithm, normative:

1. `event.preventDefault()`.
2. Return immediately when `submittingRef.current` is true.
3. `const amountMinor = parseAmount(amountText, settings.currencyExponent)`.
4. Build local errors:
   - `amountMinor === null || amountMinor <= 0` → `amount: 'Enter an amount greater than zero.'`
   - `categoryId === null` → `category: 'Choose a category.'`
   - `accountId === null` → `account: 'Choose an account.'`
   - `!isValidLocalDate(date)` → `date: 'Choose a valid date.'`
5. If any local check failed, set the errors and return without writing.
6. Set `submittingRef.current = true`, `setSubmitting(true)`, `setErrors({})`.
7. Call `ledger.addIncome({ amountMinor, categoryId, accountId, date })`.
8. On success, `navigate({ name: 'income' }, { replace: true })`. The live
   query shows the new row immediately; the list is the confirmation surface.
9. On `LedgerError`, set
   `categorizedEntryFieldErrors(error.code) ?? { form: 'Could not save the income. Try again.' }`.
10. On any other error, set
    `{ form: 'Could not save the income. Try again.' }`.
11. In `finally`, reset `submittingRef.current = false` and
    `setSubmitting(false)`.

The screen refuses an empty selection before the call for immediate feedback.
The ledger refuses it again inside the transaction, so a stale form or a direct
caller cannot write an income without a category or account. The
`submittingRef` guard prevents two rows.

`clearError(field)` removes only that field's error and leaves `errors.form`
untouched, matching the expense screens. A field change never hides a
form-level save error.

Rendering:

- `<h1>Add income</h1>`.
- `<CategorizedEntryFields idPrefix="income" … />` with the four fields in the
  shared order.
- Form-level error: `<p role="alert" className="form-error">{errors.form}</p>`.
- Actions: `Save` (`type="submit"`, `className="button-primary"`,
  `disabled={submitting}`) and `Cancel`.
- Cancel navigates to `#/income` with `{ replace: true }` without writing.

### 6.6 Income editor

`src/app/screens/IncomeEditorScreen.tsx`:

```tsx
export function IncomeEditorScreen({
  ledger,
  entryId,
}: {
  ledger: Ledger;
  entryId: string;
}) {
  const entry = useLiveQuery(
    () => ledger.getEntry(entryId),
    [ledger, entryId],
  );
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const categories = useLiveQuery(() => ledger.listCategories(), [ledger]);
  const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);

  if (
    entry === undefined ||
    accounts === undefined ||
    categories === undefined ||
    settings === undefined
  ) {
    return <p>Loading…</p>;
  }

  if (entry === null || entry.kind !== 'income') {
    return <IncomeNotFound />;
  }

  return (
    <IncomeEditorForm
      key={entry.id}
      ledger={ledger}
      entry={entry}
      accounts={accounts}
      categories={categories}
      settings={settings}
    />
  );
}
```

`IncomeNotFound`:

```tsx
function IncomeNotFound() {
  return (
    <section>
      <h1>Income not found</h1>
      <p>This income no longer exists.</p>
      <div className="actions">
        <button
          type="button"
          onClick={() =>
            navigate({ name: 'income' }, { replace: true })
          }
        >
          Back to income
        </button>
      </div>
    </section>
  );
}
```

Seeding, normative:

```ts
const storedCategoryId =
  entry.categoryId !== undefined &&
  categories.some((category) => category.id === entry.categoryId)
    ? entry.categoryId
    : null;
const categoryOptions = categories.filter(
  (category) =>
    !category.archived || category.id === entry.categoryId,
);
const storedAccountId = accounts.some(
  (account) => account.id === entry.accountId,
)
  ? entry.accountId
  : null;

const [amountText, setAmountText] = useState(() =>
  formatAmountInput(entry.amountMinor, settings.currencyExponent),
);
const [categoryId, setCategoryId] = useState<string | null>(storedCategoryId);
const [accountId, setAccountId] = useState<string | null>(storedAccountId);
const [date, setDate] = useState(entry.date);
const [errors, setErrors] = useState<CategorizedEntryFieldErrors>(() => {
  const initial: CategorizedEntryFieldErrors = {};
  if (storedCategoryId === null) {
    initial.category = 'That category no longer exists. Choose another.';
  }
  if (storedAccountId === null) {
    initial.account = 'That account no longer exists. Choose another.';
  }
  return initial;
});
```

- The amount is formatted with `formatAmountInput` and the settings exponent.
- The category is the stored category when it still exists, otherwise `null`
  with an initial category error.
- The category options are the active categories plus the stored category when
  it is archived, labelled `${category.name} (archived)` exactly as the
  expense editor does. A missing stored category contributes no option.
- The account is the stored account when it still exists, otherwise `null`
  with an initial account error.
- The date is the stored date.
- A missing entry or a non-income entry renders `IncomeNotFound`.
- The form is keyed by `entry.id`; it seeds once and does not merge live field
  changes into a half-edited form. If the entry disappears, the outer live
  query re-renders `IncomeNotFound`.

Submit algorithm, normative:

1. `preventDefault`; return when `submittingRef.current`.
2. Parse the amount and build the same local errors as add.
3. Return without writing when any local check failed.
4. Set submitting state and clear errors.
5. Call `ledger.updateIncome(entry.id, { amountMinor, categoryId, accountId, date })`.
6. On success, `navigate({ name: 'income' }, { replace: true })`.
7. On `LedgerError` with `unknown-entry` or `unsupported-entry-kind`, set
   `gone = true`, which renders `IncomeNotFound`.
8. On any other `LedgerError`, map with `categorizedEntryFieldErrors`, falling
   back to `{ form: 'Could not save the changes. Try again.' }`.
9. On any other error, use the same fallback.
10. Reset the submitting guard in `finally`.

Removal, normative:

1. The `Remove income` button reveals a `role="group"` panel labelled
   `Confirm removal`.
2. The panel copy is:
   `Remove {storedAmount} on {entry.date} for {storedCategoryName} in {storedAccountLabel}? This cannot be undone.`
   where:
   - `storedAmount` is `formatAmount(entry.amountMinor, settings.currency, settings.currencyExponent)`;
   - `storedCategoryName` is
     `categories.find((category) => category.id === entry.categoryId)?.name ?? UNCATEGORIZED_LABEL`;
   - `storedAccountLabel` is
     `accountWithTypeLabel(account?.name ?? 'Unknown account', account?.type ?? null)`,
     where `account` is
     `accounts.find((candidate) => candidate.id === entry.accountId)`.
3. Focus moves to the panel's Cancel button when the panel opens, via a ref and
   `useEffect`.
4. Cancel closes the panel without writing.
5. Remove guards on `deletingRef`, clears errors, and calls
   `ledger.deleteIncome(entry.id)`.
6. On success, navigate to `#/income` with `{ replace: true }`.
7. On `unknown-entry` or `unsupported-entry-kind`, set `gone = true`.
8. On any other error, set
   `{ form: 'Could not remove the income. Try again.' }` and leave the row in
   place.
9. Reset the deleting guard in `finally`.

`clearError(field)` removes only that field's error and leaves `errors.form`
untouched, matching the expense editor. A field change never hides a
form-level save or removal error.

Rendering:

- `<h1>Correct income</h1>`.
- `<CategorizedEntryFields idPrefix="income" … />`.
- Form-level error with `role="alert"`.
- Actions when not confirming:
  - `Save changes` (`type="submit"`, primary, `disabled={submitting}`);
  - `Back` (`disabled={submitting || deleting}`, navigates to `#/income` with
    `{ replace: true }`);
  - `Remove income` (`disabled={submitting || deleting}`, reveals the panel).
- Confirmation actions:
  - `Cancel` (ref, closes the panel);
  - `Remove` (`disabled={deleting}`, calls the removal algorithm).
- A failure leaves the row in place and shows a form error.

### 6.7 Shared categorized-entry form and ChoiceGroup

`src/app/expenseForm.tsx` is renamed to
`src/app/categorizedEntryForm.tsx`, and its generic `ChoiceGroup` moves to
`src/app/choiceGroup.tsx`.

`src/app/choiceGroup.tsx` exports exactly:

```ts
export function ChoiceGroup({
  legend,
  options,
  selectedId,
  errorId,
  error,
  onSelect,
}: {
  legend: string;
  options: { id: string; label: string }[];
  selectedId: string | null;
  errorId?: string;
  error?: string;
  onSelect: (id: string) => void;
}) { … }
```

The body is moved verbatim: a `fieldset.field` with a `legend`, a
`div.chip-group` of `type="button"` options with `aria-pressed`, and an
optional `p.field-error` with `id={errorId}`.

`src/app/categorizedEntryForm.tsx` exports exactly:

```ts
export interface CategorizedEntryFieldErrors {
  amount?: string;
  category?: string;
  account?: string;
  date?: string;
  form?: string;
}

export function categorizedEntryFieldErrors(
  code: LedgerErrorCode,
): CategorizedEntryFieldErrors | null;

export function CategorizedEntryFields({
  idPrefix,
  amountText,
  onAmountChange,
  categoryId,
  onCategoryChange,
  accountId,
  onAccountChange,
  date,
  onDateChange,
  accounts,
  categories,
  archivedCategoryId,
  errors,
  onClearError,
}: {
  idPrefix: 'expense' | 'entry' | 'income';
  amountText: string;
  onAmountChange: (value: string) => void;
  categoryId: string | null;
  onCategoryChange: (id: string) => void;
  accountId: string | null;
  onAccountChange: (id: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  accounts: Account[];
  categories: Category[];
  archivedCategoryId?: string;
  errors: CategorizedEntryFieldErrors;
  onClearError: (field: keyof CategorizedEntryFieldErrors) => void;
}) { … }
```

`CategorizedEntryFields` renders, in order:

1. Amount: `label htmlFor={`${idPrefix}-amount`}`, text input with
   `inputMode="decimal"`, `aria-describedby` to `${idPrefix}-amount-error`
   when the amount error exists, and an error `<p>` with that id.
2. Category: `ChoiceGroup` with legend `Category`, options from `categories`
   labelled `${name} (archived)` when `category.archived &&
   category.id === archivedCategoryId`, selected `categoryId`, error id
   `${idPrefix}-category-error`.
3. Account: `ChoiceGroup` with legend `Account`, options labelled with
   `accountWithTypeLabel(account.name, account.type)`, selected `accountId`,
   error id `${idPrefix}-account-error`.
4. Date: `label htmlFor={`${idPrefix}-date`}`, `type="date"` input,
   `aria-describedby` to `${idPrefix}-date-error` when the date error exists,
   and an error `<p>` with that id.

Each change handler calls its `on…Change` and then `onClearError(field)` for
that field. The shared form does not filter categories or accounts; callers
pass the exact options they want.

Cutover rules:

- `AddExpenseScreen` imports `CategorizedEntryFields`,
  `categorizedEntryFieldErrors`, and `CategorizedEntryFieldErrors` from
  `../categorizedEntryForm`, and passes `idPrefix="expense"`.
- `EntryEditorScreen` imports the same names and passes `idPrefix="entry"`.
- `transferForm.tsx` imports `ChoiceGroup` from `./choiceGroup`.
- `categorizedEntryForm.tsx` imports `ChoiceGroup` from `./choiceGroup`.
- No compatibility re-export from the old path, no second form module, and no
  second `ChoiceGroup`.
- Expense and transfer copy, validation, navigation, delete confirmation, and
  behaviour do not change.

### 6.8 Copy

| Context | Exact copy |
|---|---|
| List heading | `Income` |
| List empty | `No income yet.` |
| List empty action | `Add your first income` |
| List non-empty action | `Add income` |
| List Back | `Back` |
| Add heading | `Add income` |
| Add no-category message | `There is no category to file income under. Add or unarchive one in Categories.` |
| Add no-category action | `Categories` |
| Add save | `Save` |
| Add cancel | `Cancel` |
| Add save fallback | `Could not save the income. Try again.` |
| Editor heading | `Correct income` |
| Editor save | `Save changes` |
| Editor back | `Back` |
| Editor remove action | `Remove income` |
| Editor save fallback | `Could not save the changes. Try again.` |
| Editor removal fallback | `Could not remove the income. Try again.` |
| Confirmation group label | `Confirm removal` |
| Confirmation copy | `Remove {amount} on {date} for {category} in {account}? This cannot be undone.` |
| Confirmation cancel | `Cancel` |
| Confirmation remove | `Remove` |
| Not found heading | `Income not found` |
| Not found body | `This income no longer exists.` |
| Not found action | `Back to income` |
| Loading | `Loading…` |
| Missing category label | `Uncategorized` |
| Missing account label | `Unknown account` |

Field errors are exactly the mapper strings in §5.9, plus the local
`Choose a category.`, `Choose an account.`, and `Choose a valid date.`.

### 6.9 Accessibility

- Each list row's accessible name is exactly
  `Income: <category>, <amount>, <account label>, <date>`. It names all four
  facts and does not depend on visual order.
- The row is a real button, so it is keyboard reachable and announces its
  action.
- `CategorizedEntryFields` keeps the existing fieldset/legend and
  `aria-describedby` wiring, so each field error is associated with its input.
- Form-level errors use `role="alert"`.
- The removal confirmation is a `role="group"` labelled `Confirm removal`, and
  focus moves to Cancel when it opens.
- The list has a heading, so screen-reader users can navigate to it.

### 6.10 What the UI must not do

- Must not import `data/db` or Dexie.
- Must not compute income totals, month totals, or category totals.
- Must not filter the list by month, account, or category.
- Must not offer archived categories for new income.
- Must not write `settings.lastAccountId`.
- Must not call `db.entries` directly; all reads and writes go through
  `Ledger`.
- Must not sort the list itself; it renders the ledger order.
- Must not create a second row on correction.
- Must not convert an expense into income or income into an expense.
- Must not add a payee, note, tax, or source field.
- Must not tighten the backup parser or bump either version constant.

## 7. Invariants

- An income is exactly one `entries` row with `kind: 'income'`, a positive
  safe-integer `amountMinor`, `accountId`, and `categoryId`, and no
  `toAccountId` written by the app.
- `addIncome` requires a category and an account. Archived categories are
  refused for new income and for switching an existing income; the stored
  archived category is allowed on correction.
- `monthSummary` and `categoryEntries` never include an income.
- The home total, category rows, and `previousMonthHasSpending` are unchanged
  by adding, correcting, or removing income in the current or previous month.
- A category's entry list and total are unchanged by income sharing its
  category.
- `listIncome` is newest first by `date`, then `id` descending, joins category
  and account names at read time, and degrades missing references without
  dropping the row.
- `updateIncome` changes the one row and never creates a second row or changes
  `id`, `kind`, or `toAccountId`.
- `deleteIncome` removes the one row and leaves spending unchanged.
- Backup and restore reproduce income exactly under
  `BACKUP_SCHEMA_VERSION = 1`.
- No Dexie schema version bump, no new index, and no settings write from any
  income path.
- Each income row's accessible name states the category, account, amount, and
  date.
- Expense and transfer behaviour is unchanged after the shared form, input,
  validation, ordering, and choice-group renames.
- `addIncome`, `updateIncome`, and `deleteIncome` are the only public income
  mutations; `requireCategorizedEntryFields`, `insertEntry`, and
  `entriesOfKindNewestFirst` are private.

## 8. Testing Decisions

### 8.1 What makes a good test here

- Exercise the highest existing seam: `createLedger` for data behaviour and
  the screen components for presentation. No new seam, no exported test-only
  helper.
- Assert external behaviour: returned rows, thrown `LedgerError.code`,
  rendered text, accessible names, focus, disabled state, and route changes.
  Do not assert private helper names, call counts, or Dexie internals.
- Use a real `BudgetDatabase` on `fake-indexeddb` with a unique name, deleted
  in `afterEach`, following `src/data/ledger.test.ts` and the screen tests.
- Use `formatAmount` to build expected money strings and
  `ACCOUNT_TYPE_LABELS`/`accountWithTypeLabel` to build expected account
  labels. Never hardcode a currency symbol or locale-specific output.
- Use fixed dates (`2026-11-02`, `2025-01-15`, `2027-01-01`) and
  `todayLocalDate()` only where the default is the behaviour under test.
- Each test should fail for a plausible implementation bug: wrong kind filter,
  wrong sort tie-break, wrong error precedence, a dropped missing-reference
  row, a second row on correction, a spending total that moved, a wrong
  accessible name, or a wrong route fallback.

### 8.2 Seams and files

| Seam | Test file | Why it is the right level |
|---|---|---|
| `createLedger(db)` | `src/data/ledger.test.ts` (add `describe('income')`, `describe('income corrections')`, and `describe('income spending invariants')`) | The ledger is the whole data contract; tests cross the same calls the UI makes. |
| `parseHash` / `routeToHash` | `src/app/router.test.ts` (extend the existing `it.each` and round-trip tests) | Routing is pure and already tested there. |
| `App` route switching | `src/app/App.test.tsx` | Proves the three routes render the right screens and the zero-account gate still applies. |
| `IncomeScreen` | `src/app/screens/IncomeScreen.test.tsx` (new) | List states, row content, navigation, and live updates are user-visible. |
| `AddIncomeScreen` | `src/app/screens/AddIncomeScreen.test.tsx` (new) | Gates, defaults, validation, save, and navigation are user-visible. |
| `IncomeEditorScreen` | `src/app/screens/IncomeEditorScreen.test.tsx` (new) | Seeding, correction, removal, focus, and not-found states are user-visible. |
| `HomeScreen` | `src/app/screens/HomeScreen.test.tsx` (add income invariant and Income-button tests) | Proves the home surface ignores income and exposes the route. |
| Backup round-trip | `src/data/ledger.test.ts` (ledger seam) | `readBackupData`/`restoreBackup` are ledger calls; `backup.test.ts` already covers the parser. |

No test calls `requireCategorizedEntryFields`, `insertEntry`, or
`entriesOfKindNewestFirst` directly.

### 8.3 Ledger tests

Add to `src/data/ledger.test.ts`:

#### Income writes

1. `addIncome` writes exactly one row with `kind: 'income'`, the input amount,
   category, account, and date; no `toAccountId`; returns the stored entry;
   `db.entries.count()` is 1.
2. `addIncome` accepts checking, savings, and credit accounts; account type
   never restricts the rule.
3. `addIncome` rejects `0`, a negative amount, and a non-safe-integer amount
   with `invalid-amount` and writes nothing.
4. `addIncome` rejects an invalid date (empty, impossible day, malformed) with
   `invalid-date` and writes nothing.
5. `addIncome` rejects an unknown account with `unknown-account` and an unknown
   category with `unknown-category`; writes nothing.
6. `addIncome` rejects an archived category with `archived-category` and writes
   nothing.
7. Validation precedence: invalid amount plus invalid date yields
   `invalid-amount`; invalid date plus unknown account yields `invalid-date`;
   unknown account plus unknown category yields `unknown-account`; unknown
   category plus archived category yields `unknown-category`.
8. `addIncome` does not change `settings.lastAccountId`; set it to an account,
   add an income, assert the value is unchanged.
9. `addIncome` and `addExpense` both still write one row after the shared
   helper rename; existing `addExpense` tests remain green.

#### `listIncome`

10. Returns only `kind: 'income'` rows; expenses, transfers, and openings are
    absent.
11. Orders by `date` descending, then `id` descending. Use two same-date rows
    with ids `'b'` and `'a'` and assert `['b', 'a']`; add a later date and
    assert it first.
12. Joins category name and account name/type; an income on a credit account
    reports `accountType: 'credit'`.
13. A missing category row yields `categoryName: 'Uncategorized'` and the row
    remains. A raw income with no `categoryId` does the same.
14. A missing account yields `accountName: 'Unknown account'`,
    `accountType: null`, and the row remains.
15. Renaming a category changes `categoryName` in later reads without
    rewriting the entry. Renaming an account changes `accountName`.
16. An archived category still resolves to its name; the list never filters it.
17. Empty table yields `[]`.
18. No month filter: incomes from different months all appear in one array.
19. The returned row has no `categoryId` property.

#### `updateIncome`

20. Updates amount, category, account, and date on the one row; row count stays
    1; returns the merged entry with the original `id` and `kind`;
    `listIncome` reflects the change.
21. Rejects a missing id with `unknown-entry`; rejects a non-income id with
    `unsupported-entry-kind`; writes nothing.
22. Rejects an invalid amount, invalid date, unknown account, unknown category,
    and archived category with the same codes as add; writes nothing.
23. Allows an income to keep its stored archived category while the amount,
    account, or date changes.
24. Refuses switching to a different archived category with
    `archived-category`.
25. Preserves a stray `toAccountId` on a restored income while writing only
    the four editable fields.
26. Changing the date moves the row in `listIncome` order.
27. Does not change `settings.lastAccountId`.

#### `deleteIncome`

28. Removes the one row, returns the removed snapshot, and `listIncome` is
    empty.
29. Rejects a missing id with `unknown-entry`; rejects a non-income id with
    `unsupported-entry-kind`; writes nothing.
30. Removing an income leaves `monthSummary` and `categoryEntries` unchanged.

#### Income spending invariants

31. With one expense in the current month, snapshot `monthSummary('2026-11')`;
    add a current-month income; the summary is `toEqual` the snapshot.
32. With a current-month expense and no previous expenses, add a
    previous-month income; `previousMonthHasSpending` stays `false` and `rows`
    are unchanged.
33. An income in an earlier month is absent from that month's `monthSummary`
    and `categoryEntries`.
34. An income sharing a category with an expense is absent from
    `categoryEntries`; the category total is unchanged.
35. Correcting and removing an income leave the current and previous month
    summaries `toEqual` to their pre-income snapshots.

#### Backup round-trip

36. `readBackupData()` includes the income. `createBackupFile` →
    `serializeBackup` → `parseBackupFile` → `restoreBackup` into a fresh
    database reproduces the income exactly; `listIncome` returns the same
    amount, date, category, and account.
37. A v1 file with no income restores an empty income list.
38. A restored income without a `categoryId` is listed as `Uncategorized`; the
    editor's replacement requirement is covered in §8.5.
39. A restored income with a stray `toAccountId` round-trips; spending reads
    ignore it.
40. A restored income with a missing account is listed with
    `"Unknown account"`; the editor's replacement requirement is covered in
    §8.5.
41. `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`; the existing
    schema test's table/index assertion is unchanged.

### 8.4 Router and App tests

`src/app/router.test.ts`:

1. Extend the `parseHash` `it.each` with:
   - `#/income` → `{ name: 'income' }`
   - `#/income?x=1` → `{ name: 'income' }`
   - `#/income/new` → `{ name: 'add-income' }`
   - `#/income/new?x=1` → `{ name: 'add-income' }`
   - `#/income/new/` → home at `currentMonth`
   - `#/income/` → home at `currentMonth`
   - `#/income//` → home at `currentMonth`
   - `#/income/abc` → `{ name: 'income-entry', entryId: 'abc' }`
   - `#/income/abc?m=2026-11` → `{ name: 'income-entry', entryId: 'abc' }`
   - `#/income/a/b` → home at `currentMonth`
   - `#/income/%E0%A4%A` → home at `currentMonth`
   - `#/income/abc%2Fdef` → `{ name: 'income-entry', entryId: 'abc/def' }`
2. Extend `routeToHash` with the three exact hashes.
3. Round-trip an income id containing reserved characters
   (`'income &? #/space'`).
4. Confirm `#/income/new` is never parsed as an id.

`src/app/App.test.tsx`:

5. With one account, `#/income` renders the `Income` heading.
6. With one account, `#/income/new` renders the `Add income` heading.
7. With one account and a stored income, `#/income/<id>` renders the
   `Correct income` heading.
8. With zero accounts, `#/income`, `#/income/new`, and `#/income/<id>` redirect
   to `#/accounts`, like the existing `#/add` gate test.
9. An unknown income id renders `Income not found`.
10. The home Income button navigates to `#/income`.

### 8.5 Screen tests

`src/app/screens/IncomeScreen.test.tsx`:

1. No income: `No income yet.`, `Add your first income`, and Back; clicking the
   first-income button navigates to `#/income/new`.
2. Income exists: rows render in ledger order; each shows category, account
   label, formatted amount, and ISO date.
3. The row's accessible name is exactly the §6.4 template; use `formatAmount`
   and `accountWithTypeLabel` to build the expected string.
4. Clicking a row navigates to `#/income/<id>`.
5. A missing category renders `Uncategorized`; a missing account renders
   `Unknown account`; the row remains clickable.
6. After `ledger.addIncome`, the list updates through `waitFor`.
7. After `ledger.renameCategory`, the list shows the new category name.
8. After `ledger.renameAccount`, the list shows the new account name.
9. After `ledger.updateIncome`, the row changes; after `ledger.deleteIncome`,
   the row disappears.
10. The Add income button is present only when the list is non-empty; the empty
    state uses the first-income label.
11. Back navigates to `#/?m=<current month>`.
12. The list shows no total, no month controls, and no filters.

`src/app/screens/AddIncomeScreen.test.tsx`:

13. Every category archived: the no-category message, Categories button, and no
    form fields.
14. No categories at all: the same no-category state.
15. Active categories: amount blank, category unselected, account preselected
    from `settings.lastAccountId`, date today.
16. A missing or stale `lastAccountId` falls back to the first account.
17. Saves an income: one row in `db.entries` with the correct kind, amount,
    category, account, and date; navigates to `#/income`;
    `settings.lastAccountId` unchanged.
18. Accepts a comma decimal separator.
19. Rejects zero and negative amounts with the amount error; no row.
20. Rejects a missing category with `Choose a category.`; no row.
21. Rejects a missing account with `Choose an account.`; no row. Cover this by
    rendering with zero accounts (direct screen render, outside the App gate).
22. Rejects a cleared date with the date error; no row.
23. A date in an earlier month is stored and the list shows it.
24. A credit card can be the account.
25. A rapid double submit writes one row and disables Save.
26. Deleting the chosen account or category after render and saving maps the
    ledger's `unknown-account` or `unknown-category` to the correct field.
27. An archived category is not offered.
28. Cancel returns to `#/income` without writing.

`src/app/screens/IncomeEditorScreen.test.tsx`:

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
38. An archived stored category is offered as `Name (archived)` and can be kept
    while changing the amount, account, or date; saving succeeds.
39. Switching from an archived stored category to an active category succeeds.
40. Remove reveals the group, names the stored amount, date, category, and
    account label, and focuses Cancel.
41. Cancel keeps the row and closes the panel without writing.
42. Remove deletes the row, returns to `#/income`, and leaves home spending
    unchanged.
43. A rapid double submit writes once and disables Save changes.
44. A rapid double Remove calls delete once.
45. Removing the last income shows the empty state.

`src/app/screens/HomeScreen.test.tsx`:

46. Seed an expense in the current month and income in the current month, in
    the previous month, and in the same category as the expense; the `Spent`
    total, category rows, and previous-month comparison are exactly what the
    expenses alone produce. No income row or amount appears.
47. The `Income` button is present in the empty state and navigates to
    `#/income`.

### 8.6 Existing tests to update

- `src/data/ledger.test.ts`: add the income groups above. The existing
  `addExpense`, `monthSummary`, `categoryEntries`, and backup tests must remain
  green unchanged after the `ExpenseInput` rename and the
  `requireCategorizedEntryFields` rename.
- `src/app/router.test.ts`: add the cases above; existing cases are unchanged.
- `src/app/App.test.tsx`: add the route and home-action cases; existing cases
  are unchanged.
- `src/app/screens/HomeScreen.test.tsx`: add the income invariant and button
  tests; existing expense/comparison tests are unchanged.
- `src/app/screens/AddExpenseScreen.test.tsx`,
  `src/app/screens/EntryEditorScreen.test.tsx`,
  `src/app/screens/TransfersScreen.test.tsx`, and
  `src/app/screens/TransferEditorScreen.test.tsx`: no assertion changes. They
  must stay green after the shared form extraction and the
  `entriesOfKindNewestFirst` refactor.
- `src/domain/backup.test.ts`: no change. It already accepts income and
  optional categories. The ledger round-trip test covers the integration.
- No test is deleted. No existing assertion is re-pinned to incidental
  behaviour.

### 8.7 Manual verification

Build and preview, then:

1. Record a paycheck with a Salary category on Checking. Confirm it appears
   once in the income list, newest first, and the home total, category rows,
   and last-month comparison do not move.
2. Record income dated in an earlier month. Confirm it is absent from that
   month's spending and present in the income list.
3. Tap a category with both expenses and income. Confirm only the expenses
   appear and the category total is unchanged.
4. Correct the amount, then the category, then the account, then the date.
   Confirm the row updates in place and the list order changes when the date
   changes.
5. Archive the income's category. Confirm the list keeps the label and the
   editor offers `Name (archived)`; change the amount and save; confirm the
   category is preserved.
6. Try to switch to another archived category. Confirm it is not offered and a
   direct attempt is refused.
7. Remove an income. Confirm the panel names amount, date, category, and
   account; Cancel keeps it; Remove deletes it; spending stays unchanged.
8. Delete one account or category from a backup fixture (or restore a file
   referencing a missing row) and confirm the list shows `Unknown account` or
   `Uncategorized` and the editor requires a replacement.
9. Restore a backup containing income in a fresh profile and confirm the list
   and spending match.
10. Go offline and repeat record, view, correct, and remove.
11. Check the list and forms at 320px and one desktop width; no horizontal
    scroll.
12. With a screen reader, confirm a row announces category, account, amount,
    and date, and the confirmation panel announces amount, date, category, and
    account.

### 8.8 Deliberately not asserted

- Exact CSS pixel widths, colors, or font sizes. The contract is the two-row
  grid structure, the four visible fields, and no horizontal overflow.
- The number of Dexie transactions or the order of `bulkGet` calls.
- `localeCompare` ordering across locales. The order is display-only and not
  serialized.
- An income with an id of exactly `new`. App-created UUIDs never collide; the
  edge is documented, not tested.
- An income with a non-positive amount or invalid date created through the
  app. No reachable path creates one; the read model returns corrupt rows
  unchanged.
- Two accounts with the same name and the same type. The labels may look
  identical; selection is by id. This is the scope's accepted edge.
- Service-worker or offline internals. Offline is verified manually.

## 9. Prototype Log

One throwaway state-model prototype was run before this spec was written. It
was removed after the decision was captured; no prototype code remains in the
workspace.

### 9.1 Question

The architecture fixes the add form's account default and the editor's
missing-reference behaviour in prose, but the state model had to be checked
against the hard cases:

1. Does a single `storedCategoryId` plus a filtered `categoryOptions` list
   cover a normal income, a missing category, a missing account, and an
   archived stored category?
2. Does changing only the account on an income under an archived category
   still save, while switching to a different archived category is refused?
3. Does the add form's read-only `settings.lastAccountId` default behave when
   the stored id is stale or absent?

### 9.2 What was tried

A small JavaScript reducer modelled:

- categories `Salary` (active), `Gift` (active), `Old job` (archived);
- accounts `Checking`, `Savings`;
- add initialization with a valid `lastAccountId` and with a stale one;
- editor initialization for a normal income, a missing category, a missing
  account, an archived stored category, and a non-income entry;
- selecting a replacement category or account, changing only the account on an
  archived-category income, switching from the archived category to an active
  one, and forcing a different archived category;
- a `save` step that applies the same checks as
  `requireCategorizedEntryFields`, including
  `allowArchivedCategoryId = storedCategoryId`.

It printed the full state after each action.

### 9.3 Result

| Case | Result |
|---|---|
| Add with valid `lastAccountId` | preselects that account; category blank; date today |
| Add with stale `lastAccountId` | falls back to the first account; category blank; date today |
| Edit normal income | category and account seeded; save succeeds |
| Edit missing category, then choose one | initial category error; choosing clears it; save succeeds |
| Edit missing account, then choose one | initial account error; choosing clears it; save succeeds |
| Edit archived stored category, change account only | stored category remains selected; save succeeds |
| Edit archived stored category, switch to active | save succeeds |
| Force a different archived category | blocked with `archived-category` |
| Edit a non-income entry | not-found state |

The reducer confirmed that no extra state is needed beyond the expense
editor's pattern: `storedCategoryId` is the only extra derived value, and it
exists solely to pass `allowArchivedCategoryId` to the ledger. The category
options list already encodes the UI rule “active plus the stored category”.

### 9.4 Decision

Lock the architecture's seed-and-replace model:

- The editor seeds from the stored row once, keyed by `entry.id`.
- A missing category or account starts unselected with an initial field error.
- The category options are active categories plus the stored category, even
  when archived, labelled `Name (archived)`.
- The add form reads `settings.lastAccountId` only to preselect an account and
  never writes it.
- Saving always delegates the archived-category decision to
  `requireCategorizedEntryFields` with the stored category id; the UI does not
  duplicate the rule beyond offering the stored option.

No UI prototype was needed. The architecture already fixes the list row's
information and accessible-name template, and the existing transfer list
supplies the visual pattern. The only display choice was whether the account
label always includes the type; matching the expense pickers (always include
it) resolves it without a layout experiment.

## 10. Open Questions Resolved

Every implementation-level question the architecture left implicit is resolved
here. No question below is left to a builder's judgement.

| Question | Resolution |
|---|---|
| Is income stored as a signed amount or a positive magnitude? | Positive `amountMinor`; the `+accountId` effect is derived from `kind`. No sign is stored. |
| Is a category required? | Yes, for every income the app writes. |
| Can a new income use an archived category? | No. |
| Can a correction keep an archived stored category? | Yes, when it is the same stored category. |
| Can a correction switch to a different archived category? | No; `archived-category`. |
| Does income write `settings.lastAccountId`? | No. It may read it to preselect the add form's account. |
| Does the income list have a total? | No. |
| Does the income list have month navigation, filters, or pagination? | No. |
| What is the list order? | `date` descending, then `id` descending. |
| Where is the order computed? | In `listIncome`; the screen renders the returned order. |
| What does a missing category show? | `Uncategorized`. |
| What does a missing account show? | `Unknown account`, with `accountType: null`. |
| Are rows with missing references dropped? | No. They remain and are clickable. |
| Does the list carry a `categoryId`? | No. The editor reads the full entry through `getEntry`. |
| Does the editor seed a missing category or account? | No; it starts unselected with an initial field error and blocks saving until replaced. |
| Which categories does the editor offer? | Active categories plus the stored category if archived. |
| Which categories does the add form offer? | Active categories only. |
| What is the add form's account default? | `settings.lastAccountId` when that account exists, otherwise the first account, otherwise `null`. |
| What is the add form's date default? | `todayLocalDate()`. |
| What is the add form's category default? | Unselected. |
| What happens with zero accounts? | The unchanged App first-run gate redirects to Accounts; the income screens add no zero-account state. |
| What happens with zero active categories? | The add screen shows the no-category message and a Categories button, and renders no form. |
| What are the routes? | `#/income`, `#/income/new`, `#/income/<entryId>`. |
| Which route wins for `new`? | `#/income/new` is checked before `#/income/<id>`. |
| What happens to a malformed income id? | Empty id, a slash inside the id, or a decode failure falls back to home at the current month. |
| Where is the home entry point? | One `Income` button, first in the bottom actions row. |
| What is the list row's accessible name? | `Income: <category>, <amount>, <account label>, <date>`. |
| What happens after add? | Navigate to `#/income` with `replace: true`; the live query is the confirmation. |
| What happens after correction? | Navigate to `#/income` with `replace: true`; the live query updates the row. |
| What happens after removal? | Navigate to `#/income` with `replace: true`; the live query removes the row. |
| What happens if the editor entry is missing or not income? | `Income not found` with `Back to income`. |
| What happens if save/remove reports `unknown-entry` or `unsupported-entry-kind`? | The editor switches to `Income not found`. |
| What happens on an unexpected save/remove error? | A form-level error with the exact copy in §5.9; the row is left in place. |
| Does the removal confirmation name all four facts? | Yes: amount, date, category, account. Focus moves to Cancel. |
| Is removal reversible? | No. No tombstone, soft delete, or undo. |
| What is the shared input type? | `CategorizedEntryInput`; `ExpenseInput` is deleted. |
| What is the shared validation helper? | `requireCategorizedEntryFields`, with the existing five checks and order. |
| What is the shared insert helper? | `insertEntry`, unchanged and private. |
| What is the shared ordering helper? | `entriesOfKindNewestFirst`, private; `listTransfers` is refactored onto it. |
| What is the shared form module? | `app/categorizedEntryForm.tsx`, exporting `CategorizedEntryFieldErrors`, `categorizedEntryFieldErrors`, and `CategorizedEntryFields`. |
| Where does `ChoiceGroup` live? | `app/choiceGroup.tsx`; no re-export from the categorized-entry module. |
| What `idPrefix` values exist? | `'expense' | 'entry' | 'income'`. |
| Does the expense or transfer behaviour change? | No. Only imports and names change. |
| Does the Dexie schema change? | No. `SCHEMA_VERSION` stays `1`; no table, key, or index changes. |
| Does the backup format change? | No. `BACKUP_SCHEMA_VERSION` stays `1`. |
| Does spending change? | No. `monthSummary` and `categoryEntries` are not edited. |
| Are there endpoints? | No. `Ledger` remains the whole API. |
| Is there a second persistence seam or fake adapter? | No. One Dexie adapter, tested through `Ledger`. |

## 11. Out of Scope

- Balances, opening balances, and any per-account or total balance display.
  Recording income does not show what an account holds or owes; that is slice
  6.
- An income total on the home screen or the income list.
- A separate income-category list or a second category table.
- A payee, employer, source, note, tax, gross/net, or withholding field.
- Recurring paychecks, templates, reminders, or auto-posting.
- A refund-specific flow, negative amounts, or converting an expense into
  income or income into an expense.
- Splitting income across several accounts or categories.
- Filtering, month navigation, pagination, search, or a total on the income
  list.
- Charts, trends, forecasts, budgets, or over-budget states.
- Bank sync, multi-currency, sharing, or a laptop view.
- An `incomes` table, an income aggregate, a `kind` index, or a compound
  `[kind+date]` index.
- Any Dexie schema migration or `SCHEMA_VERSION` bump.
- Any `BACKUP_SCHEMA_VERSION` bump, parser tightening, or backup field.
- Any write to `settings.lastAccountId` from an income path.
- Any change to the expense screens, transfer screens, spending reads, or
  backup screens beyond the shared import renames.
- A generic public `addEntry(kind, input)` API.
- A repository interface or a fake persistence adapter.
- Any network endpoint, server validation, auth, or sync.

## 12. Further Notes

- **Reversibility.** Every decision here is low-cost to change: four ledger
  methods, one read model, three screens, three hash routes, and display-only
  CSS. Removing income means deleting those and the home button; no stored
  data changes shape.
- **No ADR.** The durable income semantics — one entry kind, positive
  magnitude, one shared category, never spending — were already recorded in
  the north-star and `CONTEXT.md`. This gate adds no expensive-to-reverse
  contract.
- **No glossary change.** `CONTEXT.md` already defines **Income** as money
  entering an account from outside the user's own accounts, with a category.
  “Income list” is an ordinary description, not a new term.
- **Known edge: id `new`.** `#/income/new` is the add route and wins over
  `#/income/<id>`, so a stored income with id exactly `new` is unreachable by
  URL. App-created ids are UUIDs and never collide. The parser is not
  tightened; a hand-edited backup could create the edge.
- **Known edge: restored income without a category.** The backup parser accepts
  it because v1 already does. The list shows `Uncategorized`; the editor
  requires a replacement before saving.
- **Known edge: stray `toAccountId`.** A restored income may carry one. Every
  spending read and `listIncome` ignore it; `updateIncome` preserves it
  because it writes only the four editable fields. The app never writes one.
- **Known edge: identical labels.** Two accounts with the same name and the
  same type produce identical labels. Selection is by id. The type suffix
  resolves the common case of two cards with the same name.
- **Transaction guarantee.** `listIncome` uses one `r` transaction over
  `entries`, `accounts`, and `categories` so a rename cannot tear the join.
  `addIncome` and `updateIncome` use one `rw` transaction over the same three
  tables so validation and the write are atomic. `deleteIncome` uses one `rw`
  transaction over `entries`. These are contracts, not optimizations; a future
  change that drops them can produce a torn read or a validation race the test
  suite may not reproduce.
- **Offline.** Every read and write is local IndexedDB; there is no network
  path. The service worker and installability are unchanged. Offline is
  verified manually, not in unit tests.
- **Ticket shape.** The ticket breakdown should cut along the seam:
  1. ledger contract: rename `ExpenseInput` and `requireExpenseFields`, add
     `IncomeListItem`, `entriesOfKindNewestFirst`, `addIncome`,
     `updateIncome`, `deleteIncome`, `listIncome`, and ledger tests;
  2. shared form extraction: `choiceGroup.tsx`,
     `categorizedEntryForm.tsx`, the expense/transfer import updates, and the
     existing screen tests staying green;
  3. routing and App: three routes, switch cases, and router/App tests;
  4. list screen: states, rows, labels, CSS, home action, and list tests;
  5. add screen: no-category gate, defaults, form, validation, and add tests;
  6. editor screen: seeding, correction, removal, not-found, and editor tests;
  7. spending/backup invariants: ledger and home tests, then manual
     verification.
  No ticket adds a table, index, schema version, backup version, endpoint, or
  settings write.
