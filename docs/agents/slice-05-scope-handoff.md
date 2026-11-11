# Handoff — Slice 05 Scope

## Gate

Slice scoping (workflow step 3) for slice 5 — complete.

## Artifacts

- `docs/product/slices/slice-05-scope.md` — new, user-facing scope only.
- `docs/product/backlog.md` — slice 5 moved to `In progress`; the order
  rationale records the post-slice-4 priority re-check.

## Priority check (wayfinder)

**Destination:** the user can use the app as their only ledger — log in
seconds, see this month by category, trust the number, and keep the ledger
safe.

**Next slice on the backlog:** 5 — Compare with last month.

**Confirmed as still the smallest path to real user value. No priority shift,
so no wait was needed.** Evidence:

- Slice 4 closed on 2026-11-10 and its close-out re-checked the order. No new
  information has landed since; this scope gate ran the same day.
- Slice 5 is the second half of the vision's headline. Slices 6–8 are
  supporting context by the vision's own wording and are never the headline.
- The comparison is buildable and testable now with prior-month entries in the
  test ledger. Real-data validation waits for the first complete prior month —
  December 2026 at the earliest, because the app went live on 2026-11-02.
  Deferring the slice would leave the headline incomplete when that month
  arrives.
- The release precondition is unchanged and is not a reordering: slices 3 and
  4 are built on branches but not merged or deployed; the deployed site is
  still slice 2. Slice 5 must branch from `master` after those merges.

## Scope decisions made

- **The comparison is the month on screen against the month immediately
  before it.** It follows month navigation, including across a year boundary.
  It is not the previous month with data.
- **A category appears when it has spending in either month.** This
  deliberately extends slice 4's "only categories with spending" rule to the
  comparison: a category that dropped to zero must remain visible.
- **Ordering is by the month on screen, largest first; month-before-only rows
  follow, largest in the month before first.**
- **The headline total stays the month on screen's total.** Last month's
  amounts are per-category comparison only; there is no overall last-month
  total.
- **The comparison is labelled with actual month names**, not "this
  month"/"last month," because the user can move between months.
- **Renames apply to both columns; archived categories with spending stay in
  the comparison.** These carry slice 4's semantics forward.
- **When the month before is empty, the screen says so plainly** instead of
  showing a zero column. When the month on screen is empty but the prior month
  is not, the prior month's rows show with zero for the month on screen. When
  both are empty, the usual empty state stays.
- **Tapping a category still opens the month on screen's entries.**
  Last-month-only rows have no entries to open there; the user moves to that
  month. There is no second navigation path.
- **Backups and offline behavior are unchanged**; the comparison reproduces
  from the entries.
- **No new glossary terms.** "The month before" is ordinary language, not a
  domain concept; `CONTEXT.md` is unchanged.

## Deliberately out of this slice

- Percentage change, arrows, trend lines, or a difference column.
- An overall last-month total beside the headline.
- Charts, graphs, or sparklines.
- A different comparison month (same month last year, arbitrary month).
- Opening last month's entries directly from the comparison.
- Comparison on the category entries screen or any other screen.
- Any change to spending rules or category rules.
- Bank sync, budgets, multi-currency, sharing, laptop view (product-wide out
  of scope).

## Next gate

Slice 5 Architecture — read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-04-architecture.md`
3. `docs/product/slices/slice-05-scope.md`
4. `docs/architecture/slices/slice-01-architecture.md` (home-screen month read
   model)
5. `docs/program-design/slices/slice-01-spec.md` (home-screen behavior and
   copy)

The architecture gate must decide how the home screen reads two months without
changing the stored shape; the scope adds no new user data. Keep the slice-4
carry-forwards: rename and archive semantics.

## Open items carried forward

- Slices 3 and 4 are not merged or deployed; the deployed site is slice 2.
  Merge and deploy them before shipping slice 5.
- Physical-phone checks from prior slices remain unexercised.
- Single-tab assumption; no cross-tab coordination.
- North-star says `fromAccountId` while the built entry type uses `accountId`
  as the transfer source; slice 8 must keep that field or migrate.
