import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { todayLocalDate } from '../../domain/calendar';
import type { Account } from '../../domain/types';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { AddTransferScreen } from './AddTransferScreen';

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

async function renderForm() {
  render(<AddTransferScreen ledger={ledger} />);
  await screen.findByLabelText('Amount');
}

async function selectAccount(
  group: 'From account' | 'To account',
  name: string,
) {
  const user = userEvent.setup();
  await user.click(
    within(screen.getByRole('group', { name: group })).getByRole('button', {
      name,
    }),
  );
}

describe('AddTransferScreen', () => {
  it('shows the two-account gate instead of a form', async () => {
    const user = userEvent.setup();
    await db.accounts.delete(visa.id);

    render(<AddTransferScreen ledger={ledger} />);

    expect(
      await screen.findByText('You need two accounts to record a transfer.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accounts' }));

    expect(window.location.hash).toBe('#/accounts');
  });

  it('defaults amount, source, destination, and date', async () => {
    await db.settings.update('app', { lastAccountId: visa.id });

    await renderForm();

    expect(screen.getByLabelText('Amount')).toHaveValue('');
    expect(screen.getByLabelText('Date')).toHaveValue(todayLocalDate());
    expect(
      within(screen.getByRole('group', { name: 'From account' })).getByRole(
        'button',
        { name: 'Visa · Credit card' },
      ),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'To account' })).getByRole(
        'button',
        { name: 'Checking · Checking' },
      ),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to the first account when lastAccountId is stale', async () => {
    await db.settings.update('app', { lastAccountId: 'missing' });

    await renderForm();

    expect(
      within(screen.getByRole('group', { name: 'From account' })).getByRole(
        'button',
        { name: 'Checking · Checking' },
      ),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'To account' })).getByRole(
        'button',
        { name: 'Visa · Credit card' },
      ),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves one transfer and leaves the last expense account unchanged', async () => {
    const user = userEvent.setup();
    await db.settings.update('app', { lastAccountId: visa.id });
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '240.00');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(window.location.hash).toBe('#/transfers'),
    );
    const entries = await db.entries.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'transfer',
      amountMinor: 24000,
      accountId: visa.id,
      toAccountId: checking.id,
      date: todayLocalDate(),
    });
    expect((await db.settings.get('app'))?.lastAccountId).toBe(visa.id);
  });

  it('accepts a comma decimal separator', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '12,34');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
    expect((await db.entries.toArray())[0]?.amountMinor).toBe(1234);
  });

  it.each(['0', '-5'])(
    'rejects amount %s and writes nothing',
    async (amount) => {
      const user = userEvent.setup();
      await renderForm();

      await user.type(screen.getByLabelText('Amount'), amount);
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(
        await screen.findByText('Enter an amount greater than zero.'),
      ).toBeInTheDocument();
      expect(await db.entries.count()).toBe(0);
    },
  );

  it('rejects the same account on both sides', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    await selectAccount('From account', 'Visa · Credit card');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Choose two different accounts.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('rejects a cleared date', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '' },
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Choose a valid date.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('stores an earlier-month date', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-01-15' },
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
    expect((await ledger.listTransfers())[0]?.date).toBe('2025-01-15');
  });

  it('accepts a credit card on either side', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    await selectAccount('From account', 'Visa · Credit card');
    await selectAccount('To account', 'Checking · Checking');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
    expect((await db.entries.toArray())[0]).toMatchObject({
      accountId: visa.id,
      toAccountId: checking.id,
    });
  });

  it('writes one transfer on a rapid double submit and disables Save', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    const save = screen.getByRole('button', { name: 'Save' });
    const form = save.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    expect(save).toBeDisabled();
    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
  });

  it('maps a deleted source to the source picker', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Savings', type: 'savings' });
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    await db.accounts.delete(checking.id);
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Checking · Checking' }),
      ).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await within(
        screen.getByRole('group', { name: 'From account' }),
      ).findByText('That account no longer exists. Choose another.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('maps a deleted destination to the destination picker', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Savings', type: 'savings' });
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    await selectAccount('To account', 'Visa · Credit card');
    await db.accounts.delete(visa.id);
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Visa · Credit card' }),
      ).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await within(
        screen.getByRole('group', { name: 'To account' }),
      ).findByText('That account no longer exists. Choose another.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('returns to the list from Cancel without writing', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(window.location.hash).toBe('#/transfers');
    expect(await db.entries.count()).toBe(0);
  });
});
