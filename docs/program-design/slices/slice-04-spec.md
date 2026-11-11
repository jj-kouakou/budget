# Slice 04 Program Design Spec — Manage categories

- **Gate:** Slice Program Design (workflow step 5). Gate 5 was skipped before
  the build; this spec was backfilled at close-out from the built code, the
  slice architecture, the slice scope, and the tickets. It adds no
  architectural decision.
- **Sources:** `docs/product/slices/slice-04-scope.md`,
  `docs/architecture/north-star.md`,
  `docs/architecture/slices/slice-04-architecture.md`,
  `docs/program-design/slices/slice-04-tickets.md`, ADRs 0001/0005,
  `CONTEXT.md`, and `src/` on `slice-04`.
- **Implementation state:** built on branch `slice-04` (tickets 1–6 plus
  review fixes); `npm test` 400 tests / 16 files passing; `npm run typecheck`
  clean; review approved with no open findings. Not merged or deployed.
- **Endpoints:** none. The app is static files plus IndexedDB (ADR 0001);
  `Ledger` is the whole application API.

> **Provenance note.** No slice-04 spec existed when the slice was built. The
> tickets were cut from the scope and architecture and explicitly recorded
> that gate 5 was missing. This file is the implementation contract written
> after the fact: every statement below was checked against the code and
> tests. Where the original plan left a detail open — exact screen layout and
> copy — this spec records what shipped, not a new proposal.

---

## 1. Problem Statement

The home breakdown uses a fixed starter category list. The user cannot add a
category for a kind of spending the list lacks, rename a starter name that
does not match their vocabulary, or retire one they never use. As a result a
coffee and a dinner both land in Eating out, transit and gas both land in
Transport, and the breakdown stops explaining the month.

Categories are already a flat, user-managed concept in the north-star
architecture, and `Category` already carries `archived`. What is missing is
the write path, the ordering rule, the screen, and the read-surface filters.

## 2. Solution

One Categories screen, reached from home, where the user can:

1. see every category, active first, archived below, each group alphabetical
   and archived rows marked;
2. add a category under the name rules, with a new category offered
   immediately when logging an expense;
3. rename any category, active or archived, with the new name following on
   every surface and in past months;
4. archive and unarchive a category without changing any entry, amount, or
   total.

When every category is archived, the add-expense screen explains that there is
no category to file under and links to Categories instead of rendering a form
that cannot be submitted. Backups and restores carry categories unchanged; no
storage or backup version changes.

No network, no new table, no index, no Dexie version bump, no new dependency.

## 3. User Stories

### Seeing and shaping the list

1. As a user, I want a Categories action on home, so that category management
   is one tap from where I see my month.
2. As a user, I want every category listed with active ones first and archived
   ones clearly marked and below, so that the list reflects what is offered.
3. As a user, I want each group alphabetical, so that finding a category does
   not depend on when it was created.

### Adding

4. As a user, I want to add a category by name, so that the breakdown can use
   my words.
5. As a user, I want a new category offered immediately when logging an
   expense, so that adding it is not a dead end.
6. As a user, I want adding a category to create no zero row on home, so that
   the breakdown still shows only categories with spending.
7. As a user, I want surrounding spaces ignored and the name limited to 60
   characters, so that accidental whitespace does not create a second name.
8. As a user, I want a duplicate name refused whether the existing category is
   active or archived, ignoring capitalisation, and I want the message to name
   the category already using it, so that I know what to change.

### Renaming

9. As a user, I want to rename any category, active or archived, so that a
   name that no longer fits can be corrected.
10. As a user, I want the new name to appear on home, the category's entry
    list, the add-expense choices, the correction choices, and past months, so
    that one label is used everywhere.
11. As a user, I want renaming to change no amount and no total, so that
    correcting words never rewrites history.

### Archiving and unarchiving

12. As a user, I want to archive a category, so that it stops appearing in the
    choices for new expenses.
