import _ from "lodash";
import path from "path";
import dotenv from "dotenv";

dotenv.config({path: path.join(__dirname, "/../../.env")});

import taskLib from "../../lib/task.lib";
import mongoLib from "../../lib/mongo.lib";
import configLib from "../../lib/config.lib";
import loggerLib from "../../lib/logger.lib";
import solanaLib from "../../lib/solana.lib";
import walletLib from "../../lib/wallet.lib";
import dexInterface from "../../dex/interface.dex";

import taskStatusEnum from "../../enum/task.status.enum";

const args = process.argv.slice(2);
const taskId = args[0] as string;

class HolderTask {
    id: string = "";

    constructor(id: string) {
        this.id = id;
    }

    init = async () => {
        try {
            const config = await configLib.getConfig();
            const {dex, poolAddress} = config;

            const task = await taskLib.getTask(this.id);
            const {context} = task;
            if (_.isEmpty(context)) {
                throw new Error(`Task context is empty! taskId: ${this.id}`);
            }

            const {
                masterWalletAddress,
                amountToTransfer,
                amountToSwap,
                walletGroupId
            } = context;
            if (_.isNil(masterWalletAddress) || _.isNil(amountToTransfer) || _.isNil(amountToSwap) || _.isNil(walletGroupId)) {
                throw new Error(`Invalid task context! ${JSON.stringify(context)}`);
            }

            const wallets = await walletLib.getWallets(walletGroupId);
            if (_.isEmpty(wallets)) {
                throw new Error(`No wallets found in group! walletGroupId: ${walletGroupId}`);
            }

            const masterWallet = await walletLib.getWallet(masterWalletAddress);
            if (_.isEmpty(masterWallet)) {
                throw new Error(`Master wallet not found! address: ${masterWalletAddress}`);
            }

            for (const wallet of wallets) {
                const fundingTransactionHash = await solanaLib.transferSol(
                    masterWallet.privateKey,
                    wallet.address,
                    amountToTransfer,
                );
                loggerLib.logInfo({
                    message: "Holder wallet funded!",
                    address: wallet.address,
                    amountSol: amountToTransfer,
                    transactionHash: fundingTransactionHash,
                })

                const buyTransactionHash = await dexInterface.buy(
                    dex,
                    poolAddress,
                    amountToSwap,
                    wallet.privateKey,
                );
                loggerLib.logInfo({
                    message: "Holder wallet bought!",
                    address: wallet.address,
                    amount: amountToSwap,
                    transactionHash: buyTransactionHash,
                });
            }

            await taskLib.updateTask(taskId, {status: taskStatusEnum.COMPLETED});
            await taskLib.removeTaskFromPm2(taskId);
        } catch (error) {
            throw error;
        }
    }
}

(async () => {
    try {
        //@ts-ignore
        await mongoLib.connect(process.env["MONGO_URL"]);
        //@ts-ignore
        solanaLib.connectToCluster(process.env["SOLANA_RPC_URL"]);

        const holderTask = new HolderTask(taskId);
        holderTask.init();
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
    // @ts-ignore
    await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason: error.message});
    await taskLib.removeTaskFromPm2(taskId);
});
