import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import type { Account, Entry } from '../../domain/types';
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
): Promise<Entry> {
  return ledger.addExpense({
    amountMinor,
    categoryId,
    accountId: checking.id,
    date,
  });
}

async function openFromCategoryList(amountLabel: RegExp) {
  window.location.hash = '#/category?m=2026-11&c=cat_groceries';
  render(<App ledger={ledger} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: amountLabel }));
  await screen.findByRole('heading', { name: 'Correct expense' });
  return user;
}

describe('EntryEditorScreen', () => {
  it('opens from a list row with all four fields prefilled', async () => {
    await addExpense(4500, 'cat_groceries', '2026-11-02');

    await openFromCategoryList(/45\.00 on 2026-11-02, Checking/);

    expect(screen.getByLabelText('Amount')).toHaveValue('45.00');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-02');
    expect(screen.getByRole('button', { name: 'Groceries' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Checking · Checking' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves an amount correction and updates the list and home totals', async () => {
    const entry = await addExpense(4500, 'cat_groceries', '2026-11-02');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '4.50');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(window.location.hash).toBe(
        '#/category?m=2026-11&c=cat_groceries',
      ),
    );
    expect((await screen.findByText('Spent')).closest('.spent')).toHaveTextContent(
      '4.50',
    );
    expect((await db.entries.get(entry.id))?.amountMinor).toBe(450);

    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() =>
      expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
        '4.50',
      ),
    );
    expect(
      screen.getByRole('button', { name: /^Groceries, / }),
    ).toHaveAccessibleName(/4\.50$/);
  });

  it('edits a credit-card entry the same way', async () => {
    const card = await ledger.addAccount({ name: 'Visa', type: 'credit' });
    const entry = await ledger.addExpense({
      amountMinor: 2500,
      categoryId: 'cat_groceries',
      accountId: card.id,
      date: '2026-11-02',
    });
    const user = await openFromCategoryList(
      /25\.00 on 2026-11-02, Visa/,
    );

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '20.00');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(window.location.hash).toBe(
        '#/category?m=2026-11&c=cat_groceries',
      ),
    );
    expect((await db.entries.get(entry.id))?.amountMinor).toBe(2000);
    expect((await screen.findByText('Spent')).closest('.spent')).toHaveTextContent(
      '20.00',
    );
  });

  it('moves an amount between categories and lands on the new list', async () => {
    const entry = await addExpense(4500, 'cat_groceries', '2026-11-02');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    await user.click(screen.getByRole('button', { name: 'Transport' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(window.location.hash).toBe(
        '#/category?m=2026-11&c=cat_transport',
      ),
    );
    expect(
      await screen.findByRole('heading', { name: /^Transport · / }),
    ).toBeInTheDocument();
    expect((await db.entries.get(entry.id))?.categoryId).toBe('cat_transport');
    expect((await screen.findByText('Spent')).closest('.spent')).toHaveTextContent(
      '45.00',
    );

    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /^Groceries, / }),
      ).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole('button', { name: /^Transport, / }),
    ).toHaveTextContent('45.00');
  });

  it('moves an entry to another month and leaves the old month', async () => {
    await addExpense(4500, 'cat_groceries', '2026-11-02');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2026-12-05' },
    });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(window.location.hash).toBe(
        '#/category?m=2026-12&c=cat_groceries',
      ),
    );
    expect((await screen.findByText('Spent')).closest('.spent')).toHaveTextContent(
      '45.00',
    );

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(window.location.hash).toBe('#/?m=2026-12'),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Previous month' }),
    );

    expect(
      await screen.findByText('No spending yet this month.'),
    ).toBeInTheDocument();
  });

  it('leaves the entry unchanged when Back is used without saving', async () => {
    const entry = await addExpense(4500, 'cat_groceries', '2026-11-02');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '9.99');
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() =>
      expect(window.location.hash).toBe(
        '#/category?m=2026-11&c=cat_groceries',
      ),
    );
    expect(await db.entries.get(entry.id)).toEqual(entry);
    expect((await screen.findByText('Spent')).closest('.spent')).toHaveTextContent(
      '45.00',
    );
  });

  it('shows not-found for a stale entry id and Go home works', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/entry/missing';
    render(<App ledger={ledger} />);

    expect(
      await screen.findByRole('heading', { name: 'Entry not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This entry no longer exists.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go home' }));

    expect(window.location.hash).toBe(
      `#/?m=${monthOf(todayLocalDate())}`,
    );
  });

  it('starts a missing stored category as an error and blocks saving', async () => {
    const orphan: Entry = {
      id: 'entry-orphan',
      kind: 'expense',
      date: '2026-11-02',
      amountMinor: 4500,
      accountId: checking.id,
      categoryId: 'cat_missing',
    };
    await db.entries.add(orphan);
    const user = userEvent.setup();
    window.location.hash = '#/entry/entry-orphan';
    render(<App ledger={ledger} />);

    expect(
      await screen.findByText(
        'That category no longer exists. Choose another.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await db.entries.get('entry-orphan')).toEqual(orphan);
    expect(window.location.hash).toBe('#/entry/entry-orphan');

    await user.click(screen.getByRole('button', { name: 'Groceries' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(window.location.hash).toBe(
        '#/category?m=2026-11&c=cat_groceries',
      ),
    );
    expect((await db.entries.get('entry-orphan'))?.categoryId).toBe(
      'cat_groceries',
    );
  });

  it('writes once on a rapid double submit and disables Save changes', async () => {
    const entry = await addExpense(4500, 'cat_groceries', '2026-11-02');
    await openFromCategoryList(/45\.00 on 2026-11-02, Checking/);

    const save = screen.getByRole('button', { name: 'Save changes' });
    const form = save.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    expect(save).toBeDisabled();
    expect((await db.entries.get(entry.id))?.amountMinor).toBe(4500);
  });
});

describe('EntryEditorScreen removal', () => {
  it('asks for confirmation, keeps the entry on Cancel, and focuses Cancel', async () => {
    const entry = await addExpense(4500, 'cat_groceries', '2026-11-02');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    await user.click(screen.getByRole('button', { name: 'Remove entry' }));

    const panel = screen.getByRole('group', { name: 'Confirm removal' });
    expect(panel).toHaveTextContent(
      /45\.00 on 2026-11-02 from Checking\? This cannot be undone\./,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('group', { name: 'Confirm removal' }),
    ).not.toBeInTheDocument();
    expect(await db.entries.get(entry.id)).toEqual(entry);
  });

  it('removes the entry and updates the list and home totals', async () => {
    const entry = await addExpense(4500, 'cat_groceries', '2026-11-02');
    await addExpense(800, 'cat_groceries', '2026-11-03');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    await user.click(screen.getByRole('button', { name: 'Remove entry' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(window.location.hash).toBe(
        '#/category?m=2026-11&c=cat_groceries',
      ),
    );
    expect(
      await screen.findByRole('heading', { name: /^Groceries · / }),
    ).toBeInTheDocument();
    expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
      '8.00',
    );
    expect(await db.entries.get(entry.id)).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(
      await screen.findByRole('button', { name: /^Groceries, / }),
    ).toHaveTextContent('8.00');
  });

  it("lands on home when removing the category's last entry", async () => {
    await addExpense(4500, 'cat_groceries', '2026-11-02');
    await addExpense(500, 'cat_transport', '2026-11-03');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    await user.click(screen.getByRole('button', { name: 'Remove entry' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(window.location.hash).toBe('#/?m=2026-11'),
    );
    expect(
      await screen.findByRole('button', { name: /^Transport, / }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Groceries, / }),
    ).not.toBeInTheDocument();
  });

  it('shows the empty home state after removing the month last entry', async () => {
    await addExpense(4500, 'cat_groceries', '2026-11-02');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    await user.click(screen.getByRole('button', { name: 'Remove entry' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(
      await screen.findByText('No spending yet this month.'),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/?m=2026-11');
    expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
      '0.00',
    );
  });

  it('removes a credit-card entry the same way', async () => {
    const card = await ledger.addAccount({ name: 'Visa', type: 'credit' });
    const entry = await ledger.addExpense({
      amountMinor: 2500,
      categoryId: 'cat_groceries',
      accountId: card.id,
      date: '2026-11-02',
    });
    const user = await openFromCategoryList(
      /25\.00 on 2026-11-02, Visa/,
    );

    await user.click(screen.getByRole('button', { name: 'Remove entry' }));
    expect(
      screen.getByRole('group', { name: 'Confirm removal' }),
    ).toHaveTextContent(/from Visa\?/);
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(window.location.hash).toBe('#/?m=2026-11'),
    );
    expect(await db.entries.get(entry.id)).toBeUndefined();
  });

  it('names the stored entry even after unsaved form changes', async () => {
    const entry = await addExpense(4500, 'cat_groceries', '2026-11-02');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '99.00');
    await user.click(screen.getByRole('button', { name: 'Transport' }));
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2026-12-01' },
    });

    await user.click(screen.getByRole('button', { name: 'Remove entry' }));

    const panel = screen.getByRole('group', { name: 'Confirm removal' });
    expect(panel).toHaveTextContent(
      /Remove .*45\.00 on 2026-11-02 from Checking\?/,
    );
    expect(panel).not.toHaveTextContent('99.00');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await db.entries.get(entry.id)).toEqual(entry);
  });

  it('deletes once on a rapid double Remove', async () => {
    const entry = await addExpense(4500, 'cat_groceries', '2026-11-02');
    const user = await openFromCategoryList(
      /45\.00 on 2026-11-02, Checking/,
    );

    await user.click(screen.getByRole('button', { name: 'Remove entry' }));
    const button = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    await waitFor(async () => {
      expect(await db.entries.get(entry.id)).toBeUndefined();
    });
  });

  it('shows not-found without redirecting when the entry vanishes', async () => {
    const entry = await addExpense(4500, 'cat_groceries', '2026-11-02');
    const url = `#/entry/${entry.id}`;
    await openFromCategoryList(/45\.00 on 2026-11-02, Checking/);

    await db.entries.delete(entry.id);

    expect(
      await screen.findByRole('heading', { name: 'Entry not found' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe(url);
  });
});