13. As a user, I want an archived category's spending, entries, and home row
    to remain, so that retirement never hides history.
14. As a user, I want correcting an entry filed under an archived category to
    keep that category selected, so that changing an amount does not force me
    to re-file the entry.
15. As a user, I want unarchive to offer the category again with history
    unchanged, so that archiving is reversible.
16. As a user, I want no delete action anywhere, so that no entry can lose its
    label.

### Working with no active category

17. As a user, I want the add-expense screen to explain and link to Categories
    when every category is archived, so that I am not shown a form I cannot
    complete.
18. As a user, I want no half-finished expense saved in that state, so that an
    incomplete entry never enters the ledger.

### Backup and history

19. As a user, I want a backup taken after these changes to restore added,
    renamed, and archived categories, so that the category work is protected.
20. As a user, I want restoring an older backup to restore that file's
    category list, so that restore remains an exact replacement.
21. As a user, I want adding, correcting, and removing entries to work as
    before, so that totals and ordering are unchanged.

## 4. System Shape

### 4.1 Module map

| Module | Responsibility | Change |
|---|---|---|
| `src/domain/types.ts` | `Category { id, name, archived }` | Unchanged |
| `src/domain/backup.ts` | Backup envelope, validation, restore snapshot | Unchanged |
| `src/data/db.ts` | Dexie schema v1, four tables | Unchanged |
| `src/data/ledger.ts` | Category mutations, name rules, ordering, archive-aware expense validation | **Extend** |
| `src/app/router.ts` | `#/categories` parse/serialize | **Extend** |
| `src/app/App.tsx` | Categories route; zero-account gate unchanged | **Extend** |
| `src/app/screens/CategoriesScreen.tsx` | List, add, rename, archive/unarchive | **New** |
| `src/app/screens/HomeScreen.tsx` | Categories action | **Extend** |
| `src/app/screens/AddExpenseScreen.tsx` | Active-only choices; no-active state | **Change** |
| `src/app/screens/EntryEditorScreen.tsx` | Archived-current option; active-only other choices | **Change** |
| `src/app/expenseForm.tsx` | Archived option label; `archived-category` field error | **Change** |
| `src/styles.css` | `.category-manager-list` | **Extend** |

No UI module imports `data/db` or `dexie`; the UI calls the `Ledger` seam.
`domain` does not import `data` or `app`. No dependency was added.

### 4.2 Routes

| Hash | Route | Screen |
|---|---|---|
| `#/` / `#/?m=YYYY-MM` | `{ name: 'home', month }` | Home |
| `#/categories` | `{ name: 'categories' }` | Categories, new |
| `#/add` | `{ name: 'add' }` | Add expense |
| `#/entry/<id>` | `{ name: 'entry', entryId }` | Entry editor |
| `#/category?m=…&c=…` | `{ name: 'category', month, categoryId }` | Category entries |
| `#/accounts`, `#/backup` | existing | Unchanged |

`parseHash` checks `/categories` before the month/query handling, so the path
does not collide with `/category`. `routeToHash` emits `#/categories` with no
query parameters. The zero-account gate still redirects every route except
Accounts and Backup; a cold `#/categories` on an accountless ledger lands on
Accounts.

### 4.3 Ledger interface

The existing methods are unchanged. The slice adds:

```ts
export interface Ledger {
  // unchanged: initialize, listAccounts, addAccount, renameAccount,
  // addExpense, updateExpense, deleteExpense, getEntry, categoryEntries,
  // monthSummary, getSettings, readBackupData, restoreBackup,
  // markBackupSaved

  listCategories(): Promise<Category[]>; // active first, then archived; name asc, id asc
  addCategory(name: string): Promise<Category>;
  renameCategory(id: string, name: string): Promise<void>;
  setCategoryArchived(id: string, archived: boolean): Promise<void>;
}
```

`listCategories` returns every category, including archived rows. There is no
`includeArchived` flag and no `listActiveCategories` method; callers filter the
small list they already have. The ledger owns the order.

