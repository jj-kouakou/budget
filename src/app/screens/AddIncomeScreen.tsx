import type { Ledger } from '../../data/ledger';
import { EntryEditor } from '../entryEditor';
import { navigate } from '../router';

export function AddIncomeScreen({ ledger }: { ledger: Ledger }) {
  return (
    <EntryEditor
      ledger={ledger}
      kind="income"
      mode="add"
      onSaved={() => navigate({ name: 'income' }, { replace: true })}
      onCancel={() => navigate({ name: 'income' }, { replace: true })}
      onNotFoundBack={() => navigate({ name: 'income' }, { replace: true })}
    />
  );
}
