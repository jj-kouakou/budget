import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatAmount } from '../../domain/money';
import type { Account, Entry } from '../../domain/types';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { App } from '../App';

let db: BudgetDatabase;
let ledger: Ledger;
let checking: Account;
let visa: Account;
let savings: Account;

beforeEach(async () => {
  db = new BudgetDatabase(`budget-test-${crypto.randomUUID()}`);
  window.location.hash = '';
  ledger = createLedger(db);
  await ledger.initialize();
  checking = await ledger.addAccount({ name: 'Checking', type: 'checking' });
  visa = await ledger.addAccount({ name: 'Visa', type: 'credit' });
  savings = await ledger.addAccount({ name: 'Savings', type: 'savings' });
});

afterEach(async () => {
  await db.delete();
});

async function addTransfer(
  amountMinor = 24000,
  date = '2026-11-02',
): Promise<Entry> {
  return ledger.addTransfer({
    amountMinor,
    accountId: checking.id,
    toAccountId: visa.id,
    date,
  });
}

function money(amountMinor: number): string {
  return formatAmount(amountMinor, 'CAD', 2);
}

async function openEditor(entryId: string) {
  window.location.hash = `#/entry/${entryId}`;
  render(<App ledger={ledger} />);
  await screen.findByRole('heading', { name: 'Correct transfer' });
  return userEvent.setup();
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

describe('TransferEditorScreen', () => {
  it('opens from a list row with the stored values prefilled', async () => {
    const entry = await addTransfer();
    window.location.hash = '#/transfers';
    render(<App ledger={ledger} />);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /^Transfer from/ }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Correct transfer' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe(`#/entry/${entry.id}`);
    expect(screen.getByLabelText('Amount')).toHaveValue('240.00');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-02');
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

  it('saves an amount correction on the one row', async () => {
    const entry = await addTransfer();
    const user = await openEditor(entry.id);

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '25.00');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(window.location.hash).toBe('#/transfers'),
    );
    expect(await db.entries.count()).toBe(1);
    expect((await db.entries.get(entry.id))?.amountMinor).toBe(2500);
    expect((await ledger.listTransfers())[0]?.amountMinor).toBe(2500);
  });

  it('updates both account sides without creating a second row', async () => {
    const entry = await addTransfer();
    const user = await openEditor(entry.id);

    await selectAccount('From account', 'Savings · Savings');
    await selectAccount('To account', 'Checking · Checking');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(window.location.hash).toBe('#/transfers'),
    );
    expect(await db.entries.count()).toBe(1);
    expect(await db.entries.get(entry.id)).toMatchObject({
      accountId: savings.id,
      toAccountId: checking.id,
    });
  });

  it('moves the row when the date changes and leaves spending unchanged', async () => {
    const entry = await addTransfer();
    const other = await addTransfer(5000, '2026-11-03');
    const summary = await ledger.monthSummary('2026-11');
    const user = await openEditor(entry.id);

    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2026-11-04' },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect((await ledger.listTransfers())[0]?.id).toBe(entry.id);
    });
    expect((await ledger.listTransfers())[1]?.id).toBe(other.id);
    expect(await ledger.monthSummary('2026-11')).toEqual(summary);
  });

  it('leaves the transfer unchanged from Back', async () => {
    const entry = await addTransfer();
    const user = await openEditor(entry.id);

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '99.00');
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(window.location.hash).toBe('#/transfers');
    expect(await db.entries.get(entry.id)).toEqual(entry);
  });

  it('renders not-found for a stale id', async () => {
    window.location.hash = '#/entry/missing';
    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Entry not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Go home' }),
    ).toBeInTheDocument();
  });

  it('dispatches an expense id to the expense editor', async () => {
    const expense = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    window.location.hash = `#/entry/${expense.id}`;
    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Correct expense' }),
    ).toBeInTheDocument();
  });

  it('flags a missing source and saves after a replacement', async () => {
    const entry = await addTransfer();
    await db.accounts.delete(checking.id);
    const user = await openEditor(entry.id);

    expect(
      within(screen.getByRole('group', { name: 'From account' })).getByText(
        'That account no longer exists. Choose another.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await db.entries.get(entry.id)).toEqual(entry);

    await selectAccount('From account', 'Savings · Savings');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect((await db.entries.get(entry.id))?.accountId).toBe(savings.id);
    });
  });

  it('flags a missing destination and saves after a replacement', async () => {
    const entry = await addTransfer();
    await db.accounts.delete(visa.id);
    const user = await openEditor(entry.id);

    expect(
      within(screen.getByRole('group', { name: 'To account' })).getByText(
        'That account no longer exists. Choose another.',
      ),
    ).toBeInTheDocument();

    await selectAccount('To account', 'Savings · Savings');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect((await db.entries.get(entry.id))?.toAccountId).toBe(savings.id);
    });
  });

  it('flags a restored self-transfer and saves after correcting a side', async () => {
    await db.entries.add({
      id: 'restored-self',
      kind: 'transfer',
      date: '2026-11-02',
      amountMinor: 1000,
      accountId: checking.id,
      toAccountId: checking.id,
    });
    const user = await openEditor('restored-self');

    expect(
      screen.getByText('Choose two different accounts.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((await db.entries.get('restored-self'))?.toAccountId).toBe(
      checking.id,
    );

    await selectAccount('To account', 'Visa · Credit card');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect((await db.entries.get('restored-self'))?.toAccountId).toBe(
        visa.id,
      );
    });
  });

  it('names stored values in the confirmation and focuses Cancel', async () => {
    const entry = await addTransfer();
    const user = await openEditor(entry.id);

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '99.00');
    await user.click(screen.getByRole('button', { name: 'Remove transfer' }));

    const panel = screen.getByRole('group', { name: 'Confirm removal' });
    expect(panel).toHaveTextContent(
      `Remove ${money(24000)} on 2026-11-02 from Checking · Checking to Visa · Credit card? This cannot be undone.`,
    );
    expect(panel).not.toHaveTextContent('99.00');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(await db.entries.get(entry.id)).toEqual(entry);
  });

  it('closes the confirmation without writing from Cancel', async () => {
    const entry = await addTransfer();
    const user = await openEditor(entry.id);

    await user.click(screen.getByRole('button', { name: 'Remove transfer' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('group', { name: 'Confirm removal' }),
    ).not.toBeInTheDocument();
    expect(await db.entries.get(entry.id)).toEqual(entry);
  });

  it('removes the transfer and leaves spending unchanged', async () => {
    const entry = await addTransfer();
    await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    const summary = await ledger.monthSummary('2026-11');
    const user = await openEditor(entry.id);

    await user.click(screen.getByRole('button', { name: 'Remove transfer' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(window.location.hash).toBe('#/transfers'),
    );
    expect(await db.entries.get(entry.id)).toBeUndefined();
    expect(await ledger.monthSummary('2026-11')).toEqual(summary);
  });

  it('writes once on a rapid double submit and disables Save changes', async () => {
    const entry = await addTransfer();
    await openEditor(entry.id);

    const save = screen.getByRole('button', { name: 'Save changes' });
    const form = save.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    expect(save).toBeDisabled();
    expect((await db.entries.get(entry.id))?.amountMinor).toBe(24000);
    expect(await db.entries.count()).toBe(1);
  });

  it('deletes once on a rapid double Remove', async () => {
    const entry = await addTransfer();
    const user = await openEditor(entry.id);

    await user.click(screen.getByRole('button', { name: 'Remove transfer' }));
    const remove = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(remove);
    fireEvent.click(remove);

    expect(remove).toBeDisabled();
    await waitFor(async () => {
      expect(await db.entries.get(entry.id)).toBeUndefined();
    });
  });

  it('shows the empty list after removing the last transfer', async () => {
    const entry = await addTransfer();
    const user = await openEditor(entry.id);

    await user.click(screen.getByRole('button', { name: 'Remove transfer' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('No transfers yet.')).toBeInTheDocument();
  });
});
