import { AlgorandNetwork } from '../types/payment';

export interface AlgorandNetworkConfig {
    network: AlgorandNetwork;
    label: string;
    algodServer: string;
    algodPort: string;
    algodToken: string;
}

export const ALGORAND_NETWORKS: Record<AlgorandNetwork, AlgorandNetworkConfig> = {
    testnet: {
        network: 'testnet',
        label: 'Algorand TestNet',
        algodServer: 'https://testnet-api.algonode.cloud',
        algodPort: '',
        algodToken: ''
    },
    mainnet: {
        network: 'mainnet',
        label: 'Algorand MainNet',
        algodServer: 'https://mainnet-api.algonode.cloud',
        algodPort: '',
        algodToken: ''
    }
};

export function getDefaultAlgorandNetwork(): AlgorandNetwork {
    return import.meta.env.REACT_APP_ALGORAND_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
}

export function getAlgorandConfig(network: AlgorandNetwork): AlgorandNetworkConfig {
    const base = ALGORAND_NETWORKS[network];

    return {
        ...base,
        algodServer: import.meta.env.REACT_APP_ALGOD_SERVER || base.algodServer,
        algodPort: import.meta.env.REACT_APP_ALGOD_PORT || base.algodPort,
        algodToken: import.meta.env.REACT_APP_ALGOD_TOKEN || base.algodToken
    };
}
