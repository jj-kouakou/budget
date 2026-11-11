import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import { AddExpenseScreen } from './AddExpenseScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { CategoryEntriesScreen } from './CategoryEntriesScreen';
import { HomeScreen } from './HomeScreen';

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

  it('does not create a home row for a new category', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    const view = await renderScreen();

    await user.type(screen.getByLabelText('Category name'), 'Coffee');
    await user.click(screen.getByRole('button', { name: 'Add category' }));
    await screen.findByText('Coffee');

    view.unmount();
    render(<HomeScreen ledger={ledger} month="2026-11" />);

    expect(
      await screen.findByText('No spending yet this month.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument();
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

  it('renames an active category and propagates it to past-month reads', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    const account = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    await ledger.addExpense({
      amountMinor: 1234,
      categoryId: 'cat_groceries',
      accountId: account.id,
      date: '2026-10-14',
    });
    const entriesBefore = await db.entries.toArray();
    const settingsBefore = await db.settings.toArray();
    const view = await renderScreen();

    const row = rowFor('Groceries');
    await user.click(within(row).getByRole('button', { name: 'Rename' }));
    const input = within(row).getByLabelText('Rename Groceries');
    await user.clear(input);
    await user.type(input, 'Food');
    await user.click(within(row).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(rowFor('Food')).toBeInTheDocument());
    expect(await db.entries.toArray()).toEqual(entriesBefore);
    expect(await db.settings.toArray()).toEqual(settingsBefore);

    view.unmount();
    render(<HomeScreen ledger={ledger} month="2026-10" />);
    const homeRow = await screen.findByRole('listitem');
    expect(homeRow).toHaveTextContent('Food');
    expect(homeRow).toHaveTextContent('12.34');

    cleanup();
    render(
      <CategoryEntriesScreen
        ledger={ledger}
        month="2026-10"
        categoryId="cat_groceries"
      />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Food · October 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
      '12.34',
    );
  });

  it('renames an archived category from the Archived group', async () => {
    const user = userEvent.setup();
    await db.categories.update('cat_fun', { archived: true });
    await renderScreen();

    const row = rowFor('Fun');
    await user.click(within(row).getByRole('button', { name: 'Rename' }));
    const input = within(row).getByLabelText('Rename Fun');
    await user.clear(input);
    await user.type(input, 'Leisure');
    await user.click(within(row).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const renamed = rowFor('Leisure');
      expect(within(renamed).getByText('Archived')).toBeInTheDocument();
    });
  });

  it('shows the duplicate copy and keeps the old name', async () => {
    const user = userEvent.setup();
    await renderScreen();

    const row = rowFor('Groceries');
    await user.click(within(row).getByRole('button', { name: 'Rename' }));
    const input = within(row).getByLabelText('Rename Groceries');
    await user.clear(input);
    await user.type(input, 'Transport');
    await user.click(within(row).getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText(
        'A category named “Transport” already exists.',
      ),
    ).toBeInTheDocument();
    expect((await db.categories.get('cat_groceries'))?.name).toBe('Groceries');

    await user.click(within(row).getByRole('button', { name: 'Cancel' }));
    expect(rowFor('Groceries')).toBeInTheDocument();
  });

  it('renames to its own name with different capitalisation', async () => {
    const user = userEvent.setup();
    await renderScreen();

    const row = rowFor('Groceries');
    await user.click(within(row).getByRole('button', { name: 'Rename' }));
    const input = within(row).getByLabelText('Rename Groceries');
    await user.clear(input);
    await user.type(input, 'GROCERIES');
    await user.click(within(row).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(rowFor('GROCERIES')).toBeInTheDocument());
  });

  it('discards the draft on Cancel and Escape', async () => {
    const user = userEvent.setup();
    await renderScreen();

    let row = rowFor('Groceries');
    await user.click(within(row).getByRole('button', { name: 'Rename' }));
    let input = within(row).getByLabelText('Rename Groceries');
    await user.clear(input);
    await user.type(input, 'Nope');
    await user.click(within(row).getByRole('button', { name: 'Cancel' }));
    expect(rowFor('Groceries')).toBeInTheDocument();

    row = rowFor('Groceries');
    await user.click(within(row).getByRole('button', { name: 'Rename' }));
    input = within(row).getByLabelText('Rename Groceries');
    await user.clear(input);
    await user.type(input, 'Nope{Escape}');
    expect(rowFor('Groceries')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Nope')).not.toBeInTheDocument();
  });

  it('reports a stale row as unknown and keeps the form', async () => {
    const user = userEvent.setup();
    await renderScreen();

    const row = rowFor('Groceries');
    await user.click(within(row).getByRole('button', { name: 'Rename' }));
    await db.categories.delete('cat_groceries');

    const staleLabel = await screen.findByText('Rename Groceries', {
      selector: 'label',
    });
    const staleForm = staleLabel.closest('form') as HTMLFormElement;
    await user.click(within(staleForm).getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('That category no longer exists.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Rename Groceries')).toBeInTheDocument();
  });

  it('archives and unarchives without touching history or totals', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    const account = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    await ledger.addExpense({
      amountMinor: 1234,
      categoryId: 'cat_groceries',
      accountId: account.id,
      date: '2026-10-14',
    });
    const entriesBefore = await db.entries.toArray();
    const settingsBefore = await db.settings.toArray();
    const view = await renderScreen();

    let row = rowFor('Groceries');
    await user.click(within(row).getByRole('button', { name: 'Archive' }));

    await waitFor(() => {
      row = rowFor('Groceries');
      expect(within(row).getByText('Archived')).toBeInTheDocument();
    });
    expect(
      within(row).getByRole('button', { name: 'Unarchive' }),
    ).toBeInTheDocument();

    view.unmount();
    render(<HomeScreen ledger={ledger} month="2026-10" />);
    expect(await screen.findByRole('listitem')).toHaveTextContent('12.34');

    cleanup();
    render(
      <CategoryEntriesScreen
        ledger={ledger}
        month="2026-10"
        categoryId="cat_groceries"
      />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Groceries · October 2026' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /12\.34/ }),
    ).toBeInTheDocument();

    cleanup();
    await renderScreen();
    row = rowFor('Groceries');
    await user.click(within(row).getByRole('button', { name: 'Unarchive' }));

    await waitFor(() => {
      const restored = rowFor('Groceries');
      expect(
        within(restored).queryByText('Archived'),
      ).not.toBeInTheDocument();
    });
    const summary = await ledger.monthSummary('2026-10');
    expect(summary.totalMinor).toBe(1234);
    const entries = await ledger.categoryEntries('2026-10', 'cat_groceries');
    expect(entries.rows).toHaveLength(1);
    expect(entries.totalMinor).toBe(1234);
    expect(await db.entries.toArray()).toEqual(entriesBefore);
    expect(await db.settings.toArray()).toEqual(settingsBefore);
  });
});

function rowFor(name: string): HTMLElement {
  const cell = screen.getByText(name, { selector: '.category-name' });
  return cell.closest('li') as HTMLElement;
}
