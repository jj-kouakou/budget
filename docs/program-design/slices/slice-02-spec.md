# Slice 02 Program Design Spec — Inspect and correct entries

- **Gate:** Slice Program Design (workflow step 5)
- **Sources:** `docs/product/slices/slice-02-scope.md`,
  `docs/architecture/north-star.md`,
  `docs/architecture/slices/slice-02-architecture.md`, ADRs 0001/0005,
  `CONTEXT.md`, and the slice-1 implementation in `src/`
- **Implementation state:** slice 1 is built and deployed. Slice 2 is not
  built; this spec is its implementation contract.
- **Endpoints:** none. The app is static files plus IndexedDB (ADR 0001);
  `Ledger` is the whole application API.

This document resolves every open question in the slice-2 architecture into a
type, an algorithm, a route, or exact copy. Where the architecture fixed a
seam, this spec fixes the behaviour across it. File paths appear only in the
module map; the contracts are the types, algorithms, routes, copy, and call
stacks.

---

## 1. Problem Statement

Slice 1 shows what this month cost, but the number cannot be audited or
corrected. A mistyped amount, a wrong category, a wrong account, or a duplicate
stays in the ledger forever and silently distorts every total. The user sees a
category that is higher than expected and has no way to find out why.

Without a way to inspect a category's entries and correct or remove a bad one,
the ledger stops being trustworthy, and an untrustworthy ledger gets abandoned.

## 2. Solution

Two screens complete the loop the home screen opens:

1. **Category entries** — tapping any category row on home opens that
   category's entries for the displayed month, newest first, each showing its
   amount, date, and account. The list's total equals the row that was tapped.
2. **Entry editor** — tapping a listed entry opens it with amount, category,
   account, and date prefilled. Saving corrects the stored entry in place and
   lands on the list that now holds it. Removing asks for confirmation inline,
   then deletes the entry and returns to the list — or to that month's home
   when the category has no entries left.

Everything updates through the existing Dexie live queries. No refresh, no
server, no schema change, no undo.

## 3. User Stories

### Seeing the entries behind a category

1. As a user, I want to tap a category row on the home screen, so that I can
   see what makes up that number.
2. As a user, I want the list to cover the same month the home screen was
   showing, so that the drill-down and the headline agree.
3. As a user, I want the list to name the category and the month, so that I
   know where I am after tapping.
4. As a user, I want each entry to show its amount, so that I can spot the one
   that is wrong.
5. As a user, I want each entry to show its date, so that I can tell two
   similar entries apart.
6. As a user, I want each entry to show the account it came from, so that I
   know which card or account was used.
7. As a user, I want entries newest first, so that the most recent purchase is
   easiest to find.
8. As a user, I want the list's total to equal the category row I tapped, so
   that I trust the drill-down.
9. As a user, I want credit-card entries listed exactly like checking entries,
   so that a card purchase is not hidden.
10. As a user, I want an empty list to say so plainly, so that a stale link or
    a just-emptied category is not a blank screen.
11. As a user, I want a Back action that returns to the same month on home, so
    that browsing months is not lost.
12. As a user, I want the Uncategorized row on home to open its entries too, so
    that every row is inspectable.

### Correcting an entry

13. As a user, I want to tap a listed entry to open it, so that I can fix it.
14. As a user, I want the amount prefilled as an editable decimal, so that I
    can correct digits without retyping the whole number.
15. As a user, I want the category, account, and date prefilled, so that I only
    change what is wrong.
16. As a user, I want to change the amount and save, so that the category row
    and month total drop or rise by exactly the difference.
17. As a user, I want to move an entry to another category, so that a
    mis-filed purchase leaves one row and joins the other.
18. As a user, I want to move an entry to another account, so that a purchase
    charged to the wrong card is attributed correctly.
19. As a user, I want to move an entry to another date, so that a
    mis-dated purchase appears in the right month.
20. As a user, I want saving to land on the list that now holds the entry, so
    that a re-filed or re-dated entry does not vanish.
21. As a user, I want the same amount, category, account, and date checks as
    the add form, so that a correction cannot create an invalid entry.
22. As a user, I want field-level errors that tell me what to fix, so that I do
    not lose the rest of my changes.
23. As a user, I want Back to leave without writing, so that opening an entry
    is safe.
24. As a user, I want a repeated Save tap to write once, so that a correction
    is not applied twice.
25. As a user, I want to save an entry without changing anything, so that the
    action is predictable.

### Removing an entry

26. As a user, I want a Remove action on an opened entry, so that a duplicate
    can be deleted.
27. As a user, I want removal to ask for confirmation first, so that a stray
    tap does not destroy data.
28. As a user, I want the confirmation to name the amount, date, and account,
    so that I am sure which entry I am removing.
29. As a user, I want Cancel to close the confirmation and keep the entry, so
    that the safe path is easy.
30. As a user, I want confirmation to delete the entry immediately, so that the
    list, the category row, and the month total update without a refresh.
31. As a user, I want to return to the category list after removal, so that I
    can keep reviewing.
32. As a user, I want to land on that month's home when I remove the
    category's last entry, so that I am not left on an empty list.
33. As a user, I want the month's empty state when I remove its last entry, so
    that the app never shows a misleading total.
34. As a user, I want removal to be final, so that the product's promise is
    clear and the confirmation is meaningful.

### Trust, consistency, and recovery

35. As a user, I want correcting one entry to leave every other entry
    unchanged, so that a fix does not ripple.
36. As a user, I want the home screen's ordering, month navigation, and
    all-account spending to stay exactly as they were, so that this slice does
    not change how the headline works.
37. As a user, I want a stale entry link to say the entry is gone, so that I
    am not silently redirected or shown an empty form.
38. As a user, I want a missing account or category reference to degrade to
    "Unknown account" or "Uncategorized" rather than hiding money, so that the
    totals still add up.
39. As a screen-reader user, I want labelled fields, buttons, and row actions,
    so that I can inspect and correct an entry without sight.
40. As a user, I want all of this to work offline, so that correcting a
    purchase does not depend on a connection.

## 4. System Shape

### 4.1 Module map

| Module | Responsibility | Change |
|---|---|---|
| `src/domain/money.ts` | Minor-unit parsing/formatting | **Add** `formatAmountInput` |
| `src/domain/calendar.ts` | Local dates, month keys, month labels | Unchanged |
| `src/domain/types.ts` | `Account`, `Category`, `Entry`, `Settings` | Unchanged |
| `src/data/db.ts` | Dexie schema v1 | Unchanged |
| `src/data/ledger.ts` | Read models, lifecycle writes, validation, error codes | **Extend** |
| `src/data/seed.ts` | Starter categories | Unchanged |
| `src/app/router.ts` | Hash routes | **Extend** with `category` and `entry` |
| `src/app/App.tsx` | Route switch | **Extend** with two cases |
| `src/app/expenseForm.tsx` | Shared expense field controls and error mapping | **New** |
| `src/app/screens/HomeScreen.tsx` | Month summary | **Change** category rows to buttons |
| `src/app/screens/CategoryEntriesScreen.tsx` | Category-month entry list | **New** |
| `src/app/screens/EntryEditorScreen.tsx` | Correction form, removal confirmation, not-found | **New** |
| `src/app/screens/AddExpenseScreen.tsx` | Add form | **Refactor** onto shared fields; behaviour unchanged |
| `src/app/labels.ts` | Account-type copy | Unchanged |
| `src/styles.css` | Plain global stylesheet | **Extend** for list rows and confirmation |

