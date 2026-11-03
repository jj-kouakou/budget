import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  formatMonth,
  monthOf,
  todayLocalDate,
} from '../domain/calendar';
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

  it('renders accounts from #/accounts', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    window.location.hash = '#/accounts';

    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Accounts' }),
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
