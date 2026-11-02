# Accounts own balances; a credit card is a liability account

Context: the first design instinct was to tag each entry with a card type
(debit/credit). That makes "how much do I owe on the card" unanswerable and
makes a card payment indistinguishable from spending, which corrupts every
category total. We decided accounts are the only things that carry balances,
and a credit card is an account whose balance is a liability. A purchase is an
expense on that account; paying the card is a transfer between two accounts and
never counts as spending. Balances are always derived from entries, never
stored, and an account's starting position is an `opening` entry.

Considered options: a card-type tag on entries (rejected — cannot express debt
or payments); full double-entry postings (rejected — correct but doubles the
model and every screen for a single-user ledger nobody else reconciles). The
chosen model is the smallest one that keeps "spending this month" truthful.

Consequences: transfers need two account references on one row; category totals
must filter to expenses only; credit balances are negative internally and
displayed as an amount owed.

Status: accepted
