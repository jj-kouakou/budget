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
One dated movement of money recorded in the ledger. Exactly one of three kinds:
expense, income, or transfer.
_Avoid_: Transaction, record, line item

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

**Balance**:
What an account currently holds, derived from its entries. For a credit card,
the amount owed.
_Avoid_: Total, amount, current value
