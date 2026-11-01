import React from 'react';
import { PaymentReceipt, PaymentReceiptValue, ResolvedPaymentAsset } from '../../types/payment';

function text(value: PaymentReceiptValue | undefined): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export default function ReceiptPreview({ receipt, asset }: { receipt: PaymentReceipt; asset: ResolvedPaymentAsset }) {
    let displayReceipt = receipt;
    if (typeof receipt === 'string') {
        try {
            const parsed = JSON.parse(receipt);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) displayReceipt = parsed;
        } catch {
            // Plain-text receipts are also supported.
        }
    }

    if (typeof displayReceipt === 'string') {
        return <div className="payment-popup-receipt" aria-label="Receipt Note">{displayReceipt}</div>;
    }

    const memo = text(displayReceipt.memo);
    const isDonation = displayReceipt.type === 'donation';
    const invoice = text(displayReceipt.invoiceNumber);
    const items = Array.isArray(displayReceipt.items) ? displayReceipt.items : [];
    const salesTax = text(displayReceipt.salesTax);
    const showSalesTax = salesTax.trim() !== '' && Number.isFinite(Number(salesTax)) && Number(salesTax) !== 0;
    const subtotal = text(displayReceipt.subtotal);

    return (
        <div className="payment-popup-receipt" aria-label="Receipt Note">
            <div className="payment-receipt-total"><span>{isDonation ? 'Donation total' : 'Total to pay'}</span><strong>{asset.amount} {asset.symbol}</strong></div>
            {!isDonation && showSalesTax && <div className="payment-receipt-summary"><span>Sales tax</span><span>{salesTax}</span></div>}
            {!isDonation && subtotal !== '' && <div className="payment-receipt-summary"><span>Items subtotal</span><span>{subtotal}</span></div>}
            {memo && <p className="payment-receipt-memo">{memo}</p>}
            {invoice && <p className="payment-receipt-invoice">Receipt {invoice}</p>}
            {!isDonation && items.length > 0 && (
                <ul className="payment-receipt-items">
                    {items.map((item, index) => {
                        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
                        const description = text(item.description) || text(item.name) || 'Item';
                        const quantity = text(item.quantity);
                        return (
                            <li key={index}>
                                <span>{quantity ? `${quantity} × ` : ''}{description}</span>
                                <span>{text(item.total)}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
