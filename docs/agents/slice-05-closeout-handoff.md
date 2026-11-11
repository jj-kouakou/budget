# Handoff — Slice 05 Close-out

## Gate

Slice close-out (workflow step 9). Slice 5 — Compare with last month.
Build and review were completed in the previous session
(`docs/agents/slice-05-build-review-handoff.md`); this session reconciled the
definition of done, performed the remaining manual checks, and wrote the slice
handoff.

## Branch and state

| Ref | Commit | Meaning |
|---|---|---|
| `slice-05` | `2dfb55a` | ticket 3 implementation |
| `slice-05` | `2ddd8bd` | build and review handoff |
| `slice-05` | this close-out commit | status lines, acceptance reconciliation, backlog, this handoff |
| `master` | `faf2a97` | merge of `slice-04` (also contains slices 3 and the slice-05 gate docs); ahead of `origin/master` by 24 commits, not pushed |

`slice-05` was cut from `faf2a97`. The slice-05 code is **not yet merged into
`master`**; only the gate docs and slice 4 are. The deployed site is still
slice 2.

## 1. Tests

Command run at close-out:

```
npm test -- --run
```

Result: **427 passed, 16 files, 0 failures.** This is the full suite,
including the 27 comparison tests added by tickets 1–3.

```
npm run typecheck
```

Result: **clean** (no output).

```
npm run build
```

Result: **clean**; PWA precache 12 entries. Production output used for the
manual checks below.

No test was deleted or skipped. `SCHEMA_VERSION` and
`BACKUP_SCHEMA_VERSION` remain `1`; the ledger test that pins both still
passes.

## 2. Review

Approved. Two fresh `reviewer` subagents on a different model from the build
(`DeepSeek-V4-Pro` against a `DeepSeek-V4.1-Flash` build) reviewed
`git diff master...HEAD` independently:

- **Axis A — `docs/standards.md`:** every applicable section, all `pj-*`
  rules, and the OMP `ts-*` corpus. **Zero findings.**
- **Axis B — spec and acceptance:** every ticket criterion, cited spec section,
  and architecture invariant. **Zero findings.**

No issue was raised, so no resolution links are needed and no review-fixes
commit exists. The reviewers' only qualification was that ticket 3's manual
pass is a close-out item, which this session addressed.

## 3. Docs vs. what was built

Verified against `src/data/ledger.ts`, `src/app/screens/HomeScreen.tsx`, and
`src/styles.css`:

- `CategorySpend.previousAmountMinor`, `MonthSummary.previousMonth`, and
  `MonthSummary.previousMonthHasSpending` are exactly as specified.
- One `'r'` transaction over `entries` and `categories`; predecessor derived
  before either read; `MIN_MONTH` skips the previous read; union + zero-fill;
  `bulkGet` names; `compareSummaryRows`; `totalMinor` from current amounts.
- `homeBreakdown` order is empty → `current-only` → `comparison`; the note is
  `No spending recorded in {formatMonth(previousMonth)}.`; comparison rows are
  disabled exactly when `amountMinor === 0` and carry both month names in the
  accessible name.
- CSS matches the prototype's fixed `5.75rem` amount columns, shared grid,
  `nowrap`, tabular numerals, and dark-scheme override.

No divergence was found, so no spec correction was needed. The only edits were
**status lines** in
`docs/architecture/slices/slice-05-architecture.md` and
`docs/program-design/slices/slice-05-spec.md` (designed/not-built → built and
closed), the tickets header/boundary-decision note, all 26 acceptance boxes
ticked, and a close-out section in the tickets doc. The tickets doc now also
records the preflight deviation: slices 3/4 were merged but not deployed
before `slice-05` was cut.

## 4. AGENTS.md

**No change required.** This slice added no doc path. Its scope, architecture,
spec, tickets, build/review handoff, and this handoff all live in folders
`AGENTS.md` already lists: `docs/product/slices/`,
`docs/architecture/slices/`, `docs/program-design/slices/`, and `docs/agents/`.
No new ADR, `CONTEXT.md`, or `docs/external/` entry was created.

## 5. Backlog

