# Slice 01 Tickets — Log spending and see this month by category

- **Gate:** Ticket Breakdown (workflow step 6)
- **Sources:** `docs/program-design/slices/slice-01-spec.md` (contracts),
  `docs/architecture/slices/slice-01-architecture.md` (module map, schema),
  `docs/standards.md`
- **Branch:** `slice-01`
- **Status:** complete. All 13 tickets built, tested, reviewed, and deployed
to GitHub Pages on 2026-11-02.

Each ticket is one build session, test-first, and one commit when its tests
pass. Tickets are ordered by dependency, not by spec section order.

---

## Run configuration for this slice

These are session operating choices, not architecture decisions.

| Choice | Value |
|---|---|
| Build model | DeepSeek V4.1 Flash for every ticket |
| Review model | `DeepInfra/zai-org/GLM-5.2` via `task.agentModelOverrides.reviewer` (session-only) |
| Per-call model switching | off; review is the only agent override |
| Package manager | `npm`; `package-lock.json` is committed |
| Commit policy | one commit per ticket, only when that ticket's tests pass |
| Deploy target | GitHub Pages, default; Vercel is the fallback (see §Open decisions) |
| First real entry | only after the deployed origin is verified (see §Deployment) |

The review must run in a fresh session that reads `docs/standards.md` and the
slice spec, not the build transcript. Review on GLM 5.2 rather than the
workflow's DeepSeek V4 Pro is a deliberate user choice; GLM still differs from
the Flash build model, which is the property that matters.

---

## Ticket order at a glance

| # | Ticket | Depends on |
|---|---|---|
| 1 | Scaffold and tooling | — |
| 2 | Domain types and money grammar | 1 |
| 3 | Calendar | 2 |
| 4 | Database schema, starter categories, `initialize` | 2, 3 |
| 5 | Accounts and reads | 4 |
| 6 | `addExpense` | 5 |
| 7 | `monthSummary` | 6 |
| 8 | Router (pure) | 3 |
| 9 | Accounts screen | 5, 8 |
| 10 | Add-expense screen | 6, 8 |
| 11 | Home screen | 7, 8 |
| 12 | App shell, boot, first-run gate | 9, 10, 11 |
| 13 | PWA, icons, persistence request, deploy | 12 |

Reads are split from writes (4/5 vs 6/7) and the router is split from the
shell (8 vs 12) because the screens need `navigate` before the shell that
composes them exists. Deploy gets its own ticket because it is the step that
makes the app usable on a phone.

---

## Standing rules for every ticket

- Write the failing test first, then the minimum implementation, in the same
  session. No ticket is "done" on tests alone where the ticket changes a
  runnable surface — run it.
- Assert `LedgerError.code`, never message text.
- Known-good literals, not values recomputed the way the implementation
  computes them.
- Explicit locales in money and calendar tests; no dependence on the CI
  locale.
- Unique database name per test (`budget-test-${crypto.randomUUID()}`), deleted
  in `afterEach`.
- `waitFor` for live-query updates; no fake timers, no sleeps.
- Fixture setup through `db.entries.add` is allowed where slice 1's write path
  cannot produce the row (non-expense kinds, missing category). That is
  setup, not a mock; assertions still go through the `Ledger` seam.
- Module direction holds: no UI import of `data/db` or `dexie`; no domain
  import of `data/` or `app/`.
- Update this file only if a boundary actually changes; record the change in
  the ticket's commit message.

---

## 1. Scaffold and tooling

**Goal:** an empty but honest app that builds, typechecks, and tests.

**Files**

- `package.json`, `package-lock.json`
- `tsconfig.json`
- `vite.config.ts` (React plugin only; PWA arrives in ticket 13)
- `index.html`
- `src/main.tsx` (mounts a placeholder `<h1>Budget</h1>`; replaced in ticket 12)
- `src/styles.css` (plain global stylesheet)
- `src/test/setup.ts` (`fake-indexeddb/auto`, `@testing-library/jest-dom/vitest`,
  `crypto.randomUUID` polyfill from `node:crypto` only if jsdom lacks it)
- `src/vite-env.d.ts`
- `src/test/harness.test.ts` (proves the test environment: `indexedDB` present,
  jest-dom matcher available)
- Remove `src/.gitkeep`

