# Slice 04 Tickets — Manage categories

- **Gate:** Ticket Breakdown (workflow step 6)
- **Sources:** `docs/architecture/slices/slice-04-architecture.md` (cited as
  "Architecture §…"), `docs/product/slices/slice-04-scope.md` (cited as
  "Scope §…"), `docs/agents/slice-04-architecture-handoff.md`,
  `CONTEXT.md`, `docs/standards.md`. **There is no slice-04 spec** — see
  boundary decision 1.
- **Branch:** `slice-04`, cut from `master` after `slice-03` merges.
- **Status:** proposed. No code written; no ticket built.

Each ticket is one build session, test-first, and one commit when its tests
pass. Tickets 1–2 add no UI; they ship green and are verified at the `Ledger`
seam, as slices 2 and 3 did for their read and write tickets.

---

## Source note — the spec this gate was asked to read does not exist

`docs/program-design/slices/slice-04-spec.md` is absent. The repository has
`slice-04-scope.md` and `slice-04-architecture.md` (both uncommitted), and
`git log` shows no program-design commit for slice 4. Gate 5 was skipped or
never closed.

Every ticket below therefore cites architecture headings and scope acceptance
bullets instead of spec sections. That is workable here because the
architecture doc is unusually contract-complete: it fixes the `Ledger`
interface, error codes and their fields, every write path step by step, the
`listCategories` ordering, the route, the screen states, the per-surface
filters, the invariants, and the test list.

What it does **not** fix — and what the architecture handoff says the spec
must decide — is exact screen layout and user-facing copy. The strings in
these tickets are proposed from the architecture's examples and are collected
in boundary decision 5. Confirm them before ticket 3, either here or with
`grill-me` in that session.

---

## Ticket order at a glance

| # | Ticket | Blocked by |
|---|---|---|
| 1 | Category writes: add, rename, archive, list order | — |
| 2 | Archive-aware expense writes | 1 |
| 3 | Categories route, screen, home action, and add | 1 |
| 4 | Rename and archive/unarchive on the Categories screen | 1, 3 |
| 5 | Add expense: active-only choices and the no-active state | 1, 2, 3 |
| 6 | Correction keeps the entry's archived category | 2, 5 |

**Frontier:** ticket 1 starts alone. After it, 2 and 3 run in parallel. After
3, 4 runs; after 2 and 3, 5 runs. 4 and 5 are parallel. 6 is the tail.

**Critical path:** 1 → 3 → 5 → 6.

**Why this order:** the three category mutations share one name/uniqueness
helper and one ordering contract, so they are one ticket rather than three
that each re-touch the same private helpers. The archive-aware write rule is
the fourth ledger rule and depends only on the new error code, so it follows
1 and runs beside the first UI ticket. The screen depends on the mutations
and the ordering; the two archive-aware read surfaces depend on the write rule
and the route they link to.

There is no spec order to deviate from. Within the architecture's own order
(writes → screens → filters), this breakdown moves the archive-aware write
ahead of the first screen, because it is a pure ledger rule and unblocks the
add-screen filter earlier.

---

## Standing rules for every ticket

- Failing test first, then the minimum implementation, same session. A ticket
  that changes a runnable surface is not done on tests alone — run it.
- Assert `LedgerError.code` and `existingCategoryName`, never message text.
  Assert user-facing copy at the UI seam.
- Known-good literals; never recompute the expected value the way the
  implementation does.
- Real `BudgetDatabase` per ledger test (`budget-test-${crypto.randomUUID()}`),
  deleted in `afterEach`; `fake-indexeddb` is the only boundary.
- UI tests use RTL against the real ledger on `fake-indexeddb`; `waitFor` for
  live-query updates; no sleeps, no fake timers.
- No new dependency, no schema change, no new test seam, no mocked ledger.
- Module direction holds: no UI import of `data/db` or `dexie`; no domain
  import of `data/` or `app/`.
- `listCategories` is the only category list. The UI filters and groups; it
  never re-sorts.
- If the build contradicts the architecture, fix the architecture in the same
  commit. Do not diverge silently.

