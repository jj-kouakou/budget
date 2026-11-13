# Slice 06 Program Design Spec — Track account balances

- **Gate:** Slice Program Design (workflow step 5).
- **Status:** built and reviewed 2026-11-12. Implemented as specified; no
  production divergence was found at review. `SCHEMA_VERSION` and
  `BACKUP_SCHEMA_VERSION` remain `1`. Not yet merged, pushed, or deployed;
  that is the release step.
- **Sources:** `docs/product/slices/slice-06-scope.md`,
  `docs/architecture/slices/slice-06-architecture.md`,
  `docs/architecture/north-star.md`, the slice 01–05, 07, and 08 architecture
  docs, the prior program-design specs, `CONTEXT.md`, and the current `src/`
  code.
- **Endpoints:** none. The app is static files plus IndexedDB (ADR 0001);
  `Ledger` is the whole application API. This slice adds no network call, no
  server validation, and no new persistence seam.
- **Prototype:** one throwaway logic/state prototype. It settled the inline
  editor state model and re-checked the balance effect table, credit sign
  conversion, display strings, and `parseSignedAmount` cases. §9 records what
  was tried and what changed.

---

## 1. Problem Statement

The app records every movement of money, but the Accounts screen lists only
names and types. The user cannot tell what the checking account holds, what
the card owes, or whether a balance is right. Without a starting point, even a
perfectly recorded set of movements describes only the part of the account's
history that happened after the user installed the app. The user cannot use
the app as their only ledger.

## 2. Solution

The Accounts screen shows every account's current balance, derived from one
optional opening balance plus every expense, income, and transfer recorded
against that account. The user can set the opening balance while adding an
account or later from the account's row, change it, or clear it. The form is
inline, prefilled, and non-blocking.

Checking and savings balances show what the account holds; a negative balance
is shown with its minus and called “overdrawn”. A credit-card balance shows
what the card owes as a positive amount labelled “owed”; zero owed is explicit,
and an overpaid card shows “in credit”.

Balances are current, not month-end, and update live when any movement is
added, corrected, or removed. Opening balances never enter the home total,
the category breakdown, the comparison with last month, the income list, the
transfers list, or a category's entries. No table, index, schema version,
backup version, route, endpoint, or settings write changes.

## 3. User Stories

### Setting a starting point

1. As a user, I want to set a starting point while adding an account, so that
   the balance matches what the account held before I started logging.
2. As a user, I want to add an account without a starting point, so that I can
   start quickly and add it later.
3. As a user, I want an account without a starting point to start at zero, so
   that its balance is predictable.
4. As a user, I want to set a starting point for an existing account, so that
   I can correct the balance later.
5. As a user, I want to set a zero starting point explicitly, so that the app
   stops inviting me to set one.
6. As a user, I want to enter a negative starting point for checking or
   savings, so that an overdrawn account is recorded truthfully.
7. As a user, I want to enter what a credit card owed, so that the card
   balance is meaningful.
8. As a user, I want to record a credit card that started in credit, so that
   it is not treated as debt.
9. As a user, I want to change a starting point, so that a corrected figure
   replaces the old one.
10. As a user, I want to clear a starting point, so that the account falls
    back to its recorded movements.
11. As a user, I want exactly one starting point per account, so that changing
    it never creates a second.
12. As a user, I want the starting point to belong to the account, not a
    month, so that moving between months does not change it.
13. As a user, I want the starting point to use the same currency and amount
    entry as everywhere else, so that I do not learn a second format.
14. As a user, I want the app to refuse a starting point that is not a valid
    amount, so that no corrupt number is stored.

### Seeing what each account holds or owes

15. As a user, I want the Accounts screen to show every account's current
    balance, so that I know where my money is.
16. As a user, I want each row to show the account name, type, and balance, so
    that I can identify the account.
17. As a user, I want a checking or savings balance to show what the account
    holds, so that I can read it directly.
18. As a user, I want a negative checking or savings balance to show a minus
    and say overdrawn, so that I understand the state.
19. As a user, I want a credit-card balance to show what the card owes as a
    positive amount labelled owed, so that debt is not shown as a negative
    number.
20. As a user, I want a card with nothing owed to show zero owed, so that the
    state is explicit.
21. As a user, I want an overpaid card to show the amount in credit, so that
    it is not treated as negative debt.
22. As a user, I want the balance to include the starting point and every
    expense, income, and transfer for the account, so that it is complete.
23. As a user, I want a checking or savings balance to fall when money leaves
    and rise when money arrives, so that the direction is intuitive.
24. As a user, I want a credit-card balance to rise when I spend and fall when
    I pay, so that owed tracks reality.
25. As a user, I want the balance to update straight away after an expense,
    income, or transfer is added, corrected, or removed, so that I do not
    refresh.
26. As a user, I want the balance to be current, not month-end, so that moving
    between months does not change it.
27. As a user, I want no combined total across accounts, so that the app does
    not become a net-worth tracker.
28. As a user, I want the home total, category breakdown, and last-month
    comparison to stay unchanged, so that balances remain supporting context.
29. As a user, I want an account with movements but no starting point to show
    the sum of its movements, so that I still see a useful balance.
30. As a user, I want an account with no movements and no starting point to
    show zero, so that a new account is not blank.
31. As a user, I want a non-blocking invitation to set a missing starting
    point, so that I can improve the balance without being forced.
32. As a user, I want the invitation to disappear once a starting point is
    set, including zero, so that it does not nag me.
33. As a user, I want opening balances never to appear in the income list, the
    transfers list, or a category's entries, so that those lists keep their
    meaning.

### Correcting a starting point

34. As a user, I want the starting-point form to show the current value, so
    that I can change it rather than retype from memory.
35. As a user, I want to change or clear the starting point from the row, so
    that the balance updates immediately.
36. As a user, I want clearing to be explicit, so that an empty save does not
    silently wipe the value.
37. As a user, I want Cancel to close the form without writing, so that
    opening it is safe.
38. As a user, I want Escape to cancel, so that I can dismiss the form from
    the keyboard.
39. As a user, I want a rapid double submit to write once, so that I do not
    create duplicate work.
40. As a user, I want correcting an expense, income, or transfer to update the
    balance, so that the existing correction flows remain the way to fix a
    balance.
41. As a user, I want no direct balance editing, so that the starting point
    and movements remain the only sources of truth.
42. As a user, I want no reconciliation step, so that I am not asked to match
    a statement in this slice.

### Backups and offline

43. As a user, I want a backup to include every starting point, so that my
    ledger is complete.
44. As a user, I want restoring a backup to reproduce starting points exactly,
    so that no opening balance is lost.
45. As a user, I want restoring to replace rather than add a second starting
    point, so that the ledger stays consistent.
46. As a user, I want an older backup without starting points to restore, so
    that my existing data is not stranded.
47. As a user, I want an older backup's accounts to show movement-only
    balances and the invitation, so that I can set the starting points
    afterwards.
48. As a user, I want setting, viewing, and correcting balances to work
    offline, so that the app works on a phone with no connection.

### Accessibility

49. As a screen-reader user, I want each account's name, type, and balance
    announced, so that I do not rely on visual layout.
50. As a screen-reader user, I want owed, in credit, and overdrawn announced
    as words, so that the sign is not the only cue.
51. As a screen-reader user, I want the set/edit starting-point button to name
    the account, so that I know which row it belongs to.
52. As a screen-reader user, I want the starting-point input labelled with the
    account name, so that I know what I am editing.
53. As a screen-reader user, I want hints associated with the input, so that I
    hear what the field means.
54. As a screen-reader user, I want errors announced, so that I know why the
    save failed.
55. As a screen-reader user, I want the add form's opening field to be
    optional and clearly labelled, so that I can skip it.

### Edge cases

56. As a user, I want an account with a zero starting point to keep that zero
    through a backup and restore, so that “set to zero” survives.
57. As a user, I want a hand-edited backup with two starting points to still
    show a correct sum, so that a bad file does not break the screen.
58. As a user, I want the next set or clear to collapse duplicate starting
    points to one, so that the invariant is restored.
59. As a user, I want a restored account with a non-date creation string to
    still accept a starting point, so that a bad file does not throw.
60. As a user, I want the app to keep working when an entry references a
    missing account, so that one bad row does not break the balance list.

## 4. Seams and Call Stacks

### 4.1 One seam

The slice crosses the existing `Ledger` seam only. There is no repository
interface, no fake adapter, no new persistence module, and no test-only export.