**Build**

- Dependencies exactly as spec §14.1. Nothing else.
- Scripts exactly as spec §14.2.
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`, `jsx: "react-jsx"`, `target`/`lib` ES2022,
  `moduleResolution: "bundler"`.
- Vitest: `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`,
  `globals: false`.
- `.gitignore` already covers `node_modules/` and `dist/`; add
  `coverage/` only if coverage is configured (it is not).

**Done when**

- `npm run build`, `npm run typecheck`, `npm run test` pass.
- `npm run dev` serves the placeholder at the printed URL.

---

## 2. Domain types and money grammar

**Goal:** the amount grammar from spec §6.1 and the row types from §5, with no
persistence.

**Files:** `src/domain/types.ts`, `src/domain/money.ts`,
`src/domain/money.test.ts`

**Build**

- Types verbatim from spec §5, including the four `EntryKind` values; slice 1
  writes only `expense`.
- `parseAmount(input, exponent)` and `formatAmount(amountMinor, currency,
  exponent, locale?)` with the signatures and `RangeError` rules in §6.
- `formatAmount` uses `Intl.NumberFormat` with
  `currencyDisplay: 'symbol'`, `minimumFractionDigits = maximumFractionDigits
  = exponent`. `undefined` locale means the runtime default.

**Tests**

- Every accepted row and every rejected row of the §6.1 table, at exponent 2.
- Exponent 0: accepts `12`, rejects `12.5`, `12,0`, `12.`.
- Exponent 0 and 2 formatting; zero; negative; explicit `en-CA`;
  `formatAmount(1234, 'CAD', 2, 'en-CA') === '$12.34'`.
- Invalid exponent (`-1`, `7`, `1.5`) throws `RangeError` in both functions.
- Unsafe `amountMinor` throws in `formatAmount`.
- Overflow: a value above `Number.MAX_SAFE_INTEGER` returns `null` from
  `parseAmount`.

**Done when:** tests pass and `tsc` is clean.

---

## 3. Calendar

**Goal:** local calendar dates and month arithmetic, with no `Date.parse`.

**Files:** `src/domain/calendar.ts`, `src/domain/calendar.test.ts`

**Build:** `MIN_MONTH`, `MAX_MONTH`, `todayLocalDate`, `monthOf`,
`addMonths`, `formatMonth`, `isValidLocalDate`, `isValidMonthKey`, all per
spec §7.

**Tests**

- `todayLocalDate` near local midnight (construct a local `Date` explicitly,
  never `Z` timestamps) and zero-padding.
- `monthOf` valid; invalid date throws.
- `addMonths` across year boundaries, ±12, `MIN_MONTH`/`MAX_MONTH` throws,
  non-integer delta throws.
- `isValidLocalDate`: leap day, non-leap Feb 29, 1900 not leap, 2000 leap,
  month 13, day 32, wrong padding, year 0000, trailing space.
- `isValidMonthKey`: valid, month 00/13, wrong padding, year 0000.
- `formatMonth('2026-11', 'en-CA') === 'November 2026'`; year boundary.

**Done when:** tests pass.

---

## 4. Database schema, starter categories, `initialize`

**Goal:** a real Dexie v1 database that seeds settings and nine categories
exactly once.

**Files:** `src/data/db.ts`, `src/data/seed.ts`, `src/data/ledger.ts`
(`initialize` only), tests.

**Build**

- `SCHEMA_VERSION = 1`; stores exactly `accounts: 'id, createdAt'`,
  `categories: 'id'`, `entries: 'id, date'`, `settings: 'id'`; database name
  defaults to `budget`.
- `STARTER_CATEGORIES` is data only, `readonly Category[]`, no functions, no
  Dexie import.
- `createLedger(db)` returns the closure object from spec §9 (other operations
  throw `Error('not implemented')` until their tickets; they are removed by
  ticket 7).
- `initialize()`: one `rw` transaction over `settings` and `categories`;
  create `{ id: 'app', currency: 'CAD', currencyExponent: 2 }` only when
  absent; insert each starter category only when absent; never create
  accounts.

**Tests**

- Schema version and index strings are what §8 states (read
  `db.tables.map(t => [t.name, t.schema.idxByName])` or equivalent, not a
  private field).
- Nine categories with the exact ids and names; `archived: false`.
- Second `initialize()` is a no-op: no duplicate rows, existing
  `lastAccountId` preserved, a renamed or archived category is not
  overwritten.
- `initialize()` leaves `accounts` empty.

**Done when:** tests pass.

---

## 5. Accounts and reads

**Goal:** add, rename, and list accounts; list categories; read settings.

**Files:** `src/data/ledger.ts`, tests (`src/data/ledger.test.ts`)

**Build:** `addAccount`, `renameAccount`, `listAccounts`, `listCategories`,
`getSettings` exactly per §9.2, §9.3, §9.6. `LedgerError` with the six codes
from §9.

**Tests**

- `addAccount`: trims; empty, whitespace-only, and 61-character names →
  `invalid-name`; 60 characters accepted; bad type → `invalid-account-type`;
  duplicates allowed; UUID id; ISO `createdAt`; no entry written.
- `renameAccount`: trims; empty → `invalid-name`; unknown id →
  `unknown-account`; an existing entry still references the id and is
  otherwise unchanged.
- `listAccounts` order: `createdAt` asc, then id asc (same-millisecond
  fixture).
- `listCategories` order: name asc via `localeCompare`, then id asc; includes
  archived.
- `getSettings` returns the seeded row; missing row throws a plain `Error`
  (not `LedgerError`).

**Done when:** tests pass.

---

## 6. `addExpense`

**Goal:** the only write path for entries in this slice.

**Files:** `src/data/ledger.ts`, tests.

**Build:** one `rw` transaction over `accounts`, `categories`, `entries`,
`settings`; validation order amount → date → account → category; insert the
entry; require the settings row (plain `Error('Ledger not initialized')` if
absent); set `lastAccountId`; return the entry.

**Tests**

- One expense written with `kind: 'expense'`, positive integer minor units,
  no `toAccountId`.
- Zero, negative, non-integer, and unsafe amounts → `invalid-amount`.
- Bad date → `invalid-date`.
- Unknown account → `unknown-account`; unknown category → `unknown-category`.
- Validation order: zero amount plus unknown account → `invalid-amount`.
- Archived category is accepted.
- `lastAccountId` updated to the chosen account.
- Missing settings row: throws and writes no entry (delete the row, call,
  assert `entries.count() === 0`).

**Done when:** tests pass.

---

## 7. `monthSummary`

**Goal:** the read model behind the home screen.

**Files:** `src/data/ledger.ts`, tests.

**Build:** exactly the ten steps of §9.5. Index-backed
`entries.where('date').startsWith(month)`. `__uncategorized__` sentinel for a
missing category id; missing category row keeps the group labelled
`Uncategorized`. Sort amount desc, name asc, id asc. `totalMinor` is the sum
of rows.

**Tests**

- Grouping across categories and accounts; credit-card expense included.
- Sort order with an amount tie broken by name, then by id.
- Rows sum to `totalMinor` (assert the invariant, not a recalculated total).
- Other months excluded; backdated entry appears in its own month.
- Empty month returns zero and `[]`.
- Missing category (raw fixture) → `Uncategorized` row, group kept.
- Non-expense kinds (raw fixtures for `income`, `transfer`, `opening`) are
  ignored.
- Malformed month throws `RangeError`.

**Done when:** tests pass.

---

## 8. Router (pure)

**Goal:** hash parsing and navigation with no React.

**Files:** `src/app/router.ts`, `src/app/router.test.ts`

**Build:** `Route`, `parseHash`, `routeToHash`, `navigate`,
`useHashRoute` per spec §10. `parseHash` takes an optional `today` for tests.
Unknown routes and malformed months fall back without rewriting the hash.
Assigning the current hash is a no-op.

**Tests**

- Every row of the §10.1 table.
- `routeToHash` for all three route shapes.
- `navigate` sets the hash and adds history; `{ replace: true }` replaces.
- `useHashRoute` re-parses on `hashchange` (hook tested through a tiny
  component, not by calling hooks outside React).

**Done when:** tests pass.

---

## 9. Accounts screen

**Depends on:** 5 (ledger operations), 8 (`navigate`).

**Files:** `src/app/screens/AccountsScreen.tsx`, tests.

**Build:** heading `Accounts`; empty-state intro; each row shows name, type
label, and `Rename`; inline rename with `Save`/`Cancel`, Enter saves, Escape
cancels; add form with `Account name` (`maxLength={60}`) and `Account type`
select defaulting to `Checking`; `Add account`; `Start logging` once one
account exists; error copy from §12.5.

**Tests** (real ledger on `fake-indexeddb`)

- Adding an account renders it with the right type label and reveals
  `Start logging`.
- `Start logging` sets the hash to `#/?m=<current month>`.
- Renaming updates the row; Enter saves; Escape restores the old name.
- Empty name shows `Enter an account name of 60 characters or fewer.` and
  writes nothing.
