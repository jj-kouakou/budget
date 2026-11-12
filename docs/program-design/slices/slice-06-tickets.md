# Slice 06 Tickets — Track account balances

- **Gate:** Ticket Breakdown (workflow step 6).
- **Sources:** `docs/program-design/slices/slice-06-spec.md` (cited as
  "Spec §…"), `docs/architecture/slices/slice-06-architecture.md`,
  `docs/product/slices/slice-06-scope.md`, `docs/architecture/north-star.md`,
  ADRs 0001/0005, `CONTEXT.md`, and the current `src/`.
- **Branch base:** the working tree is on `slice-07` (income built, not merged
  into `master`); `master` already contains slice 08 but **not** slice 07, so
  it has no `addIncome`/`listIncome`. This slice's balance includes income.
  Do not cut `slice-06` from the current `master`. Merge slice 07 into
  `master` first, then cut `slice-06` from that merge. This is the only
  blocker outside the slice and is recorded as boundary decision 0.
- **Status:** proposed 2026-11-12; not built. Boundary decisions 1–7 are
  flagged rather than silently fixed; 0, 8, and 9 are settled.

Each ticket is one build session, test-first, and one commit when its tests
pass. Every ticket leaves the suite green and every surface it has shipped
correct. Tickets 1–5 change no UI; tickets 6–8 change no ledger contract.

---

## Ticket order at a glance

| # | Ticket | Blocked by |
|---|---|---|
| 1 | `parseSignedAmount` domain helper | — |
| 2 | `RowEditor` union prefactor (rename only) | — |
| 3 | `listAccountBalances` read model | — |
| 4 | `addAccount` with an optional opening | 3 |
| 5 | `setOpeningBalance`, duplicates, invariants, backup | 3, 4 |
| 6 | Accounts screen: balance read and row display | 3 |
| 7 | Invitation, set/edit button, inline opening form | 1, 2, 3, 4, 5, 6 |
| 8 | Add-form starting-point field and final empty-state copy | 1, 4, 7 |

**Frontier:** tickets 1, 2, and 3 can start immediately. Recommended sequence
is 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Ticket 6 can run any time after 3 and does
not gate 7's data dependencies, but 7 needs 6's row markup, so the sequence
keeps it before 7.

**Critical path:** 3 → 4 → 5 → 7 → 8. Tickets 1 and 2 are enablers on the UI
branch; ticket 6 is the display branch.

**Why this order.** The read model is first because both the display and every
write-path assertion depend on it. The creation write follows because
`setOpeningBalance` reuses the new error code and `openingDateFor`. The
correction write carries the duplicate-collapse, spending-invariant, and
backup tests, which only make sense once both writers exist. The screen is
split display-first because balances are useful before the starting-point
affordance exists, and the inline form is the largest single diff, so it goes
after the smaller display ticket. The add-form field is last because it
reuses the sign-conversion helpers and error mapping introduced by the inline
form. `parseSignedAmount` and the `RowEditor` union are prefactors: they make
ticket 7 smaller without changing behaviour.

---

## Standing rules for every ticket

- Failing test first, then the minimum implementation, same session. A ticket
  that changes a runnable surface is not done on tests alone — run it.
- Cross the existing seams only: `createLedger(db)` for data,
  `AccountsScreen` with a real ledger for presentation. No new exported
  helper, no test-only seam, no mocked ledger, no repository interface.
- A real `BudgetDatabase(\`budget-test-${crypto.randomUUID()}\`)` per test,
  deleted in `afterEach`; `fake-indexeddb` is the only boundary. Direct
  `db.entries.add` / `db.accounts.add` seeding is allowed for read-model
  fixtures, matching `src/data/ledger.test.ts`.
- Build expected money strings with `formatAmount(...)` and
  `formatAmountInput(...)`; never hardcode a currency symbol or locale
  output. Build expected opening dates with
  `todayLocalDate(new Date(account.createdAt))`.
- Fixed dates where possible; UI tests use RTL and `waitFor` for live-query
  updates, no sleeps, no fake timers.
- No schema, index, migration, backup-version, route, endpoint, or settings
  write. `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` stay `1`.
- The UI never imports `data/db` or Dexie, never reads `listAccounts` for the
  Accounts rows, never sums rows into a combined total, and never shows a
  balance on home.
