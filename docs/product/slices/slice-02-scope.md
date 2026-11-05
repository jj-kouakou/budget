# Slice 2 — Inspect and correct entries

## Why this slice

Slice 1 put this month's spending on screen, but the number cannot yet be
trusted: a wrong amount, the wrong category, or a duplicate has no way out.
Every mistake stays in the ledger forever and quietly bends the headline. This
slice makes the number auditable — the user can see what a category is made of
and fix what is wrong — which is the difference between a log that survives
past week three and one that gets abandoned.

## The core moment

The user checks the home screen after lunch and sees Eating out higher than
expected. They tap it and the three entries behind it are there — one is a $45
dinner that should have been $4.50. They open it, correct the amount, save, and
the category row and the month's total drop by the difference. No spreadsheet,
no re-entry, no lost trust.

## What the user can do

### See the entries behind a category

From the month already on the home screen, tapping a category opens the list of
that category's entries for that month. Each entry shows its amount, its date,
and the account it came from, newest first. The list names the category and the
month, and its amounts add up to the category row the user tapped.

Going back returns the user to the same month they were looking at.

### Open an entry and change it

Tapping an entry opens it with the amount, category, account, and date already
filled in — the same four things the user entered when adding it. They can
change any of them and save. Leaving without saving changes nothing.

Saving is immediate: the entry list, the category row, and the month's total
all reflect the change without a refresh. If the user moves the entry to a
different category, the amount leaves one row and joins the other. If they
change the date into a different month, the entry leaves the month it was in
and the app shows the month it now belongs to.

Saving returns the user to the list that now holds the entry — its category in
its month — so a re-filed or re-dated entry appears in its new place instead of
vanishing from the list.

The same checks apply as when adding: an amount is required and must be a real
amount, and the entry keeps a category and an account. Mistakes are pointed out
on the spot.

### Remove an entry

An opened entry can be removed. The app asks the user to confirm first, naming
the entry's amount, date, and account, and cancelling keeps it. Once confirmed,
the entry is gone, and the list, the category row, and the month's total update
straight away. The user returns to the list they came from; if that was the
category's last entry in the month, they land on the home screen for that
month, where the category no longer appears. Removing the month's last entry
returns the home screen to its empty state.

Removal is final — there is no undo — which is why it is confirmed.

### The rest of the ledger stays put

Correcting one entry never changes another. The home screen still counts
expenses from every account, still orders categories largest first, and still
moves between months the same way. An entry on a credit card is corrected
exactly like one from checking.

## What is deliberately not in this slice

- **No all-entries feed.** Entries are reached through the category they are
  filed under, which is how the headline is read. A single chronological list
  of everything is not part of this slice.
- **No undo and no edit history.** A corrected entry replaces what was there;
  the app does not keep or show earlier versions.
- **No bulk changes.** One entry at a time — no multi-select, no "remove all in
  this category".
- **No search or filtering inside a category.** The list is the month's entries
  in that category, and nothing narrows it further.
- **No last-month comparison.** Still one month at a time.
- **No custom categories.** The starter list is still fixed; adding, renaming,
  and archiving come later.
- **No backup or restore.** Still to come, before the ledger holds much
  history.
- **No account balances, opening balances, income, or transfers.** This slice
  is still expenses only.
- **No bank sync, budgets, multi-currency, sharing, or laptop view.** These are
  outside the product vision.

## How we'll know it works

- Tapping a category on the home screen opens that month's entries in that
  category, newest first, and their amounts add up to the category's row.
- Each listed entry shows its amount, date, and account.
- The user can open any listed entry, change its amount, category, account, or
  date, and save.
- Correcting an entry's category moves its amount from one category row to the
  other and updates both rows and the total immediately.
- Correcting an entry's date to another month removes it from the current month
  and shows it in the month it now belongs to.
- After saving a change, the app shows the list that now holds the entry, with
  the correction visible.
- Removing an entry asks for confirmation; cancelling keeps the entry
  unchanged.
- Once confirmed, removal updates the list, the category row, and the month's
  total immediately, and returns the user to the list they came from.
- Removing a category's last entry in the month lands the user on the home
  screen for that month, without that category.
- Removing the last entry in the month shows the home screen's empty state.
- Correcting an entry leaves every other entry unchanged.
- Editing and removing work the same for entries on a credit card as on
  checking.
- Backing out of an edit without saving leaves the entry unchanged.
