import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { AddExpenseScreen } from './AddExpenseScreen';

let db: BudgetDatabase;
let ledger: Ledger;

beforeEach(async () => {
  db = new BudgetDatabase(`budget-test-${crypto.randomUUID()}`);
  window.location.hash = '';
  ledger = createLedger(db);
  await ledger.initialize();
  await ledger.addAccount({ name: 'Checking', type: 'checking' });
  await ledger.addAccount({ name: 'Visa', type: 'credit' });
});

afterEach(async () => {
  await db.delete();
});

async function renderForm() {
  render(<AddExpenseScreen ledger={ledger} />);
  await screen.findByLabelText('Amount');
}

async function selectCategory(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name }));
}

describe('AddExpenseScreen', () => {
  it('saves an expense and navigates to its month', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '12.34');
    await user.click(screen.getByRole('button', { name: 'Groceries' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
    const entry = (await db.entries.toArray())[0];
    expect(entry).toMatchObject({
      kind: 'expense',
      amountMinor: 1234,
      categoryId: 'cat_groceries',
      date: todayLocalDate(),
    });
    expect(window.location.hash).toBe(
      `#/?m=${monthOf(todayLocalDate())}`,
    );
  });

  it('defaults the date to today', async () => {
    await renderForm();

    expect(screen.getByLabelText('Date')).toHaveValue(todayLocalDate());
  });

  it('accepts a comma as the decimal separator', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '12,34');
    await selectCategory('Groceries');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
    expect((await db.entries.toArray())[0]?.amountMinor).toBe(1234);
  });

  it('rejects a zero amount and writes nothing', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '0');
    await selectCategory('Groceries');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Enter an amount greater than zero.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('requires a category', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Choose a category.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('rejects a cleared date', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    await selectCategory('Groceries');
    await user.clear(screen.getByLabelText('Date'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Choose a valid date.')).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('preselects the last-used account', async () => {
    const accounts = await ledger.listAccounts();
    const visa = accounts.find((account) => account.name === 'Visa');
    expect(visa).toBeDefined();
    await db.settings.update('app', { lastAccountId: visa?.id });

    await renderForm();

    expect(
      screen.getByRole('button', { name: 'Visa · Credit card' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Checking · Checking' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('writes one entry on a rapid double submit and disables Save', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText('Amount'), '10');
    await selectCategory('Groceries');
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

  it('maps a stale account to an account error', async () => {
    const user = userEvent.setup();
    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '10');
    await selectCategory('Groceries');
    await user.click(
      screen.getByRole('button', { name: 'Visa · Credit card' }),
    );

    const visa = (await ledger.listAccounts()).find(
      (account) => account.name === 'Visa',
    );
    await db.accounts.delete(visa?.id ?? '');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Save' }).closest(
        'form',
      ) as HTMLFormElement,
    );

    expect(
      await screen.findByText('That account no longer exists. Choose another.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('maps a stale category to a category error', async () => {
    const user = userEvent.setup();
    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '10');
    await selectCategory('Groceries');

    await db.categories.delete('cat_groceries');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Save' }).closest(
        'form',
      ) as HTMLFormElement,
    );

    expect(
      await screen.findByText(
        'That category no longer exists. Choose another.',
      ),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('does not offer an archived category but still offers active ones', async () => {
    await db.categories.update('cat_groceries', { archived: true });
    await renderForm();

    expect(
      screen.queryByRole('button', { name: 'Groceries' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Eating out' }),
    ).toBeInTheDocument();
  });

  it('points to Categories instead of a form when every category is archived', async () => {
    const user = userEvent.setup();
    await db.categories.toCollection().modify({ archived: true });
    render(<AddExpenseScreen ledger={ledger} />);

    expect(
      await screen.findByText(
        'There is no category to file this expense under. Add or unarchive one in Categories.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Category' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Account' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Categories' }));

    expect(window.location.hash).toBe('#/categories');
  });

  it('shows the same pointer state when the ledger has no categories', async () => {
    const user = userEvent.setup();
    await db.categories.clear();
    render(<AddExpenseScreen ledger={ledger} />);

    expect(
      await screen.findByText(
        'There is no category to file this expense under. Add or unarchive one in Categories.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Categories' }));

    expect(window.location.hash).toBe('#/categories');
  });

  it('maps a category archived after render to the archived error', async () => {
    const user = userEvent.setup();
    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '10');
    await selectCategory('Groceries');

    await db.categories.update('cat_groceries', { archived: true });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Groceries' }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.submit(
      screen.getByRole('button', { name: 'Save' }).closest(
        'form',
      ) as HTMLFormElement,
    );

    expect(
      await screen.findByText('That category is archived. Choose another.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });
});