- If the build contradicts the spec, fix the spec in the same commit. Do not
  diverge silently.

---

## Boundary decisions

0. **Settled — merge slice 07 before cutting `slice-06`.** Spec §11's release
   precondition is that income is live before a balance includes it. The
   current `master` has slice 08 but no income ledger, so it cannot host this
   slice. Merge `slice-07` into `master`, then cut `slice-06`. Do not start
   ticket 1 on the current `slice-07` branch with slice-06 docs untracked; the
   slice docs should land on the new branch.

1. **Flagged — eight tickets, not the spec's four.** Spec §11 proposes four:
   domain money, ledger contract, Accounts screen, invariants/backup. At the
   current file sizes the ledger contract is 39 ledger tests and the screen is
   24 UI tests, each more than one comfortable session. This breakdown splits
   the ledger contract into read (3), create (4), and correct/invariants (5),
   and the screen into display (6), edit (7), and add-form (8). If a ticket
   runs short, merge 4+5 or 6+7; no other ticket changes.

2. **Flagged — `parseSignedAmount` is its own prefactor ticket (1).** It is
   pure, has no caller until ticket 7, and is not user-visible. The to-tickets
   default is a vertical slice, but the skill allows prefactoring first. Kept
   separate because ticket 7 already carries the row-editor union, the form,
   the accessibility work, and 12 UI tests. If ticket 7 has room, fold ticket
   1 into it; nothing else depends on the split.

3. **Flagged — `RowEditor` union is its own prefactor ticket (2).** It replaces
   the rename booleans with the union from Spec §6.4 but keeps rename as the
   only reachable variant, so it is behaviour-preserving and all existing
   rename tests must stay green. Kept separate because it touches the same
   state that ticket 7 extends, and a broken refactor should be caught before
   the opening form is added. Fold into 7 if it proves trivial.

4. **Flagged — display ships before the starting-point affordance (6 before
   7).** Ticket 6 shows balances and keeps today's empty-state copy; it adds
   no invitation, no set/edit button, and no inline form. That leaves the
   screen in the pre-slice state for the starting-point affordance — no dead
   button, no promise the app cannot keep. The alternative is to show the
   invitation text in 6 without the button; I rejected that because it reads
   as an action that does not exist. If you want the invitation visible as
   soon as balances are, move only the invitation paragraph into 6 and leave
   the button/form in 7.

5. **Settled — `addAccount` and `setOpeningBalance` are separate tickets.**
   They have different invariants: creation validates before writing and
   writes account+opening atomically; correction reads the account, collapses
   duplicates, and handles clear. Ticket 4 introduces `openingDateFor` and
   `invalid-opening-amount`, so ticket 5 is blocked by 4 rather than parallel.

6. **Flagged — backup round-trip and spending/list invariant tests fold into
   ticket 5, not a standalone test-only ticket.** Slice 05 boundary decision 5
   rejected test-only tickets as padding. These cases cover a distinct risk
   (openings leaking into home/category/income/transfer lists, and backup
   fidelity), so they are acceptance criteria of the ticket that completes the
   write paths. If ticket 5 runs long, split Spec §8.4 cases 32–39 into 5b
   blocked by 5; do not ship 5 without the cases unless 5b is opened in the
   same session.

7. **Flagged — add-form field ships after the inline form (8 after 7).** It
   could ship earlier: it needs only tickets 1 and 4, and it is the smallest
   user-facing path to set an opening. I put it last because it reuses
   `ledgerSignedAmount` and the `invalid-opening-amount` UI mapping, which
   ticket 7 introduces; shipping it first would define those helpers in 8 and
   reuse them in 7. If you prefer the add-form first, swap 7 and 8 and move
   the helper definitions with them.

8. **Settled — the new empty-state copy lands in ticket 8, not 6.** Spec §6.6's
   copy says “You can set a starting point now or later.” That is false until
   both the add-form field and the inline form exist. Ticket 6 keeps today's
   copy; ticket 8 changes it. The final state matches the spec exactly.

9. **Settled — no ADR, glossary, schema, backup-version, route, or settings
   ticket.** Spec §11: the durable decisions are already in the north star,
   `CONTEXT.md` already defines Balance and Opening balance, and the slice
   adds no expensive-to-reverse contract. Backup/restore and offline are
   acceptance checks, not code.

---

