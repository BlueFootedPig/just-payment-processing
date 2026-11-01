import { AlgorandNetwork, PaymentResult, ResolvedPaymentAsset } from '../types/payment';

export function createAlgorandPaymentResult(
    txId: string,
    network: AlgorandNetwork,
    asset: ResolvedPaymentAsset,
    receipt: string
): PaymentResult {
    return {
        chain: 'algorand',
        transaction: {
            chain: 'algorand',
            network,
            id: txId,
            label: 'Algorand transaction ID'
        },
        asset: {
            chain: 'algorand',
            network,
            id: asset.assetId,
            symbol: asset.symbol,
            name: asset.name,
            amount: asset.amount,
            decimals: asset.decimals
        },
        network,
        receipt
    };
}