Dependency direction is unchanged:

```text
app/ui  ->  data/ledger  ->  data/db
   |             |
   +---------->  domain/money, domain/calendar, domain/types
```

- No UI module imports `data/db` or `dexie` directly.
- `domain/` imports only `domain/types` and other `domain/` modules.
- No repository interface, no fake adapter, no new dependency.

### 4.2 Endpoints

None. `Ledger` is the application API. There is no network call, server
validation, or sync in this slice.

### 4.3 Test seams

The slice uses the three seams established in slice 1; it adds none:

1. **Domain pure functions** — `money.ts` unit tests.
2. **Ledger integration** — `createLedger` over a real `BudgetDatabase` on
   `fake-indexeddb`, a unique database per test.
3. **UI integration** — screens rendered with a real ledger, plus pure router
   tests.

Callers and tests cross the same `Ledger` seam. No test mocks `ledger` or
Dexie internals.

## 5. Domain Types

`src/domain/types.ts` is unchanged. `Entry` keeps its current shape:

```ts
export interface Entry {
  id: string;
  kind: EntryKind;        // 'expense' | 'income' | 'transfer' | 'opening'
  date: LocalDate;        // YYYY-MM-DD
  amountMinor: number;    // integer minor units
  accountId: string;
  categoryId?: string;
  toAccountId?: string;
}
```

`LocalDate` and `MonthKey` remain string aliases, not branded types.

### 5.1 Ledger input and read models

```ts
// src/data/ledger.ts
export interface ExpenseInput {
  amountMinor: number;
  categoryId: string;
  accountId: string;
  date: LocalDate;
}

export interface EntryListItem {
  id: string;
  date: LocalDate;
  amountMinor: number;
  accountId: string;
  accountName: string;              // 'Unknown account' when the row is gone
  accountType: AccountType | null;  // null only when the account is gone
}

export interface CategoryEntries {
  month: MonthKey;
  categoryId: string;
  categoryName: string;             // 'Uncategorized' for the sentinel or a missing row
  totalMinor: number;               // always the sum of rows
  rows: EntryListItem[];            // date desc, then id desc
}

export const UNCATEGORIZED_CATEGORY_ID = '__uncategorized__';
export const UNCATEGORIZED_LABEL = 'Uncategorized';
```

`AddExpenseInput` is **renamed** to `ExpenseInput`. There is no alias. Its one
caller passes an object literal; the rename is mechanical.

`UNCATEGORIZED_LABEL` is new because two read models and two screens must use
one literal. `monthSummary` replaces both of its `'Uncategorized'` literals
with it; its output is unchanged.

### 5.2 Routes

```ts
// src/app/router.ts
export type Route =
  | { name: 'home'; month: MonthKey }
  | { name: 'add' }
  | { name: 'accounts' }
  | { name: 'category'; month: MonthKey; categoryId: string }
  | { name: 'entry'; entryId: string };
```

### 5.3 Error codes

```ts
export type LedgerErrorCode =
  | 'invalid-name'
  | 'invalid-account-type'
  | 'invalid-amount'
  | 'invalid-date'
  | 'unknown-account'
  | 'unknown-category'
  | 'unknown-entry'
  | 'unsupported-entry-kind';
```

`LedgerError` keeps its shape: `code` plus a developer-facing `message`. Tests
assert `code`, never message text. The UI owns user-facing copy.

New messages:

| Code | Message |
|---|---|
| `unknown-entry` | `That entry no longer exists.` |
| `unsupported-entry-kind` | `Only expenses can be corrected or removed.` |

## 6. Money Contract

### 6.1 `formatAmountInput`

```ts
export function formatAmountInput(amountMinor: number, exponent: number): string;
```

Purpose: turn stored minor units into a plain decimal string that prefills the
editor's amount field and that `parseAmount` accepts unchanged. No currency
symbol, no grouping, no locale, no thousands separator.

Algorithm:

1. Reject an exponent that is not an integer in `0..6` with `RangeError`, using
   the same private guard as `parseAmount`.
2. Reject a non-safe-integer amount with
   `RangeError('Amount must be a safe integer')`.
3. Render the absolute value as decimal digits, left-padded with `0` to at
   least `exponent + 1` digits.
4. Split `exponent` digits from the right. The left part is the whole number;
   the right part is the fraction.
5. Join with `.` unless `exponent === 0`, in which case there is no separator.
6. Prefix `-` when `amountMinor < 0`.

Canonical examples:

| `amountMinor` | `exponent` | Result |
|---|---|---|
| `4500` | `2` | `45.00` |
| `450` | `2` | `4.50` |
| `5` | `2` | `0.05` |
| `0` | `2` | `0.00` |
| `45` | `0` | `45` |
| `1` | `6` | `0.000001` |
| `-4500` | `2` | `-45.00` |

Contract properties:

- The fraction always has exactly `exponent` digits; trailing zeros are kept.
  The field is deterministic and lossless, not prettified.
- For every safe integer `n >= 0` and every exponent `0..6`,
  `parseAmount(formatAmountInput(n, exponent), exponent) === n`.
- Negative output is for completeness only; the ledger never formats a
  negative expense, and `parseAmount` rejects signs.

### 6.2 Formatting at the display edge

`formatAmount` is unchanged and remains the only display formatter. Category
rows, list rows, the list total, and the confirmation copy all call it with
`settings.currency` and `settings.currencyExponent`.

## 7. Calendar Contract

`src/domain/calendar.ts` is unchanged. This slice uses:

- `monthOf(entry.date)` for every destination month.
- `formatMonth(month)` for the home heading and the category-list heading.
- `isValidLocalDate(date)` for client-side date validation.
- `todayLocalDate()` only for the not-found screen's home destination and the
  existing add-form default.

**Date display is the stored `YYYY-MM-DD` string.** No new date formatter is
introduced. The category list and the confirmation panel show `entry.date`
verbatim; this is unambiguous, locale-free, and already the app's storage
vocabulary. A prettier date format is a later slice, not a hidden dependency
here.

## 8. Storage Contract

### 8.1 Schema stays v1

| Table | Key | Indexes | Used by this slice |
|---|---|---|---|
| `accounts` | `id` | `createdAt` | account names/types in the list; validation on update |
| `categories` | `id` | — | category name; validation on update |
| `entries` | `id` | `date` | list, lookup, update, delete |
| `settings` | `id` (`'app'`) | — | formatting; **not written** by update/delete |

- `SCHEMA_VERSION` stays `1`.
- No table, key, index, or migration is added.
- No `updatedAt`, `deletedAt`, tombstone, or history row.
- `initialize()` is unchanged.

### 8.2 Access paths

| Operation | Query |
|---|---|
| Category-month list | `entries.where('date').startsWith(month).toArray()`, then in-memory `kind`/category filter |
| Open one entry | `entries.get(id)` |
| Update | primary-key read, then `entries.update(id, fields)` |
| Delete | primary-key read, then `entries.delete(id)` |
| Month summary | unchanged: date prefix plus in-memory grouping |

### 8.3 Transactions

| Operation | Tables | Mode |
|---|---|---|
| `updateExpense` | `accounts`, `categories`, `entries` | `rw` |
| `deleteExpense` | `entries` | `rw` |
| `getEntry` | — | read-only |
| `categoryEntries` | — | read-only |