| Module | Responsibility in this slice |
|---|---|
| `data/ledger` | Owns `AddAccountInput.openingBalanceMinor`, `AccountBalanceListItem`, the new `invalid-opening-amount` code, private `compareAccountsByCreation`, private `openingDateFor`, `listAccountBalances`, the extended `addAccount`, and `setOpeningBalance`. |
| `domain/money` | Gains `parseSignedAmount`. `parseAmount`, `formatAmount`, and `formatAmountInput` are unchanged. |
| `domain/calendar` | Unchanged. `todayLocalDate` and `isValidLocalDate` are reused. |
| `domain/types` | Unchanged. `EntryKind` already includes `opening`; `Account` gains no field. |
| `domain/backup` | Unchanged. v1 already accepts and carries openings. |
| `data/db` | Unchanged. Still not imported by the UI. |
| `app/screens/AccountsScreen` | Gains the balance read, settings read, row balance text, invitation, inline opening form, optional opening field on the add form, the type-aware sign conversion, and the row-editor state union. |
| `app/labels` | Unchanged. `ACCOUNT_TYPE_LABELS` is reused. |
| `styles.css` | Gains only the balance/invitation row styles. Existing styles are unchanged. |

No new dependency is added. No endpoint is added.

### 4.2 Balance list read call stack

| Step | Caller | Callee | Effect |
|---|---|---|---|
| 1 | `AccountsScreen` render | `useLiveQuery(() => ledger.listAccountBalances(), [ledger])` | subscribes to `accounts` and `entries` |
| 2 | `listAccountBalances` | `db.transaction('r', db.accounts, db.entries, …)` | one consistent read snapshot |
| 3 | transaction body | `db.accounts.toArray()` | every account |
| 4 | transaction body | `compareAccountsByCreation` | `createdAt` ascending, then `id` ascending |
| 5 | transaction body | `db.entries.toArray()` | every entry |
| 6 | transaction body | effect switch over each entry | accumulates `balances`, `openingSums`, `openingAccountIds` |
| 7 | transaction body | map each account to `AccountBalanceListItem` | `balanceMinor`, `openingBalanceMinor`, `hasOpeningBalance` |
| 8 | `AccountsScreen` render | `useLiveQuery(() => ledger.getSettings(), [ledger])` | currency and exponent for display only |
| 9 | `AccountsScreen` render | `balanceText(row, settings)` | visible balance text |
| 10 | live query | Dexie invalidation | re-runs after any `accounts` or `entries` write |

### 4.3 Add account with an opening call stack

| Step | Caller | Callee | Effect |
|---|---|---|---|
| 1 | user submits the add form | `AccountsScreen.addAccount` | `preventDefault`; returns if `busyRef.current` is true |
| 2 | `addAccount` handler | `openingText.trim()` | empty means “no opening entry” |
| 3 | `addAccount` handler | `parseSignedAmount(openingText, settings.currencyExponent)` | integer minor units or `null` |
| 4 | `addAccount` handler | local check | invalid → `openingError`; returns, no account written |
| 5 | `addAccount` handler | `ledgerSignedAmount(type, parsed)` | credit negates; checking/savings pass through |
| 6 | `addAccount` handler | `ledger.addAccount({ name, type, openingBalanceMinor })` | one public call |
| 7 | `addAccount` | `requireAccountName(input.name)` | trims; invalid → `invalid-name` |
| 8 | `addAccount` | account-type check | invalid → `invalid-account-type` |
| 9 | `addAccount` | safe-integer check on `openingBalanceMinor` | invalid → `invalid-opening-amount` |
| 10 | `addAccount` | build `Account` | fresh UUID, trimmed name, ISO `createdAt` |
| 11 | `addAccount` | `db.transaction('rw', db.accounts, db.entries, …)` | one write transaction |
| 12 | transaction body | `db.accounts.add(account)` | writes the account |
| 13 | transaction body | `insertEntry({ kind: 'opening', … })` when defined | writes the opening |
| 14 | `insertEntry` | `db.entries.add(entry)` | one row; returns the entry |
| 15 | `addAccount` | return `account` | account and opening exist together |
| 16 | `addAccount` handler | reset name, type, opening text | form returns to its initial state |
| 17 | live query | `listAccountBalances` | row appears with its balance |

### 4.4 Set or change an opening call stack

| Step | Caller | Callee | Effect |
|---|---|---|---|
| 1 | user submits the inline form | `AccountsScreen.saveOpening` | `preventDefault`; returns if not the opening editor or `rowBusyRef.current` |
| 2 | `saveOpening` | empty-draft check | empty → field error; returns |
| 3 | `saveOpening` | `parseSignedAmount(draft, settings.currencyExponent)` | integer minor units or `null` |
| 4 | `saveOpening` | invalid check | invalid → field error; returns |
| 5 | `saveOpening` | `ledgerSignedAmount(row.type, parsed)` | credit negates; checking/savings pass through |
| 6 | `saveOpening` | `ledger.setOpeningBalance(row.id, amountMinor)` | one public call |
| 7 | `setOpeningBalance` | safe-integer check | invalid → `invalid-opening-amount` |
| 8 | `setOpeningBalance` | normalize `-0` to `0` | no negative zero is stored |
| 9 | `setOpeningBalance` | `db.transaction('rw', db.accounts, db.entries, …)` | one write transaction |
| 10 | transaction body | `db.accounts.get(accountId)` | missing → `unknown-account` |
| 11 | transaction body | `db.entries.toArray()` + filter | openings for the account, `id` ascending |
| 12 | transaction body | no opening → `insertEntry` | one opening dated `openingDateFor(account)` |
| 13 | transaction body | one or more → `db.entries.update(first.id, { amountMinor })` | first opening keeps its `id` and `date` |
| 14 | transaction body | extras → `db.entries.bulkDelete(extraIds)` | duplicates collapse to one |
| 15 | `setOpeningBalance` | return `void` | no other write |
| 16 | `saveOpening` | close the editor | live query updates the row |

### 4.5 Clear an opening call stack

| Step | Caller | Callee | Effect |
|---|---|---|---|
| 1 | user clicks Clear | `AccountsScreen.clearOpening` | returns if not the opening editor or `rowBusyRef.current` |
| 2 | `clearOpening` | `ledger.setOpeningBalance(row.id, null)` | one public call |
| 3 | `setOpeningBalance` | `db.transaction('rw', db.accounts, db.entries, …)` | one write transaction |
| 4 | transaction body | `db.accounts.get(accountId)` | missing → `unknown-account` |
| 5 | transaction body | `db.entries.toArray()` + filter | openings for the account |
| 6 | transaction body | `db.entries.bulkDelete(openingIds)` | every opening is removed |
| 7 | `setOpeningBalance` | return `void` | no other write |
| 8 | `clearOpening` | close the editor | live query restores the movement-only balance |

### 4.6 Live invalidation

| Write | Tables touched | What re-runs | Visible effect |
|---|---|---|---|
| `addAccount` with an opening | `accounts`, `entries` | `listAccountBalances`, `listAccounts`, every entry list | the row appears with its balance; no invitation |
| `addAccount` without an opening | `accounts` | `listAccountBalances`, `listAccounts`, every entry list | the row appears at zero with the invitation |
| `setOpeningBalance` set/change | `entries` | `listAccountBalances`, `getEntry`, `monthSummary`, `categoryEntries`, `listIncome`, `listTransfers` | the row balance changes; spending and lists do not |
| `setOpeningBalance` clear | `entries` | same as above | the row falls back to its movement sum; the invitation returns |
| `addExpense` / `updateExpense` / `deleteExpense` | `entries` (and `settings` for add) | `listAccountBalances`, home reads | the row balance changes; home spending changes as before |
| `addIncome` / `updateIncome` / `deleteIncome` | `entries` | `listAccountBalances`, income reads | the row balance changes; income list changes as before |
| `addTransfer` / `updateTransfer` / `deleteTransfer` | `entries` | `listAccountBalances`, transfer reads | both affected rows change; home spending is unchanged |
| `renameAccount` | `accounts` | `listAccountBalances`, `listAccounts` | the row name changes; the balance is unchanged |
| `restoreBackup` | all four tables | every live query | every row is recomputed from the restored data |

No manual cache, event bus, refresh button, or cross-tab coordination is
added. The single-tab assumption carries over: an inline form seeds its draft
once when opened, and a concurrent change from another tab is visible to live
queries but not merged into a half-edited form.

## 5. Implementation Decisions — Data Contract

### 5.1 Types

In `src/data/ledger.ts`, extend the existing `AddAccountInput`:

```ts
export interface AddAccountInput {
  name: string;
  type: AccountType;
  openingBalanceMinor?: number; // ledger-signed; omitted = no opening entry
}
```

Add:

