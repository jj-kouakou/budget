# Slice 6 — Track account balances

## Why this slice

The app can record every movement of money: a purchase, a paycheck, a transfer
between the user's own accounts. What it cannot show is where those movements
leave each account. The user can see the month's spending, but not what the
checking account holds or what the card owes.

The vision calls income and account balances supporting context, never the
headline. Slices 1–5 completed the headline; slices 8 and 7 completed the
movements around it. With spending, income, and transfers now recorded, a
balance can finally be truthful: a checking balance includes paychecks, and a
card balance includes payments. This slice adds that supporting context
without changing the one number.

## The core moment

The user opens Accounts for the first time after this slice. Checking shows the
sum of everything logged so far, and the screen invites them to set the
account's starting point. They enter what the account held before they began
logging; the balance becomes what the account really holds. The Visa shows what
it owes. The home screen's spending total does not move.

## What the user can do

### Set each account's starting point

Every account can have one opening balance: what it held, or what a credit card
owed, before the user started logging.

- The user can set it when adding an account, or later for an account that
  already exists.
- An account added without one starts at zero.
- For checking and savings, the opening balance is what the account held. It
  may be negative if the account was overdrawn.
- For a credit card, the opening balance is what the card owed. Zero means
  nothing was owed. A card that started in credit can be recorded too, and is
  not treated as debt.
- The user can change or clear the opening balance later. There is one starting
  point per account; changing it does not add a second.
- The opening balance belongs to the account's starting point, not to a month.
  It does not appear in this month's spending or income, and moving between
  months does not change it.
- The app uses the same one currency and the same way of entering an amount as
  everywhere else.

An account with no opening balance shows the sum of its recorded movements.
The screen invites the user to set the starting point so the balance matches
what the account really held or owed. The invitation does not block the user
from continuing.

### See what each account holds or owes

The Accounts screen lists every account with its name, its type, and its
current balance. The balance is current, not the balance at the end of the
month being viewed; moving between months does not change it.

- A checking or savings balance is what the account holds. A negative balance
  is shown with a minus and called overdrawn.
- A credit card balance is what the card owes, shown as a positive amount
  labelled owed. A card with nothing owed shows zero owed. A card that has been
  overpaid shows the amount in credit.
- The balance includes the opening balance and every expense, income, and
  transfer recorded for the account. For checking and savings, money leaving
  reduces the balance and money arriving increases it. For a credit card, an
  expense or money leaving the card increases what is owed, and a payment or
  other money arriving reduces it.
- Balances update straight away when an expense, income, or transfer is added,
  corrected, or removed.
- The Accounts screen does not show a combined total across accounts. The
  vision keeps net-worth aggregation out of the product.
- The home screen's total, category breakdown, and last-month comparison are
  unchanged. Balances are supporting context; the headline stays this month's
  spending.
- Opening balances never appear in the income list, the transfers list, or a
  category's entries.

### Correct a starting point

The user does not overwrite a balance by typing a new total. To fix a balance,
they correct the starting point or the movement behind it.

- Opening the opening balance form shows the current starting point, so the
  user can change it or clear it.
- Changing or clearing it updates the balance straight away.
- Correcting or removing an expense, income, or transfer updates the balance
  straight away, using the same correction and removal flows the user already
  knows.
- If the balance still looks wrong, the user checks the opening balance and the
  movements they recorded. There is no statement-matching or reconciliation
  step in this slice.

### Backups and offline

An opening balance is part of the ledger.

- A backup includes every account's opening balance, and restoring a backup
  brings it back exactly.
- Restoring replaces the ledger; it does not add a second starting point to an
  account that already has one.
- An older backup made before opening balances existed still restores. Its
  accounts have no opening balance, so their balances reflect the movements in
  the file; the screen invites the user to set the starting points.
- Setting an opening balance, viewing balances, and correcting a starting point
  work on a phone with no connection.

### Accessibility

A screen reader announces each account's name, type, and balance, including
whether a card amount is owed or in credit and whether a checking or savings
balance is overdrawn.

## What is deliberately not in this slice

- **No combined total or net worth across accounts.** The vision keeps
  net-worth aggregation out of the product.
- **No balance on the home screen.** Balances are supporting context; the
  headline stays this month's spending.
- **No per-account list of movements or drill-down from a balance.** The
  existing category, income, and transfer lists remain the way to see what was
  recorded.
- **No direct editing of a balance total.** The user corrects the starting
  point or the movement.
- **No statement reconciliation, statement import, or marking a statement
  reconciled.** The vision's reconciliation metric is a success measure, not a
  feature of this slice.
- **No balance history, charts, trends, forecasts, or balance over time.**
- **No credit limit, available credit, utilization, due date, minimum payment,
  interest, fees, or APR.**
- **No automatic opening balance from a bank or statement.**
- **No account deletion, archiving, hiding, reordering, or changing an
  account's type.** Renaming an account stays as it is.
- **No multi-currency or exchange rates.** One currency, as everywhere else.
- **No bank sync, budgets, sharing, or laptop view.** These are outside the
  product vision.

## How we'll know it works

- The user can add an account without an opening balance; it starts at zero.
- The user can set an opening balance for a new or existing account, including
  zero, a negative amount for checking or savings, and what a credit card owed.
- A credit card that started in credit can be recorded without being treated
  as debt.
- Changing or clearing an opening balance updates the one starting point; it
  does not add a second.
- The Accounts screen shows each account's name, type, and current balance.
- A checking or savings balance shows what the account holds; a negative
  balance is shown with a minus and called overdrawn.
- A credit card balance shows what is owed as a positive amount labelled owed;
  a payment reduces it, an expense on the card increases it, and zero owed is
  shown as zero.
- A card that has been overpaid shows the amount in credit, not a negative
  amount owed.
- The balance includes the opening balance and every expense, income, and
  transfer recorded for the account.
- The balance updates straight away when an expense, income, or transfer is
  added, corrected, or removed.
- Moving between months does not change any balance.
- The home screen's total, category breakdown, and last-month comparison are
  unchanged by opening balances and by viewing balances.
- Opening balances never appear in the income list, the transfers list, or a
  category's entries.
- An account with recorded movements but no opening balance shows the sum of
  its movements and invites the user to set the starting point.
- A backup includes opening balances; restoring it reproduces them exactly.
- An older backup without opening balances restores; its accounts show the
  balance of their recorded movements and invite the user to set the starting
  points.
- When no accounts exist, the screen says to add one; an account with no
  movements and no opening balance shows zero.
- Setting and viewing balances works on a phone with no connection.
- A screen reader announces the account name, type, and balance, including
  owed, in credit, and overdrawn.
