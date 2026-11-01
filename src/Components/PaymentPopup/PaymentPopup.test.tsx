import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PaymentPopup from './PaymentPopup';
import { PaymentAsset } from '../../types/payment';

vi.mock('@txnlab/use-wallet-react', () => ({
    WalletManager: vi.fn(),
    WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNetwork: () => ({
        activeNetwork: 'testnet',
        setActiveNetwork: vi.fn().mockResolvedValue(undefined)
    }),
    useWallet: () => ({
        wallets: [
            {
                id: 'pera',
                metadata: { name: 'Pera Wallet' },
                connect: vi.fn().mockResolvedValue([{ address: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ' }]),
                setActive: vi.fn()
            }
        ],
        activeWallet: null,
        activeAddress: null,
        signTransactions: vi.fn()
    })
}));

vi.mock('@txnlab/use-wallet-pera', () => ({ pera: vi.fn(() => ({ id: 'pera' })) }));
vi.mock('@txnlab/use-wallet-exodus', () => ({ exodus: vi.fn(() => ({ id: 'exodus' })) }));

const assets: PaymentAsset[] = [
    {
        symbol: 'USDC',
        name: 'USDC',
        amount: '5.00',
        decimals: 6,
        assetIds: {
            testnet: 67395862,
            mainnet: 31566704
        }
    },
    {
        symbol: 'DDR',
        name: 'DeDigitalRights Token',
        amount: '10.00',
        decimals: 6,
        assetIds: {
            testnet: 15956644
        }
    }
];

test('shows only assets supported by the active network', () => {
    render(
        <PaymentPopup
            isOpen
            onClose={vi.fn()}
            merchantWalletAddress="PCOIWU4P4K2XZDNDN2C63W4CBRMFVU55STSS26LDUNQE4AKZEGPOULSQPE"
            network="mainnet"
            assets={assets}
        />
    );

    expect(screen.getByText('Algorand MainNet')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /usdc/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /dedigitalrights/i })).not.toBeInTheDocument();
});

test('shows a readable receipt with the total first and no internal metadata', () => {
    render(
        <PaymentPopup
            isOpen
            onClose={vi.fn()}
            merchantWalletAddress="PCOIWU4P4K2XZDNDN2C63W4CBRMFVU55STSS26LDUNQE4AKZEGPOULSQPE"
            network="testnet"
            assets={assets}
            receipt={{
                invoiceNumber: 'INV-TESTNET-1001',
                memo: 'Thank you for your order.',
                merchant: 'Internal payment processor',
                items: [{ sku: 'APPLES-INTERNAL', description: 'Apples', quantity: 2, total: '3.50' }]
            }}
        />
    );

    expect(screen.getByText('Receipt Note')).toBeInTheDocument();
    expect(screen.getByText(/INV-TESTNET-1001/)).toBeInTheDocument();
    const receipt = screen.getByLabelText('Receipt Note');
    expect(receipt.firstElementChild).toHaveTextContent('Total to pay');
    expect(receipt).toHaveTextContent('Thank you for your order.');
    expect(receipt).toHaveTextContent('2 × Apples');
    expect(receipt).toHaveTextContent('3.50');
    expect(receipt).toHaveTextContent('Total to pay');
    expect(receipt).not.toHaveTextContent('APPLES-INTERNAL');
    expect(receipt).not.toHaveTextContent('Internal payment processor');
    expect(receipt).not.toHaveTextContent('{');
});

test('shows chain selection inside the popup', () => {
    render(
        <PaymentPopup
            isOpen
            onClose={vi.fn()}
            merchantWalletAddress="PCOIWU4P4K2XZDNDN2C63W4CBRMFVU55STSS26LDUNQE4AKZEGPOULSQPE"
            assets={assets}
        />
    );

    expect(screen.getByLabelText('Chain')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Algorand TestNet' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Algorand MainNet' })).toBeInTheDocument();
});

test('keeps wallet connection joined to the final pay action', () => {
    render(
        <PaymentPopup
            isOpen
            onClose={vi.fn()}
            merchantWalletAddress="PCOIWU4P4K2XZDNDN2C63W4CBRMFVU55STSS26LDUNQE4AKZEGPOULSQPE"
            network="testnet"
            assets={assets}
        />
    );

    expect(screen.getByRole('button', { name: /complete pay/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /connect pera/i })).not.toBeInTheDocument();
});

test('offers the supported Algorand wallets through the wallet wrapper', () => {
    render(
        <PaymentPopup
            isOpen
            onClose={vi.fn()}
            merchantWalletAddress="PCOIWU4P4K2XZDNDN2C63W4CBRMFVU55STSS26LDUNQE4AKZEGPOULSQPE"
            network="testnet"
            assets={assets}
        />
    );

    expect(screen.getByLabelText('Wallet')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pera Wallet' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Exodus' })).toBeInTheDocument();
});

test('donation acknowledgment resets on recipient changes and reopening checkout', () => {
    const props = {
        isOpen: true, mode: 'donation' as const, network: 'testnet' as const,
        onClose: vi.fn(), assets,
        merchantWalletAddress: 'VJVQKGORMMHVVA2W3OEODQTRNY6YQ73MRZYUYJVT3YHO3C6VVJK7YHQLBM'
    };
    const view = render(<PaymentPopup {...props} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
    const changed = { ...props, merchantWalletAddress: 'PCOIWU4P4K2XZDNDN2C63W4CBRMFVU55STSS26LDUNQE4AKZEGPOULSQPE' };
    view.rerender(<PaymentPopup {...changed} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox'));
    view.rerender(<PaymentPopup {...changed} isOpen={false} />);
    view.rerender(<PaymentPopup {...changed} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: /donate 5.00 usdc/i })).toBeDisabled();
});