```ts
export interface AccountBalanceListItem {
  id: string;
  name: string;
  type: AccountType;
  balanceMinor: number;        // signed sum of entry effects
  openingBalanceMinor: number; // signed sum of opening entries; 0 when none
  hasOpeningBalance: boolean;  // an opening entry exists, even when its sum is 0
}
```

Extend `LedgerErrorCode` by appending:

```ts
  | 'invalid-opening-amount'; // opening is not a safe integer
```

Extend `Ledger`:

```ts
export interface Ledger {
  // unchanged: initialize, listAccounts, addAccount, renameAccount,
  // listCategories, addCategory, renameCategory, setCategoryArchived,
  // addExpense, updateExpense, deleteExpense, listTransfers, addTransfer,
  // updateTransfer, deleteTransfer, listIncome, addIncome, updateIncome,
  // deleteIncome, getEntry, categoryEntries, monthSummary, getSettings,
  // readBackupData, restoreBackup, markBackupSaved

  listAccountBalances(): Promise<AccountBalanceListItem[]>; // account order
  setOpeningBalance(
    accountId: string,
    amountMinor: number | null, // ledger-signed; null clears
  ): Promise<void>;
}
```

Public API contract:

| Method | Input | Output | Errors |
|---|---|---|---|
| `listAccountBalances()` | — | `AccountBalanceListItem[]` in account order | none |
| `addAccount(input)` | `AddAccountInput` | the stored `Account` | `invalid-name`, `invalid-account-type`, `invalid-opening-amount` |
| `setOpeningBalance(id, amountMinor)` | account id, ledger-signed safe integer or `null` | `void` | `invalid-opening-amount`, `unknown-account` |

`AddAccountInput.openingBalanceMinor` is **ledger-signed**:

- checking and savings: what the account held; negative when overdrawn;
- credit: the stored balance effect; negative when the card owed.

`undefined` means “no opening entry”; `0` means “an opening entry of zero”.
The distinction is required because the screen invites the user to set a
starting point when none exists, and an explicitly set zero must stop that
invitation.

`AccountBalanceListItem.balanceMinor` and `openingBalanceMinor` are both
**ledger-signed**. The UI converts a credit amount for display and for the
form input; the ledger never has two sign conventions in one type.

`listAccounts()` is unchanged and remains the picker read used by the
expense, income, and transfer forms. A balance is deliberately not added to
`Account`: `Account` is the backup shape, and a derived field there would risk
being serialized and would make every picker read the entries table.

No other public type changes. `Entry`, `Account`, `Category`, `Settings`,
`MonthSummary`, `CategorySpend`, `EntryListItem`, `CategoryEntries`,
`TransferInput`, `TransferListItem`, and `IncomeListItem` are unchanged.

### 5.2 `parseSignedAmount`

Add to `src/domain/money.ts`:

```ts
export function parseSignedAmount(
  input: string,
  exponent: number,
): number | null {
  const trimmed = input.trim();
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;

  const magnitude = parseAmount(unsigned, exponent);
  if (magnitude === null) {
    return null;
  }
  if (negative && !/^\d/.test(unsigned)) {
    return null;
  }

  return negative && magnitude !== 0 ? -magnitude : magnitude;
}
```

The contract is exact:

- The outer whitespace is trimmed, matching `parseAmount`.
- One optional leading `-` is accepted. `+` is not.
- No whitespace is accepted between the sign and the digits. `- 5` is
  rejected even though `parseAmount(' 5')` would trim.
- The rest of the grammar is exactly `parseAmount`'s: digits before an
  optional `.` or `,` separator, at most `exponent` fraction digits, no
  thousands separators, no exponent notation, no bare separator.
- The result must be a safe integer after applying the sign.
- `-0`, `-0.00`, and `-0,00` return positive `0`; no negative zero escapes
  this function.
- A bare `-`, `--5`, `-+5`, `-.5`, `-5.`, `-1,2,3`, `-1e3`, and a value above
  `Number.MAX_SAFE_INTEGER` return `null`.
- An invalid exponent throws `RangeError` exactly as `parseAmount`, because
  `parseAmount` is called before the sign-space check.
- `parseAmount` itself is not edited and keeps rejecting every sign. Every
  existing caller is unchanged.

### 5.3 Opening entry date

Add one private helper inside `createLedger`, next to `insertEntry`:

```ts
function openingDateFor(account: Account): LocalDate {
  const created = new Date(account.createdAt);
  if (Number.isNaN(created.getTime())) {
    return todayLocalDate();
  }
  const date = todayLocalDate(created);
  return isValidLocalDate(date) ? date : todayLocalDate();
}
```

Contract:

- The opening entry is dated the account's **creation local date**, not the
  date the user sets or changes the opening.
- `createdAt` is an ISO instant, so the local calendar date is derived from it
  at write time. The timezone at the moment of the write decides the date.
- A non-date `createdAt` falls back to today's local date. The extra
  `isValidLocalDate` guard also covers a valid `Date` whose local year is
  outside `0001..9999`; `parseAccount` accepts any string, and the write path
  must never produce an invalid `LocalDate` or throw.
- No read filters on the opening date. It exists only so the entry is a
  well-formed dated movement.
- When an existing opening is updated, its stored `date` is kept. Only a new
  opening derives a date.

### 5.4 `listAccountBalances()`

Inside one Dexie `r` transaction over `accounts` and `entries`:

1. Read `accounts.toArray()` and sort with the same comparator
   `listAccounts` uses. Extract that comparator as one private helper:

   ```ts
   function compareAccountsByCreation(
     left: Account,
     right: Account,
   ): number {
     return (
       left.createdAt.localeCompare(right.createdAt) ||
       left.id.localeCompare(right.id)
     );
   }
   ```

   `listAccounts` and `listAccountBalances` both call it, so the order cannot
   drift.
2. Read `entries.toArray()`.
3. Build `accountIds` from the sorted accounts.
4. Accumulate two maps and one set:
   - `balances: Map<string, number>` — every entry's effect;
   - `openingSums: Map<string, number>` — the signed sum of `opening` entries
     only;
   - `openingAccountIds: Set<string>` — every account with at least one
     opening entry, so an opening of zero is still “set”.
5. Apply one effect table, the single place the balance convention lives:

   | kind | `accountId` effect | `toAccountId` effect |
   |---|---|---|
   | `expense` | `−amountMinor` | — |
   | `income` | `+amountMinor` | — |
   | `transfer` | `−amountMinor` | `+amountMinor` |
   | `opening` | `+amountMinor` (already signed) | — |

   Each side is applied independently and only when the target id is a known
   account. Therefore:

   - a transfer whose `toAccountId` is missing still debits the source;
   - a transfer whose `toAccountId` is unknown still debits the source;
   - a transfer whose source is unknown still credits a known destination;
   - an opening whose account is unknown contributes nothing and creates no
     phantom row;
   - an opening's `toAccountId` or `categoryId` is ignored;
   - an entry whose runtime `kind` is outside the union contributes no effect
     rather than throwing.
6. Map each account to a row:

   ```ts
   const balance = balances.get(account.id) ?? 0;
   const opening = openingSums.get(account.id) ?? 0;

   return {
     id: account.id,
     name: account.name,
     type: account.type,
     balanceMinor: balance === 0 ? 0 : balance,
     openingBalanceMinor: opening === 0 ? 0 : opening,
     hasOpeningBalance: openingAccountIds.has(account.id),
   };
   ```

   The `=== 0` normalization turns a restored `-0` sum into positive `0`, so
   `Intl.NumberFormat` cannot render `-$0.00`.
7. Return the rows in account order.

The explicit read transaction is deliberate: without it, a write landing
between the accounts read and the entries read could render a row whose
account list and balance disagree until the live query re-runs. The
transaction makes the screen one snapshot. It changes no result and is not a
caching layer.

### 5.5 Balance semantics fixed by the read model

| Case | Result |
|---|---|
| Checking opens at `-5000`, income `10000` | `balanceMinor: 5000` |
| Checking opens at `-5000`, expense `2000` | `balanceMinor: -7000`; UI says overdrawn |
| Card opens at `-24000` (owed 240), expense `3000` | `balanceMinor: -27000` (owed 270) |
| Card opens at `-24000`, transfer `10000` to the card | `balanceMinor: -14000` (owed 140) |
| Card opens at `-24000`, transfer `30000` to the card | `balanceMinor: 6000`; UI says in credit |
| Card opens at `5000` (started in credit) | `balanceMinor: 5000`; UI says in credit |
| Card with no entries | `balanceMinor: 0`; UI says zero owed |
| Account with movements and no opening | balance is the movement sum; `hasOpeningBalance: false` |
| Account with an opening entry of `0` | `balanceMinor` includes 0; `hasOpeningBalance: true` |
| Future-dated entry | included; the balance is the sum of everything recorded |
| Restored file with two openings for one account | both summed; `hasOpeningBalance: true` |
| Opening for an account not in `accounts` | ignored; no row is created |
| Transfer with no `toAccountId` | source is debited; no destination effect |
| Transfer with a known source and unknown destination | source is debited; destination effect is ignored |
| Transfer with an unknown source and known destination | destination is credited; source effect is ignored |

