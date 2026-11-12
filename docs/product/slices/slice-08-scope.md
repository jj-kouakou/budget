# Slice 8 — Record transfers

## Why this slice

The user moves money between their own accounts: checking to savings, checking
to a credit card to pay it off. Today the app can record spending, but not those
movements. A card payment recorded as an expense inflates the month's spending;
left out, the ledger is incomplete and the card's history can never add up. The
vision is explicit: paying a card is not spending, and a transfer is not an
expense.

Slices 1–5 made the spending headline complete: log, correct, keep safe, word
the user's way, compare with last month. This slice adds the movement the
headline deliberately leaves out, so the ledger can hold the rest of the user's
money without bending the number.

## The core moment

The user pays their credit card from checking. They open the app, tap Transfer,
choose Checking as the account the money leaves and Visa as the account it
arrives in, enter the amount, leave the date as today, and save. The home
screen's spending total does not move. The transfer appears in the transfers
list, and the user can see it was recorded. Paying the card did not become
spending.

## What the user can do

### Record a transfer between two of their own accounts

The user chooses the account the money leaves and the account it arrives in.
The two must be different. They enter the amount and the date; the date
defaults to today and can be changed, including to an earlier month. No
category is asked for, because a transfer is not spending and has no reason
attached.

Saving confirms the transfer and shows it in the list. The transfer is one
movement, not two: it leaves one account and arrives in the other.

The flow handles the common cases without special steps:

- Paying a credit card: checking → the card.
- Moving money to savings: checking → savings.
- Moving money back: savings → checking.

Any two different accounts can be the two sides, including a credit card. The
app does not ask why the money moved.

The amount must be more than zero. The app uses the same one currency and the
same way of entering an amount as an expense.

A transfer needs two different accounts. If the user has fewer than two, the
transfers screen says so and points to adding another account.

### See transfers without confusing them with spending

Transfers are listed in one place, newest first, showing the date, the account
the money left, the account it arrived in, and the amount. The list is reached
from the home screen, so recording a transfer is part of the same short flow as
recording a purchase.

Transfers never appear in the home screen's total or category breakdown, in the
month of the transfer or any other month. The spending number is exactly what
it was before the transfer. A transfer dated in an earlier month does not
appear in that month's spending either.

When no transfers have been recorded, the list says so and offers to add the
first one.

### Correct or remove a transfer

Opening a transfer lets the user change the amount, either account, or the
date, or remove it. A correction updates the one transfer and both sides; the
list reflects it straight away. Removal asks for confirmation, naming the
amount, the date, and both accounts, and is final. Correcting or removing a
transfer never changes a spending total, because a transfer was never
spending.

### Backups and offline

A transfer is part of the ledger. A backup includes it, and restoring a backup
brings transfers back exactly. Recording, viewing, correcting, and removing
transfers work on a phone with no connection.

## What is deliberately not in this slice

- **No income.** Money coming in from outside the user's own accounts is
  slice 7.
- **No balances or opening balances.** Recording a transfer does not show what
  an account holds or owes; that is slice 6.
- **No category, tag, note, or payee on a transfer.** A transfer has no reason
  attached.
- **No fees, exchange rates, or multi-currency.** One currency, as everywhere
  else.
- **No scheduled, recurring, or automatic transfers.**
- **No linking a transfer to a credit-card statement** or marking a statement
  reconciled.
- **No splitting a transfer** across several accounts or several amounts.
- **No changing an expense into a transfer or a transfer into an expense.**
  Remove one and record the other.
- **No transfers in the category breakdown or the category entries screen.**
  Transfers are not spending.
- **No filtering or month navigation on the transfers list.** The date on each
  transfer is enough.
- **No bank sync, budgets, sharing, or laptop view.** These are outside the
  product vision.

## How we'll know it works

- The user can record a transfer from one account to another, with an amount
  and a date.
- The date defaults to today and can be changed, including to an earlier month.
- The app refuses a transfer whose two accounts are the same.
- The app refuses an amount of zero or less.
- The transfer appears once in the transfers list, newest first, showing the
  date, both accounts, and the amount.
- The home screen's total and category breakdown are unchanged by the transfer,
  in the month of the transfer and in every other month.
- A transfer dated in an earlier month does not appear in that month's
  spending.
- Correcting the amount, either account, or the date updates the one transfer
  and both sides, and the list shows the change straight away.
- Removing a transfer asks for confirmation naming the amount, date, and both
  accounts, then removes it; spending totals stay unchanged.
- A backup and restore reproduce the transfers exactly.
- Transfers work on a phone with no connection.
- A screen reader announces the direction of the transfer — which account the
  money left and which it arrived in — as well as the amount and date.
