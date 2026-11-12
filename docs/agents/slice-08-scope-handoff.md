# Handoff — Slice 08 Scope

## Gate

Slice scoping (workflow step 3) for slice 8 — complete. The gate re-checked the
backlog order and pulled slice 8 ahead of slices 6 and 7. The user approved the
shift at the gate.

## Artifacts

- `docs/product/slices/slice-08-scope.md` — new, user-facing scope only.
- `docs/product/backlog.md` — slice 8 moved to `In progress`; the remaining
  order is 8 → 7 → 6; the order rationale records the shift.
- This handoff.

## Priority check (wayfinder)

**Destination:** the user can use the app as their only ledger — log in
seconds, see this month by category, trust the number, and keep the ledger
safe.

**Next slice on the backlog was 6 — Track account balances.** The check found a
priority shift, not a preference reordering.

Evidence:

- The built app can create expenses only. The entry model and backup validator
  accept income, transfer, and opening entries, but no screen creates them;
  accounts have no balance.
- North-star defines a balance as the sum of an account's entry effects, and an
  opening balance is an entry. With expenses and openings only, a checking
  balance omits every paycheck and a card balance omits every payment. Slice 6's
  user-facing promise — "see what each account holds or owes" — would be false
  for the user's actual accounts.
- That is the trust failure the vision names: a balance that only falls invites
  the user to stop believing the ledger. It is worse than no balance.
- Transfers were pulled ahead of income because a card payment has no correct
  home today: recorded as an expense on checking it inflates the month's
  spending; omitted it leaves the ledger incomplete. The vision's secondary
  success metric explicitly requires card payments as transfers, and transfers
  need no income-category decision.
- Income is still required before balances: a checking balance without
  paychecks is wrong. It follows transfers.
- Time sensitivity: the ledger is accumulating history now. Missing movements
  must be backfilled; a balance can be derived later from complete entries. The
  first real comparison lands in December 2026, so the movements behind it
  should be recordable before then.

**Result: 8 transfers → 7 income → 6 balances.** No release blocker: slices
3–5 were merged and deployed on 2026-11-11.

## Scope decisions made

- **A transfer is one movement between two different accounts.** The user
  chooses the account the money leaves and the account it arrives in; the app
  refuses the same account on both sides.
- **A transfer has no category, tag, note, or payee.** It is not spending and
  has no reason attached.
- **The amount is positive and the date defaults to today**, changeable,
  including to an earlier month.
- **Transfers never appear in the home total or category breakdown**, in any
  month. The spending number is unchanged.
- **Transfers are listed in one place, newest first**, reached from the home
  screen, showing date, both accounts, and amount. No month navigation or
  filtering.
- **The user can correct or remove a transfer.** Correction updates the one
  movement and both sides; removal is confirmed and final. Neither changes
  spending.
- **Any two different accounts can be the two sides**, including a credit card.
  The app does not ask why the money moved.
- **A transfer needs two accounts.** With fewer than two, the screen says so
  and points to adding another account.
- **Backups include transfers; restore brings them back exactly.** Offline
  behavior is unchanged.
- **No new glossary terms.** "Transfer" is already in `CONTEXT.md`; the scope
  uses it as defined.
- **The home screen gains a way into transfers but its spending content is
  unchanged.** The exact route is the architecture gate's decision.

## Deliberately out of this slice

- Income (slice 7).
- Balances and opening balances (slice 6).
- Categories, tags, notes, payees, fees, exchange rates, multi-currency.
- Scheduled, recurring, or automatic transfers.
- Linking a transfer to a statement or marking a statement reconciled.
- Splitting a transfer.
- Converting an expense to a transfer or vice versa.
- Transfers in the category breakdown or category entries screen.
- Filtering or month navigation on the transfers list.
- Bank sync, budgets, sharing, laptop view (product-wide out of scope).

## Next gate

Slice 8 Architecture — read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-05-architecture.md`
3. `docs/architecture/slices/slice-01-architecture.md` (accounts, entries, and
   the write path)
4. `docs/product/slices/slice-08-scope.md`
5. `docs/architecture/slices/slice-02-architecture.md` (correction and removal
   semantics)
6. `docs/program-design/slices/slice-02-spec.md` (entry correction and removal
   behavior)

The architecture gate must decide the transfer write path, the transfers-list
read, the route, and how correction and removal reuse or extend the existing
entry paths. Keep the north-star transfer semantics: one movement with a source
and a destination, positive amount, −source/+destination, never spending. The
backup validator already accepts transfer entries; confirm whether the backup
version changes. The north-star says `fromAccountId` while the built entry type
uses `accountId` as the transfer source; slice 8 must keep that field or
migrate.

## Open items carried forward

- The remaining order is 8 → 7 → 6. Slice 6 stays in the backlog until income
  and transfers exist.
- Slices 3–5 are deployed as of 2026-11-11; no release blocker for slice 8.
- Slice 5's comparison cannot be validated against real data until December
  2026 at the earliest.
- Physical-phone checks remain unexercised.
- Single-tab assumption; no cross-tab coordination.
- North-star says `fromAccountId` while the built entry type uses `accountId` as
  the transfer source; slice 8 must keep that field or migrate.