### 4.4 Errors

`LedgerErrorCode` gains two codes:

```ts
export type LedgerErrorCode =
  | 'invalid-name'
  | 'invalid-account-type'
  | 'invalid-amount'
  | 'invalid-date'
  | 'unknown-account'
  | 'unknown-category'
  | 'unknown-entry'
  | 'unsupported-entry-kind'
  | 'duplicate-category-name' // new
  | 'archived-category';      // new
```

`LedgerError` gains one optional read-only field:

```ts
readonly existingCategoryName?: string;
```

Only `duplicate-category-name` sets it; it carries the stored name of the
category that already holds the requested name. Tests assert codes and this
field, never message text.

## 5. Ledger Contracts

### 5.1 Category name rules

Private helpers in `data/ledger.ts`:

```ts
const MAX_CATEGORY_NAME_LENGTH = 60;

function requireCategoryName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new LedgerError('invalid-name', …);
  }
  return trimmed;
}

function categoryNameKey(name: string): string {
  return name.trim().toLowerCase();
}
```

- Names are stored trimmed; surrounding spaces never enter the ledger.
- Length is `string.length`, 1–60 inclusive.
- Uniqueness is `trim().toLowerCase()`, compared across active **and**
  archived categories, inside the write transaction.
- Internal whitespace is significant: `Eating  out` and `Eating out` are
  different names.
- `toLowerCase()` is used, not `toLocaleLowerCase()`, so comparison does not
  vary with browser locale or device settings.
- Rename excludes the edited category's own id, so changing only
  capitalisation is allowed.
- The scan reads the whole `categories` table. At one user's volume this is
  trivial and avoids a normalized-name column, index, and migration.

### 5.2 `addCategory(name)`

One `rw` transaction over `categories`:

1. `requireCategoryName(name)`.
2. `requireUniqueCategoryName(trimmed)`.
3. Insert `{ id: crypto.randomUUID(), name: trimmed, archived: false }`.
4. Return the inserted `Category`.

No settings write, no entry, no account. Because the screen uses a live query
on `listCategories`, the new category is offered immediately on the add-expense
screen once the next expense form is opened. `monthSummary` is entry-driven,
so the new category creates no home row.

### 5.3 `renameCategory(id, name)`

One `rw` transaction over `categories`:

1. Read the row; missing → `unknown-category`.
2. `requireCategoryName(name)`.
3. `requireUniqueCategoryName(trimmed, id)`.
4. Update `{ name: trimmed }`.

No entry is rewritten. Every surface joins the category row at read time:
`monthSummary` for home, `categoryEntries` for the entry list, and
`listCategories` for the add and correction choices. A rename therefore
applies to past months and changes no amount or total. There is no audit field
and no previous-name record.

### 5.4 `setCategoryArchived(id, archived)`

One `rw` transaction over `categories`:

1. Read the row; missing → `unknown-category`.
2. If `row.archived === archived`, return without writing.
3. Otherwise update `{ archived }`.

Archiving the last active category is allowed. The empty state is a product
state handled on the add screen, not a write-path error. No entry or setting
is touched, so history stays labelled and all totals stay put.

### 5.5 `listCategories()`

```ts
const categories = await db.categories.toArray();
return categories.sort(
  (left, right) =>
    Number(left.archived) - Number(right.archived) ||
    left.name.localeCompare(right.name) ||
    left.id.localeCompare(right.id),
);
```

Active rows sort before archived rows; within each group, name ascending, then
id as a deterministic tie-break. `localeCompare` is used for display order;
the order is never serialized, so backup determinism is unaffected. The UI
filters and groups by `archived` but does not re-sort.

### 5.6 Archive-aware expense validation

`requireExpenseFields` grows one optional argument:

