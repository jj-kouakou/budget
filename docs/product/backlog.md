# Product Backlog

## Destination

The user can use this app as their only ledger: log a purchase in seconds, see
this month's spending by category, trust the number, and keep the ledger safe.
The app replaces the spreadsheet that gets abandoned in week three.

## Slice list

| # | Slice | What the user can do | Status |
|---|---|---|---|
| 1 | Log spending and see this month by category | Set up the accounts they spend from; add an expense in under ten seconds; see this month's total and category breakdown; move between months; install the app on the phone and use it without a connection. | In progress |
| 2 | Inspect and correct entries | Tap a category to see the entries behind it; fix or remove a mistaken entry. | Backlog |
| 3 | Keep a backup | Export the ledger to a file and restore it; see when the last backup was made and whether the phone might discard the data. | Backlog |
| 4 | Manage categories | Add, rename, and archive categories so the breakdown matches how they think about their money. | Backlog |
| 5 | Compare with last month | See last month's category totals beside this month's. | Backlog |
| 6 | Track account balances | Enter opening balances and see what each account holds or owes. | Backlog |
| 7 | Record income | Record money coming in, categorized, without inflating spending. | Backlog |
| 8 | Record transfers | Move money between their own accounts, including paying a credit card, without counting it as spending. | Backlog |

## Why this order

- **Slice 1 is the smallest complete loop that delivers the vision's headline.**
  Logging an expense and seeing this month's category totals is the product's
  reason to exist; everything else supports or extends that loop.
- **Correction comes before backup.** A wrong number erodes trust immediately.
  Backup lands before the ledger holds enough history to hurt if it is lost.
- **Category management lands before the last-month comparison.** The starter
  list is enough to begin, but the user should be able to shape the categories
  before the first full month is compared against the second.
- **The last-month comparison completes the headline, but it needs a month of
  data to mean anything.** It follows the trust-and-safety slices so the user
  has a reason to keep logging until there is a last month to compare.
- **Balances, income, and transfers complete the supporting context.** The
  vision is explicit that they are never the headline, and each depends on
  accounts and entries already existing.
- **Each slice depends only on slices before it.** The order is dependency
  order, not preference order.

## Out of scope

These are outside the product, not deferred slices:

- Bank sync or automatic import; entry stays manual.
- Envelope limits, planned budgets, rollover, or over-budget states.
- Investments, retirement, property, or net-worth aggregation.
- Multi-currency; one currency, one locale.
- Recurring templates, bill reminders, or auto-posting.
- Shared or household access; no sign-in, no user accounts, no second user.
- A native mobile app; the installable phone app is the product.
- A laptop view.
