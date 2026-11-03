import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { BudgetDatabase } from './data/db';
import { createLedger } from './data/ledger';
import type { Ledger } from './data/ledger';
import { App } from './app/App';
import { BootError } from './app/BootError';

export async function boot(
  ledger: Ledger,
  rootElement: HTMLElement,
): Promise<void> {
  const root = createRoot(rootElement);
  try {
    await ledger.initialize();
  } catch (error) {
    root.render(<BootError error={error} />);
    return;
  }

  root.render(
    <StrictMode>
      <App ledger={ledger} />
    </StrictMode>,
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const db = new BudgetDatabase();
  void boot(createLedger(db), rootElement);
}
