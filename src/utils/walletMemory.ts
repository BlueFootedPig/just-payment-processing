import { AlgorandNetwork, AlgorandWalletType } from '../types/payment';

const STORAGE_KEY = 'just-payment-processing.wallets';

export interface RememberedWallet {
    chain: 'algorand';
    network: AlgorandNetwork;
    walletType: AlgorandWalletType;
    address: string;
    lastConnectedAt?: string;
    lastSuccessfulPaymentAt?: string;
    lastAssetKey?: string;
}

function canUseStorage(): boolean {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getRememberedWallets(): RememberedWallet[] {
    if (!canUseStorage()) {
        return [];
    }

    try {
        const storedValue = window.localStorage.getItem(STORAGE_KEY);

        if (!storedValue) {
            return [];
        }

        const parsedValue = JSON.parse(storedValue);

        return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
        return [];
    }
}

export function rememberWallet(wallet: RememberedWallet): RememberedWallet[] {
    if (!canUseStorage()) {
        return [];
    }

    const wallets = getRememberedWallets();
    const filteredWallets = wallets.filter(existingWallet => !(
        existingWallet.chain === wallet.chain &&
        existingWallet.network === wallet.network &&
        existingWallet.walletType === wallet.walletType &&
        existingWallet.address === wallet.address
    ));
    const updatedWallets = [wallet, ...filteredWallets].slice(0, 10);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWallets));

    return updatedWallets;
}

export function getPreferredAlgorandNetwork(fallbackNetwork: AlgorandNetwork): AlgorandNetwork {
    const rememberedWallet = getRememberedWallets().find(wallet => wallet.chain === 'algorand');

    return rememberedWallet?.network || fallbackNetwork;
}

export function getRememberedAlgorandWallet(network: AlgorandNetwork, walletType?: AlgorandWalletType): RememberedWallet | undefined {
    return getRememberedWallets().find(wallet => (
        wallet.chain === 'algorand' &&
        (!walletType || wallet.walletType === walletType) &&
        wallet.network === network
    ));
}
