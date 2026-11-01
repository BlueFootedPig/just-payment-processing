import { resolvePaymentAssets, toAtomicUnits } from './paymentAssets';
import { PaymentAsset } from '../types/payment';

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
        amount: '10',
        decimals: 6,
        assetIds: {
            testnet: 15956644
        }
    }
];

test('resolves only assets supported on the selected Algorand network', () => {
    const testnetAssets = resolvePaymentAssets(assets, 'testnet');
    const mainnetAssets = resolvePaymentAssets(assets, 'mainnet');

    expect(testnetAssets.map(asset => asset.symbol)).toEqual(['USDC', 'DDR']);
    expect(mainnetAssets.map(asset => asset.symbol)).toEqual(['USDC']);
    expect(mainnetAssets[0].assetId).toBe(31566704);
});

test('converts display amounts to Algorand atomic units', () => {
    expect(toAtomicUnits('5.25', 6)).toBe(5250000);
    expect(toAtomicUnits('1', 0)).toBe(1);
});
