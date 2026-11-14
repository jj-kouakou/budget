import type { Ledger } from '../../data/ledger';
import { EntryEditor } from '../entryEditor';
import { navigate } from '../router';

export function AddTransferScreen({ ledger }: { ledger: Ledger }) {
  return (
    <EntryEditor
      ledger={ledger}
      kind="transfer"
      mode="add"
      onSaved={() => navigate({ name: 'transfers' }, { replace: true })}
      onCancel={() => navigate({ name: 'transfers' }, { replace: true })}
      onNotFoundBack={() =>
        navigate({ name: 'transfers' }, { replace: true })
      }
    />
  );
}
