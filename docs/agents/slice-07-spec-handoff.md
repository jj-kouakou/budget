# Handoff — Slice 07 Program Design

## Gate

Slice Program Design (workflow step 5) for slice 7 — complete.

## Artifacts

- `docs/program-design/slices/slice-07-spec.md` — new.
- This handoff.

No `src/` changes, no tests run, no build. `AGENTS.md` needs no update: the
new doc lives in `docs/program-design/slices/`, already listed, and no ADR was
added. `CONTEXT.md` is unchanged: **Income** is already defined as money
entering an account from outside the user's own accounts, with a category.

## What the spec fixed

The architecture settled the product and storage shape; this gate resolved the
implementation-level questions it left open:

- **Exact data types.** `CategorizedEntryInput` (renamed from `ExpenseInput`),
  `IncomeListItem`, and the four new `Ledger` methods. `IncomeListItem`
  deliberately has no `categoryId`; the editor uses `getEntry`.
- **Exact shared renames.** `requireExpenseFields` becomes
  `requireCategorizedEntryFields` with the same five checks and order.
  `app/expenseForm.tsx` becomes `app/categorizedEntryForm.tsx`; `ChoiceGroup`
  moves to `app/choiceGroup.tsx`. `ExpenseInput` is deleted with no alias.
- **Exact write paths.** `addIncome`, `updateIncome`, and `deleteIncome` with
  their transaction tables, validation order, error precedence, and returned
  values. `addIncome` and `updateIncome` transact over `accounts`,
  `categories`, and `entries`; neither includes `settings`. `deleteIncome`
  transacts over `entries`.
- **Exact shared ordering.** Private `entriesOfKindNewestFirst(kind)` reads
  through the date index, filters the kind, and sorts by date desc then id
  desc. `listTransfers` is refactored onto it with no observable change.
- **Exact read model.** One `r` transaction over `entries`, `accounts`, and
  `categories`; unique-id `bulkGet` joins; missing category →
  `Uncategorized`; missing account → `Unknown account` / `null`; archived
  categories still resolve; no total, month filter, or pagination.
- **Exact routes.** `#/income`, `#/income/new`, and `#/income/<id>`, with
  `new` checked before the id branch, raw-slash and decode-failure fallbacks
  to home at the current month, encoded-slash acceptance matching
  `#/entry/<id>`, and query strings ignored.
- **Exact list state model.** `loading`, `empty`, or `list`. The empty state
  says `No income yet.` and offers `Add your first income`; the non-empty state
  offers `Add income`; both offer Back. The row is a button with the exact
  accessible name `Income: <category>, <amount>, <account label>, <date>`.
- **Exact add form.** No zero-account branch (the App gate owns it); no active
  category → message + Categories button and no form; amount blank; category
  unselected; account from `settings.lastAccountId` when valid, else the first
  account; date today; local validation then `addIncome`; navigate to
  `#/income` with `replace: true`; no settings write.
- **Exact editor.** Seed from the stored row; missing category/account starts
  unselected with a field error and blocks save; the category options are
  active categories plus the stored category as `Name (archived)`; save calls
  `updateIncome`; removal uses stored values, names amount/date/category/
  account, focuses Cancel, and is final; missing or non-income entry renders
  `Income not found`.
- **Exact error mapping and copy.** `categorizedEntryFieldErrors` keeps the
  existing five mappings. `unknown-entry`/`unsupported-entry-kind` switch the
  editor to not-found. All screen copy, fallbacks, field errors, and the
  confirmation sentence are fixed in the spec.
- **Exact tests.** Ledger cases, router/App cases, three new screen test files,
  home invariant/button tests, and the existing tests that must stay green. No
  test is deleted or re-pinned.
- **Known edges.** A stored id of `new` is unreachable by URL; a restored
  income without a category shows `Uncategorized` and requires replacement in
  the editor; a restored stray `toAccountId` is ignored by reads and preserved
  by `updateIncome`; identical account labels remain possible by design.

## Prototype results

One throwaway state-model reducer was run and removed; the spec records it in
§9. It modelled three categories (two active, one archived), two accounts, add
initialization with valid and stale `lastAccountId`, editor initialization for
normal/missing-category/missing-account/archived-category/non-income cases, and
the ledger's archived-category rule via `allowArchivedCategoryId`.

It confirmed that the expense editor's pattern is sufficient: one
`storedCategoryId` value plus a filtered option list covers every case. The
hard cases behaved as intended:

- a stale `lastAccountId` falls back to the first account;
- a missing category or account starts with a field error and saves after a
  replacement;
- an income under an archived stored category saves when only the account
  changes, and switching to a different archived category is refused;
- a non-income entry renders not-found.

No UI prototype was needed: the architecture already fixed the row's
information and accessible-name template, and the existing transfer list
supplies the visual pattern. The only display choice (always include the
account type) is resolved by matching the expense pickers.

No prototype code remains in the workspace.

## Next gate

Ticket Breakdown (`to-tickets`). Read, in order:

1. `docs/program-design/slices/slice-07-spec.md`
2. `docs/architecture/slices/slice-07-architecture.md`
3. `docs/product/slices/slice-07-scope.md`
4. `docs/architecture/north-star.md`
5. `docs/architecture/slices/slice-01-architecture.md` (entry model, write path)
6. `docs/architecture/slices/slice-02-architecture.md` (correction/removal)
7. `docs/architecture/slices/slice-08-architecture.md` and
   `docs/program-design/slices/slice-08-spec.md` (the list/add/edit pattern)

Cut tickets along the seam, not the file list:

1. Ledger contract: rename `ExpenseInput` and `requireExpenseFields`, add
   `IncomeListItem`, `entriesOfKindNewestFirst`, the four methods, and ledger
   tests.
2. Shared form extraction: `choiceGroup.tsx`,
   `categorizedEntryForm.tsx`, expense/transfer import updates, and existing
   screen tests staying green.
3. Routing and App: three routes, switch cases, and router/App tests.
4. List screen: states, rows, labels, CSS, home action, and list tests.
5. Add screen: no-category gate, defaults, form, validation, and add tests.
6. Editor screen: seeding, correction, removal, not-found, and editor tests.
7. Spending/backup invariants: ledger and home tests, then manual verification.

The shared renames are not separate tickets: ticket 1 ends with one input type
and one validator; ticket 2 ends with one form module and one `ChoiceGroup`.
Do not create a ticket for an income table, an index, a schema version, a
backup version, an endpoint, a settings write, an income total, month
navigation, filtering, pagination, or a generic entry API.

## Repo state

- Docs-only gate. No `src/` changes, no tests run, no build.
- Slice 7 architecture and scope are complete. Slice 8 is built and closed;
  slice 6 (balances) remains the next slice after 7.

## Open items for the build

- Add the income groups to `src/data/ledger.test.ts`; keep every existing
  `addExpense`, `monthSummary`, `categoryEntries`, transfer, and backup
  assertion green after the shared renames and the `entriesOfKindNewestFirst`
  refactor.
- Add the router cases and App route/gate cases.
- Add the three screen test files and the home invariant/button tests.
- Verify the list and forms at 320px and one desktop width; no horizontal
  scroll.
- Verify backup/restore in a fresh profile, and offline record/view/correct/
  remove manually.
- With a screen reader, verify a row announces category, account, amount, and
  date, and the confirmation panel announces amount, date, category, and
  account.
- Do not tighten the backup parser, bump either version constant, add a new
  index, or write `settings.lastAccountId` from an income path.
- Keep the income list a list: no total, month controls, filters, or
  pagination.
