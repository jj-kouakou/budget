# Handoff — Slice 06 Scope

## Gate

Slice scoping (workflow step 3) for slice 6 — complete. The gate re-checked the
backlog order and found **no priority shift**: balances are still the right
next slice. No user approval was needed, so scoping proceeded in the same
session.

## Artifacts

- `docs/product/slices/slice-06-scope.md` — new, user-facing scope only.
- `docs/product/backlog.md` — slice 6 moved to `In progress — scope:
  docs/product/slices/slice-06-scope.md`; the order rationale records this
  gate.
- This handoff.

No `CONTEXT.md` change: **Balance** and **Opening balance** were already
defined, and this slice does not rename or broaden either.

## Priority check (wayfinder)

**Destination:** the user can use the app as their only ledger — log a purchase
in seconds, see this month's spending by category, trust the number, and keep
the ledger safe.

**Next slice on the backlog was 6 — Track account balances.** The check
confirmed it is still the smallest path to real user value.

Evidence:

- The built app records expenses, income, and transfers, but has no balance
  view and no opening-balance write path. `src/data/ledger.ts` contains no
  balance concept, and `docs/architecture/slices/slice-01-architecture.md`
  explicitly deferred opening balances to slice 6.
- The destination is "only ledger." Balances are the last user-visible gap the
  vision names as supporting context. With income and transfers recorded, a
  checking balance can include paychecks and a card balance can include
  payments; the dependency that made slice 6 premature is now satisfied.
- North-star settles the behavior: a balance is the sum of an account's
  movements, credit balances are negative by convention and displayed as owed,
  and an opening balance is one signed movement dated the account's creation.
- The v1 backup file already accepts opening balances (zero, positive, and
  negative), so this slice adds no stored-shape change or migration.
  `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` stay `1` unless the architecture
  gate finds otherwise.
- Slice 7 is built and reviewed but not merged, pushed, or deployed. That is a
  release precondition before slice 6 ships, not a reordering: the live app
  must hold income before a balance can include it.
- Slice 5's comparison still cannot be validated against real data until
  December 2026 at the earliest. That does not reorder anything.

**Result: 6 balances is still next.** No reordering, no new fog that changes
the route.

## Scope decisions made

- **Every account can have one optional opening balance.** It is set when the
  account is added or later for an existing account. No opening balance means
  the account starts at zero.
- **Checking and savings opening balances may be negative** when the account
  was overdrawn. **A credit card's opening balance is what it owed**; zero is
  valid, and a card that started in credit can be recorded without being
  treated as debt.
- **The opening balance is a starting point, not a monthly movement.** It does
  not appear in spending, income, or transfers, and month navigation does not
  change it.
- **An account with movements but no opening balance shows the movement total**
  and invites the user to set the starting point. The invitation does not block
  continued use.
- **The Accounts screen shows each account's name, type, and current balance.**
  The balance is current, not month-end.
- **Checking and savings show what the account holds**; a negative balance is
  shown with a minus and called overdrawn.
- **A credit card shows what is owed as a positive amount labelled owed.** A
  payment reduces it, an expense increases it, zero owed shows zero, and an
  overpaid card shows the amount in credit.
- **The balance includes the opening balance and every expense, income, and
  transfer recorded for the account**, and updates immediately when any of
  those is added, corrected, or removed.
- **The user never overwrites a balance total directly.** They correct the
  opening balance or the movement behind it.
- **No combined total across accounts.** Net-worth aggregation stays out.
- **No balance on the home screen.** The headline stays this month's spending.
- **No per-account movement list or drill-down.** Existing category, income,
  and transfer lists remain the way to see recorded movements.
- **No statement reconciliation, import, or marking reconciled.** The vision's
  reconciliation metric is a success measure, not this slice's feature.
- **Backups include opening balances; restore reproduces them exactly.**
  Older backups without opening balances still restore, with movement-only
  balances and the invitation to set starting points.
- **Accessibility:** a screen reader announces account name, type, and balance,
  including owed, in credit, and overdrawn.
- **The exact layout, copy, and controls are the architecture gate's
  decision.** The scope fixes behavior, not construction.

## Deliberately out of this slice

- Combined total or net worth across accounts.
- A balance on the home screen.
- Per-account movement list or drill-down from a balance.
- Direct editing of a balance total.
- Statement reconciliation, statement import, or marking a statement
  reconciled.
- Balance history, charts, trends, forecasts, or balance over time.
- Credit limit, available credit, utilization, due date, minimum payment,
  interest, fees, or APR.
- Automatic opening balance from a bank or statement.
- Account deletion, archiving, hiding, reordering, or changing account type.
- Multi-currency or exchange rates.
- Bank sync, budgets, sharing, laptop view (product-wide out of scope).

## AGENTS.md

**No change required.** Both new docs live in folders `AGENTS.md` already
lists: `docs/product/slices/` and `docs/agents/`. No ADR was added; the slice
uses the balance and opening-balance semantics already settled in the
north-star and `CONTEXT.md`.

## Next gate

Slice 6 Architecture — read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-07-architecture.md` (latest slice)
3. `docs/architecture/slices/slice-01-architecture.md` (accounts, movements,
   write path, deferred opening balance)
4. `docs/product/slices/slice-06-scope.md`
5. `docs/architecture/slices/slice-03-architecture.md` (backup shape)
6. `docs/program-design/slices/slice-07-spec.md` (latest list/add/edit pattern)
7. `docs/program-design/slices/slice-03-spec.md` (backup validation)
8. `CONTEXT.md`

The architecture gate must decide the balance read, the opening-balance write
path, the one-per-account invariant, validation (signed opening, zero allowed),
the display sign rules for credit and overdrawn, and whether the backup version
changes. It must also confirm that existing accounts without an opening balance
behave as scoped. Keep the north-star rule: a balance is always the sum of an
account's movements; no stored balance field.

## Open items carried forward

- Release slice 7: merge `slice-07` into `master`, push, deploy, and verify the
  live bundle before slice 6 ships.
- Slice 5's comparison cannot be validated against real data until December
  2026 at the earliest.
- Physical-phone install, real offline use, and real screen reader output
  remain unexercised.
- Single-tab assumption; no cross-tab coordination.
- No per-account movement list. If balance trust becomes a problem, that is a
  future slice, not a silent addition to this one.

## Repo state

Docs-only gate. No `src/` changes, no tests run, no build.