---

## Boundary decisions

Challenge these before building. 1 and 5 need your decision; the rest are
calls I made and will defend.

1. **The slice spec is missing.** I did not author one: gate 5 is a Kimi K3
   judgment gate and its output is not mine to fabricate on the ticket model.
   The tickets are cut from scope + architecture. Build from them
   (recommended — nothing in the architecture's contract is ambiguous enough
   to need a spec), or run gate 5 first and re-cut tickets 3–6 against it.
   The only real loss is copy and layout detail; both are isolated to tickets
   3–6 and none of them changes a seam or a test's control surface.

2. **`listCategories` comparator: `localeCompare` or code-unit?** The
   architecture snippet uses `localeCompare`; the slice-03 tickets mandated
   code-unit comparison for backup determinism. Picked: `localeCompare`,
   because this order is display-only and never serialized, and it matches
   `listAccounts` and `monthSummary`. If you want locale-independent order,
   switch to code-unit; the tests use ASCII names that both comparators order
   identically, so only one tie-break test would need a deliberate pair.

3. **The Categories screen is two tickets (3, 4), not one.** Ticket 3 ships
   route + list + add; ticket 4 adds rename + archive/unarchive. One session
   for all five behaviors plus tests is the compaction risk. If 3 runs short,
   merge 4; if 3 runs long, move the add form into 4 and let 3 ship a
   read-only list.

4. **Tickets 5 and 6 are separate but share `expenseFieldErrors`.** The
   `archived-category` mapping lands in 5; 6 consumes it. 6 is the thinnest
   ticket in the slice (a filter, a label, and the initial-state rule). If it
   feels too thin to review, merge 5 and 6 into one "archive-aware expense UI"
   session; the DAG then has five tickets and no other change.

5. **Copy is proposed, not specified.** The architecture fixes three
   strings verbatim (`invalid-name`, `archived-category`, the duplicate-name
   sentence shape). The rest are mine. All of it is listed per ticket; if you
   change a string, change its test and nothing else. The one worth a look is
   the add-screen empty state, which the scope describes but does not quote.

6. **Marking the archived current option in correction.** `ExpenseFields`
   takes `categories: Category[]` and labels options with `category.name`.
   Suffixing the name in a derived array would smuggle display state into
   domain data. Picked: an optional `archivedCategoryId` prop on
   `ExpenseFields`, rendering `${name} (archived)`. The alternative is changing
   the prop to `categoryOptions: { id; label }[]` across both screens — cleaner
   long-term, larger diff now, and it would fold ticket 6 into 5.

7. **Archiving is reachable one ticket before the add screen stops offering
   archived categories.** Ticket 4 ships the archive control; ticket 5 filters
   the add choices. Nothing is released between them (one branch, one review),
   but build 4 and 5 back-to-back and do not manual-test archiving in between.
   If you want no window at all, merge 4 and 5.

8. **No backup ticket and no glossary ticket.** Architecture says backup and
   restore need no code change, and `CONTEXT.md` already carries *Active
   category* and *Archived category* from the architecture gate. Ticket 1
   carries the backup round-trip as an acceptance check instead of a ticket.
   A one-test ticket for it would be padding.

9. **Branch prerequisite, not a ticket.** `slice-03` is complete but not
   merged; slice 4 must branch from `master` after that merge. Starting ticket
   1 on a branch cut from `slice-03` would drag unrelated commits into review.

---

## Tests that must change, and where

The architecture handoff names four tests that pin the old permissive
behavior. Each is updated in the ticket that changes the behavior, never
deleted to make a suite green.

| Existing test | File | Ticket | Becomes |
|---|---|---|---|
| "accepts an archived category" | `src/data/ledger.test.ts` | 2 | rejects with `archived-category` |
| "resolves an archived category name" | `src/data/ledger.test.ts` | 2 | file the expense before archiving, then assert the read |
| "lists categories by name then id, including archived rows" | `src/data/ledger.test.ts` | 1 | active first, then archived, alphabetical within each group |
| "keeps an archived category selectable" | `src/app/screens/AddExpenseScreen.test.tsx` | 5 | does not offer an archived category |