`updateExpense` includes `accounts` and `categories` because
`requireExpenseFields` reads them inside the same transaction. It deliberately
excludes `settings`.

## 9. Ledger Contract

### 9.1 API surface

```ts
export interface Ledger {
  initialize(): Promise<void>;
  listAccounts(): Promise<Account[]>;
  addAccount(input: AddAccountInput): Promise<Account>;
  renameAccount(id: string, name: string): Promise<void>;
  listCategories(): Promise<Category[]>;
  monthSummary(month: MonthKey): Promise<MonthSummary>;
  getSettings(): Promise<Settings>;

  addExpense(input: ExpenseInput): Promise<Entry>;
  updateExpense(id: string, input: ExpenseInput): Promise<Entry>;
  deleteExpense(id: string): Promise<Entry>;
  getEntry(id: string): Promise<Entry | null>;
  categoryEntries(month: MonthKey, categoryId: string): Promise<CategoryEntries>;
}
```

| Operation | Success | Failure | Writes |
|---|---|---|---|
| `addExpense(input)` | inserted `Entry` | `invalid-amount`, `invalid-date`, `unknown-account`, `unknown-category` | `entries`, `settings` |
| `updateExpense(id, input)` | merged `Entry` | `unknown-entry`, `unsupported-entry-kind`, then the four field codes | `entries` |
| `deleteExpense(id)` | removed `Entry` snapshot | `unknown-entry`, `unsupported-entry-kind` | `entries` |
| `getEntry(id)` | `Entry` or `null` | IndexedDB error only | none |
| `categoryEntries(month, categoryId)` | `CategoryEntries` | `RangeError` for a malformed month | none |

### 9.2 `requireExpenseFields` — the one validation rule set

A private async function inside `createLedger`, closed over `db`:

```ts
async function requireExpenseFields(input: ExpenseInput): Promise<void>
```

It MUST be called inside the caller's `rw` transaction so the account and
category reads share that transaction's snapshot. Rules, in order, first
failure wins:

1. `Number.isSafeInteger(input.amountMinor) && input.amountMinor > 0`, else
   `LedgerError('invalid-amount')`.
2. `isValidLocalDate(input.date)`, else `LedgerError('invalid-date')`.
3. `await db.accounts.get(input.accountId)` exists, else
   `LedgerError('unknown-account')`.
4. `await db.categories.get(input.categoryId)` exists, else
   `LedgerError('unknown-category')`.

It returns `void`; it does not normalize or copy the input. It is not exported
and not part of `Ledger`. Add and update both call it, so the rules cannot
drift.

An archived category is accepted, matching slice 1. Rejecting archived
categories belongs to the slice that introduces archiving.

### 9.3 `addExpense`

Behaviour is unchanged; only the input type is renamed and the validation body
moves into `requireExpenseFields`.

1. Open one `rw` transaction over `accounts`, `categories`, `entries`,
   `settings`.
2. Call `requireExpenseFields(input)`.
3. Insert `{ id: crypto.randomUUID(), kind: 'expense', date, amountMinor,
   accountId, categoryId }`.
4. Read `settings.get('app')`; if absent, throw a plain
   `Error('Ledger not initialized')`, aborting the transaction.
5. Put the settings row back with `lastAccountId = input.accountId`.
6. Return the inserted entry.

### 9.4 `updateExpense(id, input)`

One `rw` transaction over `accounts`, `categories`, `entries`:

1. `const existing = await db.entries.get(id)`.
2. If `existing` is `undefined` → `LedgerError('unknown-entry')`.
3. If `existing.kind !== 'expense'` → `LedgerError('unsupported-entry-kind')`.
4. `await requireExpenseFields(input)`.
5. `const updated = await db.entries.update(id, { date: input.date,
   amountMinor: input.amountMinor, accountId: input.accountId,
   categoryId: input.categoryId })`.
6. If `updated === 0` → `LedgerError('unknown-entry')` (defensive; the row was
   read in the same transaction).
7. Return `{ ...existing, date: input.date, amountMinor: input.amountMinor,
   accountId: input.accountId, categoryId: input.categoryId }`.

Properties:

- `id`, `kind`, and any `toAccountId` on the existing row are preserved. The
  four editable fields are overwritten.
- The write is unconditional. Saving unchanged values succeeds and still
  invalidates live queries; there is no change detection.
- `settings.lastAccountId` is not read or written. Correcting an old entry is
  not adding one.
- No other row is touched.
- The returned object is the stored row after the update, built by merge, not
  re-read. Callers can navigate from its `date`.

### 9.5 `deleteExpense(id)`

One `rw` transaction over `entries`:

1. `const existing = await db.entries.get(id)`.
2. If `existing` is `undefined` → `LedgerError('unknown-entry')`.
3. If `existing.kind !== 'expense'` → `LedgerError('unsupported-entry-kind')`.
4. `await db.entries.delete(id)`.
5. Return `existing`.

Properties:

- Hard delete. No tombstone, no archive, no previous-version row.
- The returned snapshot is what the caller navigates with, not form state.
- `settings.lastAccountId` is untouched.
- Deleting the last row for a month leaves no row, so `monthSummary` returns
  its empty shape.

### 9.6 `getEntry(id)`

```ts
const entry = await db.entries.get(id);
return entry ?? null;
```

- Primary-key read, no transaction, no joins, no kind filter.
- **The `?? null` is mandatory.** Dexie resolves `undefined` for a missing key,
  and `useLiveQuery` uses `undefined` to mean "query has not resolved yet".
  Returning `undefined` would make a stale id render `Loading…` forever. The
  prototype in §14 caught exactly this.
- Any entry kind is returned; the editor filters non-expenses.

### 9.7 `categoryEntries(month, categoryId)`

1. If `!isValidMonthKey(month)` → `throw new RangeError('Invalid month key')`,
   matching `monthSummary`.
2. `const monthRows = await db.entries.where('date').startsWith(month).toArray()`.
3. Keep `entry.kind === 'expense'`; drop every other kind.
4. Keep entries where
   `(entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID) === categoryId`.
5. Resolve accounts: collect the unique `accountId`s, call
   `db.accounts.bulkGet(uniqueIds)`, and build an id→row map. A missing row
   yields `accountName: 'Unknown account'`, `accountType: null`.
6. Resolve the category name:
   - `categoryId === UNCATEGORIZED_CATEGORY_ID` → `UNCATEGORIZED_LABEL`, no
     lookup.
   - otherwise `await db.categories.get(categoryId)`; a missing row →
     `UNCATEGORIZED_LABEL`, a present row → its stored `name` (archived or
     not).
7. Sort the kept entries by `date` descending, then `id` descending using
   `localeCompare`, before mapping.
8. Map to `EntryListItem`: `id`, `date`, `amountMinor`, `accountId`,
   `accountName`, `accountType`. Display formatting happens at render time via
   `formatAmount`; the read model never formats.
9. `totalMinor` is the sum of the mapped rows' `amountMinor`.
10. Return `{ month, categoryId, categoryName, totalMinor, rows }`.

Properties:

- **The list total equals the home row.** `monthSummary` and
  `categoryEntries` apply the same month-prefix, expense-only predicate; the
  category filter is the only difference. For every `monthSummary` row,
  `categoryEntries(month, row.categoryId).totalMinor === row.amountMinor`.