The balance is **current**: it takes no month, and `monthSummary` is not
involved. Moving between months changes nothing on this screen.

### 5.6 `addAccount` with an optional opening

`addAccount` keeps its current name/type validation and adds opening
validation in this normative order:

| Order | Check | Code |
|---|---|---|
| 1 | `requireAccountName(input.name)` | `invalid-name` |
| 2 | `input.type` is `checking`, `savings`, or `credit` | `invalid-account-type` |
| 3 | `openingBalanceMinor` is `undefined` or a safe integer | `invalid-opening-amount` |

Zero and negative safe integers are valid. `null` is not part of the type; a
runtime `null` fails the safe-integer check with `invalid-opening-amount`.

Then:

```ts
const openingBalanceMinor =
  input.openingBalanceMinor === 0 ? 0 : input.openingBalanceMinor;

const account: Account = {
  id: crypto.randomUUID(),
  name,
  type: input.type,
  createdAt: new Date().toISOString(),
};

await db.transaction('rw', db.accounts, db.entries, async () => {
  await db.accounts.add(account);
  if (openingBalanceMinor !== undefined) {
    await insertEntry({
      id: crypto.randomUUID(),
      kind: 'opening',
      date: openingDateFor(account),
      amountMinor: openingBalanceMinor,
      accountId: account.id,
    });
  }
});

return account;
```

Properties:

- An omitted opening writes no entry. The existing test that adding an
  account alone leaves `entries` empty remains true.
- A provided zero writes one opening row of zero.
- The `=== 0` normalization turns `-0` into `0`, so a direct caller cannot
  store a negative zero.
- The account and its opening are one transaction: either both exist or
  neither does.
- The transaction always names both tables, even when the opening is omitted.
  The unused table is harmless and keeps one code path.
- No `categoryId`, `toAccountId`, or other field is written on the opening.
- No `settings` table is in the transaction and `settings.lastAccountId` is
  not written.
- The returned account is the stored account, with the same `id` and
  `createdAt` used by the opening entry.

### 5.7 `setOpeningBalance(accountId, amountMinor | null)`

Validation order is normative:

1. If `amountMinor !== null`, reject unless it is a safe integer
   (`invalid-opening-amount`). This check runs before the transaction, so an
   invalid amount never opens a transaction.
2. Normalize `-0` to `0`.
3. Inside one `rw` transaction over `accounts` and `entries`:
   - Read the account; missing → `unknown-account`.
   - Read all entries and keep
     `kind === 'opening' && accountId === accountId`, ordered by `id`
     ascending with `localeCompare`.
   - If `amountMinor === null`, delete every kept opening and return.
   - If none exist, `insertEntry` one opening dated `openingDateFor(account)`.
   - If one or more exist, update the first kept entry's `amountMinor` and
     keep its `id` and `date`; delete any extras.

```ts
async setOpeningBalance(accountId, amountMinor) {
  if (amountMinor !== null && !Number.isSafeInteger(amountMinor)) {
    throw new LedgerError(
      'invalid-opening-amount',
      'Enter a valid starting amount.',
    );
  }

  const normalized = amountMinor === 0 ? 0 : amountMinor;

  await db.transaction('rw', db.accounts, db.entries, async () => {
    const account = await db.accounts.get(accountId);
    if (!account) {
      throw new LedgerError(
        'unknown-account',
        'That account no longer exists. Choose another.',
      );
    }

    const openings = (await db.entries.toArray())
      .filter(
        (entry) =>
          entry.kind === 'opening' && entry.accountId === accountId,
      )
      .sort((left, right) => left.id.localeCompare(right.id));

    if (normalized === null) {
      if (openings.length > 0) {
        await db.entries.bulkDelete(openings.map((entry) => entry.id));
      }
      return;
    }

    if (openings.length === 0) {
      await insertEntry({
        id: crypto.randomUUID(),
        kind: 'opening',
        date: openingDateFor(account),
        amountMinor: normalized,
        accountId,
      });
      return;
    }

    const first = openings[0];
    if (first === undefined) {
      return;
    }
    await db.entries.update(first.id, { amountMinor: normalized });
    const extraIds = openings.slice(1).map((entry) => entry.id);
    if (extraIds.length > 0) {
      await db.entries.bulkDelete(extraIds);
    }
  });
}
```

Properties:

- `setOpeningBalance` writes no other entry and does not touch
  `settings.lastAccountId`.
- It does not change the account's name, type, or `createdAt`.
- It never writes `categoryId`, `toAccountId`, `kind`, or `id` on an existing
  opening. A restored opening carrying a stray `categoryId` or `toAccountId`
  keeps it; only `amountMinor` is updated.
- It does not check the `update` return value: the row was read in the same
  transaction, and the single-tab assumption plus IndexedDB transaction
  isolation means it cannot disappear between the read and the update.
- `null` on an account with no openings is a successful no-op.
- A non-null amount on an account with no openings creates one.
- A non-null amount on an account with one opening updates it in place.
- A non-null amount on an account with duplicate openings updates the
  lowest-id opening and deletes the rest.
- A `null` amount deletes every opening for the account, including
  duplicates.
- A zero amount creates or updates an opening of zero; `hasOpeningBalance`
  becomes or stays `true`.

### 5.8 One starting point per account

- `addAccount` creates at most one opening.
- `setOpeningBalance` updates the first existing opening in place and deletes
  any extras, or creates one when none exists; it never adds a second while
  one exists.
