import algosdk from "algosdk";
import * as React from 'react';
import './PaymentPopup.css';
import { WalletManager, WalletProvider, useNetwork, useWallet, type Wallet } from '@txnlab/use-wallet-react';
import { pera } from '@txnlab/use-wallet-pera';
import { exodus } from '@txnlab/use-wallet-exodus';
import { getAlgorandConfig, getDefaultAlgorandNetwork } from '../../config/algorand';
import { AlgorandNetwork, AlgorandWalletType, PaymentAsset, PaymentMode, PaymentReceipt, PaymentResult, ResolvedPaymentAsset } from '../../types/payment';
import { resolvePaymentAssets, toAtomicUnits } from '../../utils/paymentAssets';
import { createAlgorandPaymentResult } from '../../utils/paymentResult';
import { createDefaultReceipt, encodeReceiptNote, serializeReceipt } from '../../utils/receipt';
import { getPreferredAlgorandNetwork, getRememberedAlgorandWallet, rememberWallet } from '../../utils/walletMemory';
import logo from '../../logo.svg'; // Using standard React logo as App Logo
import ReceiptPreview from './ReceiptPreview';
import { createDonationReceipt, DONATION_ACKNOWLEDGMENT } from '../../utils/donation';

export interface PaymentPopupProps {
    isOpen: boolean;
    onClose: () => void;
    assets?: PaymentAsset[];
    merchantWalletAddress: string;
    network?: AlgorandNetwork;
    receipt?: PaymentReceipt;
    rememberWallet?: boolean;
    mode?: PaymentMode;
    donationDefaultAmount?: number | string;
    onPaymentComplete?: (result: PaymentResult) => void;
}

interface WalletOption {
    id: AlgorandWalletType;
    label: string;
}

const WALLET_OPTIONS: WalletOption[] = [
    { id: 'pera', label: 'Pera Wallet' },
    { id: 'exodus', label: 'Exodus' }
];

const ALL_ALGORAND_NETWORKS = 4160;

function createAlgorandWalletManager(defaultNetwork: AlgorandNetwork): WalletManager {
    return new WalletManager({
        wallets: [
            pera({ shouldShowSignTxnToast: true, chainId: ALL_ALGORAND_NETWORKS }),
            exodus()
        ],
        networks: {
            testnet: toUseWalletNetworkConfig('testnet'),
            mainnet: toUseWalletNetworkConfig('mainnet')
        },
        defaultNetwork,
        options: {
            persistNetwork: true
        }
    });
}

function toUseWalletNetworkConfig(network: AlgorandNetwork) {
    const config = getAlgorandConfig(network);

    return {
        algod: {
            token: config.algodToken,
            baseServer: config.algodServer,
            port: config.algodPort
        },
        isTestnet: network === 'testnet'
    };
}

function PaymentPopup(props: PaymentPopupProps) {
    const initialNetwork = React.useMemo(() => getInitialNetwork(props), [props.assets, props.network]);
    const walletManager = React.useMemo(() => createAlgorandWalletManager(initialNetwork), []);

    return (
        <WalletProvider manager={walletManager}>
            <PaymentPopupInner {...props} initialNetwork={initialNetwork} walletManager={walletManager} />
        </WalletProvider>
    );
}

