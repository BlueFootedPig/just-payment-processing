# Just Payment Processing

A browser checkout module for direct Algorand payments with a receipt attached to the payment transaction.

Created by **bluefootedpig** · [MIT license](LICENSE) · [Download v0.1.0 preview](https://github.com/BlueFootedPig/just-payment-processing/releases/tag/v0.1.0) · **[Donate to support development](DONATE.md)**

Donation wallet (Algorand): `VJVQKGORMMHVVA2W3OEODQTRNY6YQ73MRZYUYJVT3YHO3C6VVJK7YHQLBM`. MainNet USDC donations are pending recipient opt-in; see the donation guide before sending tokens. No hosted checkout URL is available yet.

Think of it as the digital version of paying from your wallet and keeping the sales receipt: the customer approves a payment in their own wallet, the merchant receives the funds, and the confirmed transaction records a compact reference to the sale. Customers and merchants can later use the transaction ID to inspect the payment and its receipt.

The module connects an existing wallet; it does not create wallets or hold funds or private keys. The merchant supplies the receiving address, accepted assets, prices, and receipt. The customer's wallet signs the transfer.

## What it can do

- Accept ALGO and Algorand Standard Assets (ASAs), including configured USDC assets.
- Offer Pera and Exodus wallet adapters through TxnLab `use-wallet`.
- Connect or restore a wallet session and continue to payment approval from one checkout action.
- Submit the signed transaction and wait for confirmation.
- Attach a plain-text receipt reference or compact JSON receipt to the transaction's note.
- Show a readable receipt preview with total, optional nonzero sales tax, subtotal, memo, and item breakdown.
- Return the transaction ID, chain, network, asset details, and serialized receipt to the merchant.
- Remember public wallet preferences locally, with an option to disable that memory.
- Integrate through a React component or a browser controller with a React renderer.

Current implementation: Algorand only. TestNet and MainNet configuration are available; the included demo is explicitly locked to TestNet. Pera has been exercised during development on TestNet. Other wallet, device, browser, and production combinations need their own end-to-end validation.

The module does not calculate exchange rates or tax, manage inventory or delivery, provide a hosted sale lookup service, or automate refunds.

## How the payment and receipt fit together

1. The merchant creates a sale reference and fixes the order amount and terms.
2. Checkout receives the merchant's address, supported asset amounts, and receipt.
3. The customer chooses a supported asset and wallet, then clicks **Complete Pay**.
4. Checkout restores the wallet session or asks the customer to connect.
5. The customer separately approves the payment in their wallet. Connecting a wallet alone does not authorize payment.
6. The signed transfer is submitted to Algorand with the receipt in its transaction note.
7. After confirmation, checkout displays the transaction ID and invokes `onPaymentComplete`.
8. The merchant verifies the payment and stores its reference against the order.

The confirmed record shows the payment and the receipt data attached to it. The receipt can describe the goods, quantities, or services promised; it does not prove that those goods were delivered or enforce those promises.

## Download and install

The package name is `just-payment-processing`, currently version `0.1.0`. Source is maintained at [BlueFootedPig/just-payment-processing](https://github.com/BlueFootedPig/just-payment-processing). A public npm listing is not assumed to exist yet.

### Install a downloaded module

Download a release's `just-payment-processing-0.1.0.tgz` file, then install it into your application:

```sh
npm install ./downloads/just-payment-processing-0.1.0.tgz
npm install react react-dom
```

React and ReactDOM 18 or later are peer dependencies. An existing React application can use its installed compatible versions. The default popup needs a browser and React even when you call it from plain JavaScript.

Import the package stylesheet once:

```ts
import 'just-payment-processing/style.css';
```

### Build a module from source

Use a Node.js version compatible with the pinned build tools; Vite 7 requires Node 20.19+ or 22.12+. From this module's directory:

```sh
npm ci
npm run build
npm pack
```

`npm pack` builds the library through the `prepack` script and produces `just-payment-processing-0.1.0.tgz`. The tarball includes the compiled module, TypeScript declarations, CSS, package metadata, and this README. Install it into another application using the local-file command above.

To obtain the standalone source first:

```sh
git clone https://github.com/BlueFootedPig/just-payment-processing.git
cd just-payment-processing
```

If you obtained the module inside a larger repository instead, run the build commands inside its `just-payment-processing` subdirectory.

## Quick start: React

Replace the placeholder address with an Algorand receiving address you control. This example charges **5.00 TestNet USDC**, including zero sales tax.

```tsx
import { useState } from 'react';
import { PaymentPopup, type PaymentResult } from 'just-payment-processing';
import 'just-payment-processing/style.css';

export default function Checkout() {
  const [isOpen, setIsOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentResult | null>(null);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Pay with Crypto</button>
      <PaymentPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        merchantWalletAddress="YOUR_MERCHANT_ALGORAND_ADDRESS"
        network="testnet"
        rememberWallet={true}
        assets={[{
          symbol: 'USDC',
          name: 'USD Coin',
          amount: '5.00',
          decimals: 6,
          assetIds: { testnet: 10458941 }
        }]}
        receipt={{
          invoiceNumber: 'SALE-1001',
          memo: 'Thank you for your purchase.',
          currency: 'USD',
          total: '5.00',
          salesTax: '0.00',
          subtotal: '5.00',
          items: [
            { sku: 'APPLES', description: 'Apples', quantity: 2, total: '3.50' },
            { sku: 'BREAD', description: 'Bread', quantity: 1, total: '1.50' }
          ]
        }}
        onPaymentComplete={result => {
          setPayment(result);
          setIsOpen(false);
          // Send this reference to your order system for independent verification.
          // This callback alone must not authorize fulfillment.
        }}
      />
      {payment && (
        <p>Payment confirmed on {payment.transaction.network}.
          Reference: {payment.transaction.id}</p>
      )}
    </>
  );
}
```

Generate a unique sale reference for each real order; the fixed reference above is just an example. Closing this popup does not disconnect the wallet or reverse a submitted payment.

## Merchant configuration

| Option | Meaning |
| --- | --- |
| `merchantWalletAddress` | Required receiving address. No merchant private key is needed by checkout. |
| `assets` | Accepted assets with an explicit amount for each. Omitted or empty means there are no payable options. |
| `network` | `testnet` or `mainnet`. Set this explicitly to restrict checkout to one network. |
| `receipt` | Plain string or JSON object. A basic payment receipt is generated if omitted. |
| `rememberWallet` | Defaults to enabled. Set `false` to stop checkout from writing its own wallet preference data. |
| `mode` | `payment` (default) or `donation`. Donation mode provides an editable amount and mandatory acknowledgment. |
| `donationDefaultAmount` | Initial amount in donation mode; defaults to `'5.00'`. Amounts are units of the selected asset. |
| `onPaymentComplete` | Called with `PaymentResult` after transaction confirmation. Async work returned by your callback is not awaited. |
| `isOpen`, `onClose` | React component visibility controls. The controller manages these itself. |

### Accepted assets and amounts

```ts
const assets = [{
  symbol: 'USDC',
  name: 'USD Coin',
  amount: '5.00',
  decimals: 6,
  assetIds: {
    testnet: 10458941,
    mainnet: 31566704
  }
}];
```

These USDC IDs are published by [Circle](https://www.circle.com/multi-chain-usdc/algorand). Asset IDs identify tokens on a specific network; matching a token's name or symbol is not sufficient verification.

An asset without an ID for the selected network is hidden. If `network` is omitted, checkout derives the selectable networks from the accepted asset list and wallet preferences. For a TestNet-only integration, set `network: 'testnet'` and supply only TestNet IDs.

ALGO uses asset ID `0` and six decimals:

```ts
const algoOption = {
  symbol: 'ALGO',
  amount: '1.00',
  decimals: 6,
  assetIds: { testnet: 0 }
};
```

Prefer decimal strings. Each asset's `amount` is the actual amount charged in that asset, already including applicable tax. Checkout converts it to atomic units using `decimals`. It does not fetch prices, calculate conversions, or validate that your receipt totals reconcile. If offering multiple tokens, supply the correct amount for each; receipt line prices remain the merchant's supplied values.

### Receipts, sales tax, and display

The JSON receipt is serialized without removing internal fields and attached to the payment. Only selected fields are shown in the readable preview:

| Receipt field | Display behavior |
| --- | --- |
| `invoiceNumber` | Sale/receipt reference shown to the customer. Recommended for order lookup. |
| `memo` | Customer-facing note above the item list, after the payment summary. |
| `subtotal` | Optional items subtotal shown beneath tax. |
| `salesTax` | Optional decimal amount. Shown beneath the total when numeric and nonzero; zero or absent tax is hidden. |
| `items` | List of item objects. Shows `description` (or `name`), `quantity`, and `total`. |
| `total`, `currency`, `sku`, other metadata | Preserved in JSON. The displayed payment total comes from the selected asset's `amount` and `symbol`. |

Display order: **total to pay → sales tax when nonzero → items subtotal → memo/reference → items**. Supplied zero tax remains in the JSON even though its row is hidden. If tax is omitted entirely, no tax field is added automatically.

For a taxable order with a 5.00 subtotal and 0.40 tax, set the selected asset amount to `'5.40'`, receipt `total` to `'5.40'`, `salesTax` to `'0.40'`, and `subtotal` to `'5.00'`. The merchant determines the applicable tax; checkout only displays the supplied amount.

Algorand notes allow at most **1024 UTF-8 bytes**, not 1024 characters. `encodeReceiptNote` rejects oversized payloads. For larger orders, put an opaque sale reference in the note and keep the full receipt in the merchant's order system. See [Algorand's transaction reference](https://dev.algorand.co/concepts/transactions/reference/).

**Transaction notes are public.** Fields hidden by the preview, including SKU and merchant metadata, remain visible on-chain if supplied. Do not include personal details, credentials, private order access tokens, or sensitive purchase details. Use an opaque reference when appropriate.

## Browser controller integration

For a non-React host page with a JavaScript bundler, the supplied controller can mount the default React popup:

```ts
import { JustPayment } from 'just-payment-processing';
import 'just-payment-processing/style.css';

export function openCheckout() {
  JustPayment.init({
    merchantWalletAddress: 'YOUR_MERCHANT_ALGORAND_ADDRESS',
    network: 'testnet',
    assets: [{
      symbol: 'USDC', amount: '5.00', decimals: 6,
      assetIds: { testnet: 10458941 }
    }],
    receipt: { invoiceNumber: 'SALE-1001', total: '5.00' },
    onPaymentComplete(result) {
      // Store sale ID + result.transaction + result.asset + result.receipt.
      // Verify independently before fulfilling an order.
      console.info('Transaction reference:', result.transaction.id);
    }
  });
}
```

Call `openCheckout()` from your page's final Pay action. `init(options)` configures and opens checkout. `configure(options)` replaces the complete configuration without changing whether it is open. `open()`, `close()`, and `destroy()` manage its lifecycle.

The default renderer also registers `window.JustPayment` when loaded in a browser. The UMD build requires React/ReactDOM globals and its CSS; install through a bundler unless you are deliberately configuring those script dependencies. Do not treat the UMD file as a standalone wallet application.

`JustPaymentClient` accepts a custom renderer for advanced integrations. It manages popup configuration and visibility; a custom renderer must provide its own checkout UI and connect the required payment behavior. The existing wallet transaction flow lives in `PaymentPopup`.

## Donation mode

Individuals and companies can use `mode: 'donation'` with their own receiving address. It is opt-in; ordinary checkout remains a fixed-price payment.

```ts
import { JustPayment } from 'just-payment-processing';
import 'just-payment-processing/style.css';

export function openDonation() {
  JustPayment.init({
    mode: 'donation',
    donationDefaultAmount: '5.00',
    merchantWalletAddress: 'YOUR_DONATION_ALGORAND_ADDRESS',
    network: 'testnet',
    assets: [{
      symbol: 'USDC', name: 'USD Coin', amount: '5.00', decimals: 6,
      assetIds: { testnet: 10458941 }
    }],
    receipt: { invoiceNumber: 'DONATION-1001', memo: 'Support our work' },
    onPaymentComplete(result) {
      // Store the donation reference and show it to the donor.
      console.info(result.transaction.id);
    }
  });
}
```

The same `mode` and `donationDefaultAmount` options are available on the React `PaymentPopup` component. Generate a fresh reference for each contribution.

The donor sees a **Donation mode** badge, an editable amount initialized to 5, a Donation recipient label, and a **Donate [amount] [asset]** button. Before connecting/signing, they must check:

> I understand this is a donation and do not expect a refund or any gift in return.

The checkbox starts unchecked, resets when the amount, asset, network, or wallet changes, and is required again when checkout reopens. Amounts must be positive and fit the asset's precision. The Donate button is disabled during processing and after a successful contribution to prevent accidental resubmission.

With USDC, a default of 5 means **5 USDC**, a USD-denominated token. Other assets use their own token units; the module does not convert a dollar amount to ALGO or another token.

The serialized receipt preserves supplied metadata and adds `type: 'donation'`, the selected `amount`, `total`, `asset`, `assetId`, `decimals`, the acknowledgment text, and `acknowledgedNoRefundOrGift: true` after consent. Donation amount/total fields override stale merchant values so the note describes the actual signed amount. Donation preview omits purchase-item and sales-tax rows. These acknowledgments record the donor's stated expectations; the module does not adjudicate disputes or establish a legal refund waiver.

For this project's donation wallet and the included donation page, see [DONATE.md](DONATE.md). GitHub's rendered README cannot run an interactive JavaScript payment control. A README can display the wallet and link to this donation guide; once a static donation page is hosted, its link can open the live module.

## Payment results and sale references

`onPaymentComplete` receives this structure (IDs below are placeholders):

```json
{
  "chain": "algorand",
  "network": "testnet",
  "transaction": {
    "chain": "algorand",
    "network": "testnet",
    "id": "CONFIRMED_ALGORAND_TRANSACTION_ID",
    "label": "Algorand transaction ID"
  },
  "asset": {
    "chain": "algorand",
    "network": "testnet",
    "id": 10458941,
    "symbol": "USDC",
    "name": "USD Coin",
    "amount": "5.00",
    "decimals": 6
  },
  "receipt": "{\"invoiceNumber\":\"SALE-1001\",\"total\":\"5.00\"}"
}
```

`receipt` is a serialized string, not a nested object. Parse it as JSON only when you supplied a JSON receipt; plain-text references are also supported.

Keep two references together:

- **Sale ID:** merchant-generated identifier such as `SALE-1001`, used to find the order and what was promised.
- **Transaction ID plus chain/network:** blockchain reference used to retrieve the actual confirmed transfer and attached receipt.

Store both references with the expected receiving address, expected asset ID and amount, order details, and fulfillment/refund status. Show the transaction reference and sale ID on the customer's receipt or order page. The callback does not separately return the sender or receiving address; retrieve them from the confirmed transaction during verification.

### Looking up a sale or receipt later

If the customer has a sale ID, your merchant order system should map it to the transaction reference. This module does not implement that database or a sale-search page. Arbitrary JSON fields are not automatically searchable by sale ID in a blockchain explorer. Indexer note-prefix filters are not a general JSON-field search service.

If the customer has a transaction ID:

1. Select the correct network in an Algorand explorer, such as [Lora](https://lora.algokit.io/).
2. Look up the transaction ID and confirm it was confirmed on that network.
3. Inspect the sender, receiving address, asset ID, and amount.
4. Read or decode the transaction note and compare the sale reference and item details with the merchant's order.
5. Contact the selling merchant with the sale and transaction references if an item or service is missing.

An application can retrieve the record through an Indexer as well. With the installed Algorand SDK:

```ts
import algosdk from 'algosdk';

export async function readTestnetReceipt(transactionId: string) {
  const indexer = new algosdk.Indexer('', 'https://testnet-idx.algonode.cloud', '');
  const response = await indexer.lookupTransactionByID(transactionId).do();
  const transaction = response.transaction;
  const noteText = transaction.note
    ? new TextDecoder().decode(transaction.note)
    : '';
  return { transaction, noteText };
}
```

This example returns the original note text, which may contain JSON or a plain reference. SDK v3 exposes decoded note bytes; raw REST JSON represents the note as Base64. Indexers can lag behind confirmation, so retry a recent lookup before assuming the payment is missing. See [Algorand transaction lookup](https://dev.algorand.co/reference/rest-api/indexer/operations/lookuptransaction/).

### Merchant verification before fulfillment

Treat the browser callback as a notification to check a payment. Before releasing goods or access, verify against a trusted node/indexer and your authoritative order record:

- Correct chain/network and a confirmed transaction.
- Correct receiving address and token asset ID.
- Exact amount in atomic units: 5.00 USDC with six decimals is 5,000,000 units.
- Receipt reference matches the expected sale; public receipt text alone is not proof of an authorized order.
- The transaction has not already been used to pay another order or trigger fulfillment twice.

A self-transfer is useful for TestNet signing tests; it does not demonstrate a separate customer's payment reaching a merchant. A confirmed payment proves the recorded transfer, not delivery or entitlement by itself.

If submission succeeded but confirmation timed out or the browser closed, inspect the account's recent transactions before asking the customer to pay again. The current failure callback/UI is not a payment reconciliation service. Wallet and node errors do not always mean a transaction was never submitted.

## Refunds and merchant responsibility

**The selling merchant or sales agent is responsible for honoring the sale, delivering what was promised, and handling refunds under the agreed sale terms.** The module supplies payment and receipt references for that conversation; it does not adjudicate disputes or guarantee that a merchant honors a refund.

The normal checkout transfer has no built-in reversal, refund, escrow, or chargeback workflow. A refund is a separate transaction authorized by the merchant using their own wallet. Record that refund transaction against the original sale and payment reference, and give its reference to the customer. An optional refund note can identify the original transaction and sale; this is a convention your application implements, not an API provided here.

Never put the merchant's seed phrase or private key in the checkout configuration to automate refunds. Asset issuer controls, such as freeze or clawback capabilities on some ASAs, are separate from this module and do not provide a customer refund guarantee.

## Run the TestNet demo

From this module's source directory:

```sh
npm ci
npm start -- --port 3000
```

Open the URL printed by Vite, normally `http://localhost:3000` with this command. If that port is occupied, Vite may select another one.

1. Set the demo's receiving address in `src/App.tsx` to an account you control; the included address is development configuration, not a shared payment service.
2. Switch the payer wallet to Algorand TestNet. In Pera, use Settings → Developer Settings → Node Settings → TestNet.
3. Fund the payer with test ALGO from the [Algorand TestNet dispenser](https://dispenser.testnet.aws.algodev.network/). Accounts need ALGO for fees and minimum balance requirements.
4. For TestNet USDC, opt both receiving accounts into asset `10458941` as needed, then fund the payer through [Circle's faucet](https://faucet.circle.com/) with **Algorand Testnet** selected. MainNet balances and opt-ins do not carry over.
5. Choose Crypto → Pay → USDC/Pera → Complete Pay. Approve a new connection if requested, then review and approve the payment separately.
6. Check the transaction ID, network, receiving address, asset ID, amount, and receipt note independently.

A self-transfer can exercise signing and notes with one account; its token balance stays unchanged, with ALGO spent on the fee. Use two accounts to verify that the merchant's balance actually increases.

Before release, also exercise rejected connections, rejected signatures, insufficient balances, missing receiver opt-ins, repeated clicks, reloads, stale wallet sessions, and interrupted network/confirmation responses.

## Node configuration and MainNet

Pass `network` explicitly to your component/controller for merchant integrations. The demo in `src/App.tsx` sets `network="testnet"`, so changing an environment default alone does not switch it to MainNet.

The library defaults to public AlgoNode endpoints for each configured network. When building this package from source, optional Vite environment overrides are:

```dotenv
REACT_APP_ALGORAND_NETWORK=testnet
REACT_APP_ALGOD_SERVER=https://testnet-api.algonode.cloud
REACT_APP_ALGOD_PORT=
REACT_APP_ALGOD_TOKEN=
```

The retained `REACT_APP_` names are read through Vite's `import.meta.env`. They are build-time values for the published library: setting them in a consuming application's runtime environment does not reconfigure an already built tarball. Restart the dev server or rebuild after changing them. Node overrides apply across network configurations, so use a node that matches the network you permit. These frontend values are public; never embed a secret API token.

For MainNet, explicitly select `mainnet`, use the correct MainNet asset ID, verify the merchant's opt-in, and repeat end-to-end checks with appropriately small amounts. MainNet transfers involve real assets. The project does not claim a production security audit or universal wallet/browser certification.

## Share through GitHub or npm

For a GitHub release:

1. Retain the included MIT `LICENSE`, copyright notice, and matching `package.json` metadata.
2. If publishing a standalone repository, place this module's source and package files at its root. Include the lockfile, README, maintainer notes, and license; exclude `node_modules`, credentials, and unrelated project files.
3. Run `npm ci`, `npm test`, `npx tsc --noEmit`, and `npm run build`. Review `npm audit` before release.
4. Run `npm pack --dry-run` and inspect the included files, then run `npm pack`.
5. Tag the version and attach the generated `.tgz` to the GitHub release. Consumers can download it and install it using the local-file installation above.

Use a release tarball for installation into another application. The source repository can be cloned and built using the commands above. A source download is not the same as the compiled installable tarball.

For an npm release, first choose an available package name or scope, update package name/version/repository/license metadata and all matching import examples, then publish from this directory using your npm account. Only after publication should consumers use `npm install just-payment-processing` (or your chosen scoped name). Uploading source to GitHub does not automatically create an npm package.

See [npm's installation documentation](https://docs.npmjs.com/cli/install/) for tarball installation behavior. This README describes the release process; it does not indicate that a release has already been published.

## License and contributor guidance

MIT licensed. Copyright (c) 2026 **bluefootedpig**. See [LICENSE](LICENSE) for the terms. Dependencies have their own licenses and notices. Donations are voluntary and are not required to use the module under its license.

Architecture, product constraints, and maintenance guidance are preserved in `MAINTAINERS.md` in the source repository. That contributor-only file is not included in the installable tarball.
