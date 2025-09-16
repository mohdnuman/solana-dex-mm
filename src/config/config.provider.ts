import fs from "fs";
import _ from "lodash";

import solanaLib from "../lib/solana.lib";
import helperLib from "../lib/helper.lib";
import loggerLib from "../lib/logger.lib";

const MAX_WALLETS_PER_MULTI_CALL: number = 100;
const WALLET_BALANCE_REFRESH_INTERVAL_MS: number = 1000;

interface Wallet {
    address: string;
    privateKey: string;
}

interface WalletGroup {
    name: string;
    wallets: Wallet[];
}

export default class ConfigProvider {
    filePath: string;
    config: {
        dex: string;
        bias: number;
        tokenAddress: string;
        poolAddress: string;
        tradesPerCycle: number
        volumePerMinute: number;
        volumeStratWalletGroupName: string;
        walletGroups: WalletGroup[];
    };

    private walletBalances: Map<string, { solBalance: number; tokenBalance: number }> = new Map();

    constructor(filePath: string) {
        this.filePath = filePath;

        if (!fs.existsSync(this.filePath)) {
            throw new Error(`Config file not found at path: ${this.filePath}`);
        }

        const data = fs.readFileSync(this.filePath, "utf8");
        this.config = JSON.parse(data);
        this.monitorWalletBalances();
    }

    save = (): void => {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            throw error;
        }
    };

    getConfig = (): any => {
        return {...this.config};
    };

    updateConfig = (newValues: any): void => {
        try {
            this.config = {...this.config, ...newValues};
            this.save();
        } catch (error) {
            throw error;
        }
    };

    getWalletGroupNames = (): string[] => {
        const config = this.getConfig();
        return config.walletGroups.map((group: WalletGroup) => group.name);
    };

    createWalletGroup = (groupName: string, walletCount: number): WalletGroup => {
        const config = this.getConfig();

        const walletGroupNames = this.getWalletGroupNames();
        if (walletGroupNames.includes(groupName)) {
            throw new Error(`Wallet group '${groupName}' already exists`);
        }

        const wallets: Wallet[] = _.range(walletCount).map(() => solanaLib.generateWallet());
        wallets.forEach((wallet: Wallet) => {
            this.walletBalances.set(wallet.address, {solBalance: 0, tokenBalance: 0});
        })
        const newWalletGroup: WalletGroup = {
            name: groupName,
            wallets: wallets
        };
        this.updateConfig({walletGroups: [...config.walletGroups, newWalletGroup]});

        const walletsWithBalances: Wallet[] = wallets.map(wallet => ({
            ...wallet,
            solBalance: 0,
            tokenBalance: 0
        }));

        return {
            name: groupName,
            wallets: walletsWithBalances
        };
    };

    monitorWalletBalances = () => {
        try {
            setInterval(async () => {
                try {
                    const {walletGroups, tokenAddress} = this.getConfig();
                    const allWallets = walletGroups.flatMap((group: WalletGroup) => group.wallets);

                    if (_.isEmpty(allWallets)) return;

                    const walletChunks: Wallet[][] = _.chunk(allWallets, MAX_WALLETS_PER_MULTI_CALL);

                    const solBalancesPromises = walletChunks.map((walletChunk: Wallet[]) =>
                        solanaLib.getBatchSolBalance(walletChunk.map((wallet) => wallet.address)),
                    );
                    const solBalances = await Promise.all(solBalancesPromises);
                    const solBalancesFlat = solBalances.flat();

                    const tokenBalancesPromises = walletChunks.map((walletChunk: Wallet[]) =>
                        solanaLib.getBatchTokenBalance(
                            walletChunk.map((wallet) => wallet.address),
                            tokenAddress,
                        ),
                    );
                    const tokenBalances = await Promise.all(tokenBalancesPromises);
                    const tokenBalancesFlat = tokenBalances.flat();

                    allWallets.forEach((wallet: Wallet, index: number) => {
                        this.walletBalances.set(wallet.address, {
                            solBalance: solBalancesFlat[index],
                            tokenBalance: tokenBalancesFlat[index]
                        });
                    });
                } catch (error) {
                    throw error;
                }
            }, WALLET_BALANCE_REFRESH_INTERVAL_MS);
        } catch (error) {
            throw error;
        }
    };

    getRandomWalletFromGroup = (groupName: string, minSolBalance: number, minTokenBalance: number) => {
        const {walletGroups} = this.getConfig();
        const walletGroup = walletGroups.find((group: WalletGroup) => group.name === groupName);

        if (!walletGroup) {
            loggerLib.logWarning(`Wallet group '${groupName}' not found`);
            return null;
        }

        const {wallets} = walletGroup;
        const walletsWithBalances = wallets.map((wallet: Wallet) => {
            const balance = this.walletBalances.get(wallet.address);
            return {
                ...wallet,
                solBalance: balance?.solBalance || 0,
                tokenBalance: balance?.tokenBalance || 0
            };
        });

        const eligibleWallets = walletsWithBalances.filter(
            (wallet: any) =>
                (wallet.solBalance || 0) >= minSolBalance &&
                (wallet.tokenBalance || 0) >= minTokenBalance,
        );

        if (_.isEmpty(eligibleWallets)) {
            return null;
        }

        return helperLib.getRandomElement(eligibleWallets);
    };

    addWalletsToGroup = (groupName: string, walletCount: number): WalletGroup => {
        const config = this.getConfig();
        const groupIndex = config.walletGroups.findIndex((group: WalletGroup) => group.name === groupName);

        if (groupIndex === -1) {
            throw new Error(`Wallet group '${groupName}' not found`);
        }

        const newWallets: Wallet[] = [];
        for (let i = 0; i < walletCount; i++) {
            const wallet = solanaLib.generateWallet();
            newWallets.push({
                address: wallet.address,
                privateKey: wallet.privateKey
            });
            // Initialize balances in memory
            this.walletBalances.set(wallet.address, { solBalance: 0, tokenBalance: 0 });
        }

        const updatedGroup = {
            ...config.walletGroups[groupIndex],
            wallets: [...config.walletGroups[groupIndex].wallets, ...newWallets]
        };

        const updatedWalletGroups = [...config.walletGroups];
        updatedWalletGroups[groupIndex] = updatedGroup;

        this.updateConfig({ walletGroups: updatedWalletGroups });

        loggerLib.logInfo({
            message: `Added ${walletCount} wallets to group '${groupName}'`
        });

        // Return group with balance information for API response
        const walletsWithBalances: any[] = updatedGroup.wallets.map((wallet: Wallet) => ({
            ...wallet,
            solBalance: this.walletBalances.get(wallet.address)?.solBalance || 0,
            tokenBalance: this.walletBalances.get(wallet.address)?.tokenBalance || 0
        }));

        return {
            name: updatedGroup.name,
            wallets: walletsWithBalances
        };
    };
}
