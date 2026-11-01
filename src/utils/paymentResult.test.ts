import { createAlgorandPaymentResult } from './paymentResult';
import { ResolvedPaymentAsset } from '../types/payment';

const asset: ResolvedPaymentAsset = {
    key: 'testnet:USDC:67395862',
    assetId: 67395862,
    symbol: 'USDC',
    amount: '5.00',
    decimals: 6,
    name: 'USDC'
};

test('creates a structured Algorand payment result with transaction and asset references', () => {
    const result = createAlgorandPaymentResult('TX-ID', 'testnet', asset, '{"invoice":"INV-1001"}');

    expect(result.transaction).toEqual({
        chain: 'algorand',
        network: 'testnet',
        id: 'TX-ID',
        label: 'Algorand transaction ID'
    });
    expect(result.asset).toEqual({
        chain: 'algorand',
        network: 'testnet',
        id: 67395862,
        symbol: 'USDC',
        name: 'USDC',
        amount: '5.00',
        decimals: 6
    });
});