- **No account filter.** Credit-card and checking expenses are identical here.
- **No other month, no other kind.**
- **No validation of `categoryId`.** Any string is a legal query; an unknown
  one returns zero rows with `categoryName: 'Uncategorized'`. Routes never
  produce an empty id.
- **Empty result** is `{ month, categoryId, categoryName, totalMinor: 0,
  rows: [] }`, with the category name still resolved when the category exists.
- **Missing references degrade, never disappear.** Amounts stay in the total.

### 9.8 `monthSummary` change

Replace the two `'__uncategorized__'` literals with
`UNCATEGORIZED_CATEGORY_ID` and the two `'Uncategorized'` literals with
`UNCATEGORIZED_LABEL`. No other change: same predicates, same grouping, same
sort (`amountMinor` desc, `name` asc, `categoryId` asc), same `totalMinor`
derivation.

### 9.9 Error precedence

- `addExpense`: amount → date → account → category.
- `updateExpense`: unknown entry → unsupported kind → amount → date → account →
  category.
- `deleteExpense`: unknown entry → unsupported kind.

The first failing check wins. For example, `updateExpense` on an unknown id with
an invalid amount reports `unknown-entry`.

### 9.10 Concurrency and live updates

- IndexedDB serializes `rw` transactions. Each operation addresses exactly one
  id.
- `updateExpense` and `deleteExpense` touch `entries`; Dexie re-runs every
  live query that read `entries`, including `monthSummary`,
  `categoryEntries`, and `getEntry`.
- No manual cache, event bus, refresh button, or query invalidation.
- Single-tab assumption carries over. A change from another tab is visible to
  live queries; a half-edited form is not merged. The next write re-reads and
  validates inside its transaction.
- No optimistic UI: the form waits for the ledger promise before navigating.

## 10. Routing Contract

### 10.1 Hash grammar

| Hash | Route |
|---|---|
| `''`, `'#'`, `'#/'` | home, current month |
| `'#/?m=2026-11'` | home, November 2026 |
| `'#/?m=2026-13'` | home, current month |
| `'#/add'` | add |
| `'#/accounts'` | accounts |
| `'#/category?m=2026-11&c=cat_groceries'` | category list |
| `'#/category?c=cat_groceries'` | category list, current month |
| `'#/category?m=2026-11'` | home, November 2026 (missing `c`) |
| `'#/category?m=2026-11&c='` | home, November 2026 (empty `c`) |
| `'#/category?m=bad&c=cat_groceries'` | category list, current month |
| `'#/entry/3f1c…'` | editor for that id |
| `'#/entry/'` | home, current month |
| `'#/entry/a/b'` | home, current month |
| `'#/entry/%E0%A4%A'` | home, current month (malformed encoding) |
| `'#/entry/3f1c…?m=2026-11'` | editor; query ignored |
| `'#/nope'`, `'#/add/'`, `'#//'` | home, current month |

### 10.2 `parseHash` algorithm

1. Strip one leading `#`.
2. Split at the first `?` into `path` and `query`.
3. `path === '/add'` → `{ name: 'add' }`.
4. `path === '/accounts'` → `{ name: 'accounts' }`.
5. `path === '/category'`:
   - `month` = first `m` in `query` if `isValidMonthKey`, else
     `monthOf(today ?? todayLocalDate())`.
   - `c = new URLSearchParams(query).get('c')`.
   - `c === null || c === ''` → `{ name: 'home', month }`.
   - otherwise → `{ name: 'category', month, categoryId: c }`.
   - `URLSearchParams` has already percent-decoded `c`; do not decode again.
6. `path.startsWith('/entry/')`:
   - `raw = path.slice('/entry/'.length)`.
   - `raw === ''` or `raw.includes('/')` → `{ name: 'home', month:
     monthOf(today ?? todayLocalDate()) }`.
   - `decodeURIComponent(raw)` in a `try`; a thrown `URIError` → the same home
     route.
   - an empty decoded id → the same home route.
   - otherwise → `{ name: 'entry', entryId: decoded }`.
7. Any other path → home with the parsed `m` (unknown path does not discard a
   valid month, matching slice 1).

The URL is not rewritten when a route falls back. Fallback is a rendering
decision.

### 10.3 `routeToHash`

- `home` → `#/?m=${month}`
- `add` → `#/add`
- `accounts` → `#/accounts`
- `category` → `#/category?m=${month}&c=${encodeURIComponent(categoryId)}`
- `entry` → `#/entry/${encodeURIComponent(entryId)}`

The query order for `category` is always `m` then `c`. `encodeURIComponent`
handles the sentinel, UUIDs, and any future ids with reserved characters.
`decodeURIComponent(routeToHash(route))` round-trips every route whose month is
valid.

### 10.4 Navigation rules

| Trigger | Destination | History |
|---|---|---|
| Home category row | `category`, displayed month, `row.categoryId` | push |
| Category list Back | `home`, the list's month | push |
| Category list row | `entry`, `row.id` | push |
| Editor Back | `category`, `monthOf(entry.date)`, `entry.categoryId ?? sentinel` | push |
| Editor Save success | `category`, `monthOf(updated.date)`, `input.categoryId` | **replace** |
| Editor Remove confirm, remaining rows > 0 | `category`, `monthOf(removed.date)`, `removed.categoryId ?? sentinel` | **replace** |
| Editor Remove confirm, remaining rows = 0 | `home`, `monthOf(removed.date)` | **replace** |
| Editor not-found "Go home" | `home`, current month | **replace** |
| Editor stale entry on save/remove | no navigation; not-found state | — |
| Home empty-state CTA | `add` (unchanged) | push |
| Home previous/next | `home`, `addMonths(±1)` (unchanged) | push |
| First-run gate | `accounts` (unchanged) | replace |

Why `replace` after save/remove: the editor must not remain in history as a
stale form for a row whose values have moved. Back after a save therefore
returns to the category list's predecessor, not the editor.

The on-screen Back buttons use explicit `navigate`, not `history.back()`, so a
deep link still has a correct destination. Browser back remains whatever the
history holds.

## 11. Call Stacks

### 11.1 Category list render

```text
App(route = { name: 'category', month, categoryId })
  -> <CategoryEntriesScreen ledger={ledger} month={month} categoryId={categoryId} />
       entries  = useLiveQuery(() => ledger.categoryEntries(month, categoryId), [ledger, month, categoryId])
       settings = useLiveQuery(() => ledger.getSettings(), [ledger])
       if either undefined -> render <p>Loading…</p>
       -> formatAmount(totalMinor, settings.currency, settings.currencyExponent)
       -> rows.map: formatAmount(row.amountMinor, …)
                    row.date verbatim
                    accountLabel(row, ambiguousNames)
       -> row button onClick -> navigate({ name: 'entry', entryId: row.id })
       -> Back button onClick -> navigate({ name: 'home', month })
```

`ambiguousNames` is computed from `rows` before render:

1. Group distinct `accountId`s by `accountName`, ignoring rows whose
   `accountType` is `null`.
2. A name is ambiguous when its group has two or more distinct account ids.
3. For an ambiguous name, the row label is
   `${accountName} · ${ACCOUNT_TYPE_LABELS[accountType]}`.
4. Otherwise, and for `accountType === null`, the label is `accountName`.