```ts
async function requireExpenseFields(
  input: ExpenseInput,
  options?: { allowArchivedCategoryId?: string },
): Promise<void> {
  // amount, date, and account checks unchanged

  const category = await db.categories.get(input.categoryId);
  if (!category) throw new LedgerError('unknown-category', …);
  if (
    category.archived &&
    category.id !== options?.allowArchivedCategoryId
  ) {
    throw new LedgerError('archived-category', …);
  }
}
```

- `addExpense` calls it with no options, so an archived category is refused at
  the ledger seam even if a stale option list offers it.
- `updateExpense` calls it with
  `{ allowArchivedCategoryId: existing.categoryId }`, so a correction keeps
  the entry's own archived category while any other archived category is
  refused.
- A missing category still raises `unknown-category`, not
  `archived-category`.

## 6. UI Contracts

### 6.1 Categories screen

Layout mirrors the Accounts screen's inline pattern: no modal, no separate
route per action.

- Loads with `useLiveQuery(() => ledger.listCategories(), [ledger])` and
  renders `Loading…` until resolved.
- `<h1>Categories</h1>`.
- Rows are split into two groups in ledger order: **Active** and **Archived**.
  A group heading renders only when that group has rows. Each group is
  alphabetical because the ledger order is.
- Archived rows carry the text `Archived`.
- **Add form:** label `Category name`, input `maxLength={60}`, button
  `Add category`. On success the input clears and the live query adds the row.
  A busy guard prevents double submission. Errors render in a `role="alert"`
  paragraph.
- **Rename:** one `Rename` button per row. Inline form pre-filled with the
  current name, `maxLength={60}`, `Save` and `Cancel`, Escape cancels,
  `aria-label={`Rename ${name}`}`, busy guard. Works for active and archived
  rows.
- **Stale row:** if the row disappears or is replaced while editing (for
  example, by a restore), the screen keeps a form with the known old name
  (`Rename {old name}`) and lets `renameCategory` report `unknown-category`,
  matching the Accounts screen's stale-account handling.
- **Archive / unarchive:** one button per row, labelled `Archive` or
  `Unarchive`, calling `setCategoryArchived(id, !category.archived)`. No
  confirmation; the action is reversible and changes no amount. The button is
  disabled while that row's write is in flight.
- **No delete control.**
- **Back** returns to home for the current month.
- The screen shows no spending totals, entry counts, or zero rows.

### 6.2 Home

Adds a `Categories` button to the existing bottom action row, between
`Accounts` and `Backup`, navigating to `{ name: 'categories' }`. Nothing else
changes: `monthSummary` still orders rows by amount and still includes any
category with expenses in the month, archived or not.

### 6.3 Add expense

The screen already loads `listCategories()`. It now derives:

```ts
const activeCategories = categories.filter((category) => !category.archived);
```

- If `activeCategories.length === 0`, it renders a plain state instead of the
  form: the copy below and a `Categories` button to `{ name: 'categories' }`.
  This covers both "every category archived" and the corrupt/restored "no
  categories at all" case. No form is rendered, so no partial entry can be
  saved.
- Otherwise it passes `activeCategories` to `ExpenseFields`. The shared form
  takes no new filter parameter.
- `expenseFieldErrors` maps `archived-category` to a category field error for
  the stale-tab/stale-list case.
- The zero-account branch still renders before the category branch: an
  accountless ledger shows the Accounts pointer, not the Categories pointer.

### 6.4 Entry editor

The editor already loads every category. It derives:

```ts
const categoryOptions = categories.filter(
  (category) => !category.archived || category.id === entry.categoryId,
);
```

- The entry's current category is always offered, even when archived, so the
  form opens with it selected and a correction that does not touch the
  category saves unchanged.
- No other archived category is offered.
- The archived current option is labelled `${name} (archived)` via the
  optional `archivedCategoryId` prop on `ExpenseFields`; no display state is
  added to domain data.
- The initial "category no longer exists" check still tests existence only.
  An archived current category is not an error.
- `updateExpense` enforces the same rule, so a stale option list cannot bypass
  it.

### 6.5 Read paths and backup