## Existing tests that must change, and where

| Existing test / assertion | File | Ticket | Becomes |
|---|---|---|---|
| “renders accounts in listAccounts order” | `src/app/screens/AccountsScreen.test.tsx` | 6 | compares to `listAccountBalances()` order; each row also asserts its balance text |
| Rename tests: Save, Enter/Escape, empty name, stale rename | `src/app/screens/AccountsScreen.test.tsx` | 2, 7 | stay green through the union refactor in 2; the stale-rename case is re-verified in 7 |
| Add-account test: adds, shows type, reveals Start logging | `src/app/screens/AccountsScreen.test.tsx` | 8 | leaves the optional field empty; behaviour unchanged; field error cases added |
| “adding an account alone leaves entries empty” | `src/data/ledger.test.ts` | 4 | still true when the opening is omitted; a provided-zero case is added |
| Existing `monthSummary`, `categoryEntries`, transfer, income, and backup tests | `src/data/ledger.test.ts` | 5 | unchanged; opening cases are added beside them |
| `src/domain/backup.test.ts` | — | none | already accepts zero/negative openings; unchanged |
| `App`, `router`, `HomeScreen`, `BackupScreen` tests | — | none | this slice adds no route, home control, or backup-screen behaviour |

No test is deleted. No existing assertion is re-pinned to incidental
behaviour.

---

## Test coverage map

| Spec test case | Ticket |
|---|---|
| §8.3 money 1–10 | 1 |
| §8.4 `addAccount` 1–8 | 4 |
| §8.4 `listAccountBalances` 9–20 | 3 |
| §8.4 `setOpeningBalance` 21–31 | 5 |
| §8.4 spending/list invariants 32–34 | 5 |
| §8.4 backup round-trip 35–39 | 5 |
| §8.5 screen 1, 3, 16, 17, 18, 22, 24 | 8 |
| §8.5 screen 2, 6–15, 21, 23 | 7 |
| §8.5 screen 4, 5, 19, 20 | 6 |
| §8.6 existing-test migration | 2, 6, 8 |
| §8.7 manual verification | after 8, then slice close-out |

---

## 1. `parseSignedAmount` domain helper

**Goal:** the app can parse an amount that may carry one leading minus, using
the same grammar as every other amount field, so opening balances can be
entered as owed, overdrawn, or in credit.

**Blocked by:** none — can start immediately.

**Spec:** §5.2 (exact contract), §8.3 (cases).

**Files:** `src/domain/money.ts`, `src/domain/money.test.ts`.

**Build**

- Add `parseSignedAmount(input, exponent)` exactly as Spec §5.2: trim, strip
  one optional leading `-`, parse the remainder with `parseAmount`, reject a
  sign with no digit immediately after it, return `0` for negative zero.
- Do not edit `parseAmount`, `formatAmount`, or `formatAmountInput`. Every
  existing caller is unchanged.
- Keep the invalid-exponent `RangeError` coming from `parseAmount`; do not add
  a second exponent check before it.

**Tests** — add `describe('parseSignedAmount')` per Spec §8.3:

1. Positive values: `12`, `12.3`, `12,34`, `0`, `0.00`, `00012.30`.
2. Negative values: `-12`, `-12.3`, `-12,34`, `-00012.30`.
3. Surrounding whitespace: ` -12,34 `.
4. `-0`, `-0.00`, `-0,00` return positive `0`; assert with
   `Object.is(result, 0)`.
5. Reject excess fraction digits, thousands separators, repeated separators,
   spaces inside the number, exponent notation, `NaN`, `Infinity`, `.5`,
   `-.5`, `5.`, `-5.`, empty and whitespace-only input.
6. Reject bare `-`, `--5`, `-+5`, `+5`, and `- 5`.
7. Reject both signs above `Number.MAX_SAFE_INTEGER`.
8. Exponent 0: accepts `12` and `-12`, returns `0` for `-0`, rejects `12.5`,
   `-12.5`, `12,0`, `-12,0`, and `12.`.
9. Throws `RangeError` for exponents `-1`, `7`, and `1.5`.
10. Existing `parseAmount` tests remain green; `parseAmount` still rejects
    `-1`.

**Acceptance criteria**

- [ ] `parseSignedAmount` accepts exactly one optional leading `-`, with no
      space between sign and digits.