### 11.2 Editor open and seeding

```text
App(route = { name: 'entry', entryId })
  -> <EntryEditorScreen ledger={ledger} entryId={entryId} />
       entry      = useLiveQuery(() => ledger.getEntry(entryId), [ledger, entryId])
       accounts   = useLiveQuery(() => ledger.listAccounts(), [ledger])
       categories = useLiveQuery(() => ledger.listCategories(), [ledger])
       settings   = useLiveQuery(() => ledger.getSettings(), [ledger])
       if any undefined -> <p>Loading…</p>
       if entry === null || entry.kind !== 'expense' -> not-found state
       -> <EntryForm key={entry.id} entry={entry} accounts categories settings />
```

`EntryForm` seeds its state once, in `useState` initializers:

- `amountText = formatAmountInput(entry.amountMinor, settings.currencyExponent)`
- `categoryId = entry.categoryId !== undefined && categories.some(c => c.id === entry.categoryId) ? entry.categoryId : null`
- `accountId = accounts.some(a => a.id === entry.accountId) ? entry.accountId : null`
- `date = entry.date`
- `errors`: `{}` plus, when a stored reference is missing, the matching
  unknown-reference copy (`category` and/or `account`).

The `key={entry.id}` is what makes this a seed-once model: a live update to the
same entry re-renders the form but does not reset its state; a different entry
id remounts and reseeds. The prototype in §14 verified both.

If the stored category or account is missing:

- the corresponding selection is `null`;
- the field starts with the unknown-reference error;
- the user must choose a real row before saving, because
  `requireExpenseFields` rejects a missing reference and the picker contains no
  matching option.

### 11.3 Save

```text
submit(event)
  preventDefault
  if submittingRef.current -> return
  amountMinor = parseAmount(amountText, settings.currencyExponent)
  errors = {}
  if amountMinor === null || amountMinor <= 0 -> errors.amount
  if categoryId === null -> errors.category
  if accountId === null -> errors.account
  if !isValidLocalDate(date) -> errors.date
  if errors non-empty -> setErrors(errors); return
  submittingRef.current = true; setSubmitting(true); setErrors({})
  try
    updated = await ledger.updateExpense(entry.id, { amountMinor, categoryId, accountId, date })
    navigate(
      { name: 'category', month: monthOf(updated.date), categoryId },
      { replace: true },
    )
  catch LedgerError
    code === 'unknown-entry' || code === 'unsupported-entry-kind'
      -> setGone(true)                      // renders not-found; no navigation
    else
      mapped = expenseFieldErrors(code)
      setErrors(mapped ?? { form: 'Could not save the changes. Try again.' })
  catch other
    setErrors({ form: 'Could not save the changes. Try again.' })
  finally
    submittingRef.current = false; setSubmitting(false)
```

The validated `categoryId` is used for the destination instead of
`updated.categoryId` because `Entry.categoryId` is optional in the domain type;
the update has just written that exact value. `monthOf(updated.date)` uses the
returned row, so a re-dated entry lands in its new month.

The form-level error renders with `role="alert"`. Field errors render under
their field with `aria-describedby`.

### 11.4 Remove

```text
click "Remove entry" -> setConfirmingDelete(true)
  -> focus the Cancel button

click "Cancel" -> setConfirmingDelete(false); no write

click "Remove"
  if deletingRef.current -> return
  deletingRef.current = true; setDeleting(true)
  try
    removed = await ledger.deleteExpense(entry.id)
    month = monthOf(removed.date)
    categoryId = removed.categoryId ?? UNCATEGORIZED_CATEGORY_ID
    remaining = await ledger.categoryEntries(month, categoryId)
    if remaining.rows.length === 0
      navigate({ name: 'home', month }, { replace: true })
    else
      navigate({ name: 'category', month, categoryId }, { replace: true })
  catch LedgerError
    unknown-entry / unsupported-entry-kind -> setGone(true)
    other -> setErrors({ form: 'Could not remove the entry. Try again.' })
  catch other -> same form error
  finally
    deletingRef.current = false; setDeleting(false)
```

The confirmation names the **stored** entry, not the form state: amount via
`formatAmount(entry.amountMinor, …)`, date verbatim, account label from the
resolved account (or `Unknown account`). A half-edited form therefore cannot
misdescribe what will be removed.

`categoryEntries` is a post-delete read, not part of the delete transaction.
Another tab adding an entry between the two calls would keep the user on the
category list; that is acceptable and self-correcting.

### 11.5 Back

```text
click "Back"
  -> navigate({
       name: 'category',
       month: monthOf(entry.date),
       categoryId: entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID,
     })
```

No write, no unsaved-changes prompt. The scope says leaving without saving
changes nothing; a prompt is not part of this slice.

### 11.6 Stale or deleted entry

- `getEntry` returns `null` → not-found state.
- Loaded entry has a non-expense `kind` → not-found state.
- `updateExpense`/`deleteExpense` throws `unknown-entry` or
  `unsupported-entry-kind` → not-found state, no redirect.

Not-found copy:

```text
<h1>Entry not found</h1>
<p>This entry no longer exists.</p>
<button>Go home</button>
```

`Go home` navigates to `home` for the current month with `replace: true`.

### 11.7 Live update paths

```text
updateExpense / deleteExpense commits
  -> Dexie invalidates queries that read `entries`
  -> HomeScreen monthSummary re-runs
  -> CategoryEntriesScreen categoryEntries re-runs
  -> EntryEditorScreen getEntry re-runs (form state is not reseeded)
```

No component calls a refresh function.

## 12. UI Contract

### 12.1 Shared expense form pieces

`src/app/expenseForm.tsx` is new and exports:

```ts
export interface ExpenseFieldErrors {
  amount?: string;
  category?: string;
  account?: string;
  date?: string;
  form?: string;
}

export function expenseFieldErrors(
  code: LedgerErrorCode,
): ExpenseFieldErrors | null;

export function ChoiceGroup(props: {
  legend: string;
  options: { id: string; label: string }[];
  selectedId: string | null;
  errorId?: string;
  error?: string;
  onSelect: (id: string) => void;
}): JSX.Element;

export function ExpenseFields(props: {
  idPrefix: 'expense' | 'entry';
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
  errors: ExpenseFieldErrors;
  onClearError: (field: keyof ExpenseFieldErrors) => void;
}): JSX.Element;
```

- `expenseFieldErrors` maps `invalid-amount` → `amount`, `invalid-date` →
  `date`, `unknown-account` → `account`, `unknown-category` → `category`.
  Every other code returns `null`; the caller supplies the surface-specific
  fallback.
- `ExpenseFields` renders amount, category, account, date in that order with
  the same markup as the slice-1 add form. Input ids are
  `${idPrefix}-amount` and `${idPrefix}-date`; error ids are
  `${idPrefix}-amount-error` and `${idPrefix}-date-error`. The add screen passes
  `idPrefix="expense"`, preserving its existing ids and tests; the editor
  passes `idPrefix="entry"`.
- `ChoiceGroup` is the existing chip group, moved without behaviour change.
- `AddExpenseScreen` is refactored onto these exports. Its copy, defaults,
  submit flow, and destination are unchanged.

### 12.2 Home screen delta

Category rows become buttons. Structure per row:

