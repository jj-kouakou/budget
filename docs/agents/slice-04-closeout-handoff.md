# Handoff — Slice 04 Close-out

## Gate
Slice close-out (workflow step 9) — complete. Build and review detail is in
`docs/agents/slice-04-build-review-handoff.md`; this pass ran step 9 and the
documentation reconciliation only.

## Artifacts
- `docs/architecture/slices/slice-04-architecture.md`
- `docs/program-design/slices/slice-04-spec.md` — **new at close-out**; gate 5
  was skipped before the build and the spec was backfilled from the built code.
- `docs/program-design/slices/slice-04-tickets.md` — marked complete.
- `docs/product/backlog.md` — slice 4 marked done.
- Code on `slice-04` (not yet merged to `master`, not yet deployed)
- No `slice-04-complete` tag yet

## Definition of Done

1. **All tickets pass their tests.** `npm test` — **400 tests across 16
   files**, all passing. `npm run typecheck` — clean. `npm run build` — clean;
   PWA precache emits 12 entries. Every ticket commit was made only after its
   test file, the full suite, and typecheck were green. The four intentional
   updates to pre-existing permissive tests are recorded in the tickets and
   spec; no test was deleted to make the suite pass.
2. **`code-review` approved.** Two fresh `reviewer` subagents ran on
   DeepSeek V4 Pro against `docs/standards.md`, the scope, architecture, and
   tickets — neither saw the build transcript. Axis A (standards) and Axis B
   (spec/acceptance/invariants) each returned no findings. Three behaviours
   that had only manual coverage were then covered by tests in `b73491b`:
   zero-account branch ordering, no home row after adding a category, and
   rename/archive leaving entries and settings unchanged. That commit changed
   tests only. **No open items.**
3. **Architecture and spec reflect what was built.** Close-out checked the
   delivered interface, error codes and `existingCategoryName`, helper rules,
   transaction scopes, `listCategories` ordering, archive-aware validation,
   route grammar, zero-account gate, screen states, per-surface filters, exact
   copy, and both version constants against the code and tests. No production
   divergence was found. Documentation changes made in this pass:
   - `slice-04-spec.md` was created, since gate 5 never ran. It is derived
     from the built code, the architecture, and tickets boundary decision 5,
     and records the delivered copy rather than a new plan.
   - The architecture gained a status line pointing at that spec; its
     interface, write paths, routes, states, and invariants were already
     accurate.
   - The tickets' status, stale “spec missing” notes, boundary decision 1,
     boundary decision 5, acceptance checkboxes, and close-out checklist were
     reconciled with completion.
   - Ticket statuses for the browser-only manual checks were annotated: the
     checks ran in headless Chromium at 390×844, not on a physical phone.
4. **`AGENTS.md` updated if new doc paths landed.** No new doc paths were
   added this slice. `docs/program-design/slices/` and `docs/agents/` were
   already listed, and every new file falls under them. No edit required.
5. **Backlog updated.** Slice 4 is marked **Done — 2026-11-10 on branch
   `slice-04`; not yet deployed**. Slice 5 — Compare with last month — is
   still the correct next slice to pull. Close-out re-checked the order:
   category management changed no stored shape (`SCHEMA_VERSION` and
   `BACKUP_SCHEMA_VERSION` both stay `1`), and the starter list is now
   user-editable before a second month accumulates. Two facts carry into
   slice 5: compare by category id so a rename applies to both months, and
   keep archived categories that still hold spending. The data prerequisite
   is unchanged — the app went live on 2026-11-02, so there is still no
   complete prior month to compare; slice 5 cannot be meaningfully validated
   until one exists. Slices 3 and 4 must be merged and deployed first. No
   reordering.
6. **Final handoff.** This file.

## What landed
- **`data/ledger`:** `duplicate-category-name` and `archived-category`;
  `LedgerError.existingCategoryName`; `addCategory`, `renameCategory`, and
  `setCategoryArchived`; trim/1–60/`toLowerCase()` uniqueness across active
  and archived rows inside the write transaction; archive-aware
  `requireExpenseFields`; `listCategories` active-first, then name, then id.
- **UI:** `#/categories` route and Categories screen (grouped list, add,
  inline rename, archive/unarchive, stale-row form, error copy, Back); home
  Categories action; add screen active-only choices and the no-active
  pointer state; correction keeps the entry's archived category and labels it
  `${name} (archived)`.
- **Tests:** ledger coverage for every write rule, ordering, rename
  propagation, archive idempotence, archive-aware add/update, and backup
  round-trip; UI coverage for the screen, navigation, gate order, error
  mapping, stale rows, archive movement, cross-surface rename, no-form state,
  and archived correction.
- **Unchanged:** `src/data/db.ts`, `domain/` (including backup),
  `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` both `1`, the starter seed, no
  table/index/dependency/seam, and the accounts/backup/category-entries
  screens.

## Verification limits
- Physical phone: install, offline use, and the real share sheet were not
  exercised this slice. Browser checks used headless Chromium at 390×844
  against the dev server.
- A backup/restore in a fresh profile and a real permission revoke were not
  repeated for slice 4; the ledger round-trip test covers category restore.
- Screen-reader output and visual layout beyond text/role assertions were not
  verified.
- Cross-tab live-query coordination is still a single-tab assumption.
- Slice 3 and slice 4 are not deployed. The deployed site is still slice 2.

## Merge and deployment
- Close-out documentation is on `slice-04`; `master` is unchanged.
- Not merged, not deployed, no tag. Next step is the usual `--no-ff` merge of
  `slice-04` into `master` after `slice-03`, push, deploy, tag both
  `slice-03-complete` and `slice-04-complete`, and verify the deployed asset.

## Next gate
Slice 5 — Compare with last month. Read, in order:

1. `docs/product/backlog.md`
2. `docs/product/slices/slice-04-scope.md` (for the category semantics that
   carry forward)
3. `docs/architecture/north-star.md`
4. `docs/architecture/slices/slice-04-architecture.md`
5. `docs/program-design/slices/slice-04-spec.md`

Start with the slice scope gate (`wayfinder`), not the build. Write
`docs/product/slices/slice-05-scope.md`; do not assume a complete prior month
exists until December 2026.

## Open items carried forward
- Slices 3 and 4 are not deployed; merge and deploy remain.
- The physical-phone checks listed above remain unexercised.
- No runtime React error boundary; only boot failure is handled.
- Single-tab assumption; no cross-tab coordination.
- North-star still says `fromAccountId` while the built entry type uses
  `accountId` as the transfer source; slice 8 must keep that field or migrate.
- The slice-04 spec is a close-out backfill, not a pre-build review artifact;
  future slices should not treat its late creation as precedent for skipping
  gate 5.
