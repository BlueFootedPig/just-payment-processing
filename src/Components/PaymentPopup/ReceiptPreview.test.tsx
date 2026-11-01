import React from 'react';
import { render, screen } from '@testing-library/react';
import ReceiptPreview from './ReceiptPreview';
import { encodeReceiptNote } from '../../utils/receipt';
import { PaymentReceiptValue } from '../../types/payment';

const asset = { key: 'testnet:USDC', assetId: 10458941, symbol: 'USDC', name: 'USDC', amount: '5.40', decimals: 6 };

test('orders total, nonzero sales tax, subtotal, and item breakdown', () => {
    const receipt = { total: '5.40', salesTax: '0.40', subtotal: '5.00', items: [{ description: 'Apples', total: '5.00' }] };
    render(<ReceiptPreview receipt={receipt} asset={asset} />);
    const preview = screen.getByLabelText('Receipt Note');
    expect(Array.from(preview.children).map(child => child.textContent)).toEqual([
        'Total to pay5.40 USDC', 'Sales tax0.40', 'Items subtotal5.00', 'Apples5.00'
    ]);
    expect(JSON.parse(new TextDecoder().decode(encodeReceiptNote(receipt)))).toEqual(receipt);
});

test.each([0, '0.00', undefined])('omits tax %s from display while preserving the supplied payload', salesTax => {
    const receipt: Record<string, PaymentReceiptValue> = { subtotal: '5.00' };
    if (salesTax !== undefined) receipt.salesTax = salesTax;
    render(<ReceiptPreview receipt={receipt} asset={asset} />);
    expect(screen.queryByText('Sales tax')).not.toBeInTheDocument();
    expect(screen.getByText('Items subtotal')).toBeInTheDocument();
    expect(JSON.parse(new TextDecoder().decode(encodeReceiptNote(receipt)))).toEqual(receipt);
});
