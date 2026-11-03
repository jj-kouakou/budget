import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1>Budget</h1>
  </StrictMode>,
);
