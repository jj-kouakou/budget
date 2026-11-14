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
import { TransfersScreen } from './TransfersScreen';

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
  render(<TransfersScreen ledger={ledger} />);
  await screen.findByRole('heading', { name: 'Transfers' });
}

function money(amountMinor: number): string {
  return formatAmount(amountMinor, 'CAD', 2);
}

describe('TransfersScreen', () => {
  it('warns and offers Accounts when there are fewer than two accounts', async () => {
    await db.accounts.delete(visa.id);

    await renderList();

    expect(
      screen.getByText('You need two accounts to record a transfer.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Accounts' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add transfer' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('No transfers yet.')).not.toBeInTheDocument();
  });

  it('keeps existing rows with fewer than two accounts and opens them', async () => {
    const user = userEvent.setup();
    const entry = await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: visa.id,
      date: '2026-11-02',
    });
    await db.accounts.delete(visa.id);

    await renderList();

    expect(
      screen.getByText('You need two accounts to record a transfer.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add transfer' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /^Transfer from Checking/ }),
    );

    expect(window.location.hash).toBe(`#/entry/${entry.id}`);
  });

  it('shows the empty state with a first-transfer action', async () => {
    const user = userEvent.setup();

    await renderList();

    expect(screen.getByText('No transfers yet.')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Add your first transfer' }),
    );

    expect(window.location.hash).toBe('#/add/transfer');
  });

  it('renders rows in ledger order with labels, amounts, and dates', async () => {
    await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: visa.id,
      date: '2026-11-02',
    });
    await ledger.addTransfer({
      amountMinor: 5000,
      accountId: visa.id,
      toAccountId: checking.id,
      date: '2025-01-15',
    });

    await renderList();

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(
      accountWithTypeLabel('Checking', 'checking'),
    );
    expect(rows[0]).toHaveTextContent(
      accountWithTypeLabel('Visa', 'credit'),
    );
    expect(rows[0]).toHaveTextContent(money(24000));
    expect(rows[0]).toHaveTextContent('2026-11-02');
    expect(rows[1]).toHaveTextContent(money(5000));
    expect(rows[1]).toHaveTextContent('2025-01-15');
  });

  it('uses the exact accessible name for each row', async () => {
    await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: visa.id,
      date: '2026-11-02',
    });

    await renderList();

    const source = accountWithTypeLabel('Checking', 'checking');
    const destination = accountWithTypeLabel('Visa', 'credit');
    expect(
      screen.getByRole('button', {
        name: `Transfer from ${source} to ${destination}, ${money(24000)}, 2026-11-02`,
      }),
    ).toBeInTheDocument();
  });

  it('navigates to the editor when a row is clicked', async () => {
    const user = userEvent.setup();
    const entry = await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: visa.id,
      date: '2026-11-02',
    });

    await renderList();
    await user.click(screen.getByRole('button', { name: /^Transfer from/ }));

    expect(window.location.hash).toBe(`#/entry/${entry.id}`);
  });

  it('keeps a row whose account is missing clickable', async () => {
    const user = userEvent.setup();
    const entry = await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: visa.id,
      date: '2026-11-02',
    });
    await db.accounts.delete(visa.id);

    await renderList();

    expect(screen.getByText(/Unknown account/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Transfer from/ }));

    expect(window.location.hash).toBe(`#/entry/${entry.id}`);
  });

  it('updates through the live query after a transfer is added', async () => {
    await renderList();
    expect(screen.getByText('No transfers yet.')).toBeInTheDocument();

    await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: visa.id,
      date: '2026-11-02',
    });

    await waitFor(() =>
      expect(screen.queryByText('No transfers yet.')).not.toBeInTheDocument(),
    );
    expect(screen.getByText(money(24000))).toBeInTheDocument();
  });

  it('shows a renamed account on both sides', async () => {
    await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: visa.id,
      date: '2026-11-02',
    });

    await renderList();
    await ledger.renameAccount(checking.id, 'Current');
    await ledger.renameAccount(visa.id, 'Rewards card');

    await waitFor(() =>
      expect(screen.getByText(/Current/)).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByText(/Rewards card/)).toBeInTheDocument(),
    );
  });

  it('shows Add transfer only with two accounts and a non-empty list', async () => {
    await renderList();
    expect(
      screen.queryByRole('button', { name: 'Add transfer' }),
    ).not.toBeInTheDocument();

    await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: visa.id,
      date: '2026-11-02',
    });

    expect(
      await screen.findByRole('button', { name: 'Add transfer' }),
    ).toBeInTheDocument();
  });

  it('returns home at the current month from Back', async () => {
    const user = userEvent.setup();

    await renderList();
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(window.location.hash).toBe(
      `#/?m=${monthOf(todayLocalDate())}`,
    );
  });
});
