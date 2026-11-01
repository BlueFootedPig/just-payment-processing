import { AlgorandNetwork, PaymentAsset, PaymentMode, PaymentReceipt, PaymentResult } from '../types/payment';

export interface InitOptions {
    merchantWalletAddress: string;
    assets?: PaymentAsset[];
    network?: AlgorandNetwork;
    receipt?: PaymentReceipt;
    rememberWallet?: boolean;
    mode?: PaymentMode;
    donationDefaultAmount?: number | string;
    onPaymentComplete?: (result: PaymentResult) => void;
}

export interface JustPaymentRenderer {
    render: (options: InitOptions, isOpen: boolean, onClose: () => void) => void;
    destroy?: () => void;
}

export class JustPaymentClient {
    private options: InitOptions = { merchantWalletAddress: '' };
    private isOpen = false;

    constructor(private readonly renderer: JustPaymentRenderer) { }

    init(options: InitOptions) {
        this.options = options;
        this.isOpen = true;
        this.render();
    }

    configure(options: InitOptions) {
        this.options = options;
        this.render();
    }

    open() {
        this.isOpen = true;
        this.render();
    }

    close() {
        this.isOpen = false;
        this.render();
    }

    destroy() {
        this.isOpen = false;
        this.renderer.destroy?.();
    }

    private render() {
        this.renderer.render(this.options, this.isOpen, () => this.close());
    }
}