- [ ] Negative zero never escapes; `Object.is(result, 0)` holds for all three
      zero spellings.
- [ ] Every grammar case in Spec §8.3 passes, including exponent 0 and the
      `RangeError` precedence.
- [ ] `parseAmount` is byte-for-byte unchanged and its tests still pass.
- [ ] `npm test` and `npm run typecheck` pass.

---

## 2. `RowEditor` union prefactor (rename only)

**Goal:** the Accounts screen has one row-editor state that can hold exactly
one editor, replacing the separate rename booleans, with rename behaviour
unchanged.

**Blocked by:** none — can start immediately.

**Spec:** §6.4 (state model and one-editor rule), §8.5 case 23.

**Files:** `src/app/screens/AccountsScreen.tsx`,
`src/app/screens/AccountsScreen.test.tsx` (only if a test needs a mechanical
adjustment; ideally none).

**Build**

- Introduce the `RowEditor` union from Spec §6.4 with both variants declared;
  only the `rename` variant is reachable in this ticket.
- Replace `editingId`, `editingName`, `draftName`, `renaming`, `renameError`,
  and `renamingRef` with `rowEditor`, `rowError`, `rowBusy`, and
  `rowBusyRef`. Keep the snapshotted `accountName` in the rename variant so
  the stale-rename form still renders above the list.
- Preserve every existing rename rule: Save on submit, Enter submits, Escape
  cancels, typing clears the error, busy disables Save and Cancel, stale
  rename shows the existing message.
- Do not add the opening variant's UI, the balance read, or the add-form
  field. Do not change copy, markup, or CSS.

**Tests**

- The existing rename tests (Save, Enter/Escape, empty name, stale rename)
  pass unchanged.
- No new behaviour test is required for a behaviour-preserving refactor; if a
  test asserted the old state variable names, it is rewritten to assert the
  same visible behaviour, not the new internals.

**Acceptance criteria**

- [ ] One screen-level `RowEditor | null` replaces the rename state; at most
      one editor can be open.
- [ ] Every rename test passes without an assertion change beyond mechanical
      query updates.
- [ ] The stale-rename form still renders above the list with the snapshotted
      name.
- [ ] No visual or copy change; `npm test` and `npm run typecheck` pass.

---

## 3. `listAccountBalances` read model

**Goal:** the ledger returns one row per account, in account order, with the
signed balance, the signed opening sum, and whether an opening exists, derived
from every entry effect.

**Blocked by:** none — can start immediately.

**Spec:** §5.1 (`AccountBalanceListItem`), §5.4 (algorithm), §5.5 (semantics),
§7 (invariants), §8.4 cases 9–20.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- Add `AccountBalanceListItem` exactly as Spec §5.1 and
  `listAccountBalances(): Promise<AccountBalanceListItem[]>` to `Ledger`.
- Extract `compareAccountsByCreation` and call it from both `listAccounts`
  and `listAccountBalances`, so the order cannot drift.
- One `db.transaction('r', db.accounts, db.entries, …)`:
  read accounts, sort, read entries, accumulate `balances`, `openingSums`,
  and `openingAccountIds`, then map each account to a row.
- Apply the effect table in one place: expense `−`, income `+`, transfer `−`
  source and `+` destination, opening `+` signed. Apply each side only when
  the target id is a known account. Ignore unknown runtime kinds, an
  opening's `toAccountId`/`categoryId`, and an opening for a missing account.
- Normalize a computed `-0` balance and opening to `0`.
- Do not add a field to `Account`; do not read `settings`; do not change
  `listAccounts`.

**Tests** — Spec §8.4 cases 9–20. Seed openings directly with
`db.entries.add` where needed; the public opening writer does not exist yet.

1. One row per account, in `listAccounts` order, including accounts with no
   entries.
2. Expense debits, income credits, transfer debits source and credits
   destination, opening applies signed.
3. A transfer to a credit card reduces the amount owed.
4. A transfer with no `toAccountId` still debits the source.
5. An unknown source with a known destination credits the destination; an
   unknown destination is ignored.
6. An entry referencing an account not in `accounts` creates no row.
7. An opening of `0` yields `balanceMinor: 0`, `openingBalanceMinor: 0`,
   `hasOpeningBalance: true`.
8. Movements without an opening yield the movement sum and
   `hasOpeningBalance: false`.
