# Budget — Ubiquitous Language

A personal, local-first ledger of money movements. This file is a glossary
only: it defines what things *are*, never how they are stored or built.

## Language

**Account**:
A place where money sits — checking/debit, savings, or a credit card.
_Avoid_: Wallet, card, payment method

**Card type**:
Whether an account is debit or credit. A property of the account, never of an
entry. An entry does not "have a card type"; it happens *on* an account.
_Avoid_: Payment method, card

**Entry**:
One dated movement of money recorded in the ledger. Exactly one of four kinds:
expense, income, transfer, or opening balance.
_Avoid_: Transaction, record, line item

**Correction**:
Changing an entry's amount, category, account, or date in place. The entry
keeps its identity; no earlier version is kept.
_Avoid_: Edit, revision, amendment

**Removal**:
Deleting an entry from the ledger. Final: the entry is not archived and there
is no undo.
_Avoid_: Delete, deletion, void

**Expense**:
Money leaving an account in exchange for goods or services. Has exactly one
category. On a credit card, it increases what you owe.
_Avoid_: Purchase, spend, debit

**Income**:
Money entering an account from outside your own accounts. Has a category.
_Avoid_: Deposit, credit, earning

**Transfer**:
Money moving between two of your own accounts. Not income, not expense, and
never categorised. A credit-card payment is a transfer.
_Avoid_: Payment, move, debit-to-credit

**Category**:
The reason money moved, attached to expenses and income. Flat, user-managed,
one per entry. Transfers have none.
_Avoid_: Tag, label, bucket

**Active category**:
A category offered when logging an expense or income. The default state of a
category.
_Avoid_: Enabled category, visible category

**Archived category**:
A category retired from the choices for new expenses and income but still
attached to history. Archived categories are never deleted.
_Avoid_: Disabled category, hidden category, deleted category

**Balance**:
What an account currently holds, derived from its entries. For a credit card,
the amount owed.
_Avoid_: Total, amount, current value

**Opening balance**:
The balance an account had when it was added to the ledger. Recorded as an
entry dated the account's creation date, never as a field on the account.
_Avoid_: Starting amount, initial balance

**Spending**:
The sum of expenses in a period. Excludes income, transfers, and opening
balances.
_Avoid_: Outflow, total spent, burn

**Backup**:
The whole ledger — every account, category, entry, and the currency setting —
saved as one file outside the app. The only protection against losing the
ledger.
_Avoid_: Export, dump, snapshot

**Restore**:
Replacing the entire ledger with the contents of a backup file. All-or-nothing;
never merges.
_Avoid_: Import, load, sync

**Last backup**:
The instant a backup file was last saved from this device. Restoring a backup
is not making one.
_Avoid_: Last export, backup date

**Persisted storage**:
Whether the browser has agreed to keep the ledger rather than being free to
discard it.
_Avoid_: Permanent storage, saved data
