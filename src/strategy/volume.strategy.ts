import _ from "lodash";

import helperLib from "../lib/helper.lib";
import loggerLib from "../lib/logger.lib";
import dexInterface from "../dex/interface.dex";

import tradeTypeEnum from "../enum/trade.type.enum";

const MS_IN_A_MINUTE: number = 60_000;
const SOL_REQUIRED_FOR_GAS: number = 0.001;

export default class VolumeStrategy {
    configProvider: any;
    isRunning: boolean = false;

    constructor(configProvider: any) {
        this.configProvider = configProvider;
    }

    start = async () => {
        try {
            this.isRunning = true;
            while (this.isRunning) {
                const config = this.configProvider.getConfig();
                const buyWeight = (1 + config.bias) / 2;
                const sellWeight = (1 - config.bias) / 2;

                const buyVolume = config.volumePerMinute * buyWeight;
                const sellVolume = config.volumePerMinute * sellWeight;

                const buyTradesCount = helperLib.getRandomIntegerValue(
                    1,
                    config.tradesPerCycle,
                );
                const sellTradesCount = config.tradesPerCycle - buyTradesCount;

                const buyAmounts = this.splitVolumeIntoAmounts(buyVolume, buyTradesCount);
                const sellAmounts = this.splitVolumeIntoAmounts(
                    sellVolume,
                    sellTradesCount,
                );

                let trades = [
                    ...buyAmounts.map((buyAmount) => {
                        return {amount: buyAmount, type: tradeTypeEnum.BUY};
                    }),
                    ...sellAmounts.map((sellAmount) => {
                        return {amount: sellAmount, type: tradeTypeEnum.SELL};
                    }),
                ];
                trades = _.shuffle(trades);

                const interval = MS_IN_A_MINUTE / trades.length;
                for (const trade of trades) {
                    const {amount, type} = trade;
                    const wallet = type === tradeTypeEnum.BUY ?
                        this.configProvider.getRandomWalletFromGroup(
                            config.volumeStratWalletGroupName,
                            amount + SOL_REQUIRED_FOR_GAS,
                            0,
                        )
                        : this.configProvider.getRandomWalletFromGroup(
                            config.volumeStratWalletGroupName,
                            SOL_REQUIRED_FOR_GAS,
                            amount,
                        );
                    if (!wallet) {
                        loggerLib.logWarning({
                            message: `No wallet with sufficient balance for trade`,
                            tradeType: type,
                            tradeAmount: amount,
                        })
                        continue;
                    }

                    try {
                        const tradeTransactionHash = trade.type === tradeTypeEnum.BUY
                            ? await dexInterface.buy(
                                config.dex,
                                config.poolAddress,
                                amount,
                                wallet.privateKey,
                            )
                            : await dexInterface.sell(
                                config.dex,
                                config.poolAddress,
                                amount,
                                wallet.privateKey,
                            );
                        loggerLib.logInfo({
                            message: `Trade Executed!`,
                            tradeType: type,
                            tradeAmount: amount,
                            transactionHash: tradeTransactionHash,
                            walletAddress: wallet.address,
                        })
                    } catch (error) {
                        // @ts-ignore
                        loggerLib.logError(`Trade Failed!`)
                        loggerLib.logError(error);
                    }

                    await helperLib.sleep(interval * helperLib.getRandomValue(0.5, 1.5));
                }

                await helperLib.sleep(1000);
            }
        } catch (error) {
            throw error;
        }
    };

    stop = () => {
        this.isRunning = false;
    };

    splitVolumeIntoAmounts = (volume: number, tradeCount: number) => {
        try {
            if (volume <= 0) return [];
            const amounts = [];
            let remaining = volume;

            for (let iterAmount = 0; iterAmount < tradeCount; iterAmount++) {
                const amount = Math.min(
                    remaining,
                    (volume / tradeCount) * helperLib.getRandomValue(0.8, 1.2),
                );
                remaining -= amount;
                amounts.push(amount);
            }
            return amounts;
        } catch (error) {
            throw error;
        }
    }
}
