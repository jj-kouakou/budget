# Handoff — Slice 04 Architecture

## Gate
Slice Architecture (workflow step 4) for slice 4 — complete.

## Artifacts
- `docs/architecture/slices/slice-04-architecture.md` — new.
- `CONTEXT.md` — `Active category` and `Archived category` added; "deleted
  category" recorded as avoided language.

## Decisions recorded
- **No endpoints, no new table, no new index, no Dexie version bump.**
  `SCHEMA_VERSION` stays `1`; `BACKUP_SCHEMA_VERSION` stays `1`. `Category`
  keeps `{ id, name, archived }`.
- **Three `Ledger` mutations:** `addCategory(name)`,
  `renameCategory(id, name)`, `setCategoryArchived(id, archived)`.
- **Name rules live in the ledger write path:** trim, 1–60 characters, unique
  under `trim().toLowerCase()` across active and archived categories.
  Duplicate raises `duplicate-category-name` and carries
  `existingCategoryName`.
- **`listCategories` returns all categories, active first then archived,
  alphabetical within each group.** The UI filters per surface and does not
  re-sort.
- **Archive-aware writes:** `addExpense` refuses any archived category
  (`archived-category`); `updateExpense` allows only the entry's own archived
  category and refuses any other.
- **New route `#/categories`**, reached from home and from the add-expense
  empty state. The screen mirrors Accounts' inline add/rename pattern and
  adds archive/unarchive. No delete.
- **Add expense with no active categories** renders a pointer state to
  Categories with no form, so no half-finished entry can be saved.
- **Correction options** are active categories plus the entry's current
  category even when archived; no other archived category is offered.
- **Rename and archive touch no entries.** Home breakdown and category
  entries join the category row at read time, so past months show new names
  and archived categories keep their rows and totals.
- **Backup and restore unchanged.** v1 already carries `archived`; restore
  replaces the category table and does not enforce uniqueness on a
  hand-edited file.
- **Starter seed unchanged.** Archiving the last active category is allowed.

## Flag raised
**None.** No north-star decision is reopened and no durable contract is
introduced. The one constraint that would be expensive to add later — name
uniqueness across archived categories — is already settled by
`docs/product/slices/slice-04-scope.md`; this gate implements it. No ADR is
warranted.

## Next gate
Slice Program Design (`to-spec`), then ticket breakdown. Read, in order:

1. `docs/architecture/north-star.md`
2. `docs/architecture/slices/slice-04-architecture.md`
3. `docs/product/slices/slice-04-scope.md`
4. `CONTEXT.md`

## Suggested skills
- `to-spec` for the program design doc.
- `prototype` only if the Categories screen's inline edit/archive states need
  a sanity check.
- `codebase-design` for the `Ledger` additions; `domain-modeling` only if a
  term shifts.

## Repo state
- Docs-only gate. No `src/` changes, no tests run, no build.
- Slice 3 is complete on branch `slice-03` but not merged or deployed. Slice 4
  must branch from `master` after that merge.

## Open items
- The slice spec must decide exact screen layout and copy; architecture fixes
  only the states, seams, and destinations.
- Build must intentionally update four tests that pin the old permissive
  behavior: ledger "accepts an archived category" → rejects; ledger
  "lists categories by name then id, including archived rows" → active-first;
  ledger "resolves an archived category name" → file the entry before
  archiving; AddExpenseScreen "keeps an archived category selectable" → does
  not offer it.
- Do not add category deletion, subcategories, reordering, colours/icons,
  merging, bulk re-filing, per-category budgets, defaults/suggestions, or
  inline category management on the add-expense screen.
