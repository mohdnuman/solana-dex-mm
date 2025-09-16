import _ from "lodash"

import helperLib from "../lib/helper.lib";
import solanaLib from "../lib/solana.lib";
import dexInterface from "../dex/interface.dex";

import tradeTypeEnum from "../enum/trade.type.enum";

const MS_IN_A_MINUTE: number = 60_000;
const SOL_REQUIRED_FOR_GAS: number = 0.001;
const MAX_WALLETS_PER_MULTI_CALL: number = 100;

export default class VolumeStrategy {
    configProvider: any;
    isRunning: boolean = false;

    constructor(configProvider: any) {
        this.configProvider = configProvider;
        this.monitorWalletBalances();
    }

    start = async () => {
        this.isRunning = true;
        while (this.isRunning) {
            const config = this.configProvider.getConfig();
            const buyWeight = (1 + config.bias) / 2;
            const sellWeight = (1 - config.bias) / 2;

            const buyVolume = config.volumePerMinute * buyWeight;
            const sellVolume = config.volumePerMinute * sellWeight;

            const buyTradesCount = helperLib.getRandomIntegerValue(1, config.tradesPerCycle);
            const sellTradesCount = config.tradesPerCycle - buyTradesCount;

            const buyAmounts = this.splitVolumeIntoAmounts(buyVolume, buyTradesCount);
            const sellAmounts = this.splitVolumeIntoAmounts(sellVolume, sellTradesCount);

            let trades = [
                ...(buyAmounts.map(buyAmount => {
                    return {amount: buyAmount, type: tradeTypeEnum.BUY}
                })),
                ...(sellAmounts.map(sellAmount => {
                    return {amount: sellAmount, type: tradeTypeEnum.SELL}
                }))
            ];
            trades = _.shuffle(trades);

            const interval = MS_IN_A_MINUTE / trades.length;
            for (const trade of trades) {
                const {amount, type} = trade;
                const wallet = type === tradeTypeEnum.BUY ? this.getRandomWallet(amount + SOL_REQUIRED_FOR_GAS, 0) : this.getRandomWallet(SOL_REQUIRED_FOR_GAS, amount);
                if (!wallet) continue;

                try {
                    trade.type === tradeTypeEnum.BUY ? await dexInterface.buy(config.dex, config.poolAddress, amount, wallet.privateKey) : await dexInterface.sell(config.dex, config.poolAddress, amount, wallet.privateKey);
                } catch (error) {
                    // @ts-ignore
                    console.error("Trade failed:", error.message);
                }

                await helperLib.sleep(interval * helperLib.getRandomValue(0.5, 1.5));
            }

            await helperLib.sleep(1000);
        }
    }

    stop = () => {
        this.isRunning = false;
    }

    monitorWalletBalances = () => {
        setInterval((async () => {
            const config = this.configProvider.getConfig();
            const oldWallets = config.wallets;

            const walletChunks = _.chunk(oldWallets, MAX_WALLETS_PER_MULTI_CALL);

            const solBalancesPromises = walletChunks.map((chunk: any[]) => solanaLib.getBatchSolBalance(chunk.map(w => w.address)));
            const solBalances = await Promise.all(solBalancesPromises);
            const solBalancesFlat = solBalances.flat();

            const tokenBalancesPromises = walletChunks.map((chunk: any[]) => solanaLib.getBatchTokenBalance(chunk.map(w => w.address), config.tokenAddress));
            const tokenBalances = await Promise.all(tokenBalancesPromises);
            const tokenBalancesFlat = tokenBalances.flat();

            this.configProvider.updateConfig({
                wallets: oldWallets.map((wallet: any, index: number) => ({
                    ...wallet,
                    solBalance: solBalancesFlat[index],
                    tokenBalance: tokenBalancesFlat[index]
                }))
            });
        }), 1000);
    }

    getRandomWallet = (minSolBalance: number, minTokenBalance: number) => {
        const config = this.configProvider.getConfig();
        const eligibleWallets = config.wallets.filter((wallet: any) => wallet.solBalance >= minSolBalance && wallet.tokenBalance >= minTokenBalance);
        if (_.isEmpty(eligibleWallets)) {
            return null;
        }

        return helperLib.getRandomElement(eligibleWallets);
    }

    splitVolumeIntoAmounts = (volume: number, tradeCount: number) => {
        if (volume <= 0) return [];
        const amounts = [];
        let remaining = volume;

        for (let iterAmount = 0; iterAmount < tradeCount; iterAmount++) {
            const amount = Math.min(remaining
                , (volume / tradeCount) * helperLib.getRandomValue(0.8, 1.2))
            remaining -= amount;
            amounts.push(amount);
        }
        return amounts;
    }
}