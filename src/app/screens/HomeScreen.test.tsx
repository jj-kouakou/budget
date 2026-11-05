import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_MONTH,
  MIN_MONTH,
  formatMonth,
} from '../../domain/calendar';
import type { Account } from '../../domain/types';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { useHashRoute } from '../router';
import { HomeScreen } from './HomeScreen';

let db: BudgetDatabase;
let ledger: Ledger;
let checking: Account;

beforeEach(async () => {
  db = new BudgetDatabase(`budget-test-${crypto.randomUUID()}`);
  window.location.hash = '';
  ledger = createLedger(db);
  await ledger.initialize();
  checking = await ledger.addAccount({ name: 'Checking', type: 'checking' });
});

afterEach(async () => {
  await db.delete();
});

async function addExpense(
  amountMinor: number,
  categoryId: string,
  date = '2026-11-02',
) {
  await ledger.addExpense({
    amountMinor,
    categoryId,
    accountId: checking.id,
    date,
  });
}

function HomeHarness({ ledger }: { ledger: Ledger }) {
  const route = useHashRoute();
  if (route.name !== 'home') {
    return null;
  }
  return <HomeScreen ledger={ledger} month={route.month} />;
}

describe('HomeScreen', () => {
  it('shows the month heading and formatted total', async () => {
    await addExpense(2000, 'cat_groceries');
    await addExpense(500, 'cat_transport');

    render(<HomeScreen ledger={ledger} month="2026-11" />);

    expect(
      await screen.findByRole('heading', { name: formatMonth('2026-11') }),
    ).toBeInTheDocument();
    expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
      '25.00',
    );
  });

  it('renders category rows in ledger order with formatted amounts', async () => {
    await addExpense(2000, 'cat_groceries');
    await addExpense(500, 'cat_transport');

    render(<HomeScreen ledger={ledger} month="2026-11" />);

    await screen.findByText('Groceries');
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Groceries');
    expect(rows[0]).toHaveTextContent('20.00');
    expect(rows[1]).toHaveTextContent('Transport');
    expect(rows[1]).toHaveTextContent('5.00');
  });

  it('shows the empty state and hides it once spending exists', async () => {
    render(<HomeScreen ledger={ledger} month="2026-11" />);

    expect(
      await screen.findByText('No spending yet this month.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add your first expense' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add expense' }),
    ).not.toBeInTheDocument();

    await addExpense(100, 'cat_groceries');

    await waitFor(() =>
      expect(
        screen.queryByText('No spending yet this month.'),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Add expense' }),
    ).toBeInTheDocument();
  });

  it('moves to the adjacent month and updates the heading', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/?m=2026-11';
    render(<HomeHarness ledger={ledger} />);

    await screen.findByRole('heading', { name: formatMonth('2026-11') });
    await user.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(window.location.hash).toBe('#/?m=2026-10');
    expect(
      await screen.findByRole('heading', { name: formatMonth('2026-10') }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next month' }));

    expect(window.location.hash).toBe('#/?m=2026-11');
    expect(
      await screen.findByRole('heading', { name: formatMonth('2026-11') }),
    ).toBeInTheDocument();
  });

  it('disables month controls at the calendar bounds', async () => {
    const { rerender } = render(
      <HomeScreen ledger={ledger} month={MIN_MONTH} />,
    );
    await screen.findByRole('heading', { name: formatMonth(MIN_MONTH) });
    expect(
      screen.getByRole('button', { name: 'Previous month' }),
    ).toBeDisabled();

    rerender(<HomeScreen ledger={ledger} month={MAX_MONTH} />);
    await screen.findByRole('heading', { name: formatMonth(MAX_MONTH) });
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('counts a credit-card expense in the total', async () => {
    const card = await ledger.addAccount({ name: 'Visa', type: 'credit' });
    await ledger.addExpense({
      amountMinor: 2500,
      categoryId: 'cat_groceries',
      accountId: card.id,
      date: '2026-11-02',
    });

    render(<HomeScreen ledger={ledger} month="2026-11" />);

    expect(
      await screen.findByText('Groceries'),
    ).toBeInTheDocument();
    expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
      '25.00',
    );
  });

  it('navigates to the add form', async () => {
    const user = userEvent.setup();
    await addExpense(100, 'cat_groceries');
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByRole('button', { name: 'Add expense' });

    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(window.location.hash).toBe('#/add');
  });

  it('navigates to accounts', async () => {
    const user = userEvent.setup();
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByRole('button', { name: 'Accounts' });

    await user.click(screen.getByRole('button', { name: 'Accounts' }));

    expect(window.location.hash).toBe('#/accounts');
  });

  it('updates the total after a live write', async () => {
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByText('No spending yet this month.');

    await addExpense(1234, 'cat_groceries');

    await waitFor(() =>
      expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
        '12.34',
      ),
    );
  });

  it('renders every category row as a labelled button', async () => {
    await addExpense(2000, 'cat_groceries');

    render(<HomeScreen ledger={ledger} month="2026-11" />);

    const row = await screen.findByRole('button', {
      name: /^Groceries, /,
    });
    expect(row).toHaveTextContent('Groceries');
    expect(row).toHaveTextContent('20.00');
  });

  it('opens the category entries route for the displayed month', async () => {
    const user = userEvent.setup();
    await addExpense(2000, 'cat_groceries', '2026-10-05');
    window.location.hash = '#/?m=2026-10';
    render(<HomeHarness ledger={ledger} />);

    const row = await screen.findByRole('button', { name: /^Groceries, / });
    await user.click(row);

    expect(window.location.hash).toBe(
      '#/category?m=2026-10&c=cat_groceries',
    );
  });
});
