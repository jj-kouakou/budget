# Handoff — Slice 01 Close-out

## Gate
Build, review, and slice close-out (workflow steps 7–9) — complete.

## Artifacts
- `docs/architecture/slices/slice-01-architecture.md`
- `docs/program-design/slices/slice-01-spec.md`
- `docs/program-design/slices/slice-01-tickets.md`
- Code on `master` (merge `cd2ebac`), feature branch `slice-01`
- Deploy workflow `.github/workflows/deploy.yml`

## Build
All 13 tickets were built test-first and committed individually on `slice-01`.
The final app is a Vite + React + TypeScript PWA over Dexie/IndexedDB with:

- `domain/money` and `domain/calendar` pure modules.
- `data/db`, `data/seed`, and the single `data/ledger` persistence seam.
- Hash routes for home, add expense, and accounts; no router dependency.
- First-run account gate, live month summary, last-account preselection,
  inline field errors, and a synchronous double-submit lock.
- Workbox precache with `autoUpdate`, four PNG icons, persistent-storage
  request, and a GitHub Pages deploy at `/budget/`.

## Review
Two-axis review ran on a different model (`DeepInfra/zai-org/GLM-5.2`) in
fresh reviewer subagents, against `master...HEAD` and `docs/standards.md`.

Findings and resolution:
- Credit-card total had ledger coverage but no UI test — added.
- Home add/accounts navigation had no UI test — added.
- `parseAmount` exponent-0 overflow was untested — added.
- `hasErrors` was a one-expression wrapper — inlined.
- Category/account chip markup was duplicated — extracted `ChoiceGroup`.
- Field changes cleared the form-level error, beyond §11.4 — fixed to clear
  only the corresponding field error.
- `labels.ts` and the stale-rename form were missing from the spec module map
  / state machine — docs updated to match the built code.
- Project-specific conventions (`pj-*`) recorded in `docs/standards.md`.

No hard standards violations remained.

## Verification
- `npm run typecheck` — clean.
- `npm run test` — 153 tests across 9 files, all passing.
- `npm run build` — emits `dist/manifest.webmanifest`, `dist/sw.js`, icons.
- Local Chromium (390×844): first-run setup, add, live update, reload
  persistence, offline reload, offline add, last-account preselection,
  credit-card spending, and backdated month routing.
- Deployed Chromium: app loads at the deployed origin, first-run setup and add
  persist across reload, service worker is active at scope
  `https://jj-kouakou.github.io/budget/`, Workbox precache is present, and an
  offline reload renders the shell and existing data.

## Deployment
- URL: https://jj-kouakou.github.io/budget/
- Pages source: GitHub Actions (`build_type: workflow`).
- Workflow run: `41561806833` — build and deploy both succeeded.
- Base path: `/budget/`; manifest `start_url` and `scope` match.

## Verification limits
Not verified from the build machine: iOS home-screen install, Android storage
eviction, whether `navigator.storage.persist()` is granted, the literal
"under ten seconds" entry time, and device visual fit beyond Chromium at
390×844. These are stated as limits, not proven.

## Next gate
Slice 2 — Inspect and correct entries. Read, in order:

1. `docs/product/backlog.md`
2. `docs/product/slices/slice-02-scope.md` (to be written)
3. `docs/architecture/north-star.md`
4. `docs/architecture/slices/slice-01-architecture.md`

## Open items carried forward
- `CONTEXT.md` still defines `Entry` as three kinds; the north star and built
  code include `opening`. Update at the next domain-modeling pass.
- North-star prose says `fromAccountId`; built code uses `accountId` as the
  transfer source. Slice 8 must keep that field or migrate.
- No runtime React error boundary; only boot failure is handled.
- Single-tab assumption; no cross-tab coordination.
- No schema migration yet; slice 3 pairs forward-only Dexie upgrades with the
  export `schemaVersion`.