function PaymentPopupInner(props: PaymentPopupProps & { initialNetwork: AlgorandNetwork; walletManager: WalletManager }) {
    const { activeNetwork, setActiveNetwork } = useNetwork();
    const { wallets, activeWallet, activeAddress } = useWallet();
    const [selectedNetwork, setSelectedNetwork] = React.useState<AlgorandNetwork>(props.initialNetwork);
    const [selectedAssetKey, setSelectedAssetKey] = React.useState(() => getResolvedAssets(props, props.initialNetwork)[0]?.key || '');
    const [selectedWalletType, setSelectedWalletType] = React.useState<AlgorandWalletType>(() => getInitialWalletType(props.initialNetwork));
    const [status, setStatus] = React.useState('');
    const [isSuccess, setIsSuccess] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const paymentInFlight = React.useRef(false);
    const isDonation = props.mode === 'donation';
    const [donationAmount, setDonationAmount] = React.useState(String(props.donationDefaultAmount ?? '5.00'));
    const [donationAcknowledged, setDonationAcknowledged] = React.useState(false);

    React.useEffect(() => {
        setDonationAcknowledged(false);
        setDonationAmount(String(props.donationDefaultAmount ?? '5.00'));
        if (!paymentInFlight.current) {
            setIsSuccess(false);
            setStatus('');
            setHasError(false);
        }
    }, [props.isOpen, props.mode, props.donationDefaultAmount]);

    React.useEffect(() => {
        setDonationAcknowledged(false);
    }, [selectedNetwork, selectedAssetKey, selectedWalletType, props.merchantWalletAddress]);

    React.useEffect(() => {
        const selectedNetworkFromProps = getInitialNetwork(props);
        const resolvedAssets = getResolvedAssets(props, selectedNetworkFromProps);
        const currentAsset = resolvedAssets.find(asset => asset.key === selectedAssetKey);

        if (selectedNetworkFromProps !== selectedNetwork || !currentAsset) {
            setSelectedNetwork(selectedNetworkFromProps);
            setSelectedAssetKey(resolvedAssets[0]?.key || '');
            setSelectedWalletType(getInitialWalletType(selectedNetworkFromProps));
        }
    }, [props.assets, props.network, selectedAssetKey, selectedNetwork]);

    React.useEffect(() => {
        if (activeNetwork !== selectedNetwork) {
            setActiveNetwork(selectedNetwork).catch((error) => {
                setStatus('Could not switch Algorand network.');
                setIsSuccess(false);
            });
        }
    }, [activeNetwork, selectedNetwork, setActiveNetwork]);

    if (!props.isOpen) return null;

    const networkConfig = getAlgorandConfig(selectedNetwork);
    const availableNetworks = getAvailableNetworks(props);
    const supportedAssets = getResolvedAssets(props, selectedNetwork);
    const configuredAsset = getSelectedAsset(props, selectedNetwork, selectedAssetKey);
    const selectedAsset = configuredAsset && isDonation ? { ...configuredAsset, amount: donationAmount } : configuredAsset;
    let donationAmountIsValid = true;
    if (isDonation && selectedAsset) {
        try { toAtomicUnits(donationAmount, selectedAsset.decimals); }
        catch { donationAmountIsValid = false; }
    }
    const hasAssets = supportedAssets.length > 0;
    const receiptPreview = selectedAsset ? getReceipt(props, selectedAsset, donationAcknowledged) : null;
    const orderedWalletOptions = getOrderedWalletOptions(selectedNetwork);
    const selectedWallet = wallets.find(wallet => wallet.id === selectedWalletType);
    const rememberedWallet = getRememberedAlgorandWallet(selectedNetwork, selectedWalletType);
    const selectedWalletLabel = orderedWalletOptions.find(wallet => wallet.id === selectedWalletType)?.label || 'Wallet';
    const connectedDisplayAddress = activeWallet?.id === selectedWalletType ? activeAddress : null;

    const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextNetwork = e.target.value as AlgorandNetwork;
        const nextAssets = getResolvedAssets(props, nextNetwork);

        setSelectedNetwork(nextNetwork);
        setDonationAcknowledged(false);
        setSelectedAssetKey(nextAssets[0]?.key || '');
        setSelectedWalletType(getInitialWalletType(nextNetwork));
        setStatus('');
        setIsSuccess(false);
    };

    const handleAssetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAssetKey(e.target.value);
        setDonationAcknowledged(false);
        setStatus('');
        setIsSuccess(false);
    };

    const handleWalletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedWalletType(e.target.value as AlgorandWalletType);
        setDonationAcknowledged(false);
        setStatus('');
        setIsSuccess(false);
    };

    const handleApproveClick = async () => {
        if (paymentInFlight.current) return;
        setHasError(false);
        if (isDonation && (!donationAcknowledged || !donationAmountIsValid || isSuccess)) {
            setStatus('Enter a valid donation amount and acknowledge the donation terms to continue.');
            return;
        }
        if (!selectedAsset) {
            setHasError(true);
            setStatus('No supported Algorand assets are available.');
            return;
        }

        if (!algosdk.isValidAddress(props.merchantWalletAddress)) {
            setHasError(true);
            setStatus('Merchant wallet address is invalid.');
            return;
        }

        if (!selectedWallet) {
            setHasError(true);
            setStatus(`${selectedWalletLabel} is not available in this browser.`);
            return;
        }

        setStatus('');
        setIsSuccess(false);
        setIsProcessing(true);
        paymentInFlight.current = true;
        let stage: 'connection' | 'preparing' | 'signing' | 'submitting' | 'confirming' = 'connection';

        try {
            const signingWallet = props.walletManager.getWallet(selectedWallet.walletKey);
            if (!signingWallet) throw new Error('Selected wallet is not available.');
            setStatus(`Restoring ${selectedWallet.metadata.name} connection...`);
            try {
                // Persisted account state alone does not initialize Pera's transport.
                // Resume the live adapter before trusting its connected address.
                await signingWallet.resumeSession();
            } catch {
                // A stale session requires fresh wallet approval, not a payment retry.
            }
            let payerAddress = signingWallet.activeAccount?.address || null;

            if (!payerAddress) {
                setStatus(`Connect ${selectedWallet.metadata.name} to continue to payment approval...`);
                const accounts = await selectedWallet.connect();
                payerAddress = accounts[0]?.address || null;

                if (!payerAddress) {
                    setStatus('No wallet account was selected. Connect a wallet to continue.');
                    setIsProcessing(false);
                    return;
                }

                rememberConnectedWallet(props, payerAddress, selectedNetwork, selectedWalletType);
            }

            if (!algosdk.isValidAddress(payerAddress)) {
                setHasError(true);
                setStatus('Connected wallet address is invalid.');
                setIsProcessing(false);
                return;
            }
            selectedWallet.setActive();

            stage = 'preparing';
            setStatus('Wallet connected. Preparing your payment...');

            const algodClient = new algosdk.Algodv2(
                networkConfig.algodToken,
                networkConfig.algodServer,
                networkConfig.algodPort
            );
            const suggestedParams = await algodClient.getTransactionParams().do();
            const amount = toAtomicUnits(selectedAsset.amount, selectedAsset.decimals);
            const receipt = getReceipt(props, selectedAsset, donationAcknowledged);
            const receiptNote = encodeReceiptNote(receipt);
            const serializedReceipt = serializeReceipt(receipt);
            const txn = createTransferTransaction(props, suggestedParams, selectedAsset, payerAddress, amount, receiptNote);
            setStatus('Approve the payment in your wallet...');
            stage = 'signing';
            // The React hook's signer captures the active wallet from the render
            // before connect(). The manager resolves the newly active wallet now.
            const signedTransactions = await props.walletManager.signTransactions([txn], [0]);
            const signedTransactionBytes = signedTransactions.filter(Boolean) as Uint8Array[];

            if (!signedTransactionBytes.length) {
                setHasError(true);
                setStatus('The wallet did not sign the payment transaction.');
                setIsProcessing(false);
                return;
            }

            setStatus(`Submitting to ${networkConfig.label}...`);
            stage = 'submitting';

            const response = await algodClient.sendRawTransaction(signedTransactionBytes).do();
            const txId = response.txid;

            stage = 'confirming';
            await algosdk.waitForConfirmation(algodClient, txId, 4);

            setStatus(`${isDonation ? 'Donation' : 'Payment'} successful. TxID: ${txId}`);
            setIsSuccess(true);
            setIsProcessing(false);
            rememberConnectedWallet(props, payerAddress, selectedNetwork, selectedWalletType, selectedAsset.key, true);
            props.onPaymentComplete?.(createAlgorandPaymentResult(txId, selectedNetwork, selectedAsset, serializedReceipt));
        } catch (error) {
            const details = error && typeof error === 'object' ? error as { message?: unknown; data?: { type?: unknown } } : null;
            console.error('[Just Payment] Checkout failed', {
                stage,
                message: details?.message ? String(details.message) : String(error),
                type: details?.data?.type
            });
            setHasError(stage !== 'connection');
            setStatus(stage === 'connection'
                ? 'Wallet connection was not completed. Please connect your wallet to continue.'
                : getPaymentError(error));
            setIsSuccess(false);
        } finally {
            paymentInFlight.current = false;
            setIsProcessing(false);
        }
    };

    return (
        <div className="payment-popup-overlay">
            <div className={`payment-popup-container${isDonation ? ' payment-popup-donation' : ''}`}>
                <button className="payment-popup-close" onClick={props.onClose}>&times;</button>

                <div className="payment-popup-header">
                    {!isDonation && <img src={logo} className="payment-popup-logo" alt="Logo" />}
                    {isDonation && <span className="payment-donation-badge">Donation mode</span>}
                    <div className="payment-popup-title">{isDonation ? 'Make a donation' : 'Secure Checkout'}</div>
                    {isDonation && <p className="payment-donation-description">Choose your contribution. No goods or gifts are included.</p>}
                </div>

                <div className="payment-popup-form-row">
                    <div className="payment-popup-form-group">
                        <label className="payment-popup-label" htmlFor="just-payment-chain">Chain</label>
                        <select
                            id="just-payment-chain"
                            className="payment-popup-select"
                            value={selectedNetwork}
                            onChange={handleNetworkChange}
                            disabled={availableNetworks.length <= 1 || isProcessing}
                        >
                            {availableNetworks.map(availableNetwork => (
                                <option key={availableNetwork} value={availableNetwork}>
                                    {getAlgorandConfig(availableNetwork).label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="payment-popup-form-group">
                        <label className="payment-popup-label" htmlFor="just-payment-wallet">Wallet</label>
                        <select
                            id="just-payment-wallet"
                            className="payment-popup-select"
                            value={selectedWalletType}
                            onChange={handleWalletChange}
                            disabled={isProcessing}
                        >
                            {orderedWalletOptions.map(wallet => (
                                <option key={wallet.id} value={wallet.id}>
                                    {getRememberedAlgorandWallet(selectedNetwork, wallet.id) ? `${wallet.label} remembered` : wallet.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="payment-popup-form-row">
                    <div className="payment-popup-form-group">
                        <label className="payment-popup-label" htmlFor="just-payment-asset">Asset</label>
                        <select
                            id="just-payment-asset"
                            className="payment-popup-select"
                            value={selectedAssetKey}
                            onChange={handleAssetChange}
                            disabled={!hasAssets || isProcessing}
                        >
                            {supportedAssets.map(asset => (
                                <option key={asset.key} value={asset.key}>
                                    {isDonation ? `${asset.name} (${asset.symbol})` : `${asset.name} - ${asset.amount} ${asset.symbol}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {isDonation && selectedAsset && (
                    <div className="payment-popup-form-group">
                        <label className="payment-popup-label" htmlFor="donation-amount">Donation amount ({selectedAsset.symbol})</label>
                        <input id="donation-amount" className="payment-popup-input" inputMode="decimal"
                            value={donationAmount} disabled={isProcessing || isSuccess} aria-invalid={!donationAmountIsValid}
                            onChange={event => {
                                setDonationAmount(event.target.value);
                                setDonationAcknowledged(false);
                                setStatus('');
                                setHasError(false);
                            }} />
                        {!donationAmountIsValid && <span className="payment-donation-validation">Enter a positive amount with up to {selectedAsset.decimals} decimal places.</span>}
                    </div>
                )}

                {!isDonation && <div className="payment-popup-amount-display">
                    {selectedAsset ? `${selectedAsset.amount} ${selectedAsset.symbol}` : 'Unsupported asset'}
                </div>}

                <div className="payment-popup-form-group">
                    <label className="payment-popup-label">{isDonation ? 'Donation recipient' : 'Merchant Wallet'}</label>
                    <div className="payment-popup-address">{props.merchantWalletAddress}</div>
                </div>

                {receiptPreview && selectedAsset && (
                    <div className="payment-popup-form-group">
                        <label className="payment-popup-label">Receipt Note</label>
                        <ReceiptPreview receipt={receiptPreview} asset={selectedAsset} />
                    </div>
                )}

                <div role="status" className={`payment-popup-status ${isSuccess ? 'success' : hasError ? 'error' : ''}`}>
                    {status}
                </div>

                <div className="payment-popup-actions">
                    {isDonation && <label className="payment-donation-acknowledgment">
                        <input type="checkbox" checked={donationAcknowledged} disabled={isProcessing || isSuccess}
                            onChange={event => setDonationAcknowledged(event.target.checked)} />
                        <span>{DONATION_ACKNOWLEDGMENT}</span>
                    </label>}
                    <button className="payment-popup-button" onClick={handleApproveClick}
                        disabled={!hasAssets || isProcessing || (isDonation && (!donationAcknowledged || !donationAmountIsValid || isSuccess))}>
                        {isProcessing ? 'Processing...' : isDonation ? `Donate ${donationAmount} ${selectedAsset?.symbol || ''}` : 'Complete Pay'}
                    </button>
                </div>

                {connectedDisplayAddress && (
                    <div className="payment-popup-wallet-hint">
                        Connected {selectedWalletLabel}: {formatAddress(connectedDisplayAddress)}
                    </div>
                )}
                {!connectedDisplayAddress && rememberedWallet && (
                    <div className="payment-popup-wallet-hint">
                        Remembered {selectedWalletLabel}: {formatAddress(rememberedWallet.address)}
                    </div>
                )}
            </div>
        </div>
    );
}

function getInitialNetwork(props: PaymentPopupProps): AlgorandNetwork {
    if (props.network) {
        return props.network;
    }

    const availableNetworks = getAvailableNetworks(props);
    const preferredNetwork = getPreferredAlgorandNetwork(getDefaultAlgorandNetwork());

    return availableNetworks.includes(preferredNetwork) ? preferredNetwork : availableNetworks[0] || getDefaultAlgorandNetwork();
}

function getAvailableNetworks(props: PaymentPopupProps): AlgorandNetwork[] {
    if (props.network) {
        return [props.network];
    }

    const networks: AlgorandNetwork[] = ['testnet', 'mainnet'];

    return networks
        .filter(network => getResolvedAssets(props, network).length > 0)
        .sort((leftNetwork, rightNetwork) => {
            const leftRemembered = getRememberedAlgorandWallet(leftNetwork) ? 0 : 1;
            const rightRemembered = getRememberedAlgorandWallet(rightNetwork) ? 0 : 1;

            return leftRemembered - rightRemembered;
        });
}

function getResolvedAssets(props: PaymentPopupProps, network: AlgorandNetwork): ResolvedPaymentAsset[] {
    return resolvePaymentAssets(props.assets, network);
}

function getSelectedAsset(props: PaymentPopupProps, network: AlgorandNetwork, selectedAssetKey: string): ResolvedPaymentAsset | undefined {
    const resolvedAssets = getResolvedAssets(props, network);

    return resolvedAssets.find(asset => asset.key === selectedAssetKey) || resolvedAssets[0];
}

function getReceipt(props: PaymentPopupProps, selectedAsset: ResolvedPaymentAsset, acknowledged = false): PaymentReceipt {
    if (props.mode === 'donation') return createDonationReceipt(props.receipt, selectedAsset, acknowledged);
    return props.receipt || createDefaultReceipt(props.merchantWalletAddress, selectedAsset);
}

function getInitialWalletType(network: AlgorandNetwork): AlgorandWalletType {
    return getRememberedAlgorandWallet(network)?.walletType || 'pera';
}

function getOrderedWalletOptions(network: AlgorandNetwork): WalletOption[] {
    return [...WALLET_OPTIONS].sort((leftWallet, rightWallet) => {
        const leftRemembered = getRememberedAlgorandWallet(network, leftWallet.id) ? 0 : 1;
        const rightRemembered = getRememberedAlgorandWallet(network, rightWallet.id) ? 0 : 1;

        return leftRemembered - rightRemembered;
    });
}

function rememberConnectedWallet(
    props: PaymentPopupProps,
    address: string,
    network: AlgorandNetwork,
    walletType: AlgorandWalletType,
    lastAssetKey?: string,
    wasSuccessfulPayment?: boolean
) {
    if (props.rememberWallet === false) {
        return;
    }

    const timestamp = new Date().toISOString();

    rememberWallet({
        chain: 'algorand',
        network,
        walletType,
        address,
        lastConnectedAt: timestamp,
        lastSuccessfulPaymentAt: wasSuccessfulPayment ? timestamp : undefined,
        lastAssetKey
    });
}

function createTransferTransaction(
    props: PaymentPopupProps,
    suggestedParams: algosdk.SuggestedParams,
    selectedAsset: ResolvedPaymentAsset,
    payerAddress: string,
    amount: number,
    note: Uint8Array
) {
    if (selectedAsset.assetId === 0) {
        return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: payerAddress,
            receiver: props.merchantWalletAddress,
            amount,
            note,
            suggestedParams
        });
    }

    return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: payerAddress,
        receiver: props.merchantWalletAddress,
        assetIndex: selectedAsset.assetId,
        amount,
        note,
        suggestedParams
    });
}

function getPaymentError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Cannot read properties') || message.includes('Network request failed')) {
        return 'Payment failed. Could not reach the Algorand node.';
    }

    if (message.includes('overspend') || message.includes('balance')) {
        return 'Payment failed. The connected wallet may not have enough balance or may not be opted in.';
    }

    if (message.includes('Receipt note')) {
        return message;
    }

    return 'Payment failed or was cancelled.';
}

function formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export default PaymentPopup;
