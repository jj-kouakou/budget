# Product Backlog

## Destination

The user can use this app as their only ledger: log a purchase in seconds, see
this month's spending by category, trust the number, and keep the ledger safe.
The app replaces the spreadsheet that gets abandoned in week three.

## Slice list

| # | Slice | What the user can do | Status |
|---|---|---|---|
| 1 | Log spending and see this month by category | Set up the accounts they spend from; add an expense in under ten seconds; see this month's total and category breakdown; move between months; install the app on the phone and use it without a connection. | Done — deployed at https://jj-kouakou.github.io/budget/ |
| 2 | Inspect and correct entries | Tap a category to see the entries behind it; fix or remove a mistaken entry. | Done — deployed at https://jj-kouakou.github.io/budget/ |
| 3 | Keep a backup | Export the ledger to a file and restore it; see when the last backup was made and whether the phone might discard the data. | Done — 2026-11-10 on branch `slice-03`; not yet deployed |
| 4 | Manage categories | Add, rename, archive, and unarchive categories so the breakdown matches how they think about their money. | In progress |
| 5 | Compare with last month | See last month's category totals beside this month's. | Backlog |
| 6 | Track account balances | Enter opening balances and see what each account holds or owes. | Backlog |
| 7 | Record income | Record money coming in, categorized, without inflating spending. | Backlog |
| 8 | Record transfers | Move money between their own accounts, including paying a credit card, without counting it as spending. | Backlog |

## Why this order

- **Slice 1 is the smallest complete loop that delivers the vision's headline.**
  Logging an expense and seeing this month's category totals is the product's
  reason to exist; everything else supports or extends that loop.
- **Slice 2 shipped, then slice 3 followed.** Slice 2 made the headline
  auditable, so a typo no longer bends the number for good. What remained was
  loss, not accuracy: backup protects a history that now survives correction.
  Close-out on 2026-11-04 re-checked the order and found nothing in slice 2
  that changes it.
- **Slice 3 was completed on 2026-11-10; slice 4 was pulled the same day.**
  Close-out re-checked the order. The backup file is ledger-only and the data
  model did not change (`SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` both stay
  `1`), so category management adds no backup migration. The starter list is
  usable but fixed, and the user should shape categories before the first full
  month is compared.
- **The 2026-11-10 scope gate re-checked the order again and found no shift.**
  The app was first deployed on 2026-11-02, so there is no complete prior month
  to compare and slice 5 stays premature. The starter list is the last cheap
  thing to shape before months accumulate under names that were never the
  user's. Slices 6–8 are supporting context by the vision's own wording.
  Slice 3 must be merged and deployed before slice 4 ships; that is a release
  step, not a reordering.
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