```text
<li>
  <button type="button" aria-label={`${row.name}, ${formattedAmount}`}>
    <span>{row.name}</span>
    <span>{formattedAmount}</span>
  </button>
</li>
```

- The button's accessible name is the explicit `aria-label`, e.g.
  `Groceries, $45.00`. This is deterministic for tests and screen readers;
  relying on implicit text concatenation across spans is not.
- Clicking navigates to the category route for the displayed month.
- Every row is tappable, including `Uncategorized`.
- Ordering, month controls, total, empty state, and the add/accounts actions
  are unchanged.

### 12.3 Category entries screen

Heading:

```text
<h1>{categoryName} · {formatMonth(month)}</h1>
```

The separator is a middle dot surrounded by spaces, matching account labels.

Total:

```text
<p className="spent">Spent <strong>{formattedTotal}</strong></p>
```

List:

```text
<ul className="entry-list">
  <li>
    <button
      type="button"
      aria-label={`${formattedAmount} on ${row.date}, ${accountLabel}`}
    >
      <span>{formattedAmount}</span>
      <span>{row.date}</span>
      <span>{accountLabel}</span>
    </button>
  </li>
  …
</ul>
```

- Rows are in `rows` order: date desc, then id desc.
- The visible order is amount, date, account.
- The row button's accessible name is the explicit `aria-label`, e.g.
  `$45.00 on 2026-11-02, Checking`.
- Clicking navigates to `entry` with `row.id`.
- No amount sign, no running balance, no per-row category (the list is already
  one category), no edit affordance beyond the row itself.

Empty state:

```text
<p>No entries in this category this month.</p>
```

No add button, no auto-redirect. Back is always present.

Loading state is `<p>Loading…</p>` while `categoryEntries` or `settings` is
`undefined`. There is no error state; a rejected live query is a programmer
error, as in slice 1.

### 12.4 Entry editor screen

Ready state:

```text
<section>
  <h1>Correct expense</h1>
  <form>
    <ExpenseFields idPrefix="entry" … />
    {errors.form ? <p role="alert">…</p> : null}
    <div className="actions">
      <button type="submit" disabled={submitting}>Save changes</button>
      <button type="button" disabled={submitting || deleting}>Back</button>
      <button type="button" disabled={submitting || deleting}>Remove entry</button>
    </div>
  </form>
</section>
```

- The heading uses the glossary term "Correction"; the UI copy is
  `Correct expense`. Do not use "Edit" in user-facing copy.
- Amount, category, account, and date are the only editable fields. `id` and
  `kind` are never shown.
- The amount input is `type="text"`, `inputMode="decimal"`,
  `autoComplete="off"`, matching the add form.
- The date input is `type="date"`.
- Category options are `listCategories()` in its existing order (name asc, id
  asc), including archived rows.
- Account options are `listAccounts()` in its existing order (createdAt asc,
  id asc), labelled `${name} · ${ACCOUNT_TYPE_LABELS[type]}`.
- Client-side validation mirrors §11.3 and runs before the write.
- `submitting` and `deleting` are separate flags; the buttons disable on
  either. A synchronous `useRef` guard backs each flag, as in the add form.
- No delete button on the category list; removal is only from an opened entry.

Not-found state is §11.6. Loading state is `<p>Loading…</p>`.

### 12.5 Removal confirmation panel

The panel replaces the action row inside the same form; it is not a route and
not a modal.

```text
<div role="group" aria-label="Confirm removal">
  <p>
    Remove {formattedAmount} on {entry.date} from {accountLabel}?
    This cannot be undone.
  </p>
  <button type="button" ref={cancelRef}>Cancel</button>
  <button type="button" disabled={deleting}>Remove</button>
</div>
```

- Opening the panel moves focus to `Cancel`.
- Cancel closes the panel and writes nothing; the form state is untouched.
- Remove calls `deleteExpense` with `entry.id`.
- The amount, date, and account come from the stored entry, never from the
  form fields.
- `accountLabel` is the account's name, or `Unknown account` when the row is
  gone; the type suffix is not used in the confirmation (the name is enough to
  identify the entry).
- No Escape handler, no focus trap, no backdrop. The panel is inline and the
  surrounding form remains the page.

### 12.6 Error mapping

| Code | Surface | User-facing text |
|---|---|---|
| `invalid-amount` | editor amount | `Enter an amount greater than zero.` |
| `invalid-date` | editor date | `Choose a valid date.` |
| `unknown-account` | editor account | `That account no longer exists. Choose another.` |
| `unknown-category` | editor category | `That category no longer exists. Choose another.` |
| `unknown-entry` | save or remove | not-found state (§11.6) |
| `unsupported-entry-kind` | save or remove | not-found state (§11.6) |
| unexpected error | save | `Could not save the changes. Try again.` |
| unexpected error | remove | `Could not remove the entry. Try again.` |

The add screen keeps its slice-1 table, including
`Could not save the expense. Try again.`

Tests assert codes at the ledger seam and accessible text at the UI seam; they
never assert `LedgerError.message`.

### 12.7 Accessibility

- Every input has a programmatic label: `Amount`, `Category`, `Account`,
  `Date`.
- Choice groups use `fieldset`/`legend` and `aria-pressed` buttons, as in the
  add form.
- Field errors are referenced with `aria-describedby`; form errors use
  `role="alert"`.
- Category rows and entry rows are native buttons, keyboard-operable and
  announced by their visible text.
- The confirmation panel is a labelled group; focus starts on the safe action.
- Headings: one `<h1>` per screen.
- The existing month controls keep their `aria-label`s.

### 12.8 Styling scope

Reuse the existing global stylesheet and classes (`field`, `chip-group`,
`field-error`, `form-error`, `actions`, `spent`, `empty-state`,
`category-list`). Add an `entry-list` rule for row layout and a destructive
style for the `Remove` action if the build needs one. Visual design is
ticket-level; structure, copy, states, and accessible names are fixed here.

## 13. Testing Decisions

### 13.1 Seams

Test at the highest seam that observes the behaviour:

- `money.ts` unit tests for `formatAmountInput`.
- `createLedger(real BudgetDatabase)` for every ledger rule.
- `App` with a real ledger for cross-screen flows; screen-level tests where a
  flow is local.
- Pure `parseHash`/`routeToHash` tests for routing.

No new seam, no mocked ledger, no mocked Dexie. `fake-indexeddb` is the system
boundary.

### 13.2 What makes a good test here

- Assert external behaviour: returned values, stored rows, rendered text,
  navigation hash.
- Assert `LedgerError.code`, not message text.
- Use known-good literals and worked examples; never recompute the expected
  value the way the implementation does.
- Use `waitFor` for live-query updates; never sleep, never use fake timers.
- Use explicit months and dates; the wall clock is used only by the existing
  add-form default and the not-found destination.
- Each test gets `new BudgetDatabase(`budget-test-${crypto.randomUUID()}`)` and
  deletes it in `afterEach`.
- Insert non-expense or orphaned rows with raw `db.entries.add` fixtures; the
  ledger has no write path for them.
- Do not assert private helpers, call counts, or call order.

### 13.3 `formatAmountInput` tests (`src/domain/money.test.ts`)

- Canonical table in §6.1 at exponents 0, 2, and 6.
- Round-trip through `parseAmount` for representative values, including `0`,
  `1`, values shorter than the exponent, and a large safe integer.