---

## 1. Category writes: add, rename, archive, list order

**Goal:** the ledger can add, rename, archive, and unarchive categories under
the name rules, refuse duplicates across active and archived categories, and
return the one list order every screen will use.

**Blocked by:** none.

**Architecture:** §What this slice adds, §Module seams → Interfaces, §Write
paths (all three), §Invariants (name and ordering bullets), §Testing → ledger
integration tests.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- `LedgerErrorCode` gains `'duplicate-category-name'` and
  `'archived-category'`. `'archived-category'` is unused until ticket 2; it is
  declared here with the rest of the category vocabulary.
- `LedgerError` constructor gains a third optional parameter
  `readonly existingCategoryName?: string`. Existing two-argument call sites
  are untouched.
- `Ledger` gains:

  ```ts
  addCategory(name: string): Promise<Category>;
  renameCategory(id: string, name: string): Promise<void>;
  setCategoryArchived(id: string, archived: boolean): Promise<void>;
  ```

- Private helpers beside `requireAccountName`:
  `MAX_CATEGORY_NAME_LENGTH = 60`, `requireCategoryName` (trim; empty or >60 →
  `invalid-name`), `categoryNameKey` (`trim().toLowerCase()`),
  `requireUniqueCategoryName(name, exceptId?)` (scan `categories.toArray()`,
  skip `exceptId`, throw `duplicate-category-name` carrying the **stored**
  name of the conflicting row).
- `addCategory`: one `rw` transaction over `categories`; validate, check
  uniqueness, insert `{ id: crypto.randomUUID(), name, archived: false }`,
  return the row.
- `renameCategory`: one `rw` transaction; missing row → `unknown-category`;
  validate; check uniqueness excluding self; `update(id, { name })`; return
  `void`. No entry is touched.
- `setCategoryArchived`: one `rw` transaction; missing row →
  `unknown-category`; same value → return without writing; otherwise
  `update(id, { archived })`.
- `listCategories`: sort by `Number(archived)`, then name, then id (boundary
  decision 2).

**Tests**

- `addCategory('  Coffee  ')` stores `Coffee` with `archived: false`, returns
  the row with a fresh id, and the row appears in `listCategories`.
- `'   '`, `''`, and 61 characters throw `invalid-name`; 60 characters is
  accepted.
- `addCategory(' groceries ')` → `duplicate-category-name` with
  `existingCategoryName: 'Groceries'`. Archive `cat_groceries` first and the
  same call still refuses — the rule spans archived categories.
- `renameCategory('cat_groceries', '  Food  ')` stores `Food`.
- `renameCategory('cat_groceries', 'GROCERIES')` succeeds (self excluded).
- `renameCategory('cat_groceries', 'Transport')` →
  `duplicate-category-name` with `existingCategoryName: 'Transport'`.
- `renameCategory('cat_missing', 'Food')` → `unknown-category`.
- Rename propagation: file an expense under `cat_groceries` in `2026-10`,
  rename to `Food`, then `monthSummary('2026-10')` shows the `Food` row and
  the same `totalMinor`; `categoryEntries('2026-10', 'cat_groceries')` returns
  `categoryName: 'Food'` and the same total.
- `setCategoryArchived` archives, unarchives, is idempotent (second identical
  call writes nothing observable), throws `unknown-category` for a missing id,
  and can archive all nine seed categories.
- `listCategories` returns active before archived, alphabetical within each
  group, id as tie-break. Update the existing ordering test per the table
  above; keep its full expected id list.
- Round-trip: read a snapshot with `readBackupData()`; then add `Coffee`,
  rename `cat_groceries` to `Dining`, and archive `cat_fun`; read again and
  restore the newer snapshot into a second, initialized database opened with
  `openDatabase()`; the categories match by id, name, and `archived`. Restore
  the older snapshot instead and assert `Coffee` is gone and the seed names
  and archive states are back.

**Acceptance criteria**

- [ ] `npm test` and `npm run typecheck` pass.
- [ ] `src/data/db.ts` is untouched; `SCHEMA_VERSION` is still `1`; no table
      or index was added.