`docs/product/backlog.md` now marks slice 5 done (2026-11-10, branch
`slice-05`, merged only locally) and records the close-out order check.

**Next slice: 6 — Track account balances. Still the right one to pull.**

- Slice 5 changed no stored shape and no write path, so it adds no migration,
  cleanup, or compatibility work before balances.
- The two slice-4 facts slice 5 depended on — join names by category id, keep
  archived categories that hold spending — were verified in the build and are
  what a balance read will need from the same entries.
- Balances are the first supporting concept named by the vision and depend
  only on accounts and entries, both already built.

Nothing learned this slice changes the order. Two release facts carry forward:

1. **Deploy slices 3–5 before shipping slice 6.** `master` is 24 commits ahead
   of origin and the live site is slice 2. This is a release step, not a
   reordering.
2. Slice 5's comparison cannot be validated against real data until
   December 2026 at the earliest; the app went live on 2026-11-02.

## Manual verification performed at close-out

Headless Chromium, production build via `vite preview`, at 390×844 unless
noted.

- **Backup/restore in a fresh profile.** Downloaded a backup through the UI
  from a populated ledger (3 accounts, 9 categories, 8 entries; the file
  carried no comparison of its own). Restored it into a browser launched with
  a brand-new `--user-data-dir`. The restored home screen reproduced the
  comparison exactly: November 2026 / October 2026 header; Groceries
  `CA$35.59` / `CA$15.00`; Transport `CA$10.50` / `CA$0.00`; Fun `CA$0.00` /
  `CA$20.00`; Health `CA$0.00` / `CA$3.00`; total `CA$46.09`. This closes the
  backup item left open after the build session.
- **Installability.** Manifest fetched with `name`, `short_name`,
  `start_url: /budget/`, `display: standalone`, and 192/512/maskable icons;
  service worker `activated` and controlling the page; CDP
  `Page.getInstallabilityErrors` returned an empty list.
- **Offline.** Reloaded with network emulation offline; the comparison and
  total rendered from the service worker cache plus IndexedDB.
- **Four home states.** November (two columns, disabled previous-only rows,
  total `CA$46.09`); October (note `No spending recorded in September 2026.`,
  single-amount rows, no header); December (current empty, previous populated,
  total `CA$0.00`, all rows disabled, `Add expense` present, no empty state);
  `MIN_MONTH` (`January 1`, single amount, no note, no header).
- **Layout.** Column x-positions identical between the header and every row at
  320, 360, 390, and 1280 px; `scrollWidth === clientWidth` at every width, so
  no horizontal page scroll, including one desktop width.
- Rename, archive, cross-boundary correction, and the previous-only
  non-navigation row were verified in the build session's browser pass
  (`docs/agents/slice-05-build-review-handoff.md`); they were not re-run here.

## Not verified

- Physical phone install and real offline use after install; screen-reader
  output on a device or assistive technology. Headless Chromium covered
  installability criteria, offline reload, and the accessible names, not the
  device UI.
- The real browser save picker. In headless Chromium the anchor fallback saved
  the file and the UI correctly reported "Your browser has taken the file. It
  is a backup only if you saved it." (`unconfirmed`). The file was read back
  and restored successfully.
- Deployment. Slices 3 and 4 are merged only into local `master`; slice 5 is
  not merged yet.

## Known notes, not defects

- **`MIN_MONTH` heading.** `formatMonth('0001-01')` renders `January 1`,
  because the formatter includes the day whenever the month is January. This
  predates the slice and only appears at the earliest representable month. It
  is visibly ambiguous (reads as a date), but fixing it is calendar copy, not
  slice-5 behavior; leave it for a future polish ticket rather than a silent
  change here.
- **Fixed amount columns.** Fit roughly `CA$9,999.99` at the default font
  size; wider amounts overhang into the gap without clipping or horizontal
  scroll, as recorded in the spec's display limits.

## Next

1. Merge `slice-05` into `master` and deploy slices 3–5 (release step).
2. Pull slice 6 — Track account balances — in a fresh architecture session.
3. Keep the December 2026 real-data check for the comparison on the list.
