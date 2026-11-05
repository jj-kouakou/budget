# Handoff — Slice 02 Scope

## Gate
Slice scoping (workflow step 3) for slice 2 — complete.

## Artifacts
- `docs/product/slices/slice-02-scope.md` — new, user-facing scope only.
- `docs/product/backlog.md` — slice 2 moved to `In progress`; order rationale
  records the post-slice-1 priority re-check.

The request named `slice-01-scope.md` as the output path. Slice 1 is already
`Done` and has its own scope doc, so the next slice's scope was written to
`slice-02-scope.md` rather than overwriting the completed record.

## Priority check (wayfinder)

**Next slice on the backlog:** 2 — Inspect and correct entries.

**Confirmed as still the smallest path to real user value.** Evidence:

- The backlog destination includes "trust the number". Slice 1 shipped the
  number but no way to audit or correct it: the home screen shows category
  totals with no entries behind them, and the add path has no edit or delete.
  The vision's ultimate workflow step 4 — "tap a category to see the entries
  behind it" — is therefore half-built.
- The primary success metric is 90% of real transactions logged within a day.
  Manual entry on a phone guarantees typos, and a typo is permanent today. A
  user who cannot correct a wrong amount stops trusting the headline and stops
  logging — the failure mode the vision names explicitly.
- Slice 1's close-out carries no open item that changes this: the carried
  items are a `CONTEXT.md` vocabulary drift, transfer field naming, no error
  boundary, single-tab assumption, and no schema migration. None is
  user-value-bearing next.
- Backup (slice 3) was considered as a swap. Loss risk grows with accrued
  history, while wrongness is on screen from the first typo; persistent-storage
  is already requested at boot. Correction stays ahead. No priority shift, so
  no wait was needed.

## Scope decisions made

- **Entry list is per category per month**, newest first, showing amount, date,
  and account. It is reached from the home screen's category rows, matching
  the vision's headline loop.
- **Edit covers the same four fields as add** — amount, category, account,
  date — so any mistake in the original entry is correctable, including a
  misfiled category and a wrong month.
- **A date change across months moves the entry and shows the target month**,
  mirroring the after-save behaviour slice 1 already has for backdated adds.
- **Save lands in the list that now holds the entry** — its category in its
  month — so a re-filed or re-dated entry appears in its new place. **Remove
  returns to the list the user came from**, or to that month's home screen when
  the category is now empty there.
- **Removal is confirmed and final.** No undo, no edit history. The
  confirmation names amount, date, and account.
- **No all-entries feed, no search, no bulk actions.** The category drill-down
  is the only way in; the tightest slice that makes the number auditable.
- Home behaviour is unchanged: all accounts count, largest first, month
  navigation stays.

## Deliberately out of this slice

- All-entries feed, undo/history, bulk edit or delete, in-category search.
- Last-month comparison (slice 5), custom categories (slice 4), backup
  (slice 3).
- Balances, opening balances, income, transfers (slices 6–8).
- Bank sync, budgets, multi-currency, sharing, laptop view.

## Next gate
Slice 2 Architecture — read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-01-architecture.md`
3. `docs/product/slices/slice-02-scope.md`

## Open questions for architecture

- How an opened entry is addressed so that back and save return to the month
  and category list the user came from.
- Whether the category drill-down needs a new index or filters the existing
  month read; the north star defers indexes to slice needs.
- Whether removal deletes the row or records something else. The north star
  leaves edit/delete semantics and audit history open.
- How edit reuses the single entry write path instead of adding a second one,
  and how validation is shared with add.
- Whether the current ledger seam needs a read model for "entries in a
  category for a month" or whether the month summary can expose it.
- Whether `CONTEXT.md`'s `Entry` definition (three kinds) is corrected in this
  gate, since editing touches the same vocabulary.