- Two accounts created; ordering matches `listAccounts`.
- Stale rename (delete the row behind the screen, then save) shows the
  `unknown-account` copy and leaves the list correct after re-query.

**Done when:** tests pass and the screen is exercised in the browser after
ticket 12.

---

## 10. Add-expense screen

**Depends on:** 6 (`addExpense`), 8 (`navigate`).

**Files:** `src/app/screens/AddExpenseScreen.tsx`, tests.

**Build:** `Add expense` heading; amount `<input type="text"
inputMode="decimal" autoComplete="off">` parsed with the exponent from
settings; category and account radio-style button groups (`aria-pressed`,
`type="button"`, no default category); account default `lastAccountId` else
first account; `<input type="date">` defaulting to `todayLocalDate()`; `Save`
disabled while submitting; `Cancel` → home, current month; field errors via
`aria-describedby`, form errors via `role="alert"`.

**Tests**

- Happy path writes one entry and navigates to `monthOf(entry.date)`.
- Date defaults to `todayLocalDate()`.
- `,` and `.` both parse; `12,34` saves `1234`.
- Zero amount → amount error, no entry.
- No category selected → `Choose a category.`, no entry.
- Bad date (cleared input) → date error.
- Last-used account preselected on a second add.
- Double-click Save writes one entry and the button is disabled during the
  submit.