- [ ] No UI file changed.
- [ ] `Ledger` has no delete-category method and no tombstone field.

---

## 2. Archive-aware expense writes

**Goal:** new spending cannot be filed under an archived category, and
correcting an entry keeps its own archived category valid while refusing any
other archived category.

**Blocked by:** 1 (`archived-category` code, `LedgerError` shape).

**Architecture:** §Write paths → `requireExpenseFields` — archive-aware,
§Invariants (the add/update bullet), §Testing → ledger integration tests.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- `requireExpenseFields(input, options?: { allowArchivedCategoryId?: string })`.
  After the existing account check: missing category → `unknown-category`
  (unchanged); `category.archived && category.id !== options?.allowArchivedCategoryId`
  → `archived-category`.
- `addExpense` calls it with no options.
- `updateExpense` passes `{ allowArchivedCategoryId: existing.categoryId }`
  after the existing entry lookup.
- No second validation path; no UI change.

**Tests**

- `addExpense` with an archived category → `archived-category`, and
  `db.entries.count()` is unchanged.
- `updateExpense` on an entry already filed under an archived category
  succeeds when the category is unchanged, including when the amount, account,
  or date changes.
- `updateExpense` moving that entry to a *different* archived category →
  `archived-category`, and the stored entry is unchanged.
- A missing category still throws `unknown-category`, not
  `archived-category`.
- Update the two existing tests per the table above.

**Acceptance criteria**

- [ ] Every other slice-1/2/3 ledger test passes with no edits.
- [ ] No UI file changed; `BackupData` and restore paths untouched.
- [ ] The rule is enforced at the `Ledger` seam, not only in a screen.

---

## 3. Categories route, screen, home action, and add

**Goal:** from home, the user opens `#/categories`, sees every category with
active ones first and archived ones marked below, and adds a new one that is
offered immediately when logging an expense.

**Blocked by:** 1 (mutations, ordering, error fields).

**Architecture:** §Read paths and screens → route table, §Categories screen
(list, add, error mapping), §Home, §Module seams → UI.

**Files:** `src/app/router.ts`, `src/app/router.test.ts`, `src/app/App.tsx`,
`src/app/App.test.tsx`, `src/app/screens/HomeScreen.tsx`,
`src/app/screens/HomeScreen.test.tsx`, `src/app/screens/CategoriesScreen.tsx`
(new), `src/app/screens/CategoriesScreen.test.tsx` (new), `src/styles.css`.

**Build**

- `Route` gains `{ name: 'categories' }`; `parseHash` maps `/categories` to it
  and `routeToHash` returns `#/categories`. The exact path does not collide
  with `/category`.
- `App` gains the `categories` case. The zero-account gate is unchanged, so a
  cold `#/categories` on an accountless ledger still lands on Accounts.
- Home adds a `Categories` button in the existing bottom `.actions` row, after
  `Accounts` and before `Backup`.
- `CategoriesScreen` mirrors `AccountsScreen`'s inline pattern:
  - `useLiveQuery(() => ledger.listCategories(), [ledger])`; `Loading…` until
    resolved.
  - `<h1>Categories</h1>`; rows grouped by `archived` **in ledger order**,
    headings `Active` and `Archived` (render a heading only when its group has
    rows); archived rows carry the text `Archived`.
  - Add form below the list: label `Category name`, `maxLength={60}`, button
    `Add category`, busy guard, input clears on success, error in a
    `role="alert"` paragraph.
  - Local `categoryErrorMessage(code, existingCategoryName?)` — do not reuse
    `accountErrorMessage`, whose `invalid-name` copy is about accounts.
  - `Back` action to `{ name: 'home', month: monthOf(todayLocalDate()) }`.
  - No delete control. No spending totals, entry counts, or zero rows.
- Styles: a new `.category-manager-list`; do **not** reuse `.category-list`,
  which the home breakdown already owns and styles as a spending list.

**Copy (boundary decision 5)**