9. Duplicate openings are summed and `hasOpeningBalance: true`.
10. A future-dated entry is included; the read takes no month.
11. Renaming changes the row name, not the balance.
12. No `-0` balance or opening is returned.

**Acceptance criteria**

- [ ] `listAccountBalances` returns exactly one row per account, in
      `listAccounts` order.
- [ ] `balanceMinor` is the signed sum of every entry effect; `openingBalanceMinor`
      is the signed sum of opening entries only.
- [ ] `hasOpeningBalance` is true for an opening of zero.
- [ ] Unknown accounts, unknown kinds, and missing destinations contribute no
      effect and create no phantom row.
- [ ] A computed `-0` is returned as positive `0`.
- [ ] The read is one `'r'` transaction over `accounts` and `entries`.
- [ ] No schema, index, `Account`, or settings change.
- [ ] `npm test` and `npm run typecheck` pass.

---

## 4. `addAccount` with an optional opening

**Goal:** adding an account can also record one opening balance, atomically
with the account, so the new row has a meaningful balance from the start.

**Blocked by:** 3.

**Spec:** §5.1 (`AddAccountInput`), §5.3 (`openingDateFor`), §5.6
(`addAccount`), §5.9 (`invalid-opening-amount`), §7, §8.4 cases 1–8.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- Extend `AddAccountInput` with `openingBalanceMinor?: number`, ledger-signed;
  `undefined` means no opening, `0` means an opening of zero.
- Append `'invalid-opening-amount'` to `LedgerErrorCode`.
- Add private `openingDateFor(account)` per Spec §5.3: creation local date,
  falling back to today for a non-date or out-of-range `createdAt`.
- Extend `addAccount` validation in the normative order: name, type, then
  opening (`undefined` or safe integer). Zero and negative are valid.
- Normalize `-0` to `0`. Write the account and, when the opening is defined,
  one `kind: 'opening'` entry in one `'rw'` transaction over `accounts` and
  `entries`. The entry carries the account id, the signed amount, and the
  derived date; no `categoryId`, `toAccountId`, or settings write.
- Keep `listAccounts` unchanged.

**Tests** — Spec §8.4 cases 1–8:

1. No opening writes no entry; the balance read reports zero and
   `hasOpeningBalance: false`.
2. Positive, zero, and negative openings each write exactly one opening with
   the same amount, kind `opening`, the account id, and the account's creation
   local date; one account and one entry.
3. A credit account stores the ledger-signed amount and the read reports it.
4. `-0` is stored as `0`; `Object.is(stored.amountMinor, 0)`.
5. `NaN`, `Infinity`, `1.5`, and `MAX_SAFE_INTEGER + 1` throw
   `invalid-opening-amount` and write neither account nor entry.
6. Invalid name plus invalid opening yields `invalid-name`; invalid type plus
   invalid opening yields `invalid-account-type`.
7. The returned account has the same `id` and `createdAt` as the stored one.
8. `addAccount` writes no `settings.lastAccountId`.

**Acceptance criteria**

- [ ] An omitted opening writes no entry; a provided zero writes one opening
      of zero.
- [ ] Account and opening are one transaction: both exist or neither does.
- [ ] The opening is dated the account's creation local date, not today's
      date, with a safe fallback for a bad `createdAt`.
- [ ] Validation precedence and the new error code match Spec §5.6/§5.9.
- [ ] `-0` is normalized at the write boundary.
- [ ] No `settings`, `categoryId`, or `toAccountId` write on the opening path.
- [ ] `npm test` and `npm run typecheck` pass.

---

## 5. `setOpeningBalance`, duplicates, invariants, backup

**Goal:** an existing account's opening can be set, changed, or cleared, with
exactly one opening remaining; openings are proven absent from spending and
the income/transfer lists; and a backup round-trip preserves them.

**Blocked by:** 3, 4.

**Spec:** §5.7 (`setOpeningBalance`), §5.8 (one per account), §5.9 (errors),
§5.10 (backup), §5.11 (spending invariants), §7, §8.4 cases 21–39.

**Files:** `src/data/ledger.ts`, `src/data/ledger.test.ts`.

**Build**

- Add `setOpeningBalance(accountId, amountMinor | null): Promise<void>` to
  `Ledger`.
- Validate a non-null amount before opening the transaction: safe integer or
  `invalid-opening-amount`. Normalize `-0` to `0`.
