# Handoff — Slice 07 Scope

## Gate

Slice scoping (workflow step 3) for slice 7 — complete. The gate re-checked the
backlog order and found **no priority shift**: income is still the right next
slice. No user approval was needed, so scoping proceeded in the same session.

## Artifacts

- `docs/product/slices/slice-07-scope.md` — new, user-facing scope only.
- `docs/product/backlog.md` — slice 7 moved to `In progress — scoped
  2026-11-12`; the order rationale records this gate.
- `CONTEXT.md` — **Active category** and **Archived category** now say they
  apply to expenses and income. No new term was added; **Income** was already
  defined.
- This handoff.

## Priority check (wayfinder)

**Destination:** the user can use the app as their only ledger — log a purchase
in seconds, see this month's spending by category, trust the number, and keep
the ledger safe.

**Next slice on the backlog was 7 — Record income.** The check confirmed it is
still the smallest path to real user value.

Evidence:

- The built app records expenses and transfers; it has no way to record money
  arriving from outside the user's own accounts. `addIncome` does not exist,
  and no screen creates an income.
- The destination is "only ledger." A ledger that cannot hold a paycheck is
  incomplete in the direction the vision calls income. The primary success
  metric counts real transactions logged; income is one of them.
- North-star already defines `income` as an entry kind with a positive amount,
  an account, and a category. The backup validator already accepts income
  entries, and categories are already flat and user-managed. The slice
  therefore needs no stored-shape change: `SCHEMA_VERSION` and
  `BACKUP_SCHEMA_VERSION` stay `1` unless the architecture gate finds
  otherwise.
- Income remains a prerequisite for truthful balances. Transfers completed the
  outflow side; with expenses and transfers alone, a checking balance still
  omits paychecks. Slice 6 stays last.
- Slice 5's comparison still cannot be validated against real data until
  December 2026 at the earliest. That does not reorder anything; income can be
  built and checked now.
- Slice 8 is merged, pushed, and deployed. No release blocker.

**Result: 7 income → 6 balances.** No reordering, no new fog that changes the
route.

## Scope decisions made

- **Income is money entering an account from outside the user's own accounts.**
  Money moving between the user's own accounts stays a transfer and is never
  recorded as income.
- **Income has an amount, a category, an account, and a date.** The date
  defaults to today and can be changed, including to an earlier month.
- **The amount is positive.** The app refuses zero or less.
- **A category is required, and the category list is shared with spending.**
  The user can add a category such as Salary in Categories; there is no second
  income-category list. Archived categories are not offered for new income,
  but income already labelled with one keeps its label and can be corrected.
- **Income is listed in one place, newest first**, reached from the home
  screen, showing date, category, account, and amount. No month navigation or
  filtering.
- **Income never appears in spending.** It is absent from the home total,
  category breakdown, last-month comparison, and the category entries screen,
  in every month. A category total remains expenses only even when income
  shares the category.
- **The user can correct or remove income.** Correction updates the one income
  and the list; removal is confirmed naming amount, date, category, and
  account, and is final. Neither changes spending.
- **No income total on the home screen.** Income is supporting context; the
  headline stays this month's spending.
- **Backups include income; restore brings it back exactly.** Offline behavior
  is unchanged.
- **No new glossary term.** The two category definitions were broadened to
  cover income.
- **The exact route, screen layout, and copy are the architecture gate's
  decision.** The scope fixes behavior, not construction.

## Deliberately out of this slice

- Balances and opening balances (slice 6).
- An income total on the home screen.
- Separate income categories or a second category list.
- Payee, employer, source, note, tax, gross/net, withholding.
- Recurring paychecks, templates, reminders, auto-posting.
- Refund-specific flow, negative amounts, or converting between expense and
  income.
- Splitting income across accounts or categories.
- Filtering or month navigation on the income list.
- Charts, trends, forecasts, budgets, over-budget states.
- Bank sync, multi-currency, sharing, laptop view (product-wide out of scope).

## AGENTS.md

**No change required.** Both new docs live in folders `AGENTS.md` already
lists: `docs/product/slices/` and `docs/agents/`. No ADR was added; the slice
uses the income semantics already settled in the north-star and `CONTEXT.md`.

## Next gate

Slice 7 Architecture — read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-08-architecture.md` (latest slice)
3. `docs/architecture/slices/slice-01-architecture.md` (accounts, entries,
   write path)
4. `docs/product/slices/slice-07-scope.md`
5. `docs/architecture/slices/slice-02-architecture.md` (correction and removal)
6. `docs/program-design/slices/slice-02-spec.md` (entry correction and removal
   behavior)
7. `docs/program-design/slices/slice-08-spec.md` (list/add/edit pattern)
8. `CONTEXT.md`

The architecture gate must decide the income write path, the income-list read,
the route, and how correction and removal reuse or extend the existing entry
paths. Keep the north-star income semantics: positive amount, positive effect
on the account, category required, never spending. The backup validator already
accepts income entries; confirm whether the backup version changes. Decide
whether `addIncome` shares `insertEntry` and whether `requireExpenseFields`
generalizes or income gets its own validation helper.

## Open items carried forward

- The remaining order is 7 income → 6 balances. Slice 6 stays in the backlog
  until income exists.
- Slice 5's comparison cannot be validated against real data until December
  2026 at the earliest.
- Physical-phone checks remain unexercised.
- Single-tab assumption; no cross-tab coordination.
- The income list must not become a second headline. If the architecture gate
  wants to show income context on the home screen, it needs an explicit
  decision; the scope currently keeps income on its own list only.

## Repo state

Docs-only gate. No `src/` changes, no tests run, no build.
