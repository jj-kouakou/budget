import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_MONTH,
  MIN_MONTH,
  formatMonth,
} from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import type { Account } from '../../domain/types';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { useHashRoute } from '../router';
import { HomeScreen } from './HomeScreen';

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
) {
  await ledger.addExpense({
    amountMinor,
    categoryId,
    accountId: checking.id,
    date,
  });
}

function money(amountMinor: number): string {
  return formatAmount(amountMinor, 'CAD', 2);
}

function HomeHarness({ ledger }: { ledger: Ledger }) {
  const route = useHashRoute();
  if (route.name !== 'home') {
    return null;
  }
  return <HomeScreen ledger={ledger} month={route.month} />;
}

describe('HomeScreen', () => {
  it('shows the month heading and formatted total', async () => {
    await addExpense(2000, 'cat_groceries');
    await addExpense(500, 'cat_transport');

    render(<HomeScreen ledger={ledger} month="2026-11" />);

    expect(
      await screen.findByRole('heading', { name: formatMonth('2026-11') }),
    ).toBeInTheDocument();
    expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
      '25.00',
    );
  });

  it('renders category rows in ledger order with formatted amounts', async () => {
    await addExpense(2000, 'cat_groceries');
    await addExpense(500, 'cat_transport');

    render(<HomeScreen ledger={ledger} month="2026-11" />);

    await screen.findByText('Groceries');
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Groceries');
    expect(rows[0]).toHaveTextContent('20.00');
    expect(rows[1]).toHaveTextContent('Transport');
    expect(rows[1]).toHaveTextContent('5.00');
  });

  it('shows the empty state and hides it once spending exists', async () => {
    render(<HomeScreen ledger={ledger} month="2026-11" />);

    expect(
      await screen.findByText('No spending yet this month.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add your first expense' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add expense' }),
    ).not.toBeInTheDocument();

    await addExpense(100, 'cat_groceries');

    await waitFor(() =>
      expect(
        screen.queryByText('No spending yet this month.'),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Add expense' }),
    ).toBeInTheDocument();
  });

  it('moves to the adjacent month and updates the heading', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/?m=2026-11';
    render(<HomeHarness ledger={ledger} />);

    await screen.findByRole('heading', { name: formatMonth('2026-11') });
    await user.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(window.location.hash).toBe('#/?m=2026-10');
    expect(
      await screen.findByRole('heading', { name: formatMonth('2026-10') }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next month' }));

    expect(window.location.hash).toBe('#/?m=2026-11');
    expect(
      await screen.findByRole('heading', { name: formatMonth('2026-11') }),
    ).toBeInTheDocument();
  });

  it('disables month controls at the calendar bounds', async () => {
    const { rerender } = render(
      <HomeScreen ledger={ledger} month={MIN_MONTH} />,
    );
    await screen.findByRole('heading', { name: formatMonth(MIN_MONTH) });
    expect(
      screen.getByRole('button', { name: 'Previous month' }),
    ).toBeDisabled();

    rerender(<HomeScreen ledger={ledger} month={MAX_MONTH} />);
    await screen.findByRole('heading', { name: formatMonth(MAX_MONTH) });
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('counts a credit-card expense in the total', async () => {
    const card = await ledger.addAccount({ name: 'Visa', type: 'credit' });
    await ledger.addExpense({
      amountMinor: 2500,
      categoryId: 'cat_groceries',
      accountId: card.id,
      date: '2026-11-02',
    });

    render(<HomeScreen ledger={ledger} month="2026-11" />);

    expect(
      await screen.findByText('Groceries'),
    ).toBeInTheDocument();
    expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
      '25.00',
    );
  });

  it('navigates to the add form', async () => {
    const user = userEvent.setup();
    await addExpense(100, 'cat_groceries');
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByRole('button', { name: 'Add expense' });

    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(window.location.hash).toBe('#/add');
  });

  it('navigates to accounts', async () => {
    const user = userEvent.setup();
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByRole('button', { name: 'Accounts' });

    await user.click(screen.getByRole('button', { name: 'Accounts' }));

    expect(window.location.hash).toBe('#/accounts');
  });

  it('navigates to the categories screen', async () => {
    const user = userEvent.setup();
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByRole('button', { name: 'Categories' });

    await user.click(screen.getByRole('button', { name: 'Categories' }));

    expect(window.location.hash).toBe('#/categories');
  });

  it('updates the total after a live write', async () => {
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByText('No spending yet this month.');

    await addExpense(1234, 'cat_groceries');

    await waitFor(() =>
      expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
        '12.34',
      ),
    );
  });

  it('renders every category row as a labelled button', async () => {
    await addExpense(2000, 'cat_groceries');

    render(<HomeScreen ledger={ledger} month="2026-11" />);

    const row = await screen.findByRole('button', {
      name: /^Groceries, /,
    });
    expect(row).toHaveTextContent('Groceries');
    expect(row).toHaveTextContent('20.00');
  });

  it('opens the category entries route for the displayed month', async () => {
    const user = userEvent.setup();
    await addExpense(2000, 'cat_groceries', '2026-10-05');
    window.location.hash = '#/?m=2026-10';
    render(<HomeHarness ledger={ledger} />);

    const row = await screen.findByRole('button', { name: /^Groceries, / });
    await user.click(row);

    expect(window.location.hash).toBe(
      '#/category?m=2026-10&c=cat_groceries',
    );
  });

  describe('comparison', () => {
    it('renders both month labels and both amounts for every row', async () => {
      await addExpense(1500, 'cat_groceries', '2026-10-05');
      await addExpense(300, 'cat_health', '2026-10-06');
      await addExpense(2000, 'cat_groceries', '2026-11-02');
      await addExpense(500, 'cat_transport', '2026-11-03');

      render(<HomeScreen ledger={ledger} month="2026-11" />);

      await screen.findByText(formatMonth('2026-10'));
      const header = document.querySelector('.comparison-header');
      expect(header?.textContent).toContain(formatMonth('2026-11'));
      expect(header?.textContent).toContain(formatMonth('2026-10'));

      const groceries = screen.getByRole('button', { name: /^Groceries, / });
      expect(groceries).toHaveTextContent(money(2000));
      expect(groceries).toHaveTextContent(money(1500));

      const transport = screen.getByRole('button', { name: /^Transport, / });
      expect(transport).toHaveTextContent(money(500));
      expect(transport).toHaveTextContent(money(0));

      const health = screen.getByRole('button', { name: /^Health, / });
      expect(health).toHaveTextContent(money(0));
      expect(health).toHaveTextContent(money(300));
    });

    it('puts previous-only rows last and makes them non-navigating', async () => {
      await addExpense(300, 'cat_health', '2026-10-06');
      await addExpense(2000, 'cat_groceries', '2026-11-02');
      window.location.hash = '#/?m=2026-11';

      render(<HomeHarness ledger={ledger} />);

      const health = await screen.findByRole('button', { name: /^Health, / });
      const rows = screen.getAllByRole('listitem');
      expect(rows[0]).toHaveTextContent('Groceries');
      expect(rows[1]).toHaveTextContent('Health');
      expect(health).toBeDisabled();

      fireEvent.click(health);

      expect(window.location.hash).toBe('#/?m=2026-11');
    });

    it('navigates a current row to the displayed month', async () => {
      const user = userEvent.setup();
      await addExpense(1500, 'cat_groceries', '2026-10-05');
      await addExpense(2000, 'cat_groceries', '2026-11-02');
      window.location.hash = '#/?m=2026-11';

      render(<HomeHarness ledger={ledger} />);

      const row = await screen.findByRole('button', { name: /^Groceries, / });
      await user.click(row);

      expect(window.location.hash).toBe(
        '#/category?m=2026-11&c=cat_groceries',
      );
    });

    it('renders an empty current month with the previous column and Add expense', async () => {
      await addExpense(2000, 'cat_groceries', '2026-10-05');
      await addExpense(500, 'cat_health', '2026-10-06');

      render(<HomeScreen ledger={ledger} month="2026-11" />);

      await screen.findByText('Groceries');
      expect(screen.getByText('Spent').closest('.spent')).toHaveTextContent(
        money(0),
      );
      const header = document.querySelector('.comparison-header');
      expect(header?.textContent).toContain(formatMonth('2026-11'));
      expect(header?.textContent).toContain(formatMonth('2026-10'));

      const groceries = screen.getByRole('button', { name: /^Groceries, / });
      const health = screen.getByRole('button', { name: /^Health, / });
      expect(groceries).toBeDisabled();
      expect(health).toBeDisabled();
      expect(groceries).toHaveTextContent(money(2000));
      expect(health).toHaveTextContent(money(500));

      expect(
        screen.getByRole('button', { name: 'Add expense' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('No spending yet this month.'),
      ).not.toBeInTheDocument();
    });

    it('keeps the empty state when neither month has spending', async () => {
      render(<HomeScreen ledger={ledger} month="2026-11" />);

      expect(
        await screen.findByText('No spending yet this month.'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Add your first expense' }),
      ).toBeInTheDocument();
      expect(document.querySelector('.home-comparison')).toBeNull();
      expect(document.querySelector('.comparison-header')).toBeNull();
    });

    it('compares January with the previous December', async () => {
      await addExpense(800, 'cat_groceries', '2026-12-05');
      await addExpense(500, 'cat_groceries', '2027-01-05');

      render(<HomeScreen ledger={ledger} month="2027-01" />);

      await screen.findByText('Groceries');
      const header = document.querySelector('.comparison-header');
      expect(header?.textContent).toContain(formatMonth('2027-01'));
      expect(header?.textContent).toContain(formatMonth('2026-12'));
      expect(
        screen.getByRole('button', {
          name: `Groceries, ${formatMonth('2027-01')}: ${money(500)}, ${formatMonth('2026-12')}: ${money(800)}`,
        }),
      ).toBeInTheDocument();
    });

    it('names both months and both amounts for enabled and disabled rows', async () => {
      await addExpense(300, 'cat_health', '2026-10-06');
      await addExpense(2000, 'cat_groceries', '2026-11-02');

      render(<HomeScreen ledger={ledger} month="2026-11" />);

      await screen.findByText('Groceries');
      expect(
        screen.getByRole('button', {
          name: `Groceries, ${formatMonth('2026-11')}: ${money(2000)}, ${formatMonth('2026-10')}: ${money(0)}`,
        }),
      ).toBeEnabled();
      expect(
        screen.getByRole('button', {
          name: `Health, ${formatMonth('2026-11')}: ${money(0)}, ${formatMonth('2026-10')}: ${money(300)}`,
        }),
      ).toBeDisabled();
    });

    it('updates both columns after a rename and keeps an archived category', async () => {
      await addExpense(1000, 'cat_groceries', '2026-10-05');
      await addExpense(500, 'cat_groceries', '2026-11-05');

      render(<HomeScreen ledger={ledger} month="2026-11" />);

      await screen.findByRole('button', { name: /^Groceries, / });
      await ledger.renameCategory('cat_groceries', 'Food');

      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: /^Groceries, / }),
        ).not.toBeInTheDocument(),
      );
      const food = screen.getByRole('button', { name: /^Food, / });
      expect(food).toHaveTextContent(money(500));
      expect(food).toHaveTextContent(money(1000));

      await ledger.setCategoryArchived('cat_groceries', true);

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /^Food, / })).toHaveTextContent(
          money(1000),
        ),
      );
    });

    it('updates both columns after a boundary correction and a removal', async () => {
      const entry = await ledger.addExpense({
        amountMinor: 1000,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-02',
      });
      await addExpense(300, 'cat_health', '2026-10-06');

      render(<HomeScreen ledger={ledger} month="2026-11" />);

      await screen.findByRole('button', { name: /^Groceries, / });
      await ledger.updateExpense(entry.id, {
        amountMinor: 700,
        categoryId: 'cat_transport',
        accountId: checking.id,
        date: '2026-10-15',
      });

      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: /^Groceries, / }),
        ).not.toBeInTheDocument(),
      );
      const transport = screen.getByRole('button', { name: /^Transport, / });
      expect(transport).toBeDisabled();
      expect(transport).toHaveTextContent(money(0));
      expect(transport).toHaveTextContent(money(700));
      expect(screen.getByRole('button', { name: /^Health, / })).toHaveTextContent(
        money(300),
      );

      await ledger.deleteExpense(entry.id);

      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: /^Transport, / }),
        ).not.toBeInTheDocument(),
      );
      expect(
        screen.getByRole('button', { name: /^Health, / }),
      ).toBeInTheDocument();
    });

    it('moves the comparison with month navigation', async () => {
      const user = userEvent.setup();
      await addExpense(700, 'cat_groceries', '2026-09-05');
      await addExpense(1000, 'cat_groceries', '2026-10-05');
      await addExpense(500, 'cat_groceries', '2026-11-05');
      window.location.hash = '#/?m=2026-11';

      render(<HomeHarness ledger={ledger} />);

      await screen.findByRole('button', {
        name: `Groceries, ${formatMonth('2026-11')}: ${money(500)}, ${formatMonth('2026-10')}: ${money(1000)}`,
      });
      await user.click(screen.getByRole('button', { name: 'Previous month' }));

      await screen.findByRole('heading', { name: formatMonth('2026-10') });
      expect(
        await screen.findByRole('button', {
          name: `Groceries, ${formatMonth('2026-10')}: ${money(1000)}, ${formatMonth('2026-09')}: ${money(700)}`,
        }),
      ).toBeInTheDocument();
    });

    it('names an empty previous month above the single-amount rows', async () => {
      await addExpense(2000, 'cat_groceries', '2026-11-02');

      render(<HomeScreen ledger={ledger} month="2026-11" />);

      await screen.findByText('Groceries');
      expect(
        screen.getByText(
          `No spending recorded in ${formatMonth('2026-10')}.`,
        ),
      ).toBeInTheDocument();
      expect(document.querySelector('.comparison-header')).toBeNull();
      expect(document.querySelector('.home-comparison')).toBeNull();

      const row = screen.getByRole('button', { name: /^Groceries, / });
      expect(row).toBeEnabled();
      expect(row.textContent).toBe(`Groceries${money(2000)}`);
    });

    it('shows no note at the lower bound', async () => {
      await addExpense(500, 'cat_groceries', '0001-01-15');

      render(<HomeScreen ledger={ledger} month={MIN_MONTH} />);

      await screen.findByText('Groceries');
      expect(
        screen.getByRole('button', { name: `Groceries, ${money(500)}` }),
      ).toBeEnabled();
      expect(screen.queryByText(/^No spending recorded in /)).toBeNull();
      expect(document.querySelector('.comparison-header')).toBeNull();
    });

    it('does not render the note in the comparison or empty states', async () => {
      await addExpense(300, 'cat_health', '2026-10-06');
      await addExpense(2000, 'cat_groceries', '2026-11-02');

      const comparison = render(
        <HomeScreen ledger={ledger} month="2026-11" />,
      );
      await screen.findByText('Groceries');
      expect(screen.queryByText(/^No spending recorded in /)).toBeNull();
      comparison.unmount();

      render(<HomeScreen ledger={ledger} month="2027-03" />);
      await screen.findByText('No spending yet this month.');
      expect(screen.queryByText(/^No spending recorded in /)).toBeNull();
    });
  });
});

