# Slice 5 — Compare with last month

## Why this slice

The home screen has shown one month at a time. That answers "what did I spend?"
but not "is that more or less than usual?" A total with nothing beside it is a
number without a judgement: the user has to remember last month, or open a
spreadsheet, to know whether a category moved. The vision's headline is not one
month's breakdown; it is this month's breakdown **with last month beside it**.

Slices 1–4 made the month on screen accurate, correctable, safe to keep, and
worded the user's way. This slice adds the second half of the headline without
changing a single amount: the same entries, read for two months at once.

## The core moment

The user opens the app at the start of a new month. The home screen names the
month and shows its total, as before. Beside each category's amount is what
that category came to last month. Groceries is up; Dining is down; a category
that had spending last month and none yet this month shows zero this month with
last month's amount beside it. The user sees the shape of the change in one
glance, without a pivot table or a mental subtraction.

## What the user can do

### See last month beside this month

The home screen still shows the month the user is viewing: its name, its total,
and its category breakdown. Beside each category's amount, the screen shows the
amount for the month immediately before. The two amounts are labelled with the
months they cover, so it is always clear which is which.

The month's total remains the total for the month on screen. Last month's
amounts are the comparison; they are not added to this month's total.

The comparison follows the month on screen. Moving to an earlier month
compares it with the month before that one. Moving to a later month does the
same. Across a year boundary, January is compared with the previous December.

### See which categories changed

A category appears when it has spending in either the month on screen or the
month before.

- If it has spending in both, both amounts are shown.
- If it has spending only in the month on screen, the month before shows zero.
- If it has spending only in the month before, the month on screen shows zero
  and the category still appears, so a drop to nothing is visible.
- If it has no spending in either month, it does not appear.

Rows are ordered by the month on screen, largest first, as before. Categories
with nothing in the month on screen follow, largest in the month before first.
The amounts in the month on screen still add up to that month's total.

### The comparison matches the entries

The comparison is the entries seen month by month, so it always agrees with
them. Correcting an entry's amount, category, or date updates both columns
straight away. Removing an entry does the same.

Renaming a category shows the new name in both columns; the two amounts stay
attached to the same category. Archiving a category does not remove it from the
comparison while it has spending in either month. Adding, correcting, and
removing entries work exactly as before.

### When there is nothing to compare

When the month before has no spending recorded, the screen says so plainly —
for example, "No spending recorded in October 2026" — instead of showing a
column of zeros that could be mistaken for data. This is the state for the
first months of use, before a full prior month exists.

When the month on screen has no spending but the month before does, the
comparison still shows the month-before rows with zero for the month on screen,
so the drop is visible. The usual way to add an expense stays available.

When neither month has spending, the home screen keeps its empty state and its
prompt to add the first expense.

### Tapping a category

Tapping a category row still opens that category's entries for the month on
screen, as before. A category with no spending in the month on screen has no
entries to open there; moving to the month before shows its entries. The
comparison adds no second way into last month's entries.

### Backups and offline

Because the comparison is just the entries read for two months, a backup and
restore reproduce it exactly; nothing extra needs to be saved. The comparison
works on a phone with no connection, like the rest of the home screen.

## What is deliberately not in this slice

- **No percentage change, arrows, trend lines, or difference column.** The two
  amounts are shown side by side; the user reads the change.
- **No overall last-month total beside the headline.** The headline stays this
  month's total; the comparison is per category.
- **No charts, graphs, or sparklines.** The comparison is numbers in the
  breakdown.
- **No choosing a different comparison month.** It is always the month
  immediately before the one on screen — not the same month last year, not an
  arbitrary month.
- **No opening last month's entries from the comparison.** Move to that month
  and tap the category.
- **No comparison on the category entries screen or any other screen.** It
  lives on the home screen.
- **No change to how spending is counted.** Still expenses only; income,
  transfers, and opening balances never appear in a category total.
- **No change to category rules.** Archived categories with spending still
  appear; names still come from the category.
- **No bank sync, budgets, multi-currency, sharing, or laptop view.** These are
  outside the product vision.

## How we'll know it works

- The home screen shows each category's amount for the month on screen and the
  amount for the month before, labelled with both months.
- The amounts in the month on screen add up to that month's total; last month's
  amounts do not change the total.
- A category with spending in both months shows both amounts.
- A category with spending only in the month on screen shows zero for the month
  before.
- A category with spending only in the month before appears with zero for the
  month on screen and last month's amount.
- A category with no spending in either month does not appear.
- Rows are ordered by the month on screen, largest first; categories with
  nothing in the month on screen follow, largest in the month before first.
- Moving to an earlier or later month compares it with the month immediately
  before it, including across a year boundary.
- Correcting an entry's amount, category, or date updates the comparison
  straight away; removing an entry does the same.
- Renaming a category shows the new name in both columns; archiving a category
  with spending keeps it in the comparison.
- When the month before has no spending, the screen says so plainly.
- When the month on screen has no spending but the month before does, the
  comparison shows the month-before rows with zero for the month on screen, and
  adding an expense remains available.
- When neither month has spending, the home screen keeps its empty state.
- Tapping a category with spending in the month on screen still opens its
  entries for that month; a category with no spending there has no entries to
  open.
- A backup and restore reproduce the comparison.
- The comparison works on a phone with no connection.
- A screen reader announces which month each amount belongs to.