- Stale account/category (delete the row before submit) maps to the right
  field error.
- Archived category still selectable (it is in `listCategories`).

**Done when:** tests pass and the screen is exercised in the browser after
ticket 12.

---

## 11. Home screen

**Depends on:** 7 (`monthSummary`), 8 (month navigation).

**Files:** `src/app/screens/HomeScreen.tsx`, tests.

**Build:** `<h1>{formatMonth(month)}</h1>`; `Spent` label + formatted total;
category rows (name + formatted amount, already sorted); empty state
`No spending yet this month.` + `Add your first expense`; otherwise
`Add expense`; `Previous month` / `Next month` with accessible names, disabled
at `MIN_MONTH` / `MAX_MONTH`; `Accounts` link.

**Tests**

- Heading and total for a known month with known expenses.
- Rows render in ledger order and show formatted amounts.
- Empty month shows the empty state and CTA; non-empty hides it.
- Month controls navigate to the adjacent month and the heading changes.
- Controls are disabled at `MIN_MONTH` and `MAX_MONTH`.
- A live write updates the total without a reload (`waitFor`).

**Done when:** tests pass and the screen is exercised in the browser after
ticket 12.

---

## 12. App shell, boot, first-run gate

**Depends on:** 9, 10, 11.

**Files:** `src/app/App.tsx`, `src/main.tsx`, `src/app/BootError.tsx`, tests.

**Build:** `main.tsx` constructs `BudgetDatabase`, `createLedger`, awaits
`initialize()` before render, renders `BootError` on failure, otherwise
`<StrictMode><App ledger={ledger} /></StrictMode>`. `App` holds
`useHashRoute()` and `useLiveQuery(() => ledger.listAccounts(), [ledger])`,
applies the gate with `replace`, renders `Loading…` until accounts resolve,
then the route's screen.

**Tests**

- Zero accounts forces the accounts screen, including a deep link to `#/add`,
  and the hash is replaced (back button does not return to `#/add`).
- Adding an account removes the gate; `Start logging` reaches home.
- `#/` renders home for the current month; `#/add` renders the form;
  `#/accounts` renders accounts.
- Unknown route renders home at the current month without rewriting the hash.
- `initialize()` failure renders `Budget couldn't open its local data.` and a
  `Reload` button (test `BootError` directly; simulate the failure by passing
  a ledger whose `initialize` rejects).

