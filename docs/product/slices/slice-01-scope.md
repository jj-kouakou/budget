# Slice 1 — Log spending and see this month by category

## Why this slice

This is the first slice that delivers the product's headline: the user logs a
purchase in seconds and sees this month's spending take shape by category. It
replaces the moment the spreadsheet fails — the purchase happens, the user
records it at the counter, and the monthly shape updates without a pivot table.

## The core moment

The user buys groceries. They open the app, tap add, type the amount, tap
"Groceries", tap "Checking", and save. The home screen comes back with this
month's total and the Groceries row higher than it was. The whole thing takes
less than ten seconds and one thumb.

## What the user can do

### Set up the accounts they spend from

On first use, the user names the accounts they use — for example, "Checking",
"Savings", "Visa" — and says what kind each one is: checking, savings, or
credit card. They can start without entering a balance. They can add another
account later if they need one, and correct a name if they mistype it.

This slice is about where spending happened, not what each account holds yet.

### Add an expense in under ten seconds

The add action is on the home screen. The user enters an amount, picks a
category, picks an account, and saves. The date is today unless they change it.
The app remembers the last account used so a repeat expense is faster. The form
asks only for the amount, category, account, and date.

### Pick from a starter set of categories

The app begins with a short list of common categories — for example, Groceries,
Eating out, Transport, Housing, Bills, Shopping, Health, Fun, and Other — so the
user can log immediately without setting up categories first.

### See this month's spending by category

Opening the app lands on the current month. The home screen names the month,
shows the total spent, and breaks it down by category, largest first. The total
includes expenses from every account. A purchase on a credit card counts as
spending, the same as a purchase from checking.

### Move between months

The user can go to the previous or next month to see that month's total and
breakdown. An expense dated in an earlier month appears in that month, not in
the month it was entered.

### See the number update immediately

Saving an expense changes the total and the category breakdown straight away,
with no refresh.

### Use it on the phone, installed and offline

The user can add the app to their phone's home screen, open it like an app, and
log an expense without a connection. The ledger stays on the phone; there is no
account to create and nothing to sign in to.

## What is deliberately not in this slice

- **No editing or deleting entries.** A mistake cannot be corrected yet. The
  next slice adds a way to see the entries behind a category and fix or remove
  one.
- **No last-month comparison.** The home screen shows one month at a time. The
  side-by-side view comes later.
- **No account balances, opening balances, income, or transfers.** This slice
  tracks expenses only. Accounts are labels for where spending happened, not
  yet a balance to check.
- **No removing accounts.** The user can add and correct accounts, but removing
  one comes with the balances slice.
- **No custom categories.** The starter list is fixed for now. Adding,
  renaming, and archiving categories comes later.
- **No backup or restore.** Export and import come before the ledger holds much
  history.
- **No storage warning.** The app does not yet tell the user when the phone
  might discard its data; that lands with backup.
- **No bank sync, budgets, multi-currency, sharing, or laptop view.** These are
  outside the product vision.

## How we'll know it works

- A first-time user can set up their accounts and log their first expense
  without instructions.
- A repeat expense takes under ten seconds from opening the app to seeing the
  updated total.
- The add form defaults to today's date and the last account used.
- The home screen names the month it is showing.
- The current month's total equals the sum of the expenses dated in that month,
  across all accounts.
- The category breakdown lists the categories with spending, largest first, and
  those amounts add up to the total.
- A purchase on a credit card counts as spending, the same as a purchase from
  checking.
- A backdated expense appears in the month it belongs to, not the month it was
  entered.
- The app opens from the phone's home screen and logs an expense with no
  connection.
- With no expenses yet, the home screen makes it obvious how to add the first
  one.
- Amounts can include cents, and the app shows them in its one currency.
