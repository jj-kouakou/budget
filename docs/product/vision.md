# Product Vision

## The problem

Spending is invisible in aggregate. Individual purchases are remembered; the
monthly shape of them is not. A spreadsheet can hold the numbers, but it makes
every entry a chore and every review a manual pivot table. The result is a log
that is abandoned in week three, which answers nothing.

## Who it's for

One person: the owner of this repo. They hold a checking/debit account, a
savings account, and at least one credit card. They log from their phone, at
the moment of spending. No partner, no accountant, no sharing, no second device.

## What it is

A **local-first ledger** of money movements, organised by account and category,
that runs as an installable PWA on the phone and stores everything on that
phone. It records reality. It does not plan, forecast, or enforce limits.

## The one number

**This month's spend, broken down by category, with last month beside it.**

Income and account balances are supporting context. They are never the headline.

## Ultimate workflow

1. Money moves — a purchase, a paycheck, a card payment.
2. Open the installed PWA. Tap add. Enter amount, category, account. Date
   defaults to today. Save. Target: under ten seconds, one thumb.
3. When money moves between two of your own accounts — debit to credit, checking
   to savings — record it as a **transfer**, not an expense.
4. Once a month (or whenever curious), open the home screen: this month's spend
   by category against last month. Tap a category to see the entries behind it.
5. Export the ledger periodically. That export is the only backup, because the
   data lives in one browser on one phone.

## Success, measured at three months

Primary: **at least 90% of real transactions logged within a day of happening**,
and this month's category totals visible in under ten seconds.

Secondary: every credit-card statement reconciles to the cent against the app,
including payments recorded as transfers.

If the primary metric fails, the product failed — not the user. Manual entry
makes friction a survival risk, and the entry flow is where that fight is won
or lost.

## Explicitly out of scope

- Bank or API sync. Entry is manual, always.
- Envelope limits, planned budgets, rollover, over-budget states.
- Investments, retirement, property, net-worth aggregation.
- Multi-currency. One currency, one locale.
- Recurring templates, bill reminders, auto-posting.
- Shared or household access. No auth, no user accounts.
- Native mobile app. The PWA is the product.

## Consequences of these choices

- **Single device, no sync.** No conflict resolution, no server, no deploy
  target beyond static hosting. Backup and restore are export/import.
- **Browser storage.** The ledger can be lost to eviction or a cleared site.
  Persistent-storage permission and export are correctness features.
- **Manual entry.** Completeness is a discipline the UI must earn. Every screen
  is judged against the ten-second budget.
- **Phone-only PWA.** There is no laptop view. If that becomes painful, sync
  becomes a backlog item — not a silent scope change.

## Deferred to North Star Architecture

Account and credit-card modeling, transfer semantics, category model, money
representation, storage engine, and the shape of a backup file.
