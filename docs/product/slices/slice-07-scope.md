# Slice 7 — Record income

## Why this slice

The app can record spending and money moving between the user's own accounts.
It cannot record money coming in from outside those accounts: a paycheck,
interest, a cash gift. That leaves the ledger incomplete in one direction. A
checking account's history is missing every inflow, so the app cannot yet be
the only ledger the vision describes.

Slices 1–5 completed the spending headline: log, correct, keep safe, word the
user's way, compare with last month. Slice 8 completed movements between the
user's own accounts. This slice adds the other direction: money arriving from
outside. The vision puts income in supporting context, never the headline, so
this slice records income without changing the spending number.

## The core moment

It is payday. The user opens the app, taps Income, taps Add income, enters the
amount, chooses Salary, chooses Checking, leaves the date as today, and saves.
The income appears in the income list. The home screen still shows the same
spending total and category breakdown as before: the paycheck did not become
spending. The ledger now holds the paycheck.

## What the user can do

### Record money coming in

The user chooses the account the money arrives in, a category, the amount, and
the date. The date defaults to today and can be changed, including to an
earlier month. The app uses the same one currency and the same way of entering
an amount as an expense.

Saving confirms the income and shows it in the list. Income is one movement
into one account, not a movement out of another. Money moving between two of
the user's own accounts stays a transfer; it is never recorded as income.

The amount must be more than zero. A category is required. The category list
is the same one used for spending: a category can label either an expense or
an income. If no category fits, the user can add one such as Salary in
Categories, and it becomes available for income. The app does not keep a
separate income-category list.

Archived categories are not offered for new income. Income already recorded
with a category that is later archived keeps its label and can still be
corrected.

If there is no category to file income under, the income screen says so and
points to Categories. If an income's account no longer exists, the app asks for
another before saving a correction.

### See income without confusing it with spending

Income is listed in one place, newest first, showing the date, the category,
the account the money arrived in, and the amount. The list is reached from the
home screen, so recording income is part of the same short flow as recording a
purchase. Income and transfers are listed separately: a transfer never appears
in the income list, and income never appears in the transfers list.

Income never appears in the home screen's total, category breakdown, or
last-month comparison, in the month of the income or any other month. The
spending number is exactly what it was before the income. Income dated in an
earlier month does not appear in that month's spending either.

Tapping a category still shows only the expenses behind it. Income labelled
with the same category does not appear in the category's entries or add to its
total. Renaming a category changes the label on income entries; archiving it
keeps the label on income already recorded.

When no income has been recorded, the list says so and offers to add the first
one.

### Correct or remove income

Opening an income lets the user change the amount, category, account, or date,
or remove it. A correction updates the one income and the list straight away.
Removal asks for confirmation, naming the amount, the date, the category, and
the account, and is final. Correcting or removing income never changes a
spending total, because income was never spending.

### Backups and offline

Income is part of the ledger. A backup includes it, and restoring a backup
brings income back exactly. Recording, viewing, correcting, and removing income
work on a phone with no connection.

## What is deliberately not in this slice

- **No balances or opening balances.** Recording income does not show what an
  account holds or owes; that is slice 6.
- **No income total on the home screen.** Income is supporting context; the
  headline stays this month's spending.
- **No separate income categories or second category list.** The category list
  stays flat and shared between expenses and income.
- **No payee, employer, source, note, tax, gross/net, or withholding.** A
  category is the only reason recorded.
- **No recurring paychecks, templates, reminders, or auto-posting.**
- **No refund-specific flow, no negative amounts, and no converting an expense
  into income or income into an expense.** Remove one and record the other.
- **No splitting income** across several accounts or several categories.
- **No filtering or month navigation on the income list.** The date on each
  income is enough.
- **No charts, trends, forecasts, budgets, or over-budget states.**
- **No bank sync, multi-currency, sharing, or laptop view.** These are outside
  the product vision.

## How we'll know it works

- The user can record income with an amount, category, account, and date.
- The date defaults to today and can be changed, including to an earlier month.
- The app refuses an amount of zero or less.
- The app requires a category and an account before saving.
- Archived categories are not offered for new income; income already recorded
  with an archived category keeps its label and can still be corrected.
- The income appears once in the income list, newest first, showing the date,
  category, account, and amount.
- A transfer never appears in the income list, and income never appears in the
  transfers list.
- The home screen's total, category breakdown, and last-month comparison are
  unchanged by the income, in the month of the income and in every other month.
- Income dated in an earlier month does not appear in that month's spending.
- Tapping a category still shows only its expenses; income with the same
  category does not appear there and does not add to the category total.
- Renaming a category changes the label on income entries; archiving it keeps
  the label on income already recorded.
- Correcting the amount, category, account, or date updates the one income and
  the list straight away; spending totals stay unchanged.
- Removing income asks for confirmation naming the amount, date, category, and
  account, then removes it; spending totals stay unchanged.
- When no income has been recorded, the list says so and offers to add the
  first one.
- When there is no category to file income under, the screen says so and points
  to Categories.
- A backup and restore reproduce income exactly.
- Income works on a phone with no connection.
- A screen reader announces the category, account, amount, and date of each
  income.
