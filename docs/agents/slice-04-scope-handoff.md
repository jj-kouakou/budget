# Handoff — Slice 04 Scope

## Gate

Slice scoping (workflow step 3) for slice 4 — complete.

## Artifacts

- `docs/product/slices/slice-04-scope.md` — new, user-facing scope only.
- `docs/product/backlog.md` — slice 4 moved to `In progress`; the order
  rationale records the post-slice-3 priority re-check.

## Priority check (wayfinder)

**Destination:** the user can use the app as their only ledger — log in
seconds, see this month by category, trust the number, and keep the ledger
safe.

**Next slice on the backlog:** 4 — Manage categories.

**Confirmed as still the smallest path to real user value. No priority shift,
so no wait was needed.** Evidence:

- Slice 3 closed on 2026-11-10 and its close-out re-checked the order. No new
  information has landed since; this scope gate ran the same day.
- Slice 5 (last-month comparison) is still premature. The app was first
  deployed on 2026-11-02, so there is no complete prior month to compare; the
  comparison becomes meaningful in December at the earliest.
- Slice 3's backup is ledger-only and changed no stored shape
  (`SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` both stay `1`), so category
  management needs no backup migration.
- The nine-category starter list is fixed. Shaping it is the last cheap step
  before a second month accumulates under names the user never chose.
- Slices 6–8 are supporting context by the vision's own wording and are never
  the headline.

**Release precondition, not a reordering:** slice 3 is built on `slice-03` but
not merged or deployed. Slice 4 must branch from `master` after that merge.

## Scope decisions made

- **One Categories screen, reached from home**, listing active categories
  first and archived ones below, each group alphabetical.
- **Add:** name required, trimmed, at most 60 characters (same limit as
  account names). A new category is offered immediately and adds no zero row
  to the home breakdown.
- **Rename:** changes the label everywhere, including past months, because
  entries keep their category. Amounts and totals do not move.
- **Duplicate names are refused**, ignoring capitalisation and surrounding
  spaces, across active and archived categories, with a message naming the
  existing category.
- **Archive:** retires a category from the choices for new expenses. History
  stays visible: the month breakdown still shows the row, entries still list,
  and correcting an entry keeps its archived category selected.
- **Unarchive:** returns the category to the choices with history intact.
- **Every category archived:** adding an expense cannot be completed; the app
  points the user to Categories. No half-saved entry.
- **Backups carry categories** as they were when the file was made; restoring
  an older file restores the older list, never a merge.
- **Categories are never deleted**, including unused ones. Archive is the only
  retirement; a mistaken category can be renamed or archived.

## Deliberately out of this slice

- Deleting categories; subcategories, nesting, or groups; reordering.
- Colours, icons, emoji.
- Merging categories; bulk re-filing.
- Per-category budgets, limits, or targets.
- Default category, suggestions, automatic filing.
- Adding or renaming inline on the add-expense screen.
- Any change to how spending is counted.
- Bank sync, budgets, multi-currency, sharing, laptop view (product-wide out
  of scope).

## Next gate

Slice 4 Architecture — read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-03-architecture.md`
3. `docs/product/slices/slice-04-scope.md`
4. `CONTEXT.md`

## Open questions for architecture

- How the Categories screen is reached and how it relates to the existing
  accounts screen pattern; whether it is a new route.
- Where the duplicate-name rule lives, how names are normalised for
  comparison, and which error code it raises.
- Whether `listCategories` filters or flags archived categories, and how the
  add-expense choices, correction choices, home breakdown, and category
  entries screen each treat them.
- The empty-choices state on the add-expense screen and how it points at
  Categories without breaking the ten-second budget.
- Whether the starter seed list changes, and whether archiving the last active
  category is allowed by the write path or blocked there.
- Confirm no schema change is needed: `Category.archived` already exists and
  backup v1 already carries it.
- Whether `CONTEXT.md` gains "Active category" and "Archived category"; the
  scope doc defines both in plain language.
- Test surface: archive-all, duplicate names across archive state, rename
  propagation into past months, archived category retained during correction,
  backup round-trip after category changes.
