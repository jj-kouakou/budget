import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import type { Account } from '../../domain/types';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { accountWithTypeLabel } from '../labels';
import { IncomeScreen } from './IncomeScreen';

let db: BudgetDatabase;
let ledger: Ledger;
let checking: Account;
let visa: Account;

beforeEach(async () => {
  db = new BudgetDatabase(`budget-test-${crypto.randomUUID()}`);
  window.location.hash = '';
  ledger = createLedger(db);
  await ledger.initialize();
  checking = await ledger.addAccount({ name: 'Checking', type: 'checking' });
  visa = await ledger.addAccount({ name: 'Visa', type: 'credit' });
});

afterEach(async () => {
  await db.delete();
});

async function renderList() {
  render(<IncomeScreen ledger={ledger} />);
  await screen.findByRole('heading', { name: 'Income' });
}

function money(amountMinor: number): string {
  return formatAmount(amountMinor, 'CAD', 2);
}

async function addIncome(
  amountMinor: number,
  date = '2026-11-02',
  categoryId = 'cat_other',
  accountId = checking.id,
) {
  return ledger.addIncome({
    amountMinor,
    categoryId,
    accountId,
    date,
  });
}

describe('IncomeScreen', () => {
  it('shows the empty state and its first-income action', async () => {
    const user = userEvent.setup();

    await renderList();

    expect(screen.getByText('No income yet.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add income' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Add your first income' }),
    );

    expect(window.location.hash).toBe('#/income/new');
  });

  it('renders rows in ledger order with all four fields', async () => {
    await addIncome(240000, '2026-11-02');
    await addIncome(50000, '2025-01-15', 'cat_groceries', visa.id);

    await renderList();

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Other');
    expect(rows[0]).toHaveTextContent(money(240000));
    expect(rows[0]).toHaveTextContent(
      accountWithTypeLabel('Checking', 'checking'),
    );
    expect(rows[0]).toHaveTextContent('2026-11-02');
    expect(rows[1]).toHaveTextContent('Groceries');
    expect(rows[1]).toHaveTextContent(money(50000));
    expect(rows[1]).toHaveTextContent('Visa');
    expect(rows[1]).toHaveTextContent('2025-01-15');
  });

  it('exposes the exact accessible name for each row', async () => {
    await addIncome(240000, '2026-11-02');

    await renderList();

    expect(
      screen.getByRole('button', {
        name: `Income: Other, ${money(240000)}, ${accountWithTypeLabel('Checking', 'checking')}, 2026-11-02`,
      }),
    ).toBeInTheDocument();
  });

  it('opens a row', async () => {
    const user = userEvent.setup();
    const entry = await addIncome(240000);

    await renderList();
    await user.click(
      screen.getByRole('button', { name: /^Income: Other/ }),
    );

    expect(window.location.hash).toBe(`#/income/${entry.id}`);
  });

  it('keeps rows with missing references clickable', async () => {
    const user = userEvent.setup();
    await db.entries.bulkAdd([
      {
        id: 'missing-category',
        kind: 'income',
        date: '2026-11-02',
        amountMinor: 100,
        accountId: checking.id,
        categoryId: 'gone',
      },
      {
        id: 'missing-account',
        kind: 'income',
        date: '2026-11-01',
        amountMinor: 200,
        accountId: 'gone',
        categoryId: 'cat_other',
      },
    ]);

    await renderList();

    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getByText('Unknown account')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /^Income: Uncategorized/ }),
    );

    expect(window.location.hash).toBe('#/income/missing-category');
  });

  it('updates after an income is added', async () => {
    await renderList();

    await addIncome(240000);

    await waitFor(() =>
      expect(screen.queryByText('No income yet.')).not.toBeInTheDocument(),
    );
    expect(screen.getByText(money(240000))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add income' }),
    ).toBeInTheDocument();
  });

  it('shows renamed category and account labels', async () => {
    await addIncome(240000);

    await renderList();
    await ledger.renameCategory('cat_other', 'Salary');
    await ledger.renameAccount(checking.id, 'Everyday');

    await waitFor(() =>
      expect(screen.getByText('Salary')).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByText(accountWithTypeLabel('Everyday', 'checking')),
      ).toBeInTheDocument(),
    );
  });

  it('updates a corrected row and removes a deleted row', async () => {
    const entry = await addIncome(240000);

    await renderList();
    await ledger.updateIncome(entry.id, {
      amountMinor: 500000,
      categoryId: 'cat_other',
      accountId: checking.id,
      date: '2026-11-05',
    });

    await waitFor(() =>
      expect(screen.getByText(money(500000))).toBeInTheDocument(),
    );

    await ledger.deleteIncome(entry.id);

    await waitFor(() =>
      expect(screen.getByText('No income yet.')).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Add your first income' }),
    ).toBeInTheDocument();
  });

  it('navigates home on Back at the current month', async () => {
    const user = userEvent.setup();

    await renderList();
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(window.location.hash).toBe(
      `#/?m=${monthOf(todayLocalDate())}`,
    );
  });

  it('does not show a total, month controls, or filters', async () => {
    await addIncome(240000);

    await renderList();

    expect(
      screen.queryByRole('button', { name: 'Previous month' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Spent/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /filter/i }),
    ).not.toBeInTheDocument();
  });
});