- `categoryEntries` resolves the category row regardless of `archived`, so an
  archived category's entries still list and its header uses the current name.
- `monthSummary` includes archived categories with spending.
- `readBackupData` dumps the `categories` table with current names and archive
  states; `restoreBackup` replaces it wholesale. A backup taken after slice 4
  restores the added categories, renames, and archive states. An older v1
  backup restores that file's list; the current list is not merged.
- Restore does not enforce the new uniqueness rule. It reproduces the file,
  exactly as slice 3 refuses to be stricter than the ledger it restores into.
  The app never writes duplicates; only a hand-edited or damaged file could
  contain them.

## 7. Error-to-Copy Mapping

The ledger raises codes; the UI owns the user-facing strings.

| Context | Code | Copy |
|---|---|---|
| Categories add/rename | `invalid-name` | `Enter a category name of 60 characters or fewer.` |
| Categories add/rename | `duplicate-category-name` | `A category named “{existingCategoryName}” already exists.` |
| Categories add/rename | `unknown-category` | `That category no longer exists.` |
| Categories add/rename/archive | any other `LedgerError` | `Could not save the category. Try again.` |
| Add expense | `archived-category` | `That category is archived. Choose another.` |
| Add expense, no active category | — | `There is no category to file this expense under. Add or unarchive one in Categories.` + `Categories` button |
| Entry editor option | — | `{name} (archived)` |

Ledger messages for `invalid-name`, `duplicate-category-name`,
`unknown-category`, and `archived-category` match these strings; the UI maps
by code rather than displaying ledger text.

## 8. Invariants

- Renaming changes no entry, amount, or total.
- Archiving changes no entry, amount, or total.
- Archive and unarchive touch one category row; no entry, setting, or other
  category is written.
- `listCategories` is the only category list; the UI filters and groups, never
  re-sorts.
- Names are unique under `trim().toLowerCase()` across active and archived
  categories at the write path.
- A new category creates no home row.
- No category is ever deleted; there is no delete method, control, or
  tombstone.
- Add refuses every archived category; update refuses every archived category
  except the entry's own. Both rules live in `Ledger`, not only in screens.
- The name and archive state live on the category row; entries carry only
  `categoryId`, so there is no denormalized label to migrate.
- `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`; `src/data/db.ts` is
  unchanged.

## 9. Acceptance Mapping

| Scope acceptance | Implementation | Coverage |
|---|---|---|
| Home reaches Categories, archived marked after active | Home action → `#/categories`; ledger order; group headings and `Archived` mark | Home, router, Categories screen tests |
| Add a category; offered immediately; no zero home row | `addCategory` + live query; entry-driven `monthSummary` | Ledger and screen tests; review-added no-home-row test |
| Rename appears on home, entry list, add, correction, past months | Read-time joins from `categoryId` on all four surfaces | Ledger rename-propagation test; screen and editor tests |
| Renaming changes no amount or total | One `name` field update; totals derive from entries | Ledger totals assertion; review-added unchanged-entry/settings test |
| Empty or overlong name refused plainly | `requireCategoryName` → `invalid-name` | Ledger boundary tests; screen copy test |
| Duplicate, active or archived, refused naming the existing category | Whole-table uniqueness with `existingCategoryName` | Ledger tests for active/archived/self; screen copy test |
| Archive stops new expenses | `setCategoryArchived`; active-only add choices; `addExpense` rejection | Ledger and add-screen tests |
| Archived spending still on home; entries list; correction keeps it | Reads ignore `archived`; editor keeps the entry's own category; `updateExpense` allows it | Ledger and UI tests |
| Unarchive offers it again with history unchanged | `setCategoryArchived(id, false)`; entries never touched | Ledger and screen tests |
| No active category: add cannot complete and points to Categories | `activeCategories.length === 0` state; no form; button | Add-screen tests, including zero-category and gate-order cases |
| Backup restores categories; older backup restores older list | Table dump/replace; no v1 change | Ledger round-trip test |
| Add/correct/remove still work; totals and ordering unchanged | No entry path change except archive validation | Full existing suite |
| Works offline | No network in any path | Existing PWA/offline behaviour; physical-phone check not repeated |

