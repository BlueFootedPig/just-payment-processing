import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@txnlab/use-wallet-react', () => ({
  WalletManager: vi.fn(),
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNetwork: () => ({
    activeNetwork: 'testnet',
    setActiveNetwork: vi.fn().mockResolvedValue(undefined)
  }),
  useWallet: () => ({
    wallets: [],
    activeWallet: null,
    activeAddress: null,
    signTransactions: vi.fn()
  })
}));

vi.mock('@txnlab/use-wallet-pera', () => ({ pera: vi.fn(() => ({ id: 'pera' })) }));
vi.mock('@txnlab/use-wallet-exodus', () => ({ exodus: vi.fn(() => ({ id: 'exodus' })) }));

import App from './App';

test('renders crypto payment demo trigger', () => {
  render(<App />);
  expect(screen.getByText(/demo merchant closeout/i)).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /crypto/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^pay$/i })).toBeInTheDocument();
});