- The balance read still sums every opening it finds, so the north-star rule
  (“balance is always the sum of the account's entry effects”) holds even if a
  hand-edited backup contains duplicates.
- No Dexie uniqueness constraint is added; a compound index would be a schema
  version bump for an invariant the single write path already enforces.

### 5.9 Error codes and UI mapping

One new code:

```ts
export type LedgerErrorCode =
  | 'invalid-name'
  | 'invalid-account-type'
  | 'invalid-amount'
  | 'invalid-date'
  | 'unknown-account'
  | 'unknown-category'
  | 'unknown-entry'
  | 'unsupported-entry-kind'
  | 'duplicate-category-name'
  | 'archived-category'
  | 'unknown-to-account'
  | 'same-transfer-account'
  | 'invalid-opening-amount'; // new: opening is not a safe integer
```

`invalid-opening-amount` is separate from `invalid-amount` because the two
have opposite rules: an entry amount must be greater than zero, an opening
may be zero or negative.

`accountErrorMessage` in `AccountsScreen.tsx` gains exactly:

| Code | Ledger message | UI copy |
|---|---|---|
| `invalid-opening-amount` | `Enter a valid starting amount.` | `Enter a valid starting amount.` |
| `unknown-account` | `That account no longer exists. Choose another.` | `That account no longer exists.` (existing) |
| any other `LedgerError` | existing ledger message | existing `accountErrorMessage` copy |
| non-`LedgerError` | — | `Could not save the account. Try again.` |

Tests assert codes, not messages.

### 5.10 Backup contract — unchanged v1

Nothing in `src/domain/backup.ts` changes. Opening balances are already part of
the v1 data model:

- `createBackupFile` serializes every entry, including `kind: 'opening'`,
  sorted by `id`.
- `parseEntry` already accepts `opening`; it requires a safe-integer
  `amountMinor` and deliberately skips the positive-magnitude check for
  `opening`, so zero and negative values restore.
- `restoreBackup` clears and bulk-adds the `entries` table, so a restored
  opening is the same row it was before. Restoring replaces the ledger; it
  cannot add a second opening to an account that already has one.
- `readBackupData` already includes every entry.

Consequences the spec locks:

- A v1 file containing opening balances restores without migration.
- A v1 file made before this slice — no opening rows — is still valid: its
  accounts restore with no opening entry, so their balances are the sum of
  their recorded movements and the screen invites the user to set the
  starting points.
- A restored opening with a stray `categoryId` or `toAccountId` restores; the
  balance read ignores those fields, and the next set/clear preserves them on
  the updated row.
- A restored file with two openings for one account restores both; the
  balance read sums both, and the next set/clear collapses them to one.
- A restored opening whose account row is missing restores; the balance read
  ignores it and creates no phantom row.
- The parser still requires a non-empty `accountId` and a valid local date for
  every entry, including an opening.
- `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` both stay `1`.

The parser is not tightened: tightening it would reject files v1 already
accepts, which is a compatibility change this slice does not need.

### 5.11 Spending invariants — no read change

`monthSummary` and `categoryEntries` are not edited. They already exclude
every non-expense kind:

- `expenseTotals` skips every entry whose `kind !== 'expense'`. An opening in
  the month on screen, or in the previous month, creates no row and adds
  nothing to `totalMinor`.
- `previousMonthHasSpending` is `previousTotals.size > 0`, where
  `previousTotals` is built by the same expense-only helper. An opening in the
  previous month does not set it.
- `categoryEntries` filters `kind === 'expense'` before matching a category.
  An opening can never appear in a category list, even if it carries a stray
  `categoryId`.
- `listIncome` and `listTransfers` filter their exact kind; an opening is
  absent from both.
- An opening dated in an earlier month is invisible to that month's spending,
  because the same kind filter applies to every month.

This slice adds no field to `MonthSummary`, no opening branch to
`expenseTotals`, and no new spending query.

## 6. Implementation Decisions — Presentation

### 6.1 Accounts screen reads and loading

`AccountsScreen` switches its list read to:

```ts
const balances = useLiveQuery(
  () => ledger.listAccountBalances(),
  [ledger],
);
const settings = useLiveQuery(() => ledger.getSettings(), [ledger]);
```

The screen returns `<p>Loading…</p>` until both are defined:

```tsx
if (balances === undefined || settings === undefined) {
  return <p>Loading…</p>;
}
```

`listAccounts` is no longer read by this screen. It remains the picker read
for the expense, income, and transfer forms.

### 6.2 Row display

Each normal row shows, in this order: account name, type label, balance, the
existing `Rename` button, then the starting-point button. When
`!hasOpeningBalance`, an additional hint paragraph with the invitation text
renders after the starting-point button and spans the row.

```tsx
<li>
  <span className="account-name">{row.name}</span>
  <span className="account-type">
    {ACCOUNT_TYPE_LABELS[row.type]}
  </span>
  <span className="account-balance">
    {balanceText(row, settings)}
  </span>
  <button
    type="button"
    onClick={() => startRename(row)}
  >
    Rename
  </button>
  <button
    type="button"
    onClick={() => startOpening(row)}
  >
    {row.hasOpeningBalance
      ? `Edit starting point for ${row.name}`
      : `Set starting point for ${row.name}`}
  </button>
  {!row.hasOpeningBalance ? (
    <p className="hint account-hint">
      No starting point set. The balance is the sum of recorded movements.
    </p>
  ) : null}
</li>
```

`balanceText(row, settings)` is a private screen helper:

```ts
function balanceText(
  row: AccountBalanceListItem,
  settings: Settings,
): string {
  const formatted = (amountMinor: number) =>
    formatAmount(
      amountMinor,
      settings.currency,
      settings.currencyExponent,
    );

  if (row.type === 'credit') {
    if (row.balanceMinor < 0) {
      return `${formatted(-row.balanceMinor)} owed`;
    }
    if (row.balanceMinor === 0) {
      return `${formatted(0)} owed`;
    }
    return `${formatted(row.balanceMinor)} in credit`;
  }

  if (row.balanceMinor < 0) {
    return `${formatted(row.balanceMinor)} overdrawn`;
  }
  return formatted(row.balanceMinor);
}
```

| Type | `balanceMinor` | Display |
|---|---|---|
| checking / savings | `> 0` | formatted amount |
| checking / savings | `0` | formatted zero |
| checking / savings | `< 0` | formatted amount (with its minus) + ` overdrawn` |
| credit | `< 0` | formatted `−balanceMinor` + ` owed` |
| credit | `0` | formatted zero + ` owed` |
| credit | `> 0` | formatted `balanceMinor` + ` in credit` |

The minus in an overdrawn checking balance comes from `formatAmount`, which
already formats negative currency. The words “overdrawn”, “owed”, and “in
credit” are visible text, not only an accessible label, so a screen reader
announces name, type, and balance in reading order and includes the
qualifier. The row is not a button; the balance is not tappable.

No combined total is rendered. Do not sum the rows.

### 6.3 Invitation and inline form

- `!hasOpeningBalance`: the row shows
  “No starting point set. The balance is the sum of recorded movements.” and
  the button `Set starting point for {name}`.
- `hasOpeningBalance`: the row shows the button
  `Edit starting point for {name}` and no invitation.
- The invitation never blocks logging, navigation, or rename. It is a hint
  and a button, not a gate.

The inline form replaces the row's normal content, exactly as the rename form
does. It shows:

- Label: `Starting point for {name}`.
- Hint, checking/savings: “What the account held before you started logging.
  Use a minus if it was overdrawn.”
- Hint, credit: “What the card owed before you started logging. Use a minus
  if it was in credit.”
- Input: text, `inputMode="decimal"`, `autoComplete="off"`, prefilled with
  `formatAmountInput(presentedAmount(row.type, row.openingBalanceMinor), exponent)`.
  When no opening exists, the prefill is the formatted zero (`0.00` at
  exponent 2, `0` at exponent 0).
- Save: an empty input is an error, not a silent clear. A non-empty input is
  parsed with `parseSignedAmount`; invalid → a row error.
- Clear: shown only when `hasOpeningBalance`; calls
  `setOpeningBalance(id, null)`.
- Cancel: closes the form without writing.
- Escape: cancels when `rowBusy` is false.
- No field is autofocused; the form opens in place, matching the rename form.
- A busy ref prevents a double submit. While `rowBusy` is true, Save, Clear,
  and Cancel are disabled and Escape is ignored.

The sign conversion helpers are module-local in `AccountsScreen.tsx`:

```ts
function ledgerSignedAmount(
  type: AccountType,
  presented: number,
): number {
  return type === 'credit' && presented !== 0 ? -presented : presented;
}

function presentedAmount(
  type: AccountType,
  ledgerSigned: number,
): number {
  return type === 'credit' && ledgerSigned !== 0 ? -ledgerSigned : ledgerSigned;
}
```

`presentedAmount` is used for the prefill; `ledgerSignedAmount` is used on
save. Both normalize zero to positive zero.

Exact inline copy:

| Situation | Copy |
|---|---|
| Label | `Starting point for {name}` |
| Checking/savings hint | `What the account held before you started logging. Use a minus if it was overdrawn.` |
| Credit hint | `What the card owed before you started logging. Use a minus if it was in credit.` |
| Empty input, `hasOpeningBalance` | `Enter a starting amount, or clear it.` |
| Empty input, no opening | `Enter a starting amount.` |
| Non-empty invalid input | `Enter a valid starting amount.` |
| Save button | `Save` |
| Clear button | `Clear` |
| Cancel button | `Cancel` |

The architecture's “invalid → the same error” is resolved as above: empty and
invalid are both row errors, but the copy differs because the Clear action
exists only when an opening is set. The ledger's `invalid-opening-amount` uses
the same “Enter a valid starting amount.” copy as the UI's parse failure.

### 6.4 Row editor state model

One screen-level union replaces the separate rename booleans. This is the
prototype-validated decision in §9.

```ts
type RowEditor =
  | {
      kind: 'rename';
      accountId: string;
      accountName: string;
      draft: string;
    }
  | {
      kind: 'opening';
      accountId: string;
      draft: string;
    };
```

State:

```ts
const [rowEditor, setRowEditor] = useState<RowEditor | null>(null);
const [rowError, setRowError] = useState<string | null>(null);
const [rowBusy, setRowBusy] = useState(false);
const rowBusyRef = useRef(false);
```

Rules:

- At most one editor is open. Opening the rename form while an opening form is
  open closes the opening form and discards its draft; opening the
  starting-point form while rename is open closes rename and discards its
  draft. The prototype confirmed this has no ambiguous intermediate state.
  Opening either editor clears `rowError`.
- While `rowBusy` is true, every row's `Rename` and set/edit button is
  disabled, so the active editor cannot be replaced mid-write and a stale
  success cannot close a different form.
- `rowError` is one screen-level `<p id="row-error" role="alert"
  className="form-error">` above the list, shared by rename and opening,
  matching the existing rename error placement. It renders before the stale
  rename form, preserving the current screen order.
- `rowBusyRef` guards both save paths. `rowBusy` drives the disabled state.
- On success, the editor closes and `rowError` clears. On failure, the editor
  stays open and `rowError` shows the mapped message.
- Cancel closes the editor, clears `rowError`, and writes nothing.
- A rename whose account disappears keeps the existing stale rename form
  above the list, using the snapshotted `accountName`; Save then throws
  `unknown-account` and shows the existing message.
- An opening editor whose account disappears while not busy is cleared by an
  effect keyed on the balances list. While busy, it stays until the write
  settles, so a failure can be shown. There is no stale opening form.
- The opening form's input id is `opening-${row.id}`; its hint id is
  `opening-hint-${row.id}`; the label's `htmlFor` points at the input id. The
  input is described by its hint and, when present, `row-error`.
- Typing in either form clears `rowError`.
- Enter submits; Escape cancels when not busy.

### 6.5 Add-account form

The existing name/type form gains an optional starting-point field between the
type field and the form error:

```tsx
<div className="field">
  <label htmlFor="account-opening">Starting point (optional)</label>
  <p id="account-opening-hint" className="hint">
    {type === 'credit'
      ? 'What the card owed before you started logging. Use a minus if it was in credit.'
      : 'What the account held before you started logging. Use a minus if it was overdrawn.'}
  </p>
  <input
    id="account-opening"
    type="text"
    inputMode="decimal"
    autoComplete="off"
    value={openingText}
    aria-describedby={
      openingError
        ? 'account-opening-hint account-opening-error'
        : 'account-opening-hint'
    }
    onChange={(event) => {
      setOpeningText(event.target.value);
      setOpeningError(null);
    }}
  />
  {openingError ? (
    <p id="account-opening-error" role="alert" className="field-error">
      {openingError}
    </p>
  ) : null}
</div>
```

Submit rules:

1. `preventDefault`; return if `busyRef.current` is true.
2. Clear `formError` and `openingError`.
3. `const trimmed = openingText.trim();`
4. If `trimmed === ''`, `openingBalanceMinor` is `undefined`; no opening entry.
5. Otherwise `parseSignedAmount(openingText, settings.currencyExponent)`.
   - `null` → `openingError = 'Enter a valid starting amount.'`; return
     without calling the ledger, so no account is written.
   - valid → `ledgerSignedAmount(type, parsed)` using the currently selected
     type.
6. Call `ledger.addAccount({ name, type, openingBalanceMinor })`, omitting the
   property when it is `undefined`.
7. On success, clear `name`, reset `type` to `checking`, clear `openingText`
   and both errors, matching today's reset plus the new field.
8. On `LedgerError`:
   - `invalid-opening-amount` → `openingError` via `accountErrorMessage`;
   - every other code → `formError` via `accountErrorMessage`.
9. On a non-`LedgerError`, `formError = 'Could not save the account. Try again.'`.
10. Always reset the busy ref and `submitting`.

The hint updates when the type changes. The opening text is not cleared or
rewritten when the type changes; the conversion at submit uses the selected
type. The field is optional: an empty or whitespace-only value is not an
error. The add form remains below the list and its submit button remains
`Add account`.

### 6.6 Screen copy

| Location | Exact copy |
|---|---|
| Zero accounts | `Add the accounts you spend from. You can set a starting point now or later.` |
| No opening | `No starting point set. The balance is the sum of recorded movements.` |
| Set button | `Set starting point for {name}` |
| Edit button | `Edit starting point for {name}` |
| Inline label | `Starting point for {name}` |
| Add-form label | `Starting point (optional)` |
| Checking/savings hint | `What the account held before you started logging. Use a minus if it was overdrawn.` |
| Credit hint | `What the card owed before you started logging. Use a minus if it was in credit.` |
| Add-form invalid opening | `Enter a valid starting amount.` |
| Inline invalid opening | `Enter a valid starting amount.` |
| Inline empty, opening set | `Enter a starting amount, or clear it.` |
| Inline empty, no opening | `Enter a starting amount.` |
| Generic save failure | `Could not save the account. Try again.` |

The existing `Start logging` and `Restore from backup` actions are unchanged.
`Start logging` still appears only when at least one account exists.

### 6.7 Accessibility

- Visible text carries name, type, and balance; the balance text includes
  “owed”, “in credit”, or “overdrawn”.
- The set/edit button's visible text and accessible name include the account
  name: `Set starting point for Visa` / `Edit starting point for Visa`.
- The form input is labelled `Starting point for {name}`; the hint is
  associated with the input. The screen-level error is associated when
  present.
- The Clear button's visible text is `Clear`; its accessible name is
  `Clear starting point for {name}`.
- Errors use `role="alert"`, matching the existing forms.
- Tests assert the visible balance text and the accessible names.

### 6.8 CSS

Reuse the existing `.account-list`, `.account-name`, `.account-type`, `.hint`,
`.field`, `.field-error`, `.form-error`, and `.actions` classes. Add only:

```css
.account-balance {
  font-variant-numeric: tabular-nums;
}

.account-hint {
  flex-basis: 100%;
  margin: 0;
}
```

The row keeps the existing flex-wrap layout, so at 320px the balance and
buttons wrap instead of causing horizontal scroll. The opening form replaces
the row content and inherits the existing form spacing.

### 6.9 What the UI must not do

- Must not import `data/db` or Dexie.
- Must not read `listAccounts` for the Accounts rows.
- Must not store a balance, an opening total, or a derived field in
  `Account`, `Settings`, or any new table.
- Must not sum the rows into a combined total.
- Must not show a balance on home.
- Must not add a route, a per-account detail screen, or a movement list.
- Must not write `settings.lastAccountId` from any new path.
- Must not let an empty inline save clear the opening silently.
- Must not add a second opening when one exists.
- Must not change the backup parser or bump either version constant.

## 7. Invariants

- A balance is derived on every read from `entries`; it is never stored.
- An opening balance is one `entries` row with `kind: 'opening'` and a signed
  safe-integer `amountMinor`; it is never a field on `Account`.
- The app writes at most one opening per account. A restored file may contain
  duplicates; the balance sums them, and the next set/clear collapses them.
- The opening entry is dated the account's creation local date. Updating an
  opening keeps its stored date.
- `listAccountBalances` preserves `listAccounts` order: `createdAt` ascending,
  then `id` ascending.
- `balanceMinor` is the signed sum of every entry effect on the account.
- `openingBalanceMinor` is the signed sum of the account's opening entries.
- `hasOpeningBalance` is true when at least one opening entry exists, even
  when the sum is zero.
- Checking/savings display what the account holds; a negative balance is
  overdrawn. Credit displays what is owed as a positive amount; zero is zero
  owed; a positive balance is in credit.
- Opening balances never appear in `monthSummary`, `categoryEntries`,
  `listIncome`, or `listTransfers`.
- Home total, category breakdown, and previous-month comparison are unchanged
  by openings and by viewing balances.
- `addAccount` and `setOpeningBalance` never write `settings.lastAccountId`.
- `addAccount` and `setOpeningBalance` normalize `-0` to `0`.
- `listAccountBalances` normalizes a computed `-0` sum to `0`.
- The balance is current: it takes no month and includes future-dated entries.
- No new table, index, migration, schema version, backup version, route, or
  endpoint is added.
- `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`.
- `Account`, `domain/types`, `domain/backup`, and `data/db` are unchanged.

## 8. Testing Decisions

### 8.1 What makes a good test here

- Exercise the highest existing seam: `createLedger` for data behaviour and
  the screen component for presentation. No new seam, no exported test-only
  helper.
- Assert external behaviour: returned rows, thrown `LedgerError.code`, stored
  entries, rendered text, accessible names, disabled state, and live updates.
  Do not assert private helper names, call counts, or Dexie internals.
- Use a real `BudgetDatabase` on `fake-indexeddb` with a unique name, deleted
  in `afterEach`, following `src/data/ledger.test.ts` and the existing screen
  tests.
- Use `formatAmount` and `formatAmountInput` to build expected money strings;
  never hardcode a currency symbol or locale-specific output.
- Use fixed dates where possible. For the opening date, compute the expected
  local date with `todayLocalDate(new Date(account.createdAt))`; do not
  reimplement the conversion.
- Each test should fail for a plausible implementation bug: wrong effect
  direction, wrong credit sign, an opening stored as a field, a second opening
  on update, a missing `hasOpeningBalance` flag, a wrong display qualifier, a
  balance that moved the home total, or an invitation that does not toggle.

### 8.2 Seams and files

| Seam | Test file | Why it is the right level |
|---|---|---|
| `parseSignedAmount` | `src/domain/money.test.ts` (new `describe`) | Pure domain grammar; the only new pure function. |
| `createLedger(db)` | `src/data/ledger.test.ts` (new `describe('account balances')`) | The ledger is the whole data contract; tests cross the same calls the UI makes. |
| `AccountsScreen` | `src/app/screens/AccountsScreen.test.tsx` | Row display, invitation, inline form, add form, accessibility, and live updates are user-visible. |
| Backup round-trip | `src/data/ledger.test.ts` (ledger seam) | `readBackupData`/`restoreBackup` are ledger calls; `backup.test.ts` already covers the parser. |
| Home and list invariants | `src/data/ledger.test.ts` and `src/app/screens/HomeScreen.test.tsx` | Proves openings never enter spending or the lists. |

No test calls `openingDateFor`, `compareAccountsByCreation`, or the effect
switch directly.

### 8.3 `domain/money` tests

Add `describe('parseSignedAmount')`:

1. Parses positive values: `12`, `12.3`, `12,34`, `0`, `0.00`, `00012.30`.
2. Parses negative values: `-12`, `-12.3`, `-12,34`, `-00012.30`.
3. Parses with surrounding whitespace: ` -12,34 `.
4. Returns `0` for `-0`, `-0.00`, and `-0,00`; assert with `Object.is(result, 0)`.
5. Rejects `12.345`, `-12.345`, `1,234.56`, `-1,234.56`, `1.234,56`,
   `-1.234,56`, `1,2,3`, `-1,2,3`, `1 000`, `-1 000`, `1e3`, `-1e3`, `NaN`,
   `Infinity`, `.5`, `-.5`, `5.`, `-5.`, `''`, `'   '`.
6. Rejects a bare `-`, `--5`, `-+5`, `+5`, and `- 5`.
7. Rejects values above `Number.MAX_SAFE_INTEGER` in both signs.
8. Exponent 0: accepts `12` and `-12`; returns `0` for `-0`; rejects `12.5`,
   `-12.5`, `12,0`, `-12,0`, and `12.`.
9. Throws `RangeError` for exponents `-1`, `7`, and `1.5`, matching
   `parseAmount`.
10. Existing `parseAmount` tests remain green and unchanged; `parseAmount`
    still rejects `-1`.

### 8.4 Ledger tests

Add to `src/data/ledger.test.ts`:

#### `addAccount` with an opening

1. Without an opening, writes no entry; `listAccountBalances` reports
   `balanceMinor: 0`, `openingBalanceMinor: 0`, `hasOpeningBalance: false`.
2. With positive, zero, and negative openings, writes exactly one opening with
   the same amount, `kind: 'opening'`, and the account's id; the date equals
   the account's creation local date; the account and entry counts are 1 each.
3. A credit account stores the ledger-signed amount; the read reports the
   signed balance and opening.
4. `-0` is stored as `0`; `Object.is(stored.amountMinor, 0)` is true.
5. An invalid opening (`NaN`, `Infinity`, `1.5`, `MAX_SAFE_INTEGER + 1`)
   throws `invalid-opening-amount` and writes no account and no entry.
6. Validation precedence: invalid name plus invalid opening yields
   `invalid-name`; invalid type plus invalid opening yields
   `invalid-account-type`.
7. The returned account has the same `id` and `createdAt` as the stored
   account.
8. `addAccount` still writes no `settings.lastAccountId`.

#### `listAccountBalances`

9. Returns one row per account, in `listAccounts` order, including accounts
   with no entries.
10. An expense debits its account; an income credits it; a transfer debits the
    source and credits the destination; an opening applies as signed.
11. A transfer to a credit card reduces the amount owed.
12. A transfer with no `toAccountId` still debits the source.
13. A transfer with an unknown source and a known destination credits the
    destination; an unknown destination is ignored.
14. An entry referencing an account that is not in `accounts` creates no row.
15. An opening of `0` yields `balanceMinor: 0`, `openingBalanceMinor: 0`, and
    `hasOpeningBalance: true`.
16. An account with movements and no opening yields the movement sum and
    `hasOpeningBalance: false`.
17. Duplicate openings for one account are summed and
    `hasOpeningBalance: true`.
18. A future-dated entry is included; the read takes no month argument.
19. Renaming an account changes the row name but not the balance.
20. `listAccountBalances` never returns a `-0` balance or opening.

#### `setOpeningBalance`

21. Creates one opening for an existing account; the date is the account's
    creation local date; the read reports the amount.
22. A second call updates the same entry id, leaves one row, and changes the
    balance.
23. `setOpeningBalance(id, null)` deletes every opening for that account and
    restores the movement-only balance.
24. `setOpeningBalance(id, null)` on an account with no openings is a no-op.
25. An unknown account throws `unknown-account` and writes nothing.
26. A non-safe-integer amount throws `invalid-opening-amount` and writes
    nothing; zero and negative safe integers succeed.
27. `-0` is stored as `0`.
28. A restored account with two openings: a set updates the lowest-id opening,
    deletes the extra, and leaves one row; a clear deletes both.
29. A restored opening with a stray `categoryId` or `toAccountId` keeps those
    fields when its amount is updated.
30. `setOpeningBalance` does not change `settings.lastAccountId`, the account
    name, type, or `createdAt`.
31. A restored account with a non-date `createdAt` still accepts an opening;
    the date falls back to today's local date and is a valid `LocalDate`.

#### Spending and list invariants

32. `monthSummary` and `categoryEntries` are unchanged by an opening in the
    current or previous month, including an opening with a stray `categoryId`.
33. `listIncome` and `listTransfers` never return an opening.
34. Adding, correcting, or removing an expense, income, or transfer changes
    the relevant balance in `listAccountBalances`.

#### Backup round-trip

35. `readBackupData()` includes the opening. `createBackupFile` →
    `serializeBackup` → `parseBackupFile` → `restoreBackup` into a fresh
    database reproduces the opening exactly; the balance and
    `hasOpeningBalance` match.
36. An older v1 file without openings restores with
    `hasOpeningBalance: false` and movement-only balances.
37. A v1 file with two openings for one account restores both; the read sums
    them; a subsequent `setOpeningBalance` collapses them to one.
38. Restore replaces rather than adds; an opening in the destination database
    before restore is gone afterwards.
39. `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`; the existing
    schema table/index assertion is unchanged.

### 8.5 Screen tests

Add to `src/app/screens/AccountsScreen.test.tsx`:

1. Add an account with a starting point; the row shows the name, type, and
   formatted balance.
2. Add an account without a starting point; the row shows zero and the
   invitation; `hasOpeningBalance` is false.
3. Add an account with a zero starting point; the row shows zero and no
   invitation.
4. Checking negative shows the formatted minus and `overdrawn`.
5. Credit owed shows a positive amount and `owed`; zero shows `owed`; an
   overpaid card shows `in credit`.
6. Set an opening from the row; the balance updates immediately and the
   invitation disappears.
7. Change the opening; the same row updates and no second invitation appears.
8. Clear the opening; the balance falls back to the movement sum and the
   invitation returns.
9. The inline form is prefilled with the current presented opening, including
   the credit sign flip.
10. An empty inline save shows the correct empty copy and writes nothing.
11. An invalid inline value shows `Enter a valid starting amount.` and writes
    nothing.
12. Clear is present only when `hasOpeningBalance` is true.
13. Cancel and Escape close the form without writing.
14. A rapid double submit writes once and disables Save/Clear/Cancel.
15. Opening the rename form while the opening form is open closes the opening
    form; opening the starting-point form while rename is open closes rename.
16. An invalid add-form opening shows the field error and writes no account.
17. An empty add-form opening writes no entry; a zero add-form opening writes
    one entry of zero and no invitation.
18. The add-form hint changes with the selected type; a credit opening is
    converted to ledger-signed before storage.
19. Adding an expense through the ledger updates the visible balance through
    `useLiveQuery` without a refresh.
20. The row's visible text includes the name, type, and balance qualifier.
21. The set/edit button's accessible name includes the account name; the
    input label includes it; the Clear button's accessible name includes it.
22. The zero-account empty-state copy is the new copy; `Start logging` still
    appears after an account exists; `Restore from backup` remains.
23. Existing rename tests still pass, including the stale-rename error.
24. Existing add-account tests still pass; the new optional field does not
    change their behaviour.

### 8.6 Existing tests to update

- `src/app/screens/AccountsScreen.test.tsx`: the order test should compare to
  `listAccountBalances()` rather than `listAccounts()`, because that is the
  read the screen now uses. Existing rename and restore tests remain.
- `src/data/ledger.test.ts`: add the groups above. Existing `addExpense`,
  `monthSummary`, `categoryEntries`, transfer, income, and backup tests must
  remain green unchanged.
- `src/domain/backup.test.ts`: no change. It already accepts openings with
  zero and negative amounts.
- `src/app/App.test.tsx`, `src/app/router.test.ts`, `src/app/screens/HomeScreen.test.tsx`,
  and `src/app/screens/BackupScreen.test.tsx`: no change. This slice adds no
  route, home control, or backup-screen behaviour.
- No test is deleted. No existing assertion is re-pinned to incidental
  behaviour.

### 8.7 Manual verification

Build and preview, then:

1. Add a checking account with no starting point. Confirm the row shows zero
   and the invitation.
2. Set a positive starting point, then a negative one, then clear it. Confirm
   the balance and invitation update immediately.
3. Add a credit card with an opening of what it owed. Confirm the row shows a
   positive amount labelled owed; add an expense on the card and confirm owed
   rises; add a transfer to the card and confirm owed falls.
4. Overpay a card and confirm the row says in credit.
5. Add an expense, income, and transfer; confirm the relevant balances change
   and the home total changes only for the expense.
6. Move between months; confirm no balance changes.
7. Restore a backup containing openings; confirm the balances and invitations
   match. Restore an older backup without openings; confirm movement-only
   balances and invitations.
8. Go offline and repeat add, set, change, clear, and view.
9. Check the Accounts screen at 320px and one desktop width; no horizontal
   scroll.
10. With a screen reader, confirm each row announces name, type, and balance,
    including owed, in credit, or overdrawn, and that the starting-point form
    and errors are announced.

### 8.8 Deliberately not asserted

- Exact CSS pixel widths, colors, or font sizes. The contract is the row
  content, the visible qualifier, and no horizontal overflow.
- The number of Dexie transactions or the order of `toArray` calls.
- `localeCompare` ordering across locales. The order is display-only and not
  serialized.
- A hand-edited entry with a runtime kind outside `EntryKind`. The read model
  ignores it; no app path creates one.
- Two accounts with the same name and type. The rows are keyed by id; labels
  may look identical. This is the existing accepted edge.
- Service-worker or offline internals. Offline is verified manually.

## 9. Prototype Log

One throwaway prototype was run before this spec was written. It was removed
after the decisions were captured; no prototype code remains in the workspace.

### 9.1 Questions

1. Can one screen-level row-editor union keep the rename and starting-point
   forms mutually exclusive without an ambiguous state?
2. Do the balance effect table, credit sign conversion, display strings, and
   `parseSignedAmount` grammar agree across the architecture's cases?

### 9.2 What was tried

A Node script in `.scratch/slice-06-opening-prototype.mjs` (deleted after the
run) modelled:

- a `RowEditor` reducer with `openRename`, `openOpening`, `change`,
  `saveStart`, `saveError`, `saveSuccess`, and `cancel`;
- the sequence “open rename A → open opening B → type → open rename C →
  save → save again while busy → save error → cancel”;
- the architecture's balance cases for checking and credit, including
  openings of zero and negative, transfers in, overpayment, no entries,
  movement-only accounts, and duplicate openings;
- the credit prefill/parse/store round-trip for owed and in-credit cards;
- `parseSignedAmount` cases: positive, negative, `-0`, commas, excess fraction
  digits, bare `-`, `--5`, `+5`, whitespace around the sign, exponent 0, and
  exponent notation.

### 9.3 Result

| Question | Result |
|---|---|
| Mutual exclusion | The union has one editor at a time. Opening either form discards the other draft; no state has both open. |
| Double submit | The second `saveStart` while busy is a no-op. |
| Save error | The editor stays open with the error; cancel clears it. |
| Balance effects | The table produced the architecture's expected balances, including card owed/in credit and duplicate openings. |
| Credit conversion | `owed 240` prefilled `240.00`, parsed to `240`, stored `-240`; `in credit 60` prefilled `-60.00`, stored `+60`. |
| Parse grammar | `-0` returned positive `0`; `- 5`, `--5`, `+5`, and `1,234.50` were rejected. |

### 9.4 Decisions

- Lock the `RowEditor` union and one-editor-at-a-time rule in §6.4.
- Lock the effect table and the credit sign helpers in §5.4 and §6.3.
- Lock `parseSignedAmount`'s sign strip plus `parseAmount` reuse in §5.2.
- Add the `-0` normalization at the ledger write and read boundaries, because
  `Intl.NumberFormat` renders `-0` as `-$0.00`.

No UI prototype was needed. The architecture already fixes the row's content,
the balance table, the form copy, and the accessible names; the only open
question was the state model, and the reducer answered it.

## 10. Out of Scope

- A combined total or net worth across accounts.
- A balance on the home screen.
- A per-account movement list or drill-down from a balance.
- Direct editing of a balance total.
- Statement reconciliation, statement import, or marking a statement
  reconciled.
- Balance history, charts, trends, forecasts, or balance over time.
- Credit limits, available credit, utilization, due dates, minimum payments,
  interest, fees, or APR.
- Automatic opening balances from a bank or statement.
- Account deletion, archiving, hiding, reordering, or changing an account's
  type. Renaming stays as it is.
- Multi-currency or exchange rates.
- Bank sync, budgets, sharing, or a laptop view.
- A new table, index, migration, stored balance, or opening field on
  `Account`.
- A `SCHEMA_VERSION` or `BACKUP_SCHEMA_VERSION` bump.
- A backup parser tightening that rejects files v1 already accepts.
- Any write to `settings.lastAccountId` from an opening path.
- A new route, endpoint, repository interface, fake adapter, or test-only
  export.
- A category, tag, note, or payee on an opening.
- Correcting an opening through an audit/history flow; set, change, and clear
  are the whole flow.

## 11. Further Notes

- **Reversibility.** Every decision here is low-cost to change: two ledger
  methods, one read model, one domain parser, and Accounts-screen
  presentation. Removing opening balances means deleting the writer and the
  row display; no stored data changes shape.
- **No ADR.** The durable decisions — balance is derived, opening is an entry,
  credit is negative by convention, opening is dated the account's creation
  date — were already recorded in the north-star. This gate adds no
  expensive-to-reverse contract.
- **No glossary change.** `CONTEXT.md` already defines **Balance** and
  **Opening balance**. The scope's “starting point” is UI copy for the same
  concept; code and docs keep `opening`.
- **Copy ambiguity resolved.** The architecture says an invalid inline value
  gets “the same error” as an empty one. The spec distinguishes them because
  the Clear action exists only when an opening is set: empty with an opening
  says “Enter a starting amount, or clear it.”; empty without an opening says
  “Enter a starting amount.”; every invalid non-empty value says “Enter a
  valid starting amount.”
- **Known edge: duplicate openings.** A hand-edited backup can contain two
  openings for one account. The balance read sums both and reports
  `hasOpeningBalance: true`; the next set updates the lowest-id opening and
  deletes the rest, and a clear deletes all. The parser is not tightened.
- **Known edge: invalid `createdAt`.** A restored account may carry a
  non-date or out-of-range `createdAt`. `openingDateFor` falls back to today's
  local date, so setting an opening never throws and never writes an invalid
  `LocalDate`.
- **Known edge: negative zero.** `parseSignedAmount` normalizes `-0`; the
  ledger write paths and the balance read also normalize it, so a restored or
  direct-call `-0` cannot render as `-$0.00`.
- **Transaction guarantee.** `listAccountBalances` uses one `r` transaction
  over `accounts` and `entries` so a write cannot tear the join.
  `addAccount` and `setOpeningBalance` use one `rw` transaction over both
  tables so validation and the write are atomic. These are contracts, not
  optimizations; a future change that drops them can produce a torn read or a
  validation race the test suite may not reproduce.
- **Offline.** Every read and write is local IndexedDB; there is no network
  path. The service worker and installability are unchanged. Offline is
  verified manually, not in unit tests.
- **Release precondition.** Slice 7 (income) was merged into local `master`
  before this slice was cut; neither is pushed or deployed. Release both
  together so the live app holds income before a balance includes it.
- **Ticket shape.** The ticket-breakdown gate split the seam into eight
  tickets (see `slice-06-tickets.md`): 1 `parseSignedAmount`, 2 `RowEditor`
  union prefactor, 3 `listAccountBalances`, 4 `addAccount` opening, 5
  `setOpeningBalance` plus invariants/backup, 6 balance display, 7 invitation
  and inline form, 8 add-form field and final copy. Each shipped as one
  test-first commit; the four-part grouping below is the original seam, not
  the build breakdown.
  1. domain money: `parseSignedAmount` and its tests;
  2. ledger contract: types, error code, `compareAccountsByCreation`,
     `openingDateFor`, `listAccountBalances`, the extended `addAccount`,
     `setOpeningBalance`, and ledger tests;
  3. Accounts screen: balance read, row display, invitation, row-editor
     union, inline form, add-form field, copy, accessibility, CSS, and screen
     tests;
  4. invariants and backup: spending/list invariant tests, backup round-trip
     tests, and manual verification.
  No ticket adds a table, index, schema version, backup version, endpoint,
  route, or settings write.