- `invalid-name` → `Enter a category name of 60 characters or fewer.`
- `duplicate-category-name` → `A category named “${existingCategoryName}” already exists.`
- `unknown-category` → `That category no longer exists.`
- anything else → `Could not save the category. Try again.`

**Tests**

- Router: `#/categories` parses and serializes; existing route cases unchanged.
- Screen: active rows render before archived rows; archived rows show
  `Archived`; each group is alphabetical; an empty archived group renders no
  heading.
- Add success: input clears, the row appears under Active without a reload.
- Add duplicate against an active category and against an archived one both
  show the existing category's stored name.
- Add empty and 61-character names show the `invalid-name` copy.
- Home: `Categories` navigates to the screen.
- App: with zero accounts, `#/categories` redirects to Accounts.
- The new category is offered on the add-expense screen (the live query is
  already wired there; this asserts the seam, not new code).

**Acceptance criteria**

- [ ] In `npm run dev`: home → Categories → add `Coffee`; it appears under
      Active, and the add-expense screen offers it.
- [ ] Adding a category creates no home row until an expense is filed under it.
- [ ] No archive, rename, or unarchive control is rendered yet — ticket 4
      owns them, and the screen has no dead buttons.
- [ ] Existing App, Home, router, and screen tests pass unchanged.

---

## 4. Rename and archive/unarchive on the Categories screen

**Goal:** the user renames any category — active or archived — and archives or
restores one, with the list and every read surface following.

**Blocked by:** 1 (`renameCategory`, `setCategoryArchived`), 3 (the screen).

**Architecture:** §Categories screen (rename, archive/unarchive, stale row),
§Invariants (rename and archive touch no entry).

**Files:** `src/app/screens/CategoriesScreen.tsx`,
`src/app/screens/CategoriesScreen.test.tsx`.

**Build**

- Inline rename per row, copied from `AccountsScreen`: `startRename(id, name)`,
  pre-filled `draftName`, `maxLength={60}`, `Save` / `Cancel`, Escape cancels,
  `aria-label={`Rename ${name}`}`, busy guard, errors through
  `categoryErrorMessage`.
- Stale row: if the row disappears or is replaced while editing (a restore),
  keep the form with the known old name and let `renameCategory` report
  `unknown-category`, exactly as `AccountsScreen` handles a stale account.
- One button per row: `Archive` or `Unarchive`, calling
  `setCategoryArchived(id, !category.archived)`. No confirmation. Busy guard;
  a failure shows `That category no longer exists.` for `unknown-category`.
- Archived rows move between groups through the live query; the screen never
  re-sorts.

**Tests**

- Rename an active category: the row shows the new name; the home breakdown
  and the category entries header show it for a past month; totals are
  unchanged.
- Rename an archived category: works from the Archived group.
- Rename to an existing name shows the duplicate copy naming the other
  category; the row keeps its old name.
- Rename to its own name with different capitalisation succeeds.
- Cancel and Escape both discard the draft.
- Archive: the row moves to Archived and is marked; its home row and entry
  list still exist. Unarchive returns it to Active.
- Archive then unarchive leaves the category's entry count and totals
  unchanged (assert through `monthSummary` / `categoryEntries`).

**Acceptance criteria**

- [ ] In `npm run dev`: rename a seeded category and see the home breakdown
      change without a reload; archive it and see its row and entries survive.
- [ ] No rename or archive writes an entry, an amount, or a setting.
- [ ] The screen still offers no delete control.

---

## 5. Add expense: active-only choices and the no-active state

**Goal:** adding an expense offers only active categories; when none is
active, the screen explains why and points to Categories instead of showing a
form that cannot be completed.

**Blocked by:** 1 (`archived-category` code), 2 (write-path rejection),
3 (`#/categories` exists to link to).

**Architecture:** §Add expense, §Write paths → `requireExpenseFields`,
§Invariants (the add/update bullet).

**Files:** `src/app/screens/AddExpenseScreen.tsx`,
`src/app/screens/AddExpenseScreen.test.tsx`, `src/app/expenseForm.tsx`.

**Build**

