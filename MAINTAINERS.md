# Maintainer Notes

Contributor architecture and maintenance guidance. For installation and merchant integration, see [README.md](README.md).

## Future AI Guidance

This section is intentionally written for future maintainers and AI coding agents. Do not remove or contradict these principles unless the product direction has explicitly changed.

### Product Direction

Just Payment Processing is meant to be a lightweight frontend payment facilitator, not a hosted payment service. The module should help a merchant accept crypto by presenting a familiar PayPal-like checkout popup, letting the payer choose one of the merchant-supported payment options, asking the payer's wallet to sign, submitting the signed transaction to the selected chain, returning a transaction reference to the merchant, and writing a compact receipt or receipt identifier into the payment's on-chain transaction data when the selected chain provides a practical way to do it.

### AI Interpretation Directive

Future AI agents must interpret product requests by the goal they are trying to accomplish, not only by the exact protocol term the user used. The user may describe the ideal outcome in plain language, such as "write the receipt on the blockchain" or "put the receipt number in the transaction note." Do not reject that goal just because a specific chain does not call the relevant field a `note`, `memo`, or receipt field.

For this project, "write the receipt on the blockchain" means: attach a compact receipt number, invoice number, or receipt payload to the payment transaction itself when the chain has any practical native transaction-data mechanism for doing so. Equivalent mechanisms can include a note field, memo field, transaction data/input field, `OP_RETURN`, contract-call calldata, payment metadata, or another chain-native payload field, as long as the data is durably associated with the payment transaction and can be inspected later through ordinary chain tooling or APIs.

When assessing a new chain, reason from the verification goal:

- Can the payment transaction itself carry a compact receipt identifier or payload?
- Can a merchant or customer later inspect the transaction and see or recover that receipt data through a block explorer, node API, indexer, wallet, or contract event?
- Is the mechanism broadly practical for normal payments, or does it require an unusual wallet, contract, relay, custodian, or backend?
- What are the size, cost, privacy, wallet UX, and explorer visibility limits?
- If the exact mechanism is not available, is there a different chain-native way to accomplish the same verification goal?

Do not treat "no native note field" as the same as "no way to write receipt data." Ethereum, for example, has transaction input/calldata even though ordinary ETH transfers do not have an Algorand-style note field. Bitcoin can carry limited arbitrary data through mechanisms such as `OP_RETURN`, even though Bitcoin does not have a first-class payment memo field. The correct product question is whether the mechanism can reliably support the receipt-verification goal for the intended payment flow.

Future AI agents are always allowed to ask clarifying questions about the user's goals, constraints, and core principles. If an instruction appears to conflict with a non-negotiable design principle, first ask whether the instruction is meant to override the principle, reveal a misunderstanding, or update the principle. Do not silently discard the instruction, and do not rigidly enforce an old principle when the user may be intentionally changing product direction.

The first supported chain is Algorand on TestNet. Algorand wallet support is routed through TxnLab `use-wallet` so the popup can support multiple wallets without hardcoding each wallet SDK into the payment flow. Current consumer wallet options are Pera and Exodus. The long-term goal is broader: support every major chain and common token type where practical. The merchant should be able to configure which chains, tokens, assets, wallets, and receiving addresses it accepts. Unsupported options should not be shown to the payer.

### Non-Negotiable Design Principles

