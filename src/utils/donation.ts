import { PaymentReceipt, ResolvedPaymentAsset } from '../types/payment';

export const DONATION_ACKNOWLEDGMENT = 'I understand this is a donation and do not expect a refund or any gift in return.';

export function createDonationReceipt(receipt: PaymentReceipt | undefined, asset: ResolvedPaymentAsset, acknowledged: boolean): PaymentReceipt {
    // Donation totals and terms must describe the amount actually being signed.
    return {
        ...(typeof receipt === 'object' ? receipt : receipt ? { memo: receipt } : {}),
        type: 'donation',
        amount: String(asset.amount),
        total: String(asset.amount),
        asset: asset.symbol,
        assetId: asset.assetId,
        decimals: asset.decimals,
        acknowledgment: DONATION_ACKNOWLEDGMENT,
        acknowledgedNoRefundOrGift: acknowledged
    };
}
