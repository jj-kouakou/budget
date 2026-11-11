# Handoff — Slice 04 Build and Review

## Gate
Combined build (workflow step 7) and review (step 8) for slice 4 — complete.
Close-out (step 9) was deliberately left for its own pass.

## Preflight and repo state
- Uncommitted slice-04 gate docs committed as `2c35eda`
  (`docs: slice 04 gate docs (scope, architecture, tickets)`).
- Slice 3 was complete but unmerged. Merged `slice-03` into `master` as
  `8bf2f00` and tagged `slice-03-complete`, per tickets boundary decision 9.
- Cut `slice-04` from that `master`; the branch contains the gate commit.
- Baseline before any slice-04 code: `npm test` **352 tests / 15 files**,
  all passing; `npm run typecheck` clean.
- Build ran on DeepSeek V4.1 Flash. Review ran on
  `deepseek-ai/DeepSeek-V4-Pro` (`task.agentModelOverrides.reviewer`), a
  different model.

## Missing input — there is no slice-04 spec
`docs/program-design/slices/slice-04-spec.md` does not exist; gate 5 was
never run. This was already recorded in the tickets doc (source note and
boundary decision 1), which recommends building from scope + architecture
because the architecture fixes the seams, error codes, write paths,
ordering, routes, screen states, filters, invariants, and test list.

Build proceeded on that recommended path. Consequences:
- Tickets cite architecture sections, not spec sections.
- All user-facing copy is the proposed copy from tickets boundary decision 5
  (plus the three strings fixed verbatim by the architecture). It is now
  implemented and tested; no spec exists to contradict or confirm it.
- Exact screen layout follows the Accounts-screen inline pattern.

## Ticket commits

| # | Ticket | Commit |
|---|---|---|
| 1 | Category writes: add, rename, archive, list order | `f0beda8` |
| 2 | Archive-aware expense writes | `f2d5c7d` |
| 3 | Categories route, screen, home action, and add | `c21f4d3` |
| 4 | Rename and archive/unarchive on the Categories screen | `5ce1c8a` |
| 5 | Add expense: active-only choices and the no-active state | `b3fe21d` |
| 6 | Correction keeps the entry's archived category | `d888fb9` |
| — | Review fixes | `b73491b` |

Build order followed the ticket DAG: 1 → 2 → 3 → 4 → 5 → 6. Each ticket was
test-first: failing tests observed first, then the minimum implementation.
Every ticket commit was made only after its test file, full `npm test`, and
`npm run typecheck` were green.

## What landed
- **`data/ledger`:** `duplicate-category-name` and `archived-category` codes;
  `LedgerError.existingCategoryName`; `addCategory`, `renameCategory`,
  `setCategoryArchived`; trim/1–60/`toLowerCase()` uniqueness across active and
  archived rows inside write transactions; archive-aware
  `requireExpenseFields` (`addExpense` refuses any archived category,
  `updateExpense` allows only the entry's own); `listCategories` active-first,
  then name, then id.
- **UI:** `#/categories` route and `CategoriesScreen` (list grouped Active /
  Archived, add, inline rename, archive/unarchive, stale-row form, error copy,
  Back); home `Categories` action; add screen filters to active categories and
  renders a pointer state with a Categories link when none is active;
  correction filters to active plus the entry's current archived category and
  labels that option `${name} (archived)`.
- **Tests:** ledger coverage for every write rule, ordering tie-break, rename
  propagation, archive idempotence, and backup round-trip; UI coverage for the
  screen, navigation, gate order, error mapping, stale rows, archive movement,
  cross-surface rename, no-form state, and archived correction.
- **Unchanged:** `src/data/db.ts`, `domain/` (including backup), `SCHEMA_VERSION`
  and `BACKUP_SCHEMA_VERSION` both `1`, no table/index/dependency/seam,
  accounts/backup/category-entries screens and their tests.

The four existing tests the tickets required to change were updated in place,
not deleted: ledger "accepts an archived category" → rejects;
"resolves an archived category name" → files before archiving;
"lists categories by name then id" → active-first; add-screen
"keeps an archived category selectable" → does not offer it.

## Browser checks (dev server, 390×844 headless Chromium)
Observed, not inferred:
- Home → Categories → add `Coffee`: appeared alphabetically under Active,
  input cleared, no rename/archive/delete controls at that ticket, and a
  fresh home render showed no `Coffee` row.
- Add-expense screen offered `Coffee` immediately.
- Filed CA$12.34 under Groceries; renamed Groceries → Food on Categories;
  home showed `Food CA$12.34` without reload.
- Archived Food: it moved under Archived, was marked `Archived`, and its home
  row and category entry list still showed `Food CA$12.34`.
- Archived every category (UI actions): Add expense rendered no form, the
  pointer copy, and a `Categories` button that navigated to `#/categories`.
- Opened the CA$12.34 entry filed under archived Food: editor showed
  `Food (archived)` selected; changed amount to 15.00 and saved; stayed under
  `#/category?m=2026-11&c=cat_groceries`, and reopening showed
  `Food (archived)` selected.

All browser checks used a fresh managed profile against the dev server. No
production build was deployed.

## Review
Two fresh `reviewer` subagents ran concurrently, each seeing only
`git diff master...HEAD`, `docs/standards.md`, the slice scope, architecture,
tickets, and the slice-03 close-out. Neither saw the build transcript or
conclusions.

- **Axis A — standards:** no findings. Checked all applicable `ts-*` harness
  rules, all `pj-*` conventions, the prose test/design/domain conventions, and
  the Fowler smell baseline. Confirmed no ledger mocks, real `BudgetDatabase`
  per test, error-code assertions, no new dependency/schema/seam, and the
  four intentional test updates.
- **Axis B — spec/acceptance/invariants:** verdict "correct"; no findings.
  Verified every ticket acceptance criterion and named test, the architecture
  invariants, unchanged version constants, write boundaries, totals, ordering,
  uniqueness, archive-aware add/update, zero-account gate order, routes, copy,
  and untouched files.

No hard violations, real bugs, or ambiguous findings were escalated. Three
acceptance-mapped behaviours had only manual coverage, so `b73491b` added
tests for: zero-account branch preceding the no-active-category state; adding
a category creating no home row; and rename/archive leaving entries and
settings byte-for-byte unchanged. No production code changed in that commit.

## Final verification
- `npm test` — **400 tests / 16 files**, all passing.
- `npm run typecheck` — clean.
- `npm run build` — clean; PWA precaches 12 entries.
- Browser checks above re-confirmed after all code commits. The review-fix
  commit changed tests only.

## Not verified
- Physical phone: install, offline use, and the real share sheet.
- Screen-reader output and visual layout beyond text/role assertions.
- Cross-tab live-query coordination (single-tab assumption persists).
- Deployment: branch not merged, pushed, or deployed; no `slice-04-complete`
  tag.
- Copy has no spec sign-off; it follows tickets boundary decision 5.

## Next
Slice close-out (step 9): update backlog and definition-of-done items, merge
`slice-04` → `master`, tag, deploy, and write the slice close-out handoff.
