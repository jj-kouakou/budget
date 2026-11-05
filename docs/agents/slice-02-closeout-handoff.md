# Handoff — Slice 02 Close-out

## Gate
Build, review, and slice close-out (workflow steps 7–9) — complete. This pass
ran step 9 only; build and review detail is in
`docs/agents/slice-02-build-review-handoff.md`.

## Artifacts
- `docs/architecture/slices/slice-02-architecture.md`
- `docs/program-design/slices/slice-02-spec.md`
- `docs/program-design/slices/slice-02-tickets.md`
- Code on `master` (merge `89c8cad`), feature branch `slice-02`
- Tag `slice-02-complete` → `89c8cad`
- Deploy workflow run `41955339215`

## Definition of Done

1. **All tickets pass their tests.** `npm test` — 245 tests across 11 files,
   all passing. `npm run typecheck` — clean. `npm run build` — clean; PWA
   precache emits 12 entries. Baseline at slice start was 153 tests across
   9 files. Every slice-1 test still passes unchanged.
2. **`code-review` approved.** Two fresh `reviewer` subagents on
   DeepSeek V4 Pro, two axes, seeing only `master...HEAD` plus the slice
   docs. One P2 (implementation-coupled call-count spies) and one P3
   (deleting not disabling `Back`/`Remove entry`) were fixed in `6d269c4`.
   No findings remain open.
3. **Architecture and spec reflect what was built.** A close-out audit
   compared every contractual claim against the code: exports, error codes,
   transaction scopes, route grammar and fallbacks, navigation destinations,
   UI copy, storage version, and module direction. No behavioural,
   interface, storage, or navigation drift. One test-plan claim was
   unbacked — both docs said a credit-card entry *edits* like a checking one,
   but only removal had UI coverage. Added the missing edit test in
   `1e83e60`; the docs are now accurate without weakening. Ticket status and
   acceptance boxes are marked complete.
4. **`AGENTS.md` updated.** Added `docs/agents/` (one handoff per completed
   gate) to the project doc layout.
5. **Backlog updated.** Slice 2 is marked Done. Slice 3 — Keep a backup —
   remains the next slice; close-out re-checked the order and found nothing
   in slice 2 that changes it.
6. **Final handoff.** This file.

## Merge and deployment
- Close-out commit `1e83e60` on `slice-02`.
- `--no-ff` merge `89c8cad` into `master`; `master` and the tag pushed.
- Actions run `41955339215` — build and deploy both succeeded.
- Deployed origin serves `assets/index-CtNwgyY0.js`; the bundle contains the
  `Correct expense` editor copy, and `sw.js` precaches the same asset.

## What landed
- **Ledger:** `categoryEntries`, `getEntry`, `updateExpense`,
  `deleteExpense`, one shared `requireExpenseFields`, exported
  `UNCATEGORIZED_CATEGORY_ID` / `UNCATEGORIZED_LABEL`, and the
  `unknown-entry` / `unsupported-entry-kind` codes.
- **UI:** category entry list, entry editor with correction save, inline
  removal confirmation, shared `expenseForm`, tappable home rows, and the
  `#/category` / `#/entry/<id>` routes.
- **Unchanged:** schema version, indexes, dependencies, module direction, and
  add-expense behaviour.

## Verification limits
- Browser checks used headless Chromium, not a physical phone; 390×844 layout
  and screen-reader announcements were not re-verified for the new screens.
- Offline behaviour of the new routes was not exercised; the service worker
  and precache configuration are unchanged from slice 1.
- Cross-tab concurrency and same-day insertion order remain documented,
  deliberate limits (spec §17).
- Removal's `unknown-entry` catch during confirm is implemented but covered
  only by the observable stale-entry not-found path.
- The deployed smoke check was asset-level (index reference, bundle string,
  precache entry), not a full interactive flow on the deployed origin.

## Open items carried forward
- North-star prose says `fromAccountId`; built code uses `accountId` as the
  transfer source. Slice 8 must keep that field or migrate.
- No runtime React error boundary; only boot failure is handled.
- Single-tab assumption; no cross-tab coordination.
- No schema migration yet; slice 3 pairs forward-only Dexie upgrades with the
  export `schemaVersion`.
- Actions emits Node 20 deprecation warnings; runner images migrate to
  Ubuntu 26 in October 2026. No action needed for slice 3, but the workflow
  actions may need a version bump before then.

## Next gate
Slice 3 — Keep a backup. Read, in order:

1. `docs/product/backlog.md`
2. `docs/product/slices/slice-03-scope.md` (to be written)
3. `docs/architecture/north-star.md`
4. `docs/architecture/slices/slice-02-architecture.md`

Start with the scope gate (`wayfinder`), not the build.