- Trailing zeros are preserved (`4500`, exp 2 → `45.00`).
- Negative input renders a leading `-`.
- Invalid exponent and unsafe amount throw `RangeError`.

### 13.4 Ledger integration tests (`src/data/ledger.test.ts`)

`categoryEntries`:

- Returns only the requested category and month.
- Sorts date desc, then id desc for same-day rows.
- Includes credit-card entries; no account-type branch.
- `rows` sum to `totalMinor`.
- Its total equals the matching `monthSummary` row, for every row of a mixed
  month.
- Empty category-month returns zero rows and the resolved category name.
- Invalid month throws `RangeError`.
- A raw entry with no `categoryId` appears under
  `UNCATEGORIZED_CATEGORY_ID` with `UNCATEGORIZED_LABEL`.
- A missing account row yields `Unknown account`, `accountType: null`, and the
  amount stays in the total.
- A missing category row yields `Uncategorized` and the amount stays in the
  total.
- An archived category still resolves its name.

`getEntry`:

- Returns the stored row for a known id.
- Returns `null` for an unknown id (explicitly not `undefined`).
- Returns a non-expense row unchanged (filtering is the editor's job).

`updateExpense`:

- Changes the four fields, preserves `id` and `kind`, and leaves every other
  entry untouched.
- Moves an amount between category rows and between months in
  `monthSummary`.
- Rejects an unknown id with `unknown-entry`.
- Rejects a raw non-expense row with `unsupported-entry-kind`.
- Rejects each invalid field with the matching code.
- Honours precedence: invalid amount + unknown account → `invalid-amount`.
- Does not change `settings.lastAccountId`.
- Saving identical values succeeds and returns the merged row.

`deleteExpense`:

- Removes exactly one row and returns its snapshot.
- Updates `monthSummary`; empties the month when it was the last entry.
- Rejects an unknown id and a non-expense row with the matching code.
- Does not change `settings.lastAccountId`.

Storage:

- The existing schema test still asserts `SCHEMA_VERSION === 1` and the same
  tables/indexes.

### 13.5 Router tests (`src/app/router.test.ts`)

- Every row of the §10.1 table.
- `routeToHash`/`parseHash` round-trip for a category id and an entry id
  containing `&`, `?`, `#`, and a space.
- `/entry/a/b` and `/entry/` fall back home.
- A malformed percent escape in the entry id falls back home without throwing.
- Unknown paths keep a valid `m`.

### 13.6 UI tests

`CategoryEntriesScreen` / `App`:

- Home category row opens the list; heading names category and month; total
  matches the home row.
- Rows show amount, date, and account, newest first.
- The `Uncategorized` home row opens its list.
- Back returns to the same month on home.
- An empty list shows the empty copy and a working Back.
- Two same-named accounts get type suffixes on their rows; a unique name does
  not.

`EntryEditorScreen` / `App`:

- Opening a row prefills all four fields; the amount is a plain decimal.
- Editing the amount updates the list, the home row, and the home total.
- Changing the category moves the amount between home rows and lands on the
  new category's list.
- Changing the date to another month lands on that month's list; the old month
  loses the entry.
- Back without saving leaves the entry unchanged.
- Cancel on the confirmation keeps the entry and closes the panel.
- Confirm removes the entry; the list and home totals update.
- Removing a category's last entry lands on home for that month without the
  category.
- Removing the month's last entry shows the home empty state.
- A credit-card entry edits and removes like a checking one.
- A stale `/entry/<id>` shows the not-found state; `Go home` works.
- An entry whose stored category is missing starts with the category error and
  requires a new selection before saving.
- Double-clicking Save writes once; double-clicking Remove deletes once.
- The confirmation names the stored amount, date, and account even after the
  form fields were changed without saving.

### 13.7 Prior art

- `src/data/ledger.test.ts` — real database, raw fixtures for non-expense and
  orphan rows, unique DB names.
- `src/app/screens/AddExpenseScreen.test.tsx` — form interaction through
  labels and accessible names.
- `src/app/App.test.tsx` — cross-screen flows via hash changes and live
  queries.
- `src/app/router.test.ts` — pure table-driven hash cases.

### 13.8 Not tested

- Internal `requireExpenseFields` in isolation; its rules are observed through
  add and update.
- CSS, visual layout, and exact spacing.
- The literal "final" promise of removal beyond the absence of an undo UI.
- Cross-tab concurrency; out of scope as in slice 1.

## 14. Prototype Check

A throwaway Vitest file, `src/prototype/slice02.prototype.test.tsx`, was used
to sanity-check the two choices that could have been locked wrongly. It was
deleted after this spec was written; nothing from it ships.

What it tried:

1. **`formatAmountInput` round-trip.** A candidate with fixed fractional
   digits was checked against the real `parseAmount` at exponents 0, 2, and 6
   for values `1`, `5`, `50`, `450`, `4500`, `999999`, and `123456789`. Also
   checked: `0`, trailing-zero preservation, and `RangeError` for an unsafe
   amount. All passed. Decision locked: fixed `exponent` fraction digits, not
   trimmed trailing zeros.
2. **Seed-once editor form under live queries.** A miniature loader +
   `key={entry.id}` form was rendered with `useLiveQuery`. After typing into
   the amount field, the stored row was updated directly in IndexedDB. The
   form kept the typed text while the surrounding live value updated; changing
   the entry id reseeded; a missing id showed not-found. This confirmed the
   state model in §11.2.
3. **Post-delete emptiness check.** A real ledger inserted one expense, read
   the month's rows with the architecture's predicate, deleted the row, and
   read again. The category-month was empty. This confirmed the navigation
   check in §11.4.

The prototype caught one real defect before it reached the spec: Dexie's
`Table.get` resolves `undefined`, and `useLiveQuery` treats `undefined` as
"not loaded". A `getEntry` that returned the raw result would have rendered
`Loading…` forever for a stale id. §9.6 therefore makes `?? null` a hard part
of the contract, and §13.4 tests it explicitly.

Result: 6/6 prototype checks passed after that fix. No visual UI prototype was
built; the scope fixes the flow and the copy is settled in §12.

## 15. Open Questions Resolved

| Area | Question | Resolution |
|---|---|---|
| API | Are there endpoints? | No. `Ledger` is the whole API; static PWA. |
| API | New repository interface or fake adapter? | No. One Dexie adapter; tests use a real database. |
| Storage | Does the schema change? | No. `SCHEMA_VERSION` stays `1`; no table, key, index, or migration. |
| Storage | Is a compound index added? | No. `entries.date` narrows the month; category/kind filter in memory. |
| Storage | Is `updatedAt` added? | No. Correction overwrites the four fields; identity is `id`. |
| Storage | Is removal soft? | No. Hard delete; no tombstone, history, or undo. |
| Ledger | How is an entry addressed? | `#/entry/<id>` only; the stored row supplies its month and category. |
| Ledger | What does `getEntry` return for a missing id? | `null`, never `undefined`; `?? null` is mandatory for `useLiveQuery`. |
| Ledger | Does `getEntry` join accounts/categories? | No. The editor already loads both lists. |
| Ledger | Does `getEntry` filter by kind? | No. The editor renders not-found for a non-expense row. |
| Ledger | How does edit reuse the add validation? | Private `requireExpenseFields`, called inside the write transaction by both. |
| Ledger | Validation order? | add: amount→date→account→category; update: entry→kind→amount→date→account→category; delete: entry→kind. |
| Ledger | Does update touch `settings.lastAccountId`? | No. That field means "account used when adding". |
| Ledger | Does update change `id`, `kind`, or `toAccountId`? | No. Only the four editable fields are written. |
| Ledger | Does saving unchanged values write? | Yes, unconditionally; it succeeds and invalidates live queries. |
| Ledger | Is there duplicate detection? | No. |
| Ledger | What does `deleteExpense` return? | The removed snapshot, so navigation uses stored values. |
| Ledger | Are batch operations supported? | No. One id per call. |
| Read model | New read model or reuse `monthSummary`? | New `categoryEntries(month, categoryId)`; `monthSummary` stays the home aggregate. |
| Read model | What is the row order? | `date` desc, then `id` desc. |
| Read model | Is `totalMinor` derived? | Yes, always the sum of `rows`. |
| Read model | Does the list filter by account? | No. Credit and checking entries are identical. |
| Read model | Are other kinds listed? | No. Only `kind === 'expense'`. |
| Read model | What about an entry with no `categoryId`? | Grouped under `UNCATEGORIZED_CATEGORY_ID`, labelled `Uncategorized`, reachable from home. |
| Read model | Missing account row? | `Unknown account`, `accountType: null`; amount retained. |
| Read model | Missing category row? | `Uncategorized`; amount retained. |
| Read model | Empty category-month? | `{ totalMinor: 0, rows: [] }` with the category name still resolved. |
| Read model | Is `categoryId` validated? | No. An unknown id returns an empty list; routes never send an empty id. |
| Read model | Does the list total equal the home row? | Yes; it is a tested invariant, not an implementation detail. |
| Money | What string does the editor show? | Fixed `exponent` fraction digits, no symbol/grouping; `4500` at exp 2 → `45.00`. |
| Money | Does `formatAmountInput` round-trip? | Yes, for non-negative safe integers at every exponent 0..6. |
| Money | What about negatives and unsafe values? | Negative renders `-`; unsafe throws `RangeError`; the ledger only passes positive expenses. |
| Routing | What are the new routes? | `#/category?m=YYYY-MM&c=<id>` and `#/entry/<id>`. |
| Routing | Missing/empty `c`? | Home for the parsed month. |
| Routing | Invalid `m`? | Current month, no URL rewrite. |
| Routing | Entry id with a literal `/` segment or malformed encoding? | Home, current month. A percent-encoded `/` is a legal id character and is decoded after the path split. |
| Routing | Is the entry route's query used? | No; ignored. |
| Routing | Where does Back go from the list? | Home for the list's month, push. |
| Routing | Where does Back go from the editor? | The entry's stored category and month, push. |
| Routing | Where does save land? | The updated entry's month and `input.categoryId`, replace. |
| Routing | Where does removal land? | Remaining category list, or that month's home when empty, replace. |
| Routing | Where does not-found "Go home" land? | Current month home, replace. |
| Routing | Does a stale write redirect silently? | No; it renders not-found so the user learns the entry is gone. |
| UI | How is the editor form seeded? | Once, via `useState` initializers in a component keyed by `entry.id`. |
| UI | Do live updates clobber a half-edited form? | No. The same entry re-renders; only a different id reseeds. |
| UI | What if the stored category/account is gone? | Selection is `null`, the unknown-reference error is shown, and the user must choose. |
| UI | What is the editor heading? | `Correct expense` (glossary: Correction). |
| UI | What is the save action? | `Save changes`; disabled while submitting. |
| UI | What is the removal action? | `Remove entry`, then an inline confirmation with `Cancel` and `Remove`. |
| UI | Is removal a modal or route? | Neither; an inline labelled group inside the editor. |
| UI | What does the confirmation name? | The stored amount, date, and account; not unsaved form edits. |
| UI | Where does focus go when the panel opens? | The `Cancel` button. |
| UI | Is there an unsaved-changes prompt on Back? | No; Back writes nothing. |
| UI | How are duplicate account names disambiguated? | Type suffix only for names shared by 2+ distinct account ids in the visible rows. |
| UI | How is a date displayed? | The stored `YYYY-MM-DD` string; no new formatter. |
| UI | Is there an add action on the category list? | No. Add remains on home. |
| UI | What does an empty category list show? | `No entries in this category this month.` plus Back. |
| UI | Are archived categories selectable? | Yes, matching `listCategories()`; archiving is not this slice. |
| UI | Is there optimistic UI? | No. Navigation happens after the ledger promise resolves. |
| UI | Double submit/remove? | Synchronous ref guards plus disabled buttons. |
| UI | Loading and error states? | `Loading…` while live queries resolve; no live-query error boundary, as in slice 1. |
| Testing | New seams? | No. Domain, ledger, UI, and pure router seams from slice 1. |
| Testing | Are ledger or Dexie internals mocked? | No. `fake-indexeddb` is the boundary. |
| Testing | How are non-expense/orphan rows created? | Raw `db.entries.add` fixtures. |
| Docs | Does `CONTEXT.md` need another change? | No. The architecture gate already added `Correction` and `Removal` and fixed `Entry` to four kinds. |

## 16. Out of Scope

Inherited from the slice scope and architecture, and not to be added while
building:

- All-entries feed; search or filtering inside a category.
- Undo, audit history, soft delete, "recently removed" recovery.
- Bulk edit/delete, multi-select, "remove all in this category".
- Custom category management; category rename/archive UI.
- Backup/restore, export/import, storage-warning UI.
- Account deletion or any cascade.
- Balances, opening balances, income, transfers.
- Last-month comparison, budgets, charts beyond the existing headline.
- Multi-currency, locale settings, bank sync, sharing, laptop view.
- Any HTTP endpoint, server validation, sync, or auth.
- Any Dexie version bump or migration.
- A visual redesign or new component library.
- `createdAt` on entries; insertion-order tie-breaking within a day.

## 17. Further Notes

- **No ADR.** The two hard-to-reverse choices — in-place correction and final
  removal — are settled by the product scope. The rest is reversible: routes,
  copy, and read-model shapes can change without touching stored data.
- **No migration.** Because the schema is untouched, an installed slice-1 app
  upgrades by loading the new static bundle; IndexedDB data is read as-is.
- **Implementation order.** Ledger read models first (`getEntry`,
  `categoryEntries`, constants), then writes (`requireExpenseFields`,
  `updateExpense`, `deleteExpense`), then money/route primitives, then screens,
  then cross-screen tests. This keeps each step testable at an existing seam.
- **Risk: same-day ordering is arbitrary.** `id` desc is deterministic but not
  insertion order. Users may see two same-day entries swap when one is
  corrected. Fixing it needs `createdAt` or a sequence, both deferred.
- **Risk: orphaned references.** Categories are archived, not deleted, and
  accounts cannot be deleted in this slice, so missing rows are corruption-only
  today. The list and editor still degrade explicitly so a later import cannot
  hide money.
- **Risk: stale form after a cross-tab change.** The form keeps its seed while
  live queries update around it. The next write re-reads and validates, so the
  failure mode is a visible `unknown-entry`/`unknown-account` error, never a
  silent overwrite of a different row.
- **Docs:** if the build finds a contradiction with this spec, update this file
  in the same change rather than diverging silently. The next gate is
  `to-tickets`; tickets should cite the section they implement.
