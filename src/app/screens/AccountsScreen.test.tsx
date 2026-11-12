import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { formatAmount } from '../../domain/money';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import { AccountsScreen } from './AccountsScreen';

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

function renderScreen() {
  return render(<AccountsScreen ledger={createLedger(db)} />);
}

describe('AccountsScreen', () => {
  it('adds an account, shows its type, and reveals Start logging', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(await screen.findByLabelText('Account name'), 'Checking');
    await user.click(screen.getByRole('button', { name: 'Add account' }));

    const row = await screen.findByRole('listitem');
    expect(
      within(row).getByText('Checking', { selector: '.account-name' }),
    ).toBeInTheDocument();
    expect(
      within(row).getByText('Checking', { selector: '.account-type' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start logging' }),
    ).toBeInTheDocument();
  });

  it('navigates home to the current month from Start logging', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(await screen.findByLabelText('Account name'), 'Checking');
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    await screen.findByRole('button', { name: 'Start logging' });

    await user.click(screen.getByRole('button', { name: 'Start logging' }));

    expect(window.location.hash).toBe(
      `#/?m=${monthOf(todayLocalDate())}`,
    );
  });

  it('renames an account with the Save button', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    const input = screen.getByLabelText('Rename Checking');
    await user.clear(input);
    await user.type(input, 'Chequing');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Chequing')).toBeInTheDocument();
  });

  it('saves a rename on Enter and cancels on Escape', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    let input = screen.getByLabelText('Rename Checking');
    await user.clear(input);
    await user.type(input, 'Chequing{Enter}');
    expect(await screen.findByText('Chequing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    input = screen.getByLabelText('Rename Chequing');
    await user.clear(input);
    await user.type(input, 'Nope{Escape}');
    expect(screen.getByText('Chequing')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Nope')).not.toBeInTheDocument();
  });

  it('rejects an empty name without writing an account', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(
      await screen.findByRole('button', { name: 'Add account' }),
    );

    expect(
      await screen.findByText(
        'Enter an account name of 60 characters or fewer.',
      ),
    ).toBeInTheDocument();
    expect(await db.accounts.count()).toBe(0);
  });

  it('renders accounts in listAccountBalances order with their balances', async () => {
    const ledger = createLedger(db);
    await db.accounts.bulkAdd([
      {
        id: 'acct-b',
        name: 'Second',
        type: 'savings',
        createdAt: '2026-11-02T12:00:00.000Z',
      },
      {
        id: 'acct-a',
        name: 'First',
        type: 'checking',
        createdAt: '2026-11-01T12:00:00.000Z',
      },
    ]);
    renderScreen();

    await screen.findByText('First');
    const rows = screen.getAllByRole('listitem');
    expect(
      rows.map((row) => row.querySelector('.account-name')?.textContent),
    ).toEqual(
      (await ledger.listAccountBalances()).map((row) => row.name),
    );
    for (const row of rows) {
      expect(
        within(row).getByText(formatAmount(0, 'CAD', 2), {
          selector: '.account-balance',
        }),
      ).toBeInTheDocument();
    }
  });

  it('reports a stale rename and keeps the list correct', async () => {
    const user = userEvent.setup();
    const ledger = createLedger(db);
    const account = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    await db.accounts.delete(account.id);
    await waitFor(() =>
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('That account no longer exists.'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument(),
    );
  });
});


describe('AccountsScreen balances', () => {
  function rowFor(name: string): HTMLElement {
    const row = screen
      .getAllByRole('listitem')
      .find(
        (candidate) =>
          within(candidate).queryByText(name, {
            selector: '.account-name',
          }) !== null,
      );
    if (!row) {
      throw new Error(`Missing row for ${name}`);
    }
    return row;
  }

  it('shows an overdrawn checking balance with its minus', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    await ledger.addExpense({
      amountMinor: 1234,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    renderScreen();

    const row = await screen.findByRole('listitem');
    expect(
      within(row).getByText(`${formatAmount(-1234, 'CAD', 2)} overdrawn`, {
        selector: '.account-balance',
      }),
    ).toBeInTheDocument();
  });

  it('shows credit owed, zero owed, and in credit', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    const visa = await ledger.addAccount({
      name: 'Visa',
      type: 'credit',
    });
    const emptyCard = await ledger.addAccount({
      name: 'Empty card',
      type: 'credit',
    });
    const overpaid = await ledger.addAccount({
      name: 'Overpaid',
      type: 'credit',
    });
    await ledger.addExpense({
      amountMinor: 5000,
      categoryId: 'cat_groceries',
      accountId: visa.id,
      date: '2026-11-02',
    });
    await ledger.addTransfer({
      amountMinor: 6000,
      accountId: checking.id,
      toAccountId: overpaid.id,
      date: '2026-11-02',
    });

    renderScreen();

    await screen.findAllByRole('listitem');
    expect(
      within(rowFor('Visa')).getByText(
        `${formatAmount(5000, 'CAD', 2)} owed`,
        { selector: '.account-balance' },
      ),
    ).toBeInTheDocument();
    expect(
      within(rowFor('Empty card')).getByText(
        `${formatAmount(0, 'CAD', 2)} owed`,
        { selector: '.account-balance' },
      ),
    ).toBeInTheDocument();
    expect(
      within(rowFor('Overpaid')).getByText(
        `${formatAmount(6000, 'CAD', 2)} in credit`,
        { selector: '.account-balance' },
      ),
    ).toBeInTheDocument();
  });

  it('updates the balance after an expense is added', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    renderScreen();
    await screen.findByRole('listitem');

    await ledger.addExpense({
      amountMinor: 2500,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    await waitFor(() =>
      expect(
        screen.getByText(`${formatAmount(-2500, 'CAD', 2)} overdrawn`, {
          selector: '.account-balance',
        }),
      ).toBeInTheDocument(),
    );
  });

  it('renders the name, type, and balance qualifier in one row', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    await ledger.addExpense({
      amountMinor: 100,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    renderScreen();

    const row = await screen.findByRole('listitem');
    expect(
      within(row).getByText('Checking', { selector: '.account-name' }),
    ).toBeInTheDocument();
    expect(
      within(row).getByText('Checking', { selector: '.account-type' }),
    ).toBeInTheDocument();
    expect(
      within(row).getByText('overdrawn', { exact: false }),
    ).toBeInTheDocument();
  });
});

describe('AccountsScreen starting point', () => {
  function rowFor(name: string): HTMLElement {
    const row = screen
      .getAllByRole('listitem')
      .find(
        (candidate) =>
          within(candidate).queryByText(name, {
            selector: '.account-name',
          }) !== null,
      );
    if (!row) {
      throw new Error(`Missing row for ${name}`);
    }
    return row;
  }

  async function openSet(name: string) {
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {
        name: `Set starting point for ${name}`,
      }),
    );
    return user;
  }

  async function openEdit(name: string) {
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {
        name: `Edit starting point for ${name}`,
      }),
    );
    return user;
  }

  it('invites a starting point on an account without one', async () => {
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });

    renderScreen();

    const row = await screen.findByRole('listitem');
    expect(
      within(row).getByText(formatAmount(0, 'CAD', 2), {
        selector: '.account-balance',
      }),
    ).toBeInTheDocument();
    expect(
      within(row).getByText(
        'No starting point set. The balance is the sum of recorded movements.',
      ),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole('button', {
        name: 'Set starting point for Checking',
      }),
    ).toBeInTheDocument();
  });

  it('sets an opening from the row and hides the invitation', async () => {
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    renderScreen();
    const user = await openSet('Checking');

    const input = screen.getByLabelText('Starting point for Checking');
    await user.clear(input);
    await user.type(input, '100.00');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText(formatAmount(10000, 'CAD', 2), {
        selector: '.account-balance',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'No starting point set. The balance is the sum of recorded movements.',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Edit starting point for Checking',
      }),
    ).toBeInTheDocument();
  });

  it('changes the existing opening without adding a second', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
      openingBalanceMinor: 10000,
    });
    renderScreen();
    const user = await openEdit('Checking');

    const input = screen.getByLabelText('Starting point for Checking');
    await user.clear(input);
    await user.type(input, '250.00');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText(formatAmount(25000, 'CAD', 2), {
        selector: '.account-balance',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'No starting point set. The balance is the sum of recorded movements.',
      ),
    ).not.toBeInTheDocument();
    const openings = (await db.entries.toArray()).filter(
      (entry) =>
        entry.kind === 'opening' && entry.accountId === checking.id,
    );
    expect(openings).toHaveLength(1);
    expect(openings[0]?.amountMinor).toBe(25000);
  });

  it('clears the opening and restores the movement balance', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
      openingBalanceMinor: 10000,
    });
    await ledger.addExpense({
      amountMinor: 300,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    renderScreen();
    const user = await openEdit('Checking');

    await user.click(
      screen.getByRole('button', {
        name: 'Clear starting point for Checking',
      }),
    );

    expect(
      await screen.findByText(`${formatAmount(-300, 'CAD', 2)} overdrawn`, {
        selector: '.account-balance',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'No starting point set. The balance is the sum of recorded movements.',
      ),
    ).toBeInTheDocument();
    expect(await db.entries.count()).toBe(1);
  });

  it('prefills the presented credit amount in both directions', async () => {
    const ledger = createLedger(db);
    await ledger.addAccount({
      name: 'Visa',
      type: 'credit',
      openingBalanceMinor: -24000,
    });
    await ledger.addAccount({
      name: 'Credit card',
      type: 'credit',
      openingBalanceMinor: 6000,
    });

    renderScreen();

    let user = await openEdit('Visa');
    expect(screen.getByLabelText('Starting point for Visa')).toHaveValue(
      '240.00',
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    user = await openEdit('Credit card');
    expect(
      screen.getByLabelText('Starting point for Credit card'),
    ).toHaveValue('-60.00');
  });

  it('rejects an empty inline save without writing', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
      openingBalanceMinor: 10000,
    });
    await ledger.addAccount({ name: 'Savings', type: 'savings' });
    renderScreen();
    const user = await openEdit('Checking');

    await user.clear(screen.getByLabelText('Starting point for Checking'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Enter a starting amount, or clear it.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    const user2 = await openSet('Savings');
    await user2.clear(screen.getByLabelText('Starting point for Savings'));
    await user2.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Enter a starting amount.'),
    ).toBeInTheDocument();
    expect(
      (await db.entries.toArray()).filter(
        (entry) => entry.kind === 'opening',
      ),
    ).toHaveLength(1);
    expect(
      (await db.entries.toArray()).find(
        (entry) => entry.kind === 'opening',
      )?.accountId,
    ).toBe(checking.id);
  });

  it('rejects an invalid inline value without writing', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
      openingBalanceMinor: 10000,
    });
    renderScreen();
    const user = await openEdit('Checking');
    const input = screen.getByLabelText('Starting point for Checking');

    await user.clear(input);
    await user.type(input, 'abc');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Enter a valid starting amount.'),
    ).toBeInTheDocument();
    expect(
      (await db.entries.toArray()).find(
        (entry) => entry.kind === 'opening',
      )?.amountMinor,
    ).toBe(10000);
    expect(await db.entries.count()).toBe(1);
    expect(
      (await db.entries.toArray()).find((entry) => entry.kind === 'opening')
        ?.accountId,
    ).toBe(checking.id);
  });

  it('shows Clear only when an opening exists', async () => {
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    await ledger.addAccount({
      name: 'Savings',
      type: 'savings',
      openingBalanceMinor: 100,
    });
    renderScreen();

    await openSet('Checking');
    expect(
      screen.queryByRole('button', { name: /^Clear starting point/ }),
    ).not.toBeInTheDocument();
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Cancel' }),
    );

    await openEdit('Savings');
    expect(
      screen.getByRole('button', {
        name: 'Clear starting point for Savings',
      }),
    ).toBeInTheDocument();
  });

  it('closes without writing on Cancel and Escape', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
      openingBalanceMinor: 10000,
    });
    renderScreen();

    let user = await openEdit('Checking');
    let input = screen.getByLabelText('Starting point for Checking');
    await user.clear(input);
    await user.type(input, '999');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.queryByLabelText('Starting point for Checking'),
    ).not.toBeInTheDocument();

    user = await openEdit('Checking');
    input = screen.getByLabelText('Starting point for Checking');
    await user.clear(input);
    await user.type(input, '888{Escape}');
    expect(
      screen.queryByLabelText('Starting point for Checking'),
    ).not.toBeInTheDocument();
    expect(
      (await db.entries.toArray()).find(
        (entry) => entry.kind === 'opening',
      )?.amountMinor,
    ).toBe(10000);
    expect(
      (await db.entries.toArray()).filter(
        (entry) => entry.kind === 'opening',
      ),
    ).toHaveLength(1);
    expect(
      (await db.entries.toArray()).find((entry) => entry.kind === 'opening')
        ?.accountId,
    ).toBe(checking.id);
  });

  it('writes once on a rapid double submit and disables the actions', async () => {
    const ledger = createLedger(db);
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
      openingBalanceMinor: 10000,
    });
    renderScreen();
    await openEdit('Checking');
    const input = screen.getByLabelText('Starting point for Checking');
    fireEvent.change(input, { target: { value: '500.00' } });
    const save = screen.getByRole('button', { name: 'Save' });
    const form = save.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    expect(save).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'Clear starting point for Checking',
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Cancel' }),
    ).toBeDisabled();
    await waitFor(async () => {
      expect(
        (await db.entries.toArray()).filter(
          (entry) => entry.kind === 'opening',
        ),
      ).toHaveLength(1);
    });
    expect(
      (await db.entries.toArray()).find(
        (entry) => entry.kind === 'opening' && entry.accountId === checking.id,
      )?.amountMinor,
    ).toBe(50000);
  });

  it('keeps exactly one editor open', async () => {
    const ledger = createLedger(db);
    await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
      openingBalanceMinor: 100,
    });
    await ledger.addAccount({ name: 'Savings', type: 'savings' });
    renderScreen();
    const user = await openEdit('Checking');

    await user.click(
      within(rowFor('Savings')).getByRole('button', { name: 'Rename' }),
    );
    expect(
      screen.queryByLabelText('Starting point for Checking'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Rename Savings')).toBeInTheDocument();

    await user.click(
      within(rowFor('Checking')).getByRole('button', {
        name: 'Edit starting point for Checking',
      }),
    );
    expect(
      screen.queryByLabelText('Rename Savings'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Starting point for Checking'),
    ).toBeInTheDocument();
  });

  it('names the account in the button, input, and Clear names', async () => {
    const ledger = createLedger(db);
    await ledger.addAccount({
      name: 'Visa',
      type: 'credit',
      openingBalanceMinor: -24000,
    });
    renderScreen();
    const user = await openEdit('Visa');

    expect(
      screen.getByLabelText('Starting point for Visa'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Clear starting point for Visa',
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.getByRole('button', {
        name: 'Edit starting point for Visa',
      }),
    ).toBeInTheDocument();
  });
});

describe('AccountsScreen restore entry', () => {
  it('navigates to the backup screen with zero accounts', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(
      await screen.findByRole('button', { name: 'Restore from backup' }),
    );

    expect(window.location.hash).toBe('#/backup');
  });

  it('keeps the restore entry when accounts exist', async () => {
    const ledger = createLedger(db);
    await ledger.addAccount({ name: 'Checking', type: 'checking' });
    renderScreen();

    expect(
      await screen.findByRole('button', { name: 'Restore from backup' }),
    ).toBeInTheDocument();
  });
});
