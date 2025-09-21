import _ from "lodash";
import path from "path";
import dotenv from "dotenv";

dotenv.config({path: path.join(__dirname, "/../../.env")});

import taskLib from "../../lib/task.lib";
import mongoLib from "../../lib/mongo.lib";
import configLib from "../../lib/config.lib";
import helperLib from "../../lib/helper.lib";
import loggerLib from "../../lib/logger.lib";
import walletLib from "../../lib/wallet.lib";
import solanaLib from "../../lib/solana.lib";
import dexInterface from "../../dex/interface.dex";
import encryptionLib from "../../lib/encryption.lib";

import tradeTypeEnum from "../../enum/trade.type.enum";
import taskStatusEnum from "../../enum/task.status.enum";

const MS_IN_A_MINUTE: number = 60_000;
const SOL_REQUIRED_FOR_GAS: number = 0.001;

const args = process.argv.slice(2);
const taskId = args[0] as string;

class VolumeTask {
    id: string = "";

    constructor(id: string) {
        this.id = id;
    }

    init = async () => {
        try {
            const config = await configLib.getConfig();
            const {dex, poolAddress} = config;
            while (true) {
                const task = await taskLib.getTask(this.id);

                const {context} = task;
                if (_.isEmpty(context)) {
                    throw new Error(`Task context is empty! taskId: ${this.id}`);
                }

                const {bias, volumePerMinute, tradesPerCycle, walletGroupId} = context;
                if (_.isNil(bias) || _.isNil(volumePerMinute) || _.isNil(tradesPerCycle) || _.isNil(walletGroupId)) {
                    throw new Error(`Invalid task context! ${JSON.stringify(context)}`);
                }

                const buyWeight = (1 + bias) / 2;
                const sellWeight = (1 - bias) / 2;

                const buyVolume = volumePerMinute * buyWeight;
                const sellVolume = volumePerMinute * sellWeight;

                const buyTradesCount = helperLib.getRandomIntegerValue(
                    1,
                    tradesPerCycle,
                );
                const sellTradesCount =
                    tradesPerCycle - buyTradesCount;

                const buyAmounts = this.splitVolumeIntoAmounts(
                    buyVolume,
                    buyTradesCount,
                );
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
                    let {amount, type} = trade;
                    amount = type === tradeTypeEnum.BUY ? amount : await dexInterface.getTokenAmountToSellToGetGivenSolAmount(dex, poolAddress, amount)

                    const wallet =
                        type === tradeTypeEnum.BUY
                            ? await walletLib.getRandomWalletFromGroup(
                                walletGroupId,
                                amount + SOL_REQUIRED_FOR_GAS,
                                0,
                            )
                            : await walletLib.getRandomWalletFromGroup(
                                walletGroupId,
                                SOL_REQUIRED_FOR_GAS,
                                amount,
                            );
                    if (!wallet) {
                        loggerLib.logWarning({
                            message: `No wallet with sufficient balance for trade`,
                            tradeType: type,
                            tradeAmount: amount,
                        });
                        continue;
                    }

                    try {
                        const tradeTransactionHash =
                            trade.type === tradeTypeEnum.BUY
                                ? await dexInterface.buy(
                                    dex,
                                    poolAddress,
                                    amount,
                                    encryptionLib.decrypt(wallet.encryptedPrivateKey),
                                )
                                : await dexInterface.sell(
                                    dex,
                                    poolAddress,
                                    amount,
                                    encryptionLib.decrypt(wallet.encryptedPrivateKey),
                                );
                        loggerLib.logInfo({
                            message: `Trade Executed!`,
                            tradeType: type,
                            tradeAmount: amount,
                            transactionHash: tradeTransactionHash,
                            walletAddress: wallet.address,
                        });
                    } catch (error) {
                        loggerLib.logError(`Trade Failed!`);
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
    };
}

(async () => {
    try {
        //@ts-ignore
        await mongoLib.connect(process.env["MONGO_URL"]);
        //@ts-ignore
        solanaLib.connectToCluster(process.env["SOLANA_RPC_URL"]);

        // @ts-ignore
        const volumeTask = new VolumeTask(taskId);
        volumeTask.init();
    } catch (error) {
        loggerLib.logError(error);
        // @ts-ignore
        await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason: error.message});
        await taskLib.removeTaskFromPm2(taskId);
    }
})();

process.on("unhandledRejection", async (error) => {
    loggerLib.logError(`Unhandled promise rejection!`);
    loggerLib.logError(error);
    // @ts-ignore
    await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason: error.message});
    await taskLib.removeTaskFromPm2(taskId);
});

process.on("uncaughtException", async (error) => {
    loggerLib.logError(`Uncaught exception!`);
    loggerLib.logError(error);
    await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason: error.message});
    await taskLib.removeTaskFromPm2(taskId);
});
