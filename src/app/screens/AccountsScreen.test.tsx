import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import { AccountsScreen } from './AccountsScreen';

let db: BudgetDatabase;

beforeEach(async () => {
  db = new BudgetDatabase(`budget-test-${crypto.randomUUID()}`);
  window.location.hash = '';
  const ledger = createLedger(db);
  await ledger.initialize();
});

afterEach(async () => {
  await db.delete();
});

function renderScreen() {
  return render(<AccountsScreen ledger={createLedger(db)} />);
}

describe('AccountsScreen', () => {
  it('adds an account, shows its type, and reveals Start logging', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(await screen.findByLabelText('Account name'), 'Checking');
    await user.click(screen.getByRole('button', { name: 'Add account' }));

    const row = await screen.findByRole('listitem');
    expect(
      within(row).getByText('Checking', { selector: '.account-name' }),
    ).toBeInTheDocument();
    expect(
      within(row).getByText('Checking', { selector: '.account-type' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start logging' }),
    ).toBeInTheDocument();
  });

  it('navigates home to the current month from Start logging', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(await screen.findByLabelText('Account name'), 'Checking');
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    await screen.findByRole('button', { name: 'Start logging' });

    await user.click(screen.getByRole('button', { name: 'Start logging' }));

    expect(window.location.hash).toBe(
      `#/?m=${monthOf(todayLocalDate())}`,
    );
  });

  it('renames an account with the Save button', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    const input = screen.getByLabelText('Rename Checking');
    await user.clear(input);
    await user.type(input, 'Chequing');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Chequing')).toBeInTheDocument();
  });

  it('saves a rename on Enter and cancels on Escape', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    let input = screen.getByLabelText('Rename Checking');
    await user.clear(input);
    await user.type(input, 'Chequing{Enter}');
    expect(await screen.findByText('Chequing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    input = screen.getByLabelText('Rename Chequing');
    await user.clear(input);
    await user.type(input, 'Nope{Escape}');
    expect(screen.getByText('Chequing')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Nope')).not.toBeInTheDocument();
  });

  it('rejects an empty name without writing an account', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(
      await screen.findByRole('button', { name: 'Add account' }),
    );

    expect(
      await screen.findByText(
        'Enter an account name of 60 characters or fewer.',
      ),
    ).toBeInTheDocument();
    expect(await db.accounts.count()).toBe(0);
  });

  it('renders accounts in listAccounts order', async () => {
    const ledger = createLedger(db);
    await db.accounts.bulkAdd([
      {
        id: 'acct-b',
        name: 'Second',
        type: 'savings',
        createdAt: '2026-11-02T12:00:00.000Z',
      },
      {
        id: 'acct-a',
        name: 'First',
        type: 'checking',
        createdAt: '2026-11-01T12:00:00.000Z',
      },
    ]);
    renderScreen();

    await screen.findByText('First');
    const names = screen
      .getAllByRole('listitem')
      .map((row) => row.querySelector('.account-name')?.textContent);
    expect(names).toEqual(
      (await ledger.listAccounts()).map((account) => account.name),
    );
  });

  it('reports a stale rename and keeps the list correct', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    const account = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    await db.accounts.delete(account.id);
    await waitFor(() =>
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('That account no longer exists.'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument(),
    );
  });
});
