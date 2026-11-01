import {
    getPreferredAlgorandNetwork,
    getRememberedAlgorandWallet,
    getRememberedWallets,
    rememberWallet
} from './walletMemory';

beforeEach(() => {
    window.localStorage.clear();
});

test('remembers public wallet preferences locally', () => {
    rememberWallet({
        chain: 'algorand',
        network: 'testnet',
        walletType: 'pera',
        address: 'TESTNET_ADDRESS',
        lastConnectedAt: '2026-08-21T00:00:00.000Z'
    });

    expect(getRememberedWallets()).toHaveLength(1);
    expect(getRememberedAlgorandWallet('testnet')?.address).toBe('TESTNET_ADDRESS');
    expect(getPreferredAlgorandNetwork('mainnet')).toBe('testnet');
});

test('updates an existing remembered wallet instead of duplicating it', () => {
    rememberWallet({
        chain: 'algorand',
        network: 'testnet',
        walletType: 'pera',
        address: 'TESTNET_ADDRESS',
        lastConnectedAt: '2026-08-21T00:00:00.000Z'
    });
    rememberWallet({
        chain: 'algorand',
        network: 'testnet',
        walletType: 'pera',
        address: 'TESTNET_ADDRESS',
        lastConnectedAt: '2026-08-21T00:01:00.000Z',
        lastSuccessfulPaymentAt: '2026-08-21T00:01:00.000Z'
    });

    expect(getRememberedWallets()).toHaveLength(1);
    expect(getRememberedAlgorandWallet('testnet')?.lastSuccessfulPaymentAt).toBe('2026-08-21T00:01:00.000Z');
});

test('can remember different Algorand wallet providers separately', () => {
    rememberWallet({
        chain: 'algorand',
        network: 'testnet',
        walletType: 'pera',
        address: 'PERA_ADDRESS',
        lastConnectedAt: '2026-08-21T00:00:00.000Z'
    });
    rememberWallet({
        chain: 'algorand',
        network: 'testnet',
        walletType: 'exodus',
        address: 'EXODUS_ADDRESS',
        lastConnectedAt: '2026-08-21T00:01:00.000Z'
    });

    expect(getRememberedWallets()).toHaveLength(2);
    expect(getRememberedAlgorandWallet('testnet', 'pera')?.address).toBe('PERA_ADDRESS');
    expect(getRememberedAlgorandWallet('testnet', 'exodus')?.address).toBe('EXODUS_ADDRESS');
});
