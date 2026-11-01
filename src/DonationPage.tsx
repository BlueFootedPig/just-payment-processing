import React, { useState } from 'react';
import PaymentPopup from './Components/PaymentPopup/PaymentPopup';
import { PaymentResult } from './types/payment';

export default function DonationPage() {
  // Enable only after the receiving account opts into MainNet USDC (31566704).
  const mainnetDonationsReady = false;
  const network = new URLSearchParams(window.location.search).get('network') === 'mainnet' ? 'mainnet' : 'testnet';
  const [isOpen, setIsOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [result, setResult] = useState<PaymentResult | null>(null);

  return (
    <main className="checkout donation-page">
      <span className="donation-page-badge">Donations</span>
      <h1>Support Just Payment Processing</h1>
      <p>Help maintain the open-source payment and receipt module. The suggested contribution is 5 USDC; choose any positive amount.</p>
      <p className="donation-page-network">{network === 'testnet' ? 'TestNet preview — test tokens only.' : 'Algorand MainNet — this transfers real USDC.'}</p>
      {network === 'mainnet' && !mainnetDonationsReady && <p role="status">USDC donations are not open yet. The recipient wallet must first opt in to MainNet USDC.</p>}
      <p>This is a voluntary donation. You should not expect a refund or any goods, services, or gifts in return.</p>
      <button className="checkout-pay-button" disabled={network === 'mainnet' && !mainnetDonationsReady} onClick={() => {
        setReference(`DONATION-${crypto.randomUUID()}`);
        setResult(null);
        setIsOpen(true);
      }}>Donate with USDC</button>
      <p>Recipient wallet</p>
      <p className="donation-page-address">VJVQKGORMMHVVA2W3OEODQTRNY6YQ73MRZYUYJVT3YHO3C6VVJK7YHQLBM</p>
      {result && <p role="status">Thank you. Donation confirmed on {result.network}. Reference: {result.transaction.id}</p>}
      <PaymentPopup isOpen={isOpen} onClose={() => setIsOpen(false)} mode="donation"
        network={network} donationDefaultAmount="5.00"
        merchantWalletAddress="VJVQKGORMMHVVA2W3OEODQTRNY6YQ73MRZYUYJVT3YHO3C6VVJK7YHQLBM"
        assets={[{ symbol: 'USDC', name: 'USD Coin', amount: '5.00', decimals: 6, assetIds: { testnet: 10458941, mainnet: 31566704 } }]}
        receipt={{ invoiceNumber: reference, memo: 'Support for Just Payment Processing' }}
        onPaymentComplete={setResult} />
    </main>
  );
}
