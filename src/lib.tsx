import React from 'react';
import ReactDOM from 'react-dom/client';
import PaymentPopup from './Components/PaymentPopup/PaymentPopup';
import { InitOptions, JustPaymentClient, JustPaymentRenderer } from './core/JustPaymentClient';

export type { InitOptions } from './core/JustPaymentClient';

class ReactPopupRenderer implements JustPaymentRenderer {
    private root: ReactDOM.Root | null = null;
    private container: HTMLElement | null = null;

    render(options: InitOptions, isOpen: boolean, onClose: () => void) {
        this.ensureRoot();

        if (!this.root) {
            return;
        }

        this.root.render(
            <PaymentPopup
                merchantWalletAddress={options.merchantWalletAddress}
                assets={options.assets}
                network={options.network}
                receipt={options.receipt}
                rememberWallet={options.rememberWallet}
                mode={options.mode}
                donationDefaultAmount={options.donationDefaultAmount}
                onPaymentComplete={options.onPaymentComplete}
                isOpen={isOpen}
                onClose={onClose}
            />
        );
    }

    destroy() {
        this.root?.unmount();
        this.container?.remove();
        this.root = null;
        this.container = null;
    }

    private ensureRoot() {
        if (this.container || typeof document === 'undefined') {
            return;
        }

        this.container = document.createElement('div');
        this.container.id = 'just-payment-root';
        document.body.appendChild(this.container);
        this.root = ReactDOM.createRoot(this.container);
    }
}

const justPayment = new JustPaymentClient(new ReactPopupRenderer());

if (typeof window !== 'undefined') {
    (window as any).JustPayment = justPayment;
}

export default justPayment;
