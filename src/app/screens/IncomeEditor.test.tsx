import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatAmount, formatAmountInput } from '../../domain/money';
import type { Account, Entry } from '../../domain/types';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { accountWithTypeLabel } from '../labels';
import { EntryEditorScreen } from './EntryEditorScreen';

let db: BudgetDatabase;
let ledger: Ledger;
let checking: Account;
let savings: Account;
let entry: Entry;

beforeEach(async () => {
  db = new BudgetDatabase(`budget-test-${crypto.randomUUID()}`);
  window.location.hash = '';
  ledger = createLedger(db);
  await ledger.initialize();
  checking = await ledger.addAccount({ name: 'Checking', type: 'checking' });
  savings = await ledger.addAccount({ name: 'Savings', type: 'savings' });
  entry = await ledger.addIncome({
    amountMinor: 240000,
    categoryId: 'cat_other',
    accountId: checking.id,
    date: '2026-11-02',
  });
});

afterEach(async () => {
  await db.delete();
});

async function renderEditor(entryId = entry.id) {
  render(<EntryEditorScreen ledger={ledger} entryId={entryId} />);
  await screen.findByRole('heading', { name: 'Correct income' });
}

function money(amountMinor: number): string {
  return formatAmount(amountMinor, 'CAD', 2);
}

describe('IncomeEditorScreen', () => {
  it('seeds the form from the stored income', async () => {
    await renderEditor();

    expect(screen.getByLabelText('Amount')).toHaveValue(
      formatAmountInput(240000, 2),
    );
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-02');
    expect(
      screen.getByRole('button', { name: 'Other' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', {
        name: accountWithTypeLabel('Checking', 'checking'),
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves an amount correction on the one row', async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '2500');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect((await db.entries.get(entry.id))?.amountMinor).toBe(250000);
    });
    expect(await db.entries.count()).toBe(1);
    expect(window.location.hash).toBe('#/income');
    expect((await ledger.listIncome())[0]?.amountMinor).toBe(250000);
  });

  it('changes category, account, and date', async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.click(screen.getByRole('button', { name: 'Groceries' }));
    await user.click(
      screen.getByRole('button', {
        name: accountWithTypeLabel('Savings', 'savings'),
      }),
    );
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2027-01-01' },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect(await db.entries.get(entry.id)).toMatchObject({
        categoryId: 'cat_groceries',
        accountId: savings.id,
        date: '2027-01-01',
      });
    });
    expect(await db.entries.count()).toBe(1);
  });

  it('moves the row when the date moves to an earlier month', async () => {
    await db.entries.add({
      id: 'later',
      kind: 'income',
      date: '2027-01-01',
      amountMinor: 100,
      accountId: checking.id,
      categoryId: 'cat_other',
    });
    const user = userEvent.setup();
    await renderEditor();

    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-01-15' },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect((await ledger.listIncome()).map((row) => row.id)).toEqual([
        'later',
        entry.id,
      ]);
    });
    expect((await ledger.monthSummary('2025-01')).totalMinor).toBe(0);
  });

  it('leaves the row unchanged on Back', async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '1');
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(window.location.hash).toBe('#/income');
    expect(await db.entries.get(entry.id)).toEqual(entry);
  });

  it('shows not-found for a stale id', async () => {
    render(<EntryEditorScreen ledger={ledger} entryId="missing" />);

    expect(
      await screen.findByRole('heading', { name: 'Entry not found' }),
    ).toBeInTheDocument();
    expect(screen.getByText('This entry no longer exists.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Go home' }),
    ).toBeInTheDocument();
  });

  it('dispatches an expense id to the expense editor', async () => {
    const expense = await ledger.addExpense({
      amountMinor: 100,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    render(<EntryEditorScreen ledger={ledger} entryId={expense.id} />);

    expect(
      await screen.findByRole('heading', { name: 'Correct expense' }),
    ).toBeInTheDocument();
  });

  it('requires a replacement for a missing stored category', async () => {
    await db.categories.delete('cat_other');
    const user = userEvent.setup();
    await renderEditor();

    expect(
      screen.getByText('That category no longer exists. Choose another.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await db.entries.get(entry.id)).toEqual(entry);

    await user.click(screen.getByRole('button', { name: 'Groceries' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect((await db.entries.get(entry.id))?.categoryId).toBe(
        'cat_groceries',
      );
    });
    expect((await ledger.listIncome())[0]?.categoryName).toBe('Groceries');
  });

  it('requires a replacement for a missing stored account', async () => {
    await db.accounts.delete(checking.id);
    const user = userEvent.setup();
    await renderEditor();

    expect(
      screen.getByText('That account no longer exists. Choose another.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await db.entries.get(entry.id)).toEqual(entry);

    await user.click(
      screen.getByRole('button', {
        name: accountWithTypeLabel('Savings', 'savings'),
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect((await db.entries.get(entry.id))?.accountId).toBe(savings.id);
    });
  });

  it('keeps an archived stored category selectable', async () => {
    await ledger.setCategoryArchived('cat_other', true);
    const user = userEvent.setup();
    await renderEditor();

    const archived = screen.getByRole('button', {
      name: 'Other (archived)',
    });
    expect(archived).toHaveAttribute('aria-pressed', 'true');

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '99');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect(await db.entries.get(entry.id)).toMatchObject({
        amountMinor: 9900,
        categoryId: 'cat_other',
      });
    });
  });

  it('switches from an archived stored category to an active one', async () => {
    await ledger.setCategoryArchived('cat_other', true);
    const user = userEvent.setup();
    await renderEditor();

    await user.click(screen.getByRole('button', { name: 'Groceries' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(async () => {
      expect((await db.entries.get(entry.id))?.categoryId).toBe(
        'cat_groceries',
      );
    });
  });

  it('names the stored facts in the removal confirmation and focuses Cancel', async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.click(screen.getByRole('button', { name: 'Remove income' }));

    const group = screen.getByRole('group', { name: 'Confirm removal' });
    expect(group).toHaveTextContent(
      `Remove ${money(240000)} on 2026-11-02 for Other in ${accountWithTypeLabel('Checking', 'checking')}? This cannot be undone.`,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('group', { name: 'Confirm removal' }),
    ).not.toBeInTheDocument();
    expect(await db.entries.get(entry.id)).toEqual(entry);
  });

  it('removes the income and returns to the list', async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.click(screen.getByRole('button', { name: 'Remove income' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(async () => {
      expect(await db.entries.get(entry.id)).toBeUndefined();
    });
    expect(window.location.hash).toBe('#/income');
    expect((await ledger.monthSummary('2026-11')).totalMinor).toBe(0);
  });

  it('writes once on a rapid double submit', async () => {
    await renderEditor();

    const form = screen.getByRole('button', { name: 'Save changes' })
      .closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
  });

  it('deletes once on a rapid double removal', async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.click(screen.getByRole('button', { name: 'Remove income' }));
    const remove = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(remove);
    fireEvent.click(remove);

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(0);
    });
    expect(window.location.hash).toBe('#/income');
  });
});
