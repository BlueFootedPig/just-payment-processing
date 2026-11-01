export type AlgorandNetwork = 'testnet' | 'mainnet';
export type PaymentMode = 'payment' | 'donation';

export type AlgorandWalletType = 'pera' | 'exodus';

export type PaymentReceiptValue = string | number | boolean | null | PaymentReceiptValue[] | {
    [key: string]: PaymentReceiptValue;
};

export type PaymentReceipt = string | {
    [key: string]: PaymentReceiptValue;
};

export interface AcceptedAlgorandAsset {
    symbol: string;
    amount: number | string;
    assetIds: Partial<Record<AlgorandNetwork, number>>;
    decimals?: number;
    name?: string;
}

export interface LegacyAcceptedAsset {
    assetId: number;
    cost: number;
    decimals?: number;
    name?: string;
    symbol?: string;
}

export type PaymentAsset = AcceptedAlgorandAsset | LegacyAcceptedAsset;

export interface ResolvedPaymentAsset {
    key: string;
    assetId: number;
    symbol: string;
    amount: number | string;
    decimals: number;
    name: string;
}

export interface PaymentTransaction {
    chain: 'algorand';
    network: AlgorandNetwork;
    id: string;
    label: string;
}

export interface PaymentAssetResult {
    chain: 'algorand';
    network: AlgorandNetwork;
    id: number;
    symbol: string;
    name: string;
    amount: number | string;
    decimals: number;
}

export interface PaymentResult {
    chain: 'algorand';
    transaction: PaymentTransaction;
    asset: PaymentAssetResult;
    network: AlgorandNetwork;
    receipt: string;
}
