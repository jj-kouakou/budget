import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Ledger } from '../data/ledger';
import { navigate, useHashRoute } from './router';
import { AccountsScreen } from './screens/AccountsScreen';
import { AddExpenseScreen } from './screens/AddExpenseScreen';
import { BackupScreen } from './screens/BackupScreen';
import { CategoryEntriesScreen } from './screens/CategoryEntriesScreen';
import { EntryEditorScreen } from './screens/EntryEditorScreen';
import { HomeScreen } from './screens/HomeScreen';

export function App({ ledger }: { ledger: Ledger }) {
  const route = useHashRoute();
  const accounts = useLiveQuery(() => ledger.listAccounts(), [ledger]);

  useEffect(() => {
    if (
      accounts !== undefined &&
      accounts.length === 0 &&
      route.name !== 'accounts'
    ) {
      navigate({ name: 'accounts' }, { replace: true });
    }
  }, [accounts, route.name]);

  if (accounts === undefined) {
    return <p>Loading…</p>;
  }

  if (accounts.length === 0 && route.name !== 'accounts') {
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
      return <BackupScreen ledger={ledger} />;
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
  }
}