- One `'rw'` transaction over `accounts` and `entries`:
  read the account (`unknown-account` when missing); read and filter openings
  for the account, sorted by `id` ascending.
  - `null`: delete every opening, return. No openings is a successful no-op.
  - No openings: insert one dated `openingDateFor(account)`.
  - One or more: update the first opening's `amountMinor`, keep its `id` and
    `date`, and delete the extras.
- Preserve stray `categoryId`/`toAccountId` on an updated opening. Do not
  change the account's name, type, or `createdAt`, and do not write
  `settings.lastAccountId`.
- No parser tightening, no version bump.

**Tests** — Spec §8.4 cases 21–39:

1. Creates one opening for an existing account with the creation local date;
   the read reports the amount.
2. A second call updates the same entry id, leaves one row, and changes the
   balance.
3. `null` deletes every opening and restores the movement-only balance.
4. `null` with no openings is a no-op.
5. An unknown account throws `unknown-account` and writes nothing.
6. A non-safe-integer amount throws `invalid-opening-amount` and writes
   nothing; zero and negative safe integers succeed.
7. `-0` is stored as `0`.
8. Two restored openings: a set updates the lowest-id opening, deletes the
   extra, leaves one; a clear deletes both.
9. A restored opening with a stray `categoryId` or `toAccountId` keeps those
   fields when its amount is updated.
10. The account name, type, `createdAt`, and `settings.lastAccountId` are
    unchanged.
11. A non-date `createdAt` still accepts an opening; the date falls back to
    today and is a valid `LocalDate`.
12. `monthSummary` and `categoryEntries` are unchanged by an opening in the
    current or previous month, including one with a stray `categoryId`.
13. `listIncome` and `listTransfers` never return an opening.
14. Adding, correcting, or removing an expense, income, or transfer changes
    the relevant balance.
15. `readBackupData` includes the opening; a full
    `createBackupFile → serializeBackup → parseBackupFile → restoreBackup`
    round-trip into a fresh database reproduces it and the balance flags.
16. An older v1 file without openings restores with
    `hasOpeningBalance: false` and movement-only balances.
17. A v1 file with two openings restores both; the read sums them; a
    subsequent set collapses them.
18. Restore replaces rather than adds; a destination opening is gone.
19. `SCHEMA_VERSION` and `BACKUP_SCHEMA_VERSION` remain `1`; the schema
    table/index assertion is unchanged.

**Acceptance criteria**

- [ ] Set creates one opening, change updates it in place, clear deletes all;
      duplicates collapse to one on the next set.
- [ ] `null` on an account with no openings is a successful no-op.
- [ ] Validation runs before the transaction; invalid amounts write nothing.
- [ ] No other entry, account field, or settings value changes.
- [ ] Openings never appear in `monthSummary`, `categoryEntries`, `listIncome`,
      or `listTransfers`.
- [ ] Backup round-trip preserves openings, including zero and duplicates;
      an older file restores with movement-only balances.
- [ ] Both version constants stay `1`; the parser is unchanged.
- [ ] `npm test` and `npm run typecheck` pass.

---

## 6. Accounts screen: balance read and row display

**Goal:** the Accounts screen shows each account's current balance, formatted
for its type, from the new ledger read. No starting-point affordance yet.

**Blocked by:** 3.

**Spec:** §6.1 (reads and loading), §6.2 (`balanceText`), §6.6 (existing
empty-state copy retained), §6.8 (`.account-balance`), §6.9 (prohibitions),
§8.5 cases 4, 5, 19, 20; §8.6 order-test migration.

**Files:** `src/app/screens/AccountsScreen.tsx`,
`src/app/screens/AccountsScreen.test.tsx`, `src/styles.css`.

**Build**

- Replace the `listAccounts` read with
  `useLiveQuery(() => ledger.listAccountBalances(), [ledger])` and add
  `useLiveQuery(() => ledger.getSettings(), [ledger])`. Return
  `<p>Loading…</p>` until both are defined.
- Add private `balanceText(row, settings)` exactly as Spec §6.2: checking and
  savings show the formatted signed amount; a negative adds ` overdrawn`;
  credit shows the formatted absolute amount plus ` owed`, zero plus ` owed`,
  and a positive plus ` in credit`.