- Keep the core module frontend-first and lightweight. Do not add a required web service unless there is a clear product requirement that cannot be met client-side.
- Do not introduce clawback, escrow, partial-signing, custody, or merchant-key control flows for the normal payment path.
- The payer signs with their own wallet. Merchant private keys must never be placed in frontend code.
- The payment should behave like a real-world cash/card closeout: once the payer commits and the chain confirms, the deal is done.
- The blockchain receipt should be part of the payment transaction when practical. Prefer a native note/memo field when available, but equivalent transaction-data mechanisms count if they accomplish the same verification goal.
- A successful payment must always return a structured transaction reference to the merchant, whether or not the selected chain supports a native note/memo field.
- Vendors and customers must always have enough returned data to verify a payment on the correct chain/network and identify the asset used.
- React is a supported wrapper, not the product boundary. Keep the core browser API usable from plain JavaScript and other UI frameworks.
- Keep receipt payloads compact. They may be an invoice number, receipt number, or small JSON object. Do not assume full shopping-cart detail will fit on every chain.
- The popup UX is central. A host site should be able to offer `Pay with Crypto`, then show a checkout popup where the payer connects/scans/approves using their wallet.
- Merchant configuration drives what the payer sees: accepted chains, accepted tokens/assets, token IDs per network, and receiving wallet per chain.
- Remembered public wallet data may improve UX, but it must never be treated as payment authorization.
- Streamlined UX is a product requirement. Prefer fewer clicks, fewer fields, lazy loading, shorter pointer/eye travel, and one clear primary action over extra confirmation or setup steps.
- Smooth checkout means future actions should get easier when safe public data is already available, but the module should avoid noisy or unused data. Keep data minimal unless it directly helps verification, payment completion, support, or future checkout speed.

### Code Writing Guidelines

Use these rules for all new code and refactors:

- Prefer TypeScript names that feel natural to C# developers: `camelCase` for variables and functions, `PascalCase` for types, interfaces, classes, and React components.
- Keep modules focused. A file should have one primary responsibility; if a second reason to change appears, split it behind a small wrapper, service, adapter, or helper module.
- Keep one class per module. Prefer functions for simple behavior, and introduce a class only when it owns state or a clear lifecycle.
- Follow SOLID principles pragmatically. Single responsibility matters most in this project.
- Preserve an onion-style architecture: payment/domain logic should not know about logging, persistence, notifications, analytics, or UI framework details.
- Put infrastructure concerns behind wrappers or ports. If the system needs logging, persistence, email, notification, browser storage, scanner lookup, or external messaging, create a focused layer for that responsibility.
- Do not mix transaction construction/submission with unrelated side effects. Transaction code should read like transaction code.
- Keep React as a UI adapter. Shared payment rules, result shapes, receipt serialization, and merchant-facing controller behavior belong in framework-neutral TypeScript.
- Avoid direct `console.log` in product code. Logging should go through an explicit diagnostics layer when one is needed.
- Prefer small pure functions for parsing, validation, serialization, asset resolution, receipt construction, and result shaping.
- Keep public result objects minimal but complete. Include data needed for verification, support, payment completion, and faster future checkout; avoid fields with no clear use.
- Remove dead code promptly. Do not keep old wallet, chain, build-tool, or framework experiments in `src/` once the active path has replaced them.

### Reasoning And Goal Object Graph