## 10. Test Plan and Delivered Coverage

**Ledger integration tests** (`src/data/ledger.test.ts`) use a fresh real
`BudgetDatabase` per test on `fake-indexeddb` and assert codes and fields:

- add: trimming, `archived: false`, fresh id, appears in the list; empty and
  61-character names refused; 60 accepted; duplicate refused ignoring case and
  surrounding spaces against active and archived rows, carrying the stored
  conflicting name.
- rename: trims and updates; own-name case change allowed; another category's
  name refused; unknown id → `unknown-category`; name propagates to
  `monthSummary` and `categoryEntries` for a past month with totals unchanged.
- archive: archive/unarchive, idempotence, unknown id, archiving every seed
  category.
- ordering: active before archived, alphabetical within each group, id
  tie-break.
- expenses: `addExpense` rejects an archived category; `updateExpense` accepts
  the entry's own archived category and rejects another; a missing category
  remains `unknown-category`.
- backup: new snapshot round-trips added, renamed, and archived categories;
  restoring the older snapshot restores the older list.
- versions: `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`.

**UI tests** (RTL, real ledger, `waitFor` for live queries):

- router parses and serializes `#/categories`;
- Categories screen group order, archived mark, alphabetical groups, empty
  group heading omission, add success/duplicate/invalid copy, rename, cancel,
  Escape, stale row, archive/unarchive movement, and unchanged totals;
- home Categories navigation;
- zero-account App redirect for `#/categories`;
- add screen offers only active categories, renders the no-active state with a
  working link, handles zero categories, and shows the `archived-category`
  stale-submit error without writing an entry;
- entry editor keeps the archived current option selected and labelled,
  offers no other archived category, and reports a stale archived submission;
- review-added tests for the zero-account branch preceding the no-active
  state, no home row after adding a category, and rename/archive leaving
  entries and settings unchanged.

**Intentional updates, not deletions**, to four pre-existing permissive tests:

| Test | New expectation |
|---|---|
| ledger "accepts an archived category" | rejects with `archived-category` |
| ledger "resolves an archived category name" | file before archiving, then assert the read |
| ledger "lists categories by name then id, including archived rows" | active first, then archived |
| AddExpenseScreen "keeps an archived category selectable" | does not offer it |

**Manual/browser:** headless Chromium at 390×844 against the dev server
confirmed add, rename across surfaces, archive/unarchive, the no-active state
and its link, and corrective save under an archived category. A physical
phone, install, offline use, and screen-reader quality were not exercised in
this slice.

## 11. Implementation Facts

- The spec did not exist during build; tickets cited architecture headings and
  boundary decision 5 supplied the copy. This file records the delivered copy
  and does not reopen it.
- `listCategories` uses `localeCompare` for display order, per tickets
  boundary decision 2. Comparison is never serialized, so backup determinism
  is unaffected.
- The archived-option label is implemented through the optional
  `archivedCategoryId` prop on `ExpenseFields`, per tickets boundary decision
  6, rather than by adding display state to `Category`.
- The Categories screen's stale-row form is an addition to the Accounts
  pattern required by the architecture; it keeps the old name and lets the
  write report `unknown-category`.
- Review added three UI tests and changed no production code.
- No new doc directory was added; `docs/agents/` and the existing
  `docs/program-design/slices/` path already appear in `AGENTS.md`.

## 12. Out of Scope

As recorded in `docs/product/slices/slice-04-scope.md`: category deletion or
tombstones, subcategories/nesting/groups, reordering, colours/icons/emoji,
merging categories, bulk re-filing, per-category budgets or limits, default or
suggested categories, inline category management on the add-expense screen,
any change to how spending is counted or ordered, and bank sync, budgets,
multi-currency, sharing, or a laptop view.
