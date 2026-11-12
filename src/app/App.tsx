import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Ledger } from '../data/ledger';
import { navigate, useHashRoute } from './router';
import { AccountsScreen } from './screens/AccountsScreen';
import { AddExpenseScreen } from './screens/AddExpenseScreen';
import { BackupScreen } from './screens/BackupScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { CategoryEntriesScreen } from './screens/CategoryEntriesScreen';
import { EntryEditorScreen } from './screens/EntryEditorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TransfersScreen } from './screens/TransfersScreen';

export function App({ ledger }: { ledger: Ledger }) {
  const route = useHashRoute();
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);
  const [pendingRestore, setPendingRestore] = useState(false);

  useEffect(() => {
    if (accounts !== undefined && accounts.length > 0) {
      setPendingRestore(false);
    }
  }, [accounts]);

  useEffect(() => {
    if (
      accounts !== undefined &&
      accounts.length === 0 &&
      route.name !== 'accounts' &&
      route.name !== 'backup' &&
      !pendingRestore
    ) {
      navigate({ name: 'accounts' }, { replace: true });
    }
  }, [accounts, route.name, pendingRestore]);

  if (accounts === undefined) {
    return <p>Loading…</p>;
  }

  if (
    accounts.length === 0 &&
    route.name !== 'accounts' &&
    route.name !== 'backup' &&
    !pendingRestore
  ) {
    return <p>Loading…</p>;
  }

  switch (route.name) {
    case 'home':
      return <HomeScreen ledger={ledger} month={route.month} />;
    case 'add':
      return <AddExpenseScreen ledger={ledger} />;
    case 'accounts':
      return <AccountsScreen ledger={ledger} />;
    case 'backup':
      return (
        <BackupScreen
          ledger={ledger}
          onRestored={(accountCount) => {
            if (accountCount > 0) {
              setPendingRestore(true);
            }
          }}
        />
      );
    case 'categories':
      return <CategoriesScreen ledger={ledger} />;
    case 'category':
      return (
        <CategoryEntriesScreen
          ledger={ledger}
          month={route.month}
          categoryId={route.categoryId}
        />
      );
    case 'entry':
      return <EntryEditorScreen ledger={ledger} entryId={route.entryId} />;
    case 'transfers':
      return <TransfersScreen ledger={ledger} />;
  }
}
