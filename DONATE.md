# Support Just Payment Processing

Voluntary donations support development of the payment and receipt module. No refund or gift is expected in return. Using the MIT-licensed module does not require a donation.

## Donation wallet

**Network: Algorand MainNet**

```text
VJVQKGORMMHVVA2W3OEODQTRNY6YQ73MRZYUYJVT3YHO3C6VVJK7YHQLBM
```

ALGO can be sent directly to this address from an Algorand wallet. Check the network and recipient before approving a transfer.

**MainNet USDC checkout is not open yet.** When checked during setup, this address had not opted into MainNet USDC asset `31566704`. The wallet owner must complete that opt-in before receiving USDC donations. Do not send USDC on another blockchain to this Algorand address.

## Donate through our checkout

The project's donation page uses this module, with an editable amount defaulting to **5 USDC**, a visible Donation mode badge, and this required acknowledgment:

> I understand this is a donation and do not expect a refund or any gift in return.

The signed transaction note records the donation amount, asset, reference, and acknowledgment. A wallet connection by itself does not authorize a donation; donors must still approve the transaction.

A public checkout URL has not been configured yet. GitHub README files cannot execute this JavaScript checkout directly. Once the page is hosted, link the README's donation button to that HTTPS page.

## Preview locally

From the module directory:

```sh
npm ci
npm start -- --port 3000
```

Open `http://localhost:3000/?mode=donation`. This defaults to **TestNet**, using test USDC asset `10458941`; it does not make a real donation. Choose Donate with USDC, edit the amount if desired, acknowledge the terms, then connect and approve in Pera or another supported wallet.

## Publish the donation page

1. Complete the recipient's MainNet USDC opt-in and verify it independently.
2. Set `mainnetDonationsReady` to `true` in `src/DonationPage.tsx` only after that opt-in is confirmed.
3. Run `npm run build:demo`. Host the resulting `build/` directory on an HTTPS static site. The page requires no merchant private key or payment backend.
4. For hosting beneath a subdirectory, such as a GitHub Pages project site, build with `npm run build:demo -- --base=./` so bundled asset paths remain relative.
5. Check the hosted page with `?mode=donation&network=mainnet`. Its banner must say MainNet; confirm the receiving address and USDC ID before enabling the public link.
6. Replace the README donation link's `DONATE.md` target with the real HTTPS checkout URL including `?mode=donation&network=mainnet`.

The MainNet page is intentionally disabled until wallet setup is complete. No deployment, donation, or opt-in transaction is performed by these instructions.