- Render each normal row as name, type, balance, then the existing Rename
  button. Keep the existing rename form and stale-rename form.
- Add `.account-balance { font-variant-numeric: tabular-nums; }`.
- Do not add the invitation, the set/edit button, the inline form, or the
  add-form field. Do not sum rows. Do not change the empty-state copy yet.

**Tests** — Spec §8.5 cases 4, 5, 19, 20, plus the order-test migration:

1. Checking with an expense shows the formatted minus and `overdrawn`.
2. Credit with an expense shows a positive amount and `owed`; no entries
   shows zero `owed`; a transfer that overpays shows `in credit`.
3. Adding an expense through the ledger updates the visible balance through
   `useLiveQuery` without a refresh.
4. The row's visible text contains the name, the type label, and the balance
   qualifier.
5. The order test compares to `listAccountBalances()`; every row's balance is
   asserted.
6. Existing rename and empty-state/action tests pass; the empty state keeps
   today's copy.

**Acceptance criteria**

- [ ] The screen reads only `listAccountBalances` and `getSettings`; it does
      not call `listAccounts`.
- [ ] Loading renders until both reads resolve.
- [ ] Balance text matches the type table exactly, including `overdrawn`,
      `owed`, and `in credit`.
- [ ] No combined total, no home change, no starting-point affordance.
- [ ] Rows stay in ledger order and update live after a write.
- [ ] `npm test` and `npm run typecheck` pass.

---

## 7. Invitation, set/edit button, inline opening form

**Goal:** a row without an opening invites one; the user can set, change, or
clear the opening inline; the balance and invitation update immediately; the
form is keyboard- and screen-reader-usable.

**Blocked by:** 1, 2, 3, 4, 5, 6.

**Spec:** §6.3 (invitation and form), §6.4 (opening variant and one-editor
rule), §6.6 (inline copy), §6.7 (accessibility), §8.5 cases 2, 6–15, 21, 23.

**Files:** `src/app/screens/AccountsScreen.tsx`,
`src/app/screens/AccountsScreen.test.tsx`, `src/styles.css`.

**Build**

- Extend `RowEditor` with the opening variant. Opening either editor closes
  the other and discards its draft; opening either clears `rowError`. While
  `rowBusy`, disable every Rename and set/edit button.
- Add the set/edit button with visible text
  `Set starting point for {name}` / `Edit starting point for {name}`. When
  `!hasOpeningBalance`, render the invitation paragraph after the button:
  `No starting point set. The balance is the sum of recorded movements.`
- Inline form:
  - label `Starting point for {name}`, `htmlFor` the input id
    `opening-${row.id}`;
  - hint id `opening-hint-${row.id}`, copy by type per Spec §6.6;
  - text input, `inputMode="decimal"`, `autoComplete="off"`, prefilled with
    `formatAmountInput(presentedAmount(row.type, row.openingBalanceMinor), exponent)`;
  - Save: empty → the correct empty copy; non-empty invalid → `Enter a valid
    starting amount.`; valid → `ledgerSignedAmount` then
    `setOpeningBalance(row.id, amount)`;
  - Clear only when `hasOpeningBalance`, accessible name
    `Clear starting point for {name}`, calls `setOpeningBalance(id, null)`;
  - Cancel closes without writing; Escape cancels when not busy;
  - `rowBusyRef` prevents a double submit; Save/Clear/Cancel disabled while
    busy; typing clears `rowError`;
  - `invalid-opening-amount` maps to `Enter a valid starting amount.`; other
    ledger errors use the existing mapping.
- Add module-local `ledgerSignedAmount` and `presentedAmount` per Spec §6.3,
  normalizing zero.
- Clear an opening editor whose account disappears while not busy; keep it
  while busy so a failure can be shown. Keep the stale rename form.
- Add `.account-hint { flex-basis: 100%; margin: 0; }`.
- Do not add the add-form field; the add form is unchanged in this ticket.

**Tests** — Spec §8.5 cases 2, 6–15, 21, 23:

1. Add an account without an opening: zero balance and the invitation.
2. Set an opening from the row: balance updates immediately, invitation
   disappears.
3. Change it: same row updates, no second invitation.
4. Clear it: balance falls back to the movement sum, invitation returns.
5. Prefill shows the current presented opening, including the credit sign
   flip.