```yaml
JustPaymentProcessing:
  purpose:
    primary: "Facilitate direct crypto payments from payer wallet to merchant wallet."
    secondary: "Write a compact, merchant-supplied receipt to the blockchain."
    not_a_goal:
      - "Hosted payment service"
      - "Custodial wallet"
      - "Backend-controlled payment processor"
      - "NFT control system"
      - "Clawback or escrow system"

  architecture_decisions:
    frontend_first:
      decision: "No required web service for the core payment path."
      reason:
        - "Keep merchant adoption lightweight."
        - "Avoid server custody, server signing, and private-key handling."
        - "Let the payer wallet sign directly."
      allowed_backend_uses:
        - "Optional order lookup"
        - "Optional analytics"
        - "Optional receipt generation"
        - "Optional post-payment fulfillment"
      forbidden_backend_dependency:
        - "Requiring a service just to build/sign/submit a normal payment transaction."

    transaction_model:
      decision: "Use normal irreversible wallet transfers for payments."
      current_implementation:
        chain: "Algorand"
        network: "TestNet by default"
        wallet_layer: "TxnLab use-wallet"
        wallets:
          - "Pera"
          - "Exodus"
        transfer_types:
          - "ALGO payment transaction"
          - "Algorand Standard Asset transfer"
      reason:
        - "Matches real-world payment finality."
        - "Avoids clawback, escrow, and partial-signed contract complexity."

    receipt_model:
      decision: "Encode receipt data into the payment transaction through any practical chain-native transaction-data mechanism, and always return a transaction reference."
      algorand_field: "transaction note"
      equivalent_mechanisms:
        - "Native note field"
        - "Native memo field"
        - "Transaction data/input field"
        - "OP_RETURN or similar limited arbitrary-data output"
        - "Contract-call calldata or event data when the payment flow already uses a contract"
      current_limit_bytes: 1024
      merchant_result:
        transaction:
          id: "Chain transaction ID, hash, or signature."
          chain: "Chain where the payment was submitted."
          network: "Network where the payment was submitted."
          label: "Human-readable label for customer display."
        asset:
          id: "Chain-specific asset/token ID or contract identifier."
          chain: "Chain where the asset exists."
          network: "Network where the asset exists."
          symbol: "Merchant-facing asset symbol."
          name: "Merchant-facing asset name."
          amount: "Display amount paid."
          decimals: "Asset decimal precision used for transaction conversion."
      examples:
        - "INV-1001"
        - '{"invoice":"INV-1001","total":"5.00"}'
        - '{"store":"Demo Grocery","items":[{"sku":"APPLES","total":"3.50"}],"total":"5.00"}'
      reason:
        - "Creates durable proof of what the payment was for."
        - "Keeps the receipt coupled to the payment transaction."
        - "Gives merchants and customers a universal support reference even on chains without native receipt notes."
      caution:
        - "A raw transaction hash/ID generally does not identify the chain or asset by itself; preserve chain/network with the ID and preserve the structured asset details."
        - "Do not store sensitive personal information in public chain notes."
        - "Keep payloads compact and chain-compatible."

    integration_model:
      decision: "Keep the public payment controller framework-neutral, with React as one renderer."
      current_default:
        browser_global: "window.JustPayment"
        controller: "JustPaymentClient"
        default_renderer: "React PaymentPopup mounted by lib.tsx"
      reason:
        - "Plain JavaScript embeds should work for older sites, CMS pages, and point-of-sale systems."
        - "React merchants should get a lightweight wrapper without forcing React onto every integration."
        - "Future Angular, Vue, or custom DOM integrations should wrap the same client instead of duplicating payment logic."

    code_architecture:
      decision: "Use focused modules with onion-style boundaries and explicit adapters for infrastructure concerns."
      naming:
        variables_and_functions: "camelCase"
        types_interfaces_classes_components: "PascalCase"
      module_rules:
        - "One primary responsibility per module."
        - "One class per module when a class is needed."
        - "Prefer functions for stateless logic."
        - "Split logging, persistence, notifications, analytics, scanner lookup, and wallet infrastructure from transaction logic."
      reason:
        - "When logging breaks, the problem should be in the logging layer."
        - "When transactions break, transaction modules should contain transaction concerns only."
        - "Future framework wrappers should reuse the same core payment behavior."

    merchant_configuration:
      decision: "Merchant declares accepted payment options."
      includes:
        - "Accepted chains"
        - "Accepted tokens/assets"
        - "Network-specific token or asset IDs"
        - "Receiving wallet address per chain"
        - "Amount"
        - "Receipt payload"
      rule: "If a token/asset is not supported for the active network, do not display it."
      example:
        token: "USDC"
        algorand:
          testnet_asset_id: 10458941
          mainnet_asset_id: 31566704

    user_experience:
      decision: "Checkout should resemble PayPal-style embedded payment popups."
      design_principle: "Streamlined by default."
      streamline_rules:
        - "Prefer fewer clicks over more clicks."
        - "Do not split wallet connection into a separate required step when final payment can trigger connection/signing."
        - "Lazy-load or defer work until the user reaches the point where it is needed."
        - "Keep related buttons and fields close together; fewer pixels of travel is better than more."
        - "Use one obvious primary action for the payment commit path."
        - "Do not ask for crypto-specific information before the final popup unless absolutely required."
        - "Use remembered public data to reduce future steps when it safely speeds checkout."
        - "Do not surface or request data that has no clear use in payment, verification, support, or future checkout speed."
      desired_flow:
        - "Customer chooses Pay with Crypto on merchant site."
        - "Popup opens as part of checkout/closeout."
        - "Customer selects supported chain/token if multiple are available."
        - "Customer clicks the popup's primary payment action."
        - "Wallet connection and approval happen as part of that payment action."
        - "Wallet signs the transaction."
        - "Frontend submits transaction to the chain."
        - "Popup shows transaction result and receipt reference."
        - "Merchant callback receives a structured transaction reference for order storage."
      merchant_page_rule:
        - "The merchant page may show Crypto as a payment method."
        - "The merchant page should not require chain/token/wallet choices before final Pay."
        - "Chain/token/wallet choices belong in the popup at final payment time."

    remembered_wallets:
      decision: "Remember non-sensitive wallet preferences locally to improve repeat checkout."
      current_scope: "Browser/site-local storage only."
      long_term_goal: "Optional cross-merchant wallet preference continuity, similar in spirit to PayPal remembering a user."
      remember_after:
        - "Successful wallet connection"
        - "Successful payment submission"
        - "Successful confirmed transaction"
      may_store:
        - "Chain"
        - "Wallet type/provider"
        - "Public wallet address"
        - "Last successful token/asset"
        - "Last successful payment timestamp"
      must_not_store:
        - "Private keys"
        - "Seed phrases"
        - "Signed transactions for later submission"
        - "Wallet credentials"
        - "Sensitive receipt contents"
      usage:
        - "Sort chains with known wallets higher in the popup."
        - "Sort remembered wallet providers higher in the popup."
        - "Preselect the most likely wallet/token."
        - "Query public balances or supported assets in the future."
        - "Reduce repeated user setup across checkout attempts."
      authority_rule:
        - "Remembered address is a hint, not authority."
        - "The wallet that signs the final transaction is authoritative."
        - "If remembered address and signing wallet disagree, signing wallet wins."
      future_lookup:
        - "Use chain scanner, indexer, or node APIs to inspect remembered public addresses."
        - "Use lookup results only to improve display/order; never to skip wallet approval."

  expansion_path:
    near_term:
      - "Harden Algorand TestNet flow."
      - "Test with real Pera and Exodus wallet approval."
      - "Improve merchant configuration ergonomics."
    future:
      - "Algorand MainNet"
      - "Additional Algorand assets"
      - "Ethereum and ERC-20 style payments"
      - "Bitcoin or lightning-style flows if practical"
      - "Other major chains and tokens"
    invariant_for_new_chains:
      - "Do not show unsupported payment options."
      - "Use the payer wallet for signing."
      - "Use the chain's native receipt/memo/note/data equivalent when available and practical."
      - "Always return structured transaction and asset references with chain, network, and IDs, even when no native receipt field exists."
      - "Keep backend services optional unless technically unavoidable."
```

## Verification

```powershell
npx.cmd tsc --noEmit
npm.cmd test
npm.cmd run build
npm.cmd audit
```

The demo and library builds use Vite. Do not reintroduce Create React App, `react-scripts`, or `react-app-rewired`.

Current security posture:

- `npm audit` should report zero vulnerabilities before release.
- Keep the `esbuild` override until Vite's dependency range no longer needs it for the audited version.
- Prefer removing stale wallet/build dependencies over suppressing advisories.

Current wallet dependency notes:

- TxnLab `use-wallet` v5 uses separate adapter packages per wallet.
- Keep wallet adapters modular and only install adapters that are actively supported and needed for the demo.
- Do not keep old wallet adapters merely because they compile; stale wallet dependencies can carry security advisories and bundle-size cost.
- Enabling more wallet adapters increases the built library size. If package size becomes a product problem, prefer lazy-loading wallet adapters over reducing necessary payer wallet options.

