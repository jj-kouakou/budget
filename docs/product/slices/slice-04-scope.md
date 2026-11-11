# Slice 4 — Manage categories

## Why this slice

The headline is only useful if its rows mean what the user means by them. Right
now the breakdown uses a fixed starter list — Groceries, Eating out, Transport,
Housing, Bills, Shopping, Health, Fun, Other — and none of it can be changed.
A coffee and a dinner both land in Eating out. Transit and gas both land in
Transport. When no starter category fits, the expense goes to Other and the
breakdown stops explaining the month.

This slice lets the user shape the list to their own spending, before a second
month accumulates under names that were never theirs. The totals do not change;
only the words and the set of rows do.

## The core moment

The user has a week of entries. Eating out is carrying both coffees and
dinners, and Transport holds transit and gas. They open Categories, add Coffee
and Gas, rename Eating out to Dining, and archive a category they never use so
the list of choices stays short. The next expense takes the same few seconds,
and the home screen now reads like their month instead of a generic template.

## What the user can do

### See their categories

The home screen has a Categories action. The Categories screen lists every
category the app has: the active ones first, the archived ones below, each
plainly marked as archived, and each group in alphabetical order. Each
category shows its name. This is where adding, renaming, archiving, and
unarchiving happen.

An **active** category is one offered when logging an expense. An **archived**
category is one that has been retired: not offered for new expenses, but still
part of history.

### Add a category

The user can add a category by giving it a name. It is offered immediately when
adding an expense. A new category does not add a zero row to the home screen;
the breakdown shows only categories with spending in that month.

A name is required, is trimmed of leading and trailing spaces, and is at most
60 characters. The app refuses a name already used by another category,
archived or not, ignoring capitalisation, and says which category already has
that name.

### Rename a category

The user can rename any category, active or archived. The new name appears
everywhere the category appears: the home breakdown, the list of entries
behind a category, the choices when adding an expense, and the choices when
correcting an entry. Past months show the new name too, because the entries
keep their category and only the label changes. Renaming moves no amount
between rows and changes no total.

The same name rules apply as when adding: required, trimmed, at most 60
characters, and not a name another category already uses.

### Archive a category

The user can archive a category to retire it. An archived category is not
offered when adding an expense, so new spending cannot be filed under it.

Archiving does not remove history. A month where the category has spending
still shows its row in the breakdown, its entries are still listed, and an
entry filed under it still opens with that category selected, so correcting
its amount, account, or date does not force the user to re-file it. Archiving
changes no amount and no total.

### Unarchive a category

An archived category can be brought back. It is offered again when adding an
expense, and its history is unchanged. No other category is affected.

### When no active category is left

If every category is archived, adding an expense cannot be completed. The app
says plainly that there is no category to file the expense under and points
the user to Categories, where they can add one or unarchive one. No
half-finished entry is saved.

### Backups carry the categories

A backup taken after these changes holds the categories as they then were —
the added ones, the new names, and which are archived. Restoring that backup
reproduces them. Restoring an older backup restores the categories as that
file recorded them; the current list is not merged into it.

### History stays labelled

Categories are never deleted. Archiving is how a category is retired. Every
entry keeps the category it was filed under, so no month loses a label and no
total loses an amount.

## What is deliberately not in this slice

- **No deleting categories**, not even unused ones. Archiving is the only
  retirement, so history is never left unlabelled and there is one rule to
  learn. A category added by mistake can be renamed or archived.
- **No subcategories, nesting, or groups.** The list is flat.
- **No reordering.** The home breakdown keeps ordering by amount.
- **No colours, icons, or emoji.** A category is its name.
- **No merging two categories** or moving all entries from one to another.
  Individual entries are corrected one at a time, as before.
- **No bulk re-filing.** One entry at a time.
- **No per-category budgets, limits, or targets.** The product does not plan or
  enforce.
- **No default category, suggestions, or automatic filing.** The user chooses
  every time.
- **No adding or renaming from the add-expense screen.** Categories are managed
  on the Categories screen.
- **No change to how spending is counted.** Still expenses only; income,
  transfers, and opening balances stay out of category totals.
- **No bank sync, budgets, multi-currency, sharing, or laptop view.** These are
  outside the product vision.

## How we'll know it works

- The home screen reaches a Categories screen that lists every category, with
  archived ones marked and listed after the active ones.
- The user can add a category; it is offered when adding an expense and does
  not create a zero row on the home screen.
- The user can rename a category; the new name appears on the home breakdown,
  the entries list, the choices when adding an expense, and the correction
  screen, including for past months.
- Renaming changes no amount and no total.
- An empty or overlong name is refused with a plain message.
- A name already used by another category, archived or not, is refused with a
  plain message naming the category that already has it.
- The user can archive a category; it stops being offered for new expenses.
- An archived category with spending still appears in that month's breakdown,
  its entries are still listed, and correcting one of those entries keeps its
  category.
- The user can unarchive a category; it is offered again and its history is
  unchanged.
- With every category archived, adding an expense cannot be completed and the
  app points the user to Categories.
- A backup taken after adding, renaming, or archiving restores those
  categories; restoring an older backup restores the older category list.
- Adding, correcting, and removing entries work as before; the home screen's
  totals and ordering are unchanged.
- All of this works on a phone with no connection.
