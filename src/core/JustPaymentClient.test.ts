import { InitOptions, JustPaymentClient, JustPaymentRenderer } from './JustPaymentClient';
import { vi } from 'vitest';

function createRenderer() {
    const calls: Array<{ options: InitOptions; isOpen: boolean }> = [];
    let closeFromRender: (() => void) | null = null;

    const renderer: JustPaymentRenderer = {
        render: (options, isOpen, onClose) => {
            calls.push({ options, isOpen });
            closeFromRender = onClose;
        },
        destroy: vi.fn()
    };

    return { calls, renderer, getClose: () => closeFromRender };
}

test('drives payment popup state without depending on React', () => {
    const { calls, renderer, getClose } = createRenderer();
    const client = new JustPaymentClient(renderer);
    const options: InitOptions = {
        merchantWalletAddress: 'MERCHANT',
        receipt: { invoice: 'INV-1001' }
    };

    client.init(options);
    expect(calls[calls.length - 1]).toEqual({ options, isOpen: true });

    getClose()?.();
    expect(calls[calls.length - 1]).toEqual({ options, isOpen: false });

    client.open();
    expect(calls[calls.length - 1]).toEqual({ options, isOpen: true });
});

test('can reconfigure merchant options without remounting product logic', () => {
    const { calls, renderer } = createRenderer();
    const client = new JustPaymentClient(renderer);

    client.init({ merchantWalletAddress: 'FIRST' });
    client.configure({ merchantWalletAddress: 'SECOND', rememberWallet: false });

    expect(calls[calls.length - 1]).toEqual({
        options: { merchantWalletAddress: 'SECOND', rememberWallet: false },
        isOpen: true
    });
});
