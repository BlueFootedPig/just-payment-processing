import { PaymentReceipt, ResolvedPaymentAsset } from '../types/payment';

const MAX_ALGORAND_NOTE_BYTES = 1024;

export function createDefaultReceipt(
    merchantWalletAddress: string,
    selectedAsset: ResolvedPaymentAsset
): PaymentReceipt {
    return {
        type: 'just-payment-processing-receipt',
        merchantWalletAddress,
        assetId: selectedAsset.assetId,
        asset: selectedAsset.symbol,
        amount: selectedAsset.amount
    };
}

export function serializeReceipt(receipt: PaymentReceipt): string {
    if (typeof receipt === 'string') {
        return receipt;
    }

    return JSON.stringify(receipt);
}

export function encodeReceiptNote(receipt: PaymentReceipt): Uint8Array {
    const serializedReceipt = serializeReceipt(receipt);
    const encodedReceipt = new TextEncoder().encode(serializedReceipt);

    if (encodedReceipt.length > MAX_ALGORAND_NOTE_BYTES) {
        throw new Error(`Receipt note is ${encodedReceipt.length} bytes. Algorand transaction notes support up to ${MAX_ALGORAND_NOTE_BYTES} bytes.`);
    }

    return encodedReceipt;
}
