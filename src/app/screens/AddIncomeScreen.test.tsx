import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { todayLocalDate } from '../../domain/calendar';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { accountWithTypeLabel } from '../labels';
import { AddIncomeScreen } from './AddIncomeScreen';

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

async function renderForm() {
  render(<AddIncomeScreen ledger={ledger} />);
  await screen.findByRole('heading', { name: 'Add income' });
}

async function selectCategory(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name }));
}

function pressedButton(label: string): HTMLElement {
  const button = screen.getByRole('button', { name: label });
  expect(button).toHaveAttribute('aria-pressed', 'true');
  return button;
}

describe('AddIncomeScreen', () => {
  it('shows the no-category gate when every category is archived', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    for (const category of await ledger.listCategories()) {
      await ledger.setCategoryArchived(category.id, true);
    }

    await renderForm();

    expect(
      screen.getByText(
        'There is no category to file income under. Add or unarchive one in Categories.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Categories' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Date')).not.toBeInTheDocument();
  });

  it('shows the no-category gate when there are no categories at all', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    await db.categories.clear();

    await renderForm();

    expect(
      screen.getByText(
        'There is no category to file income under. Add or unarchive one in Categories.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Amount'),
    ).not.toBeInTheDocument();
  });

  it('seeds amount, category, account, and date defaults', async () => {
    await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    const savings = await ledger.addAccount({
      name: 'Savings',
      type: 'savings',
    });
    await db.settings.update('app', { lastAccountId: savings.id });

    await renderForm();

    expect(screen.getByLabelText('Amount')).toHaveValue('');
    expect(screen.getByLabelText('Date')).toHaveValue(todayLocalDate());
    pressedButton(accountWithTypeLabel('Savings', 'savings'));
    expect(
      screen.getByRole('button', {
        name: accountWithTypeLabel('Checking', 'checking'),
      }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-pressed') === 'true'),
    ).toHaveLength(1);
  });

  it('falls back to the first account when lastAccountId is stale', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    await ledger.addAccount({ name: 'Savings', type: 'savings' });
    await db.settings.update('app', { lastAccountId: 'gone' });

    await renderForm();

    pressedButton(accountWithTypeLabel('Checking', 'checking'));
  });

  it('saves one income, navigates to the list, and leaves lastAccountId', async () => {
    const user = userEvent.setup();
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    await ledger.addAccount({ name: 'Savings', type: 'savings' });
    await db.settings.update('app', { lastAccountId: checking.id });

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '2400.00');
    await selectCategory('Other');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
    expect((await db.entries.toArray())[0]).toMatchObject({
      kind: 'income',
      amountMinor: 240000,
      categoryId: 'cat_other',
      accountId: checking.id,
      date: todayLocalDate(),
    });
    expect(window.location.hash).toBe('#/income');
    expect((await db.settings.get('app'))?.lastAccountId).toBe(
      checking.id,
    );
  });

  it('accepts a comma decimal separator', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Checking', type: 'checking' });

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '12,34');
    await selectCategory('Other');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
    expect((await db.entries.toArray())[0]?.amountMinor).toBe(1234);
  });

  it('rejects zero and negative amounts', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Checking', type: 'checking' });

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '0');
    await selectCategory('Other');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Enter an amount greater than zero.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('requires a category', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Checking', type: 'checking' });

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '100');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Choose a category.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('requires an account when none exists', async () => {
    const user = userEvent.setup();

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '100');
    await selectCategory('Other');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Choose an account.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('rejects a cleared date', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Checking', type: 'checking' });

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '100');
    await selectCategory('Other');
    await user.clear(screen.getByLabelText('Date'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Choose a valid date.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('stores an earlier-month date', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Checking', type: 'checking' });

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '100');
    await selectCategory('Other');
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-01-15' },
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
    expect((await db.entries.toArray())[0]?.date).toBe('2025-01-15');
  });

  it('accepts a credit card account', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Visa', type: 'credit' });

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '100');
    await selectCategory('Other');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
  });

  it('writes once on a rapid double submit and disables Save', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });

    await renderForm();
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '100' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));

    const form = screen.getByRole('button', { name: 'Save' })
      .closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(async () => {
      expect(await db.entries.count()).toBe(1);
    });
  });

  it('maps a stale account to the account field', async () => {
    const user = userEvent.setup();
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '100');
    await selectCategory('Other');
    await db.accounts.delete(checking.id);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('That account no longer exists. Choose another.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('maps a stale category to the category field', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Checking', type: 'checking' });

    await renderForm();
    await user.type(screen.getByLabelText('Amount'), '100');
    await selectCategory('Other');
    await db.categories.delete('cat_other');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('That category no longer exists. Choose another.'),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(0);
  });

  it('does not offer archived categories', async () => {
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    await ledger.setCategoryArchived('cat_other', true);

    await renderForm();

    expect(
      screen.queryByRole('button', { name: 'Other' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Groceries' }),
    ).toBeInTheDocument();
  });

  it('cancels back to the list without writing', async () => {
    const user = userEvent.setup();
    await ledger.addAccount({ name: 'Checking', type: 'checking' });

    await renderForm();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(window.location.hash).toBe('#/income');
    expect(await db.entries.count()).toBe(0);
  });
});
