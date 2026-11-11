import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import { AddExpenseScreen } from './AddExpenseScreen';
import { CategoriesScreen } from './CategoriesScreen';

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

async function renderScreen() {
  const view = render(<CategoriesScreen ledger={createLedger(db)} />);
  await screen.findByLabelText('Category name');
  return view;
}

describe('CategoriesScreen', () => {
  it('lists active categories before archived ones, alphabetical within each group', async () => {
    await db.categories.update('cat_bills', { archived: true });
    await db.categories.update('cat_fun', { archived: true });
    await renderScreen();

    await screen.findByRole('heading', { name: 'Active' });
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Eating out'),
      expect.stringContaining('Groceries'),
      expect.stringContaining('Health'),
      expect.stringContaining('Housing'),
      expect.stringContaining('Other'),
      expect.stringContaining('Shopping'),
      expect.stringContaining('Transport'),
      expect.stringContaining('Bills'),
      expect.stringContaining('Fun'),
    ]);
    const archivedRows = rows.slice(7);
    expect(archivedRows).toHaveLength(2);
    for (const row of archivedRows) {
      expect(within(row).getByText('Archived')).toBeInTheDocument();
    }
  });

  it('omits the Archived heading when no category is archived', async () => {
    await renderScreen();

    await screen.findByRole('heading', { name: 'Active' });
    expect(
      screen.queryByRole('heading', { name: 'Archived' }),
    ).not.toBeInTheDocument();
  });

  it('adds a category, clears the input, and offers it on the add-expense screen', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    const view = await renderScreen();

    await user.type(screen.getByLabelText('Category name'), 'Coffee');
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    await screen.findByText('Coffee');
    expect(screen.getByLabelText('Category name')).toHaveValue('');

    view.unmount();
    render(<AddExpenseScreen ledger={ledger} />);
    expect(
      await screen.findByRole('button', { name: 'Coffee' }),
    ).toBeInTheDocument();
  });

  it('names an active category that already holds the name', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.type(screen.getByLabelText('Category name'), ' groceries ');
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    expect(
      await screen.findByText(
        'A category named “Groceries” already exists.',
      ),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('alert')).getByText(/Groceries/)).toBeInTheDocument();
  });

  it('names an archived category that already holds the name', async () => {
    const user = userEvent.setup();
    await db.categories.update('cat_fun', { archived: true });
    await renderScreen();

    await user.type(screen.getByLabelText('Category name'), 'fun');
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    expect(
      await screen.findByText('A category named “Fun” already exists.'),
    ).toBeInTheDocument();
  });

  it('rejects empty and overlong names without writing', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.click(screen.getByRole('button', { name: 'Add category' }));
    expect(
      await screen.findByText(
        'Enter a category name of 60 characters or fewer.',
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Category name'), {
      target: { value: 'a'.repeat(61) },
    });
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    expect(
      await screen.findByText(
        'Enter a category name of 60 characters or fewer.',
      ),
    ).toBeInTheDocument();
    expect(await db.categories.count()).toBe(9);
  });

  it('returns home for the current month from Back', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Back' }));

    await waitFor(() =>
      expect(window.location.hash).toBe(`#/?m=${monthOf(todayLocalDate())}`),
    );
  });
});