6. Empty inline save shows the correct copy for each `hasOpeningBalance`
   state and writes nothing.
7. Invalid inline value shows `Enter a valid starting amount.` and writes
   nothing.
8. Clear is present only when `hasOpeningBalance`.
9. Cancel and Escape close without writing.
10. A rapid double submit writes once and disables Save/Clear/Cancel.
11. Opening rename while the opening form is open closes it; the reverse also
    holds.
12. The set/edit button, input label, and Clear button accessible names
    include the account name.
13. Existing rename tests, including stale rename, still pass.

**Acceptance criteria**

- [ ] A missing opening shows the invitation and the Set button; a present
      opening shows the Edit button and no invitation.
- [ ] Set, change, and clear update the balance and invitation live.
- [ ] An empty save never clears silently; the copy distinguishes the two
      empty cases.
- [ ] Only one editor is open at a time; busy disables the row actions.
- [ ] The form's label, hint, error, and Clear name are associated and
      announced.
- [ ] No add-form change; no combined total; no settings write.
- [ ] `npm test` and `npm run typecheck` pass.

---

## 8. Add-form starting-point field and final empty-state copy

**Goal:** adding an account can set its starting point in the same form, and
the zero-account copy tells the user they can set it now or later.

**Blocked by:** 1, 4, 7.

**Spec:** §6.5 (add form), §6.6 (add-form copy and zero-account copy), §6.7,
§8.5 cases 1, 3, 16, 17, 18, 22, 24.

**Files:** `src/app/screens/AccountsScreen.tsx`,
`src/app/screens/AccountsScreen.test.tsx`.

**Build**

- Add `openingText` and `openingError` state. Insert the optional field
  between the type field and the form error, with label
  `Starting point (optional)`, hint id `account-opening-hint`, input id
  `account-opening`, `inputMode="decimal"`, `autoComplete="off"`, and
  `aria-describedby` including the error when present.
- Hint copy by selected type per Spec §6.6. Changing the type updates the
  hint but does not rewrite the opening text.
- Submit: trim; empty → omit `openingBalanceMinor`; otherwise
  `parseSignedAmount(openingText, exponent)`; `null` → field error
  `Enter a valid starting amount.` and no ledger call; valid →
  `ledgerSignedAmount(type, parsed)` and call `addAccount` with the property
  only when defined.
- On success reset name, type to `checking`, opening text, and both errors.
- On `LedgerError`: `invalid-opening-amount` → field error; every other code
  → form error. Non-ledger error → `Could not save the account. Try again.`
- Change the zero-account copy to
  `Add the accounts you spend from. You can set a starting point now or later.`
  Keep `Start logging` and `Restore from backup` unchanged.
- Do not change the inline form or the row display.

**Tests** — Spec §8.5 cases 1, 3, 16, 17, 18, 22, 24:

1. Add an account with a starting point: the row shows the name, type, and
   formatted balance.
2. Add with a zero starting point: zero balance, no invitation.
3. An invalid add-form opening shows the field error and writes no account.
4. An empty add-form opening writes no entry; a zero writes one entry of zero
   and no invitation.
5. The hint changes with the selected type; a credit opening is converted to
   ledger-signed before storage.
6. The zero-account empty state uses the new copy; `Start logging` still
   appears after an account exists; `Restore from backup` remains.
7. Existing add-account tests pass with the optional field left empty.

**Acceptance criteria**

- [ ] The add form accepts an optional starting point; an empty value is not
      an error and writes no entry.
- [ ] An invalid value blocks the account write and shows the field error.
- [ ] A credit opening is converted to ledger-signed before storage; the hint
      follows the selected type.
- [ ] The form resets fully after success.
- [ ] The zero-account copy matches Spec §6.6; the actions are unchanged.
- [ ] `npm test` and `npm run typecheck` pass.

---

## Manual verification and close-out

After ticket 8, run Spec §8.7 end to end: add with and without an opening;
set, change, and clear; credit owed, zero, and in credit; live updates from
expense, income, and transfer; month navigation; backup with and without
openings; offline; 320px and desktop widths; screen-reader announcement of
name, type, balance, qualifier, form label, and errors.

Then the slice close-out checklist: all tickets green, review approved, spec
and tickets reconciled with what was built, `AGENTS.md` updated if a doc path
was added, backlog marked done, and the slice handoff written.
