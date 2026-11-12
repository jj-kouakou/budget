# Handoff — Slice 07 Architecture

## Gate

Slice 7 Architecture (workflow step 4) — complete. The gate extended the
existing architecture; it did not restart it.

## Artifacts

- `docs/architecture/slices/slice-07-architecture.md` — new.
- This handoff.

No `src/` changes, no tests run, no build. `AGENTS.md` needs no update: the new
doc lives in `docs/architecture/slices/`, already listed, and no ADR was added.

## Decisions

- **No storage change.** Income is one `entries` row with `kind: 'income'`, a
  positive `amountMinor`, `accountId`, and `categoryId`. `SCHEMA_VERSION` stays
  `1`; no new table, index, or migration.
- **No backup change.** `BACKUP_SCHEMA_VERSION` stays `1`. `parseEntry`
  already accepts income with a positive amount and an optional `categoryId`;
  restore already bulk-replaces entries.
- **No spending read change.** `monthSummary` and `categoryEntries` already
  filter `kind === 'expense'`. Income is excluded by the existing predicate.
- **Four new `Ledger` methods:** `listIncome()`, `addIncome()`,
  `updateIncome()`, `deleteIncome()`. No generic public entry API.
- **Validation is shared.** `requireExpenseFields` is renamed
  `requireCategorizedEntryFields`; the rules are identical for expense and
  income. `insertEntry` is reused. A private
  `entriesOfKindNewestFirst(kind)` is shared by the transfer and income lists.
- **The form is shared.** `app/expenseForm.tsx` becomes
  `app/categorizedEntryForm.tsx`; `ChoiceGroup` moves to
  `app/choiceGroup.tsx`. `ExpenseInput` becomes `CategorizedEntryInput`.
  Expense and transfer behaviour and copy do not change.
- **Routes:** `#/income` (list), `#/income/new` (add), `#/income/<id>`
  (editor). Home gains an Income action first in the bottom row.
- **Settings:** income paths never write `settings.lastAccountId`. The add
  form may read it to preselect an account. This preserves the expense form's
  documented default.
- **No new error codes.** Income reuses `invalid-amount`, `invalid-date`,
  `unknown-account`, `unknown-category`, `archived-category`,
  `unknown-entry`, and `unsupported-entry-kind`.
- **No income total anywhere.** The list is a list; home stays the spending
  headline.

## Durable-question check

No new decision is expensive to change after income data exists. The durable
semantics — income is an entry kind, positive magnitude, `+` effect, one
shared category, never spending — were already settled in the north-star. The
remaining choices (settings convenience, form/input names, route shapes) are
internal or device-local. **No stop was required.**

## Wayfinder check

The destination is unchanged: the user can use the app as their only ledger.
The 2026-11-12 scope gate confirmed the remaining route as **7 income → 6
balances**; this architecture does not move it. No new fog, no new ticket.

## Domain-model check

`CONTEXT.md` already defines **Income**, and **Active category** / **Archived
category** already cover expenses and income. No new term, no ADR.

## Next gate

Slice 7 Program Design. Read:

1. `docs/architecture/slices/slice-07-architecture.md`
2. `docs/architecture/north-star.md`
3. `docs/architecture/slices/slice-08-architecture.md` (the list/add/edit
   pattern this slice mirrors)
4. `docs/program-design/slices/slice-02-spec.md` (correction and removal)
5. `docs/program-design/slices/slice-08-spec.md` (list/add/edit pattern)
6. `CONTEXT.md`

Produce `docs/program-design/slices/slice-07-spec.md`. It must settle the exact
screen copy, form state transitions, field-error wiring, and the test plan. It
must not reopen the storage, backup, spending, or settings decisions above.

## Open items carried forward

- Slice 5's comparison cannot be validated against real data until December
  2026 at the earliest.
- Physical-phone checks remain unexercised.
- Single-tab assumption; no cross-tab coordination.
- The income list must not become a second headline. If the program design
  wants income context on home, that needs an explicit decision; the scope
  keeps income on its own list only.
- The add-income form preselects the last expense account because income never
  writes `lastAccountId`. This is documented as a convenience tradeoff, not a
  rule.
