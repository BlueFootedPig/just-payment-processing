import React, { useState } from 'react';
import './App.css';
import PaymentPopup from './Components/PaymentPopup/PaymentPopup';
import { PaymentAsset } from './types/payment';
import DonationPage from './DonationPage';

const demoAssets: PaymentAsset[] = [
  {
    symbol: 'USDC',
    name: 'USDC',
    amount: '5.00',
    decimals: 6,
    assetIds: {
      testnet: 10458941,
      mainnet: 31566704
    }
  },
  {
    symbol: 'DDR',
    name: 'DeDigitalRights Token',
    amount: '10.00',
    decimals: 6,
    assetIds: {
      testnet: 15956644
    }
  }
];

function App() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'crypto'>('crypto');

  if (new URLSearchParams(window.location.search).get('mode') === 'donation') return <DonationPage />;

  const handlePay = () => {
    if (paymentMethod === 'crypto') {
      setIsPopupOpen(true);
    }
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <div className="App">
      <main className="checkout">
        <header className="checkout-header">
          <div>
            <h1>Checkout</h1>
            <p>Demo merchant closeout</p>
          </div>
          <div className="checkout-total">$5.00</div>
        </header>

        <section className="checkout-section">
          <h2>Payment Method</h2>
          <label className="payment-option">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={() => setPaymentMethod('card')}
            />
            <span>
              <strong>Credit card</strong>
              <small>Placeholder merchant option</small>
            </span>
          </label>
          <label className="payment-option">
            <input
              type="radio"
              name="paymentMethod"
              value="paypal"
              checked={paymentMethod === 'paypal'}
              onChange={() => setPaymentMethod('paypal')}
            />
            <span>
              <strong>PayPal</strong>
              <small>Placeholder merchant option</small>
            </span>
          </label>
          <label className="payment-option">
            <input
              type="radio"
              name="paymentMethod"
              value="crypto"
              checked={paymentMethod === 'crypto'}
              onChange={() => setPaymentMethod('crypto')}
            />
            <span>
              <strong>Crypto</strong>
              <small>Choose chain and token after final pay</small>
            </span>
          </label>
        </section>

        <button className="checkout-pay-button" onClick={handlePay}>
          Pay
        </button>

        <PaymentPopup
          merchantWalletAddress="VJVQKGORMMHVVA2W3OEODQTRNY6YQ73MRZYUYJVT3YHO3C6VVJK7YHQLBM"
          assets={demoAssets}
          network="testnet"
          receipt={{
            invoiceNumber: 'TESTNET-GROCERY-1001',
            merchant: 'Just Payment Processing Demo',
            total: '5.00',
            salesTax: '0.00',
            subtotal: '5.00',
            items: [
              { sku: 'APPLES', description: 'Apples', quantity: 2, total: '3.50' },
              { sku: 'BREAD', description: 'Bread', quantity: 1, total: '1.50' }
            ],
            memo: 'Demo receipt stored in the Algorand transaction note'
          }}
          isOpen={isPopupOpen}
          onClose={handleClosePopup}
        />
      </main>
    </div>
  );
}

export default App;