describe('HomeScreen backup action', () => {
  it('navigates to the backup screen', async () => {
    const user = userEvent.setup();
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByRole('button', { name: 'Backup' });

    await user.click(screen.getByRole('button', { name: 'Backup' }));

    expect(window.location.hash).toBe('#/backup');
  });
});

describe('HomeScreen storage warning', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(
    navigator,
    'storage',
  );

  function setStorage(storage: unknown): void {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: storage,
    });
  }

  afterEach(() => {
    if (originalStorage) {
      Object.defineProperty(navigator, 'storage', originalStorage);
    } else {
      Reflect.deleteProperty(navigator, 'storage');
    }
  });

  it('warns when the browser may discard the ledger and links to backup', async () => {
    const user = userEvent.setup();
    setStorage({
      persist: vi.fn().mockResolvedValue(false),
      persisted: vi.fn().mockResolvedValue(false),
    });
    render(<HomeScreen ledger={ledger} month="2026-11" />);

    expect(
      await screen.findByText('This phone may discard your ledger.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back up now' }));

    expect(window.location.hash).toBe('#/backup');
  });

  it('warns when the browser cannot confirm storage status', async () => {
    setStorage(undefined);
    render(<HomeScreen ledger={ledger} month="2026-11" />);

    expect(
      await screen.findByText(
        "This browser can't confirm it will keep your ledger.",
      ),
    ).toBeInTheDocument();
  });

  it('renders nothing when storage is persisted', async () => {
    setStorage({
      persist: vi.fn().mockResolvedValue(true),
      persisted: vi.fn().mockResolvedValue(true),
    });
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByText('No spending yet this month.');
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Back up now' }),
      ).not.toBeInTheDocument();
    });

    expect(
      screen.queryByText('This phone may discard your ledger.'),
    ).not.toBeInTheDocument();
  });

  it('never flashes the warning while the status is undefined', async () => {
    const persisted = Promise.withResolvers<boolean>();
    setStorage({
      persist: vi.fn().mockResolvedValue(true),
      persisted: vi.fn().mockReturnValue(persisted.promise),
    });
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByText('No spending yet this month.');

    expect(
      screen.queryByRole('button', { name: 'Back up now' }),
    ).not.toBeInTheDocument();

    persisted.resolve(false);
    await screen.findByRole('button', { name: 'Back up now' });
  });

  it('shows a Transfers action in the empty state and navigates to the list', async () => {
    const user = userEvent.setup();
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByText('No spending yet this month.');

    await user.click(screen.getByRole('button', { name: 'Transfers' }));

    expect(window.location.hash).toBe('#/transfers');
  });

  it('keeps the summary, month controls, and actions', async () => {
    setStorage({
      persist: vi.fn().mockResolvedValue(false),
      persisted: vi.fn().mockResolvedValue(false),
    });
    render(<HomeScreen ledger={ledger} month="2026-11" />);
    await screen.findByRole('button', { name: 'Back up now' });

    expect(screen.getByText('Spent')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Previous month' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Accounts' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Backup' })).toBeInTheDocument();
  });
});
