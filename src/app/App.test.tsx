import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  formatMonth,
  monthOf,
  todayLocalDate,
} from '../domain/calendar';
import {
  createBackupFile,
  serializeBackup,
} from '../domain/backup';
import type { BackupData } from '../domain/backup';
import { BudgetDatabase } from '../data/db';
import { createLedger } from '../data/ledger';
import type { Ledger } from '../data/ledger';
import { App } from './App';
import { BootError } from './BootError';
import { boot } from '../main';

let db: BudgetDatabase;
let ledger: Ledger;

beforeEach(async () => {
  db = new BudgetDatabase(`budget-test-${crypto.randomUUID()}`);
  window.location.hash = '';
  ledger = createLedger(db);
  await ledger.initialize();
});

afterEach(async () => {
  await db.delete();
});

describe('App', () => {
  it('forces the accounts screen with zero accounts, including a deep link', async () => {
    window.location.hash = '#/add';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Accounts' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/accounts');
  });

  it('forces accounts from a zero-account #/categories deep link', async () => {
    window.location.hash = '#/categories';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Accounts' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/accounts');
  });

  it('renders the categories screen from #/categories with an account', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    window.location.hash = '#/categories';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Categories' }),
    ).toBeInTheDocument();
  });

  it('removes the gate after the first account and Start logging reaches home', async () => {
    const user = userEvent.setup();
    render(<App ledger={ledger} />);
    await screen.findByRole('heading', { name: 'Accounts' });

    await user.type(screen.getByLabelText('Account name'), 'Checking');
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    await user.click(
      await screen.findByRole('button', { name: 'Start logging' }),
    );

    expect(
      await screen.findByRole('heading', {
        name: formatMonth(monthOf(todayLocalDate())),
      }),
    ).toBeInTheDocument();
  });

  it('renders home at the current month from #/', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    window.location.hash = '#/';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', {
        name: formatMonth(monthOf(todayLocalDate())),
      }),
    ).toBeInTheDocument();
  });

  it('renders the add form from #/add', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    window.location.hash = '#/add';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Add expense' }),
    ).toBeInTheDocument();
  });

  it('renders the backup screen from #/backup', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    window.location.hash = '#/backup';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Backup' }),
    ).toBeInTheDocument();
  });

  it('renders accounts from #/accounts', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    window.location.hash = '#/accounts';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Accounts' }),
    ).toBeInTheDocument();
  });

  it('renders the transfers screen from #/transfers with one account', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    window.location.hash = '#/transfers';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Transfers' }),
    ).toBeInTheDocument();
  });

  it('renders the add transfer form from #/transfers/new with two accounts', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    await ledger.addAccount({ name: 'Visa', type: 'credit' });
    window.location.hash = '#/transfers/new';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Add transfer' }),
    ).toBeInTheDocument();
  });

  it('renders home for an unknown route without rewriting the hash', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    window.location.hash = '#/nope';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', {
        name: formatMonth(monthOf(todayLocalDate())),
      }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/nope');
  });
});

describe('BootError', () => {
  it('shows the boot failure copy and a Reload button', () => {
    render(<BootError error={new Error('boom')} />);

    expect(
      screen.getByText("Budget couldn't open its local data."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('renders the boot error when initialize rejects', async () => {
    const failingLedger = createLedger(db);
    failingLedger.initialize = async () => {
      throw new Error('boom');
    };
    const container = document.createElement('div');
    document.body.append(container);

    await act(async () => {
      await boot(failingLedger, container);
    });

    await waitFor(() =>
      expect(container).toHaveTextContent(
        "Budget couldn't open its local data.",
      ),
    );
    container.remove();
  });
});


function restoredData(withAccounts: boolean): BackupData {
  return {
    accounts: withAccounts
      ? [
          {
            id: 'acct-restored',
            name: 'Restored checking',
            type: 'checking',
            createdAt: '2026-11-01T12:00:00.000Z',
          },
        ]
      : [],
    categories: [{ id: 'cat_food', name: 'Food', archived: false }],
    entries: withAccounts
      ? [
          {
            id: 'entry-restored',
            kind: 'expense',
            date: todayLocalDate(),
            amountMinor: 4321,
            accountId: 'acct-restored',
            categoryId: 'cat_food',
          },
        ]
      : [],
    settings: { currency: 'CAD', currencyExponent: 2 },
  };
}

function backupUpload(withAccounts: boolean): File {
  return new File(
    [
      serializeBackup(
        createBackupFile(
          restoredData(withAccounts),
          new Date('2026-11-09T08:00:00.000Z'),
        ),
      ),
    ],
    'budget-backup.json',
    { type: 'application/json' },
  );
}

describe('App backup and restore', () => {
  it('allows #/backup with zero accounts and does not bounce it', async () => {
    window.location.hash = '#/backup';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Backup' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/backup');
    expect(
      screen.queryByRole('heading', { name: 'Accounts' }),
    ).not.toBeInTheDocument();
  });

  it('restores from a fresh profile and lands on home with the restored total', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/backup';
    render(<App ledger={ledger} />);
    await screen.findByRole('heading', { name: 'Backup' });

    await user.upload(
      screen.getByLabelText('Restore from backup'),
      backupUpload(true),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Restore backup' }),
    );

    expect(
      await screen.findByRole('heading', {
        name: formatMonth(monthOf(todayLocalDate())),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
      '43.21',
    );
    expect(window.location.hash).toBe(
      `#/?m=${monthOf(todayLocalDate())}`,
    );

    await ledger.addExpense({
      amountMinor: 100,
      categoryId: 'cat_food',
      accountId: 'acct-restored',
      date: todayLocalDate(),
    });
    await waitFor(() =>
      expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
        '44.21',
      ),
    );
  });

  it('lands on accounts when the restored backup has no accounts', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/backup';
    render(<App ledger={ledger} />);
    await screen.findByRole('heading', { name: 'Backup' });

    await user.upload(
      screen.getByLabelText('Restore from backup'),
      backupUpload(false),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Restore backup' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Accounts' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/accounts');
  });
});
