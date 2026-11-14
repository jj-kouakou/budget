import type { Ledger } from '../../data/ledger';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import { EntryEditor } from '../entryEditor';
import { navigate } from '../router';

export function AddExpenseScreen({ ledger }: { ledger: Ledger }) {
  return (
    <EntryEditor
      ledger={ledger}
      kind="expense"
      mode="add"
      onSaved={(entry) =>
        navigate({ name: 'home', month: monthOf(entry.date) })
      }
      onCancel={() =>
        navigate({ name: 'home', month: monthOf(todayLocalDate()) })
      }
      onNotFoundBack={() =>
        navigate({ name: 'home', month: monthOf(todayLocalDate()) })
      }
    />
  );
}