- Derive `activeCategories = categories.filter((category) => !category.archived)`.
- Replace the existing `categories.length === 0` branch with
  `activeCategories.length === 0`: a plain state with the copy below and a
  `Categories` button navigating to `{ name: 'categories' }`. No form is
  rendered, so no half-finished entry can be saved. This covers both
  "everything archived" and the corrupt/restored "no categories at all" case.
- Pass `activeCategories` to `ExpenseFields`; the shared form takes no new
  filter parameter.
- `expenseFieldErrors` gains
  `'archived-category' → { category: 'That category is archived. Choose another.' }`
  for a stale tab or a category archived after render.
- Update the existing "keeps an archived category selectable" test to its
  inverse.

**Copy (boundary decision 5)**

- Empty state: `There is no category to file this expense under. Add or unarchive one in Categories.`
- Button: `Categories`.

**Tests**

- An archived category is not offered; the active ones are.
- All categories archived: no amount/category/account controls render; the
  copy and button render; the button navigates to `#/categories`.
- Zero categories in the ledger: the same state, same link.
- Stale submit: render with an active category selected, archive it through
  the ledger, submit; the `archived-category` field error shows and
  `db.entries.count()` stays `0`.
- Existing add-expense tests pass unchanged apart from the one update above.

**Acceptance criteria**

- [ ] With every category archived, `npm run dev` shows the pointer state and
      no form; the link opens Categories.
- [ ] A submitted expense can never be filed under an archived category, even
      with a stale option list.
- [ ] The zero-account branch still renders before the category branch.

---

## 6. Correction keeps the entry's archived category

**Goal:** correcting an entry filed under an archived category opens with that
category selected and saves without re-filing, while offering no other
archived category.

**Blocked by:** 2 (`updateExpense` rule), 5 (`expenseFieldErrors` mapping).
Ticket 1's active-first ordering improves the option order but is not required:
the filter works against today's alphabetical list.

**Architecture:** §Entry editor, §Invariants (correction bullet),
§Testing → UI tests.

**Files:** `src/app/screens/EntryEditorScreen.tsx`,
`src/app/screens/EntryEditorScreen.test.tsx`, `src/app/expenseForm.tsx`.

**Build**

- Derive
  `categoryOptions = categories.filter((category) => !category.archived || category.id === entry.categoryId)`.
- Pass `categoryOptions` to `ExpenseFields`; the entry's current category is
  always present, so the form opens selected and an untouched category saves
  unchanged.
- The initial "category no longer exists" check still tests existence only; an
  archived current category is not an error.
- Mark the archived current option (boundary decision 6): optional
  `archivedCategoryId` prop on `ExpenseFields`, label `${name} (archived)`.
  No other archived category is offered.
- `updateExpense` already enforces the same rule, so a stale option list
  cannot bypass it.

**Tests**

- Open an entry whose category was archived: the option is selected and
  labelled `Coffee (archived)`; changing only the amount saves, and the entry
  keeps `categoryId`.
- Another archived category is not among the options.
- The archived state is not treated as a missing category (no
  "no longer exists" error on open).
- A stale option list that submits another archived category surfaces
  `That category is archived. Choose another.` and leaves the entry unchanged.

**Acceptance criteria**

- [ ] In `npm run dev`: archive a category with an entry, open that entry,
      save an amount change, and confirm it is still filed under the archived
      category.
- [ ] No correction is forced to re-file an entry.
- [ ] Existing entry-editor tests pass unchanged.

---

## Slice close-out

- [ ] All six tickets pass their tests; `npm test` and `npm run typecheck` are
      green on `slice-04`.
- [ ] `code-review` approved against `docs/standards.md` and the architecture
      (no spec exists to review against; note that in the review prompt).
- [ ] The architecture and these tickets reflect what was built; any
      divergence was fixed in the same commit.
- [ ] `docs/product/backlog.md` marks slice 4 complete and confirms slice 5.
- [ ] Manual check: add, rename, archive, unarchive on a phone; archive every
      category and confirm the add screen points to Categories; take a backup,
      restore it in a fresh profile, and confirm names and archive states.
- [ ] Slice handoff written to `docs/agents/`.
