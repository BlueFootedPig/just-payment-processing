import { createDefaultReceipt, encodeReceiptNote, serializeReceipt } from './receipt';
import { ResolvedPaymentAsset } from '../types/payment';

const selectedAsset: ResolvedPaymentAsset = {
    key: 'testnet:USDC:67395862',
    assetId: 67395862,
    symbol: 'USDC',
    amount: '5.00',
    decimals: 6,
    name: 'USDC'
};

test('serializes object receipts as JSON transaction notes', () => {
    const receipt = {
        invoiceNumber: 'INV-1001',
        items: [
            { sku: 'APPLES', total: '3.50' }
        ]
    };

    expect(serializeReceipt(receipt)).toBe('{"invoiceNumber":"INV-1001","items":[{"sku":"APPLES","total":"3.50"}]}');
    expect(new TextDecoder().decode(encodeReceiptNote(receipt))).toBe(serializeReceipt(receipt));
});

test('builds a default receipt when a merchant does not supply one', () => {
    const receipt = createDefaultReceipt('MERCHANT', selectedAsset);

    expect(serializeReceipt(receipt)).toContain('"asset":"USDC"');
    expect(serializeReceipt(receipt)).toContain('"merchantWalletAddress":"MERCHANT"');
});

test('rejects receipts that exceed Algorand note size limits', () => {
    expect(() => encodeReceiptNote('x'.repeat(1025))).toThrow(/1025 bytes/);
});
