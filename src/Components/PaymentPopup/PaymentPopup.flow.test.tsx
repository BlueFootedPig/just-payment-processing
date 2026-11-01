import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { TextEncoder as NodeTextEncoder } from 'util';
import PaymentPopup, { PaymentPopupProps } from './PaymentPopup';

const flow = vi.hoisted(() => ({
    active: false,
    connect: vi.fn(),
    resume: vi.fn(),
    restoredAddress: null as string | null,
    sign: vi.fn(),
    send: vi.fn(),
    confirm: vi.fn(),
    staleSigner: vi.fn(() => { throw new Error('No active wallet'); })
}));

vi.mock('@txnlab/use-wallet-react', () => ({
    WalletManager: class {
        getWallet() {
            return { resumeSession: flow.resume, get activeAccount() {
                return flow.restoredAddress ? { address: flow.restoredAddress } : null;
            } };
        }
        get signTransactions() {
            if (!flow.active) throw new Error('No active wallet');
            return flow.sign;
        }
    },
    WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNetwork: () => ({ activeNetwork: 'testnet', setActiveNetwork: vi.fn() }),
    useWallet: () => ({
        wallets: [{ id: 'pera', walletKey: 'pera', metadata: { name: 'Pera Wallet' }, connect: flow.connect, setActive: () => { flow.active = true; } }],
        activeWallet: null,
        activeAddress: null,
        // Model the first render's hook closure: connecting does not update it.
        signTransactions: flow.staleSigner
    })
}));
vi.mock('@txnlab/use-wallet-pera', () => ({ pera: vi.fn() }));
vi.mock('@txnlab/use-wallet-exodus', () => ({ exodus: vi.fn() }));
vi.mock('algosdk', async importOriginal => {
    const actual = await importOriginal<typeof import('algosdk')>();
    return { ...actual, default: {
        ...actual.default,
        Algodv2: class {
            getTransactionParams() {
                return { do: async () => ({ fee: 1000, minFee: 1000, flatFee: true, firstValid: 100, lastValid: 200, genesisID: 'testnet-v1.0', genesisHash: new Uint8Array(32) }) };
            }
            sendRawTransaction(bytes: Uint8Array[]) { return { do: () => flow.send(bytes) }; }
        },
        waitForConfirmation: flow.confirm
    } };
});

