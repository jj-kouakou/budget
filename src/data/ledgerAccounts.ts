import type { Account } from '../domain/types';
import type { BudgetDatabase } from './db';
import { createEntry, requireOpeningAmount } from './ledgerEntryWrite';
import {
  LedgerError,
  compareAccountsByCreation,
  openingDateFor,
  requireAccountName,
} from './ledgerShared';
import type {
  AccountBalanceListItem,
  AddAccountInput,
} from './ledgerShared';

export function createAccountsApi(db: BudgetDatabase) {
  return {
    async listAccounts(): Promise<Account[]> {
      const accounts = await db.accounts.toArray();
      return accounts.sort(compareAccountsByCreation);
    },

    async listAccountBalances(): Promise<AccountBalanceListItem[]> {
      return db.transaction('r', db.accounts, db.entries, async () => {
        const accounts = (await db.accounts.toArray()).sort(
          compareAccountsByCreation,
        );
        const entries = await db.entries.toArray();
        const knownAccountIds = new Set(
          accounts.map((account) => account.id),
        );
        const balances = new Map<string, number>();
        const openingSums = new Map<string, number>();
        const openingAccountIds = new Set<string>();

        const addEffect = (
          totals: Map<string, number>,
          accountId: string,
          amountMinor: number,
        ) => {
          totals.set(accountId, (totals.get(accountId) ?? 0) + amountMinor);
        };

        for (const entry of entries) {
          switch (entry.kind) {
            case 'opening': {
              if (!knownAccountIds.has(entry.accountId)) {
                continue;
              }
              addEffect(balances, entry.accountId, entry.amountMinor);
              addEffect(openingSums, entry.accountId, entry.amountMinor);
              openingAccountIds.add(entry.accountId);
              break;
            }
            case 'expense': {
              if (knownAccountIds.has(entry.accountId)) {
                addEffect(balances, entry.accountId, -entry.amountMinor);
              }
              break;
            }
            case 'income': {
              if (knownAccountIds.has(entry.accountId)) {
                addEffect(balances, entry.accountId, entry.amountMinor);
              }
              break;
            }
            case 'transfer': {
              if (knownAccountIds.has(entry.accountId)) {
                addEffect(balances, entry.accountId, -entry.amountMinor);
              }
              const destinationId = entry.toAccountId;
              if (
                destinationId !== undefined &&
                knownAccountIds.has(destinationId)
              ) {
                addEffect(balances, destinationId, entry.amountMinor);
              }
              break;
            }
            default: {
              const exhaustive: never = entry.kind;
              throw new Error(`Unhandled entry kind: ${exhaustive}`);
            }
          }
        }

        return accounts.map((account) => {
          const balance = balances.get(account.id) ?? 0;
          const opening = openingSums.get(account.id) ?? 0;

          return {
            id: account.id,
            name: account.name,
            type: account.type,
            balanceMinor: balance === 0 ? 0 : balance,
            openingBalanceMinor: opening === 0 ? 0 : opening,
            hasOpeningBalance: openingAccountIds.has(account.id),
          };
        });
      });
    },

    async addAccount(input: AddAccountInput): Promise<Account> {
      const name = requireAccountName(input.name);
      if (
        input.type !== 'checking' &&
        input.type !== 'savings' &&
        input.type !== 'credit'
      ) {
        throw new LedgerError(
          'invalid-account-type',
          'Choose a valid account type.',
        );
      }
      if (input.openingBalanceMinor !== undefined) {
        requireOpeningAmount(input.openingBalanceMinor);
      }

      const openingBalanceMinor =
        input.openingBalanceMinor === 0
          ? 0
          : input.openingBalanceMinor;

      const account: Account = {
        id: crypto.randomUUID(),
        name,
        type: input.type,
        createdAt: new Date().toISOString(),
      };

      await db.transaction('rw', db.accounts, db.entries, async () => {
        await db.accounts.add(account);
        if (openingBalanceMinor !== undefined) {
          await createEntry(db, {
            kind: 'opening',
            date: openingDateFor(account),
            amountMinor: openingBalanceMinor,
            accountId: account.id,
          });
        }
      });

      return account;
    },

    async setOpeningBalance(
      accountId: string,
      amountMinor: number | null,
    ): Promise<void> {
      if (amountMinor !== null) {
        requireOpeningAmount(amountMinor);
      }

      const normalized = amountMinor === 0 ? 0 : amountMinor;

      await db.transaction('rw', db.accounts, db.entries, async () => {
        const account = await db.accounts.get(accountId);
        if (!account) {
          throw new LedgerError(
            'unknown-account',
            'That account no longer exists. Choose another.',
          );
        }

        const openings = (await db.entries.toArray())
          .filter(
            (entry) =>
              entry.kind === 'opening' && entry.accountId === accountId,
          )
          .sort((left, right) => left.id.localeCompare(right.id));

        if (normalized === null) {
          if (openings.length > 0) {
            await db.entries.bulkDelete(
              openings.map((entry) => entry.id),
            );
          }
          return;
        }

        if (openings.length === 0) {
          await createEntry(db, {
            kind: 'opening',
            date: openingDateFor(account),
            amountMinor: normalized,
            accountId,
          });
          return;
        }

        const first = openings[0];
        if (first === undefined) {
          return;
        }
        await db.entries.update(first.id, { amountMinor: normalized });
        const extraIds = openings.slice(1).map((entry) => entry.id);
        if (extraIds.length > 0) {
          await db.entries.bulkDelete(extraIds);
        }
      });
    },

    async renameAccount(id: string, name: string): Promise<void> {
      const trimmed = requireAccountName(name);
      await db.transaction('rw', db.accounts, async () => {
        const updated = await db.accounts.update(id, { name: trimmed });
        if (updated === 0) {
          throw new LedgerError(
            'unknown-account',
            'That account no longer exists.',
          );
        }
      });
    },
  };
}
