import { describe, expect, it } from 'vitest';

describe('test harness', () => {
  it('provides IndexedDB', () => {
    expect(indexedDB).toBeDefined();
    expect(typeof indexedDB.open).toBe('function');
  });

  it('provides jest-dom matchers', () => {
    const element = document.createElement('p');
    element.textContent = 'Budget';
    document.body.append(element);
    expect(element).toBeInTheDocument();
    element.remove();
  });

  it('provides crypto.randomUUID', () => {
    expect(crypto.randomUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
