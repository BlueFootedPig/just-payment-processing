import {
    AcceptedAlgorandAsset,
    AlgorandNetwork,
    LegacyAcceptedAsset,
    PaymentAsset,
    ResolvedPaymentAsset
} from '../types/payment';

function isLegacyAsset(asset: PaymentAsset): asset is LegacyAcceptedAsset {
    return 'assetId' in asset;
}

function isAcceptedAlgorandAsset(asset: PaymentAsset): asset is AcceptedAlgorandAsset {
    return 'assetIds' in asset;
}

export function resolvePaymentAssets(assets: PaymentAsset[] | undefined, network: AlgorandNetwork): ResolvedPaymentAsset[] {
    if (!assets) {
        return [];
    }

    return assets.flatMap((asset) => {
        if (isLegacyAsset(asset)) {
            const symbol = asset.symbol || asset.name || `Asset ${asset.assetId}`;

            return [{
                key: `${network}:${asset.assetId}`,
                assetId: asset.assetId,
                symbol,
                amount: asset.cost,
                decimals: asset.decimals ?? 6,
                name: asset.name || symbol
            }];
        }

        if (isAcceptedAlgorandAsset(asset)) {
            const assetId = asset.assetIds[network];

            if (assetId === undefined) {
                return [];
            }

            return [{
                key: `${network}:${asset.symbol}:${assetId}`,
                assetId,
                symbol: asset.symbol,
                amount: asset.amount,
                decimals: asset.decimals ?? 6,
                name: asset.name || asset.symbol
            }];
        }

        return [];
    });
}

export function toAtomicUnits(amount: number | string, decimals: number): number {
    const normalized = String(amount).trim();

    if (!/^\d+(\.\d+)?$/.test(normalized)) {
        throw new Error('Amount must be a positive decimal value.');
    }

    const [wholePart, fractionPart = ''] = normalized.split('.');

    if (fractionPart.length > decimals) {
        throw new Error(`Amount has more than ${decimals} decimal places.`);
    }

    const wholeUnits = Number(wholePart) * Math.pow(10, decimals);
    const fractionalUnits = Number(fractionPart.padEnd(decimals, '0') || '0');
    const atomicUnits = wholeUnits + fractionalUnits;

    if (!Number.isSafeInteger(atomicUnits) || atomicUnits <= 0) {
        throw new Error('Amount is outside the supported range.');
    }

    return atomicUnits;
}