beforeEach(() => {
    vi.resetAllMocks();
    // Node's TextEncoder returns a different realm's Uint8Array in jsdom.
    vi.stubGlobal('TextEncoder', class {
        encode(value: string) { return Uint8Array.from(new NodeTextEncoder().encode(value)); }
    });
    localStorage.clear();
    flow.active = false;
    flow.restoredAddress = null;
    flow.resume.mockResolvedValue(undefined);
    flow.connect.mockResolvedValue([{ address: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ' }]);
    flow.sign.mockResolvedValue([new Uint8Array([1])]);
    flow.send.mockResolvedValue({ txid: 'TEST-TX' });
    flow.confirm.mockResolvedValue({});
});

afterEach(() => vi.unstubAllGlobals());

function checkout(options: Partial<PaymentPopupProps> = {}) {
    const onPaymentComplete = vi.fn();
    render(<PaymentPopup isOpen onClose={vi.fn()} network="testnet"
        merchantWalletAddress="VJVQKGORMMHVVA2W3OEODQTRNY6YQ73MRZYUYJVT3YHO3C6VVJK7YHQLBM"
        assets={[{ symbol: 'USDC', amount: '5.00', decimals: 6, assetIds: { testnet: 10458941 } }]}
        onPaymentComplete={onPaymentComplete} {...options} />);
    if (options.mode !== 'donation') fireEvent.click(screen.getByRole('button', { name: 'Complete Pay' }));
    return onPaymentComplete;
}

test('one click connects a new wallet and continues through signing and confirmation', async () => {
    const complete = checkout();
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(flow.connect).toHaveBeenCalledOnce();
    expect(flow.sign).toHaveBeenCalledOnce();
    expect(flow.staleSigner).not.toHaveBeenCalled();
    expect(flow.send).toHaveBeenCalledOnce();
    expect(flow.confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Payment successful. TxID: TEST-TX');
});

test('keeps connection pending and prevents a second payment while approval is open', async () => {
    let finishConnection!: (accounts: { address: string }[]) => void;
    flow.connect.mockReturnValue(new Promise(resolve => { finishConnection = resolve; }));
    const complete = checkout();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Connect Pera Wallet'));
    expect(screen.getByRole('status')).not.toHaveClass('error');
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Processing...' }));
    expect(flow.sign).not.toHaveBeenCalled();
    finishConnection([{ address: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ' }]);
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(flow.connect).toHaveBeenCalledOnce();
    expect(flow.send).toHaveBeenCalledOnce();
});

test('restores the live signing session before using a remembered account', async () => {
    flow.resume.mockImplementation(async () => {
        flow.restoredAddress = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';
    });
    const complete = checkout();
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(flow.resume).toHaveBeenCalledOnce();
    expect(flow.connect).not.toHaveBeenCalled();
    expect(flow.sign).toHaveBeenCalledOnce();
    expect(flow.send).toHaveBeenCalledOnce();
});

test('a stale session reconnects before continuing to payment approval', async () => {
    flow.resume.mockRejectedValue(new Error('Session expired'));
    const complete = checkout();
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(flow.resume).toHaveBeenCalledOnce();
    expect(flow.connect).toHaveBeenCalledOnce();
    expect(flow.sign).toHaveBeenCalledOnce();
    expect(flow.send).toHaveBeenCalledOnce();
});

test('an incomplete connection is not reported as a failed payment', async () => {
    flow.connect.mockRejectedValue(new Error('Connection cancelled'));
    checkout();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Wallet connection was not completed'));
    expect(screen.getByRole('status')).not.toHaveClass('error');
    expect(flow.sign).not.toHaveBeenCalled();
    expect(flow.send).not.toHaveBeenCalled();
});

test('still reports a rejected payment signature and does not submit it', async () => {
    flow.sign.mockRejectedValue(new Error('User rejected signing'));
    const complete = checkout();
    await waitFor(() => expect(screen.getByRole('status')).toHaveClass('error'));
    expect(flow.sign).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Payment failed or was cancelled.');
    expect(flow.send).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
});

test('donation requires acknowledgment and signs the edited amount with donation terms', async () => {
    const complete = checkout({ mode: 'donation', receipt: { invoiceNumber: 'DONATION-1001', total: '999.00' } });
    expect(screen.getByText('Donation mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Donation amount (USDC)')).toHaveValue('5.00');
    const donate = screen.getByRole('button', { name: /donate 5.00 usdc/i });
    expect(donate).toBeDisabled();
    fireEvent.click(donate);
    expect(flow.resume).not.toHaveBeenCalled();
    expect(flow.connect).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Donation amount (USDC)'), { target: { value: '7.25' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand this is a donation/ }));
    fireEvent.click(screen.getByRole('button', { name: /donate 7.25 usdc/i }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    const transaction = flow.sign.mock.calls[0][0][0];
    expect(transaction.assetTransfer.amount).toBe(BigInt(7250000));
    const receipt = JSON.parse(new TextDecoder().decode(transaction.note));
    expect(receipt).toMatchObject({ type: 'donation', invoiceNumber: 'DONATION-1001', total: '7.25', amount: '7.25', acknowledgedNoRefundOrGift: true });
    expect(receipt.acknowledgment).toContain('do not expect a refund or any gift');
    expect(complete.mock.calls[0][0].asset.amount).toBe('7.25');
    expect(screen.getByRole('status')).toHaveTextContent('Donation successful.');
    expect(screen.getByRole('button', { name: /donate 7.25 usdc/i })).toBeDisabled();
});

test('changing a donation amount clears acknowledgment and rejects invalid amounts before connecting', () => {
    checkout({ mode: 'donation', donationDefaultAmount: '12.50' });
    expect(screen.getByLabelText('Donation amount (USDC)')).toHaveValue('12.50');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: /donate 12.50 usdc/i })).toBeEnabled();
    for (const value of ['0', '-5', 'abc', '1.0000001', '']) {
        fireEvent.change(screen.getByLabelText('Donation amount (USDC)'), { target: { value } });
        expect(screen.getByRole('checkbox')).not.toBeChecked();
        fireEvent.click(screen.getByRole('checkbox'));
        expect(screen.getByRole('button', { name: /^donate/i })).toBeDisabled();
    }
    expect(flow.connect).not.toHaveBeenCalled();
    expect(flow.sign).not.toHaveBeenCalled();
});
