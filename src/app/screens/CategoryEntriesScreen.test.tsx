import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatMonth } from '../../domain/calendar';
import type { Account } from '../../domain/types';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { App } from '../App';

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
  accountId = checking.id,
) {
  await ledger.addExpense({
    amountMinor,
    categoryId,
    accountId,
    date,
  });
}

describe('CategoryEntriesScreen', () => {
  it('opens from a home row and names the category and month', async () => {
    const user = userEvent.setup();
    await addExpense(1200, 'cat_groceries', '2026-11-02');
    await addExpense(800, 'cat_groceries', '2026-11-03');
    await addExpense(500, 'cat_transport', '2026-11-04');
    window.location.hash = '#/?m=2026-11';
    render(<App ledger={ledger} />);

    const row = await screen.findByRole('button', { name: /^Groceries, / });
    const rowAmount = row.getAttribute('aria-label')?.split(', ')[1];
    await user.click(row);

    expect(window.location.hash).toBe(
      '#/category?m=2026-11&c=cat_groceries',
    );
    expect(
      await screen.findByRole('heading', {
        name: `Groceries · ${formatMonth('2026-11')}`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
      rowAmount ?? '',
    );
  });

  it('lists amount, date, and account newest first', async () => {
    await addExpense(1200, 'cat_groceries', '2026-11-02');
    await addExpense(800, 'cat_groceries', '2026-11-03');
    window.location.hash = '#/category?m=2026-11&c=cat_groceries';
    render(<App ledger={ledger} />);

    const rows = await screen.findAllByRole('listitem');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('8.00');
    expect(rows[0]).toHaveTextContent('2026-11-03');
    expect(rows[0]).toHaveTextContent('Checking');
    expect(rows[1]).toHaveTextContent('12.00');
    expect(rows[1]).toHaveTextContent('2026-11-02');
    expect(rows[1]).toHaveTextContent('Checking');
  });

  it('opens the Uncategorized list from home', async () => {
    const user = userEvent.setup();
    await db.entries.add({
      id: 'entry-orphan-category',
      kind: 'expense',
      date: '2026-11-02',
      amountMinor: 750,
      accountId: checking.id,
    });
    window.location.hash = '#/?m=2026-11';
    render(<App ledger={ledger} />);

    await user.click(
      await screen.findByRole('button', { name: /^Uncategorized, / }),
    );

    expect(window.location.hash).toBe(
      '#/category?m=2026-11&c=__uncategorized__',
    );
    expect(
      await screen.findByRole('heading', {
        name: `Uncategorized · ${formatMonth('2026-11')}`,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('returns to the same month on home', async () => {
    const user = userEvent.setup();
    await addExpense(1000, 'cat_groceries', '2026-10-05');
    window.location.hash = '#/?m=2026-10';
    render(<App ledger={ledger} />);

    await user.click(await screen.findByRole('button', { name: /^Groceries, / }));
    await user.click(await screen.findByRole('button', { name: 'Back' }));

    expect(window.location.hash).toBe('#/?m=2026-10');
    expect(
      await screen.findByRole('heading', {
        name: formatMonth('2026-10'),
      }),
    ).toBeInTheDocument();
  });

  it('shows the empty copy with a working Back', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/category?m=2026-11&c=cat_transport';
    render(<App ledger={ledger} />);

    expect(
      await screen.findByText('No entries in this category this month.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(window.location.hash).toBe('#/?m=2026-11');
  });

  it('suffixes duplicate account names and leaves a unique name alone', async () => {
    const visaCredit = await ledger.addAccount({
      name: 'Visa',
      type: 'credit',
    });
    const visaChecking = await ledger.addAccount({
      name: 'Visa',
      type: 'checking',
    });
    await addExpense(1000, 'cat_groceries', '2026-11-02', visaCredit.id);
    await addExpense(2000, 'cat_groceries', '2026-11-03', visaChecking.id);
    await addExpense(3000, 'cat_groceries', '2026-11-04', checking.id);
    window.location.hash = '#/category?m=2026-11&c=cat_groceries';
    render(<App ledger={ledger} />);

    const rows = await screen.findAllByRole('listitem');

    expect(
      within(rows[0]!).getByRole('button', { name: /, Checking$/ }),
    ).toBeInTheDocument();
    expect(
      within(rows[1]!).getByRole('button', {
        name: /Visa · Checking$/,
      }),
    ).toBeInTheDocument();
    expect(
      within(rows[2]!).getByRole('button', {
        name: /Visa · Credit card$/,
      }),
    ).toBeInTheDocument();
  });
});