**Done when:** tests pass and `npm run dev` shows the real flow end to end in
a browser: add account → add expense → total updates → reload persists.

---

## 13. PWA, icons, persistence request, deploy

**Depends on:** 12.

**Files:** `vite.config.ts`, `public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon-180}.png`,
`src/app/pwa.ts`, `index.html`, deploy workflow (if Pages), tests where
practical.

**Build**

- `VitePWA` with `registerType: 'autoUpdate'`, the manifest from spec §13.1,
  `globPatterns`, `navigateFallback: 'index.html'`, `runtimeCaching: []`,
  `cleanupOutdatedCaches: true`.
- Manifest `start_url` and `scope` must match the deployment base path. On
  GitHub Pages project hosting the app lives at `/budget/`, so the build sets
  `base: '/budget/'` and the manifest uses `/budget/`; on a root-hosted
  deploy the spec's `/` values apply. Record whichever choice is used.
- `registerPwa()` calls `registerSW({ immediate: true })` once, fire and
  forget; `requestPersistentStorage()` calls `navigator.storage.persist()`
  when available, fire and forget, result not surfaced.
- `index.html`: viewport meta, `<title>Budget</title>`,
  `<link rel="apple-touch-icon" href="icons/apple-touch-icon-180.png">`
  (base-relative).
- Icons are real PNGs at the stated sizes, legible at 192 px, with the
  maskable variant keeping content inside the safe zone.
- Deploy workflow publishes `dist/` (Pages: Actions workflow; Vercel:
  `npx vercel --prod`).

**Done when**

- `npm run build` emits `dist/manifest.webmanifest`, `dist/sw.js`, and the
  icons; `npm run preview` serves them.
- Browser check: service worker registers; after load, DevTools offline +
  reload still renders the shell and existing data; adding an expense offline
  updates the total.
- The deployed origin loads over HTTPS, registers the service worker, and
  persists an entry across a reload.

---

## Deferred out of this slice

Entry editing and deletion (slice 2), export/import and storage warnings
(slice 3), category management (slice 4), last-month comparison (slice 5),
balances and opening entries (slice 6), income (slice 7), transfers (slice 8).
Also not built: account deletion/archive, settings UI, currency change,
charts, auth, sync, native app, error boundary beyond the boot screen,
multi-tab coordination.

---

## Open decisions

| Decision | Default if unanswered | Effect |
|---|---|---|
| Hosting: GitHub Pages vs Vercel | GitHub Pages | Pages project hosting needs `base: '/budget/'` and a `/budget/` manifest; Vercel serves at `/` and matches the spec as written |
| Enable Pages in repo settings | — | Blocks the deploy ticket; without it the slice stops at a verified local `preview` build |
| Icon artwork | plain mark with the letter B on the theme color | Cosmetic only; sizes and maskable safe zone are not cosmetic |
| `crypto.randomUUID` in jsdom | browser Web Crypto only | If jsdom lacks it, the polyfill lives in `src/test/setup.ts` and never ships |
| Copy for an unselected category | `Choose a category.` | §12.5 has no code for it: the screen blocks submit before calling `addExpense`, so this is a UI-level required-field error, not a `LedgerError` |

---

## Deployment and first-use rule

IndexedDB is per-origin. Entries logged against `localhost:5173` do not appear
on the deployed origin, and export does not exist until slice 3. Therefore:
**deploy and verify the deployed origin before the first real expense is
logged.**

Deployed smoke sequence:

1. Open the deployed URL over HTTPS; confirm the app shell renders.
2. Add an account, add an expense, reload, confirm both persist.
3. DevTools offline, reload, confirm the app opens and the total is intact.
4. Add a backdated expense; confirm it lands in its own month, not the current
   one.
5. Install to the home screen (manual, on a real phone; not verifiable from the
   build machine).

---

## Verification limits

From the build machine, Chromium can verify the manifest, service-worker
registration, precache, offline reload, and persistence across reload. It
cannot verify iOS home-screen install, Android storage eviction,
`navigator.storage.persist()` grants, the literal "under ten seconds" entry
time, or device visual fit beyond screenshots at 390×844. These are stated in
the close-out, not claimed as proven.
