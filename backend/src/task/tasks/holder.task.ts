import _ from "lodash";
import path from "path";
import util from "util";
import dotenv from "dotenv";

dotenv.config({path: path.join(__dirname, "/../../.env")});

import taskLib from "../../lib/task.lib";
import mongoLib from "../../lib/mongo.lib";
import configLib from "../../lib/config.lib";
import loggerLib from "../../lib/logger.lib";
import solanaLib from "../../lib/solana.lib";
import walletLib from "../../lib/wallet.lib";
import dexInterface from "../../dex/interface.dex";
import encryptionLib from "../../lib/encryption.lib";

import taskStatusEnum from "../../enum/task.status.enum";
import helperLib from "../../lib/helper.lib";

const args = process.argv.slice(2);
const taskId = args[0] as string;

const AMOUNT_OF_SOL_FOR_GAS_AND_ACCOUNT_INITIALIZATION = 0.005

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
                walletGroupId
            } = context;
            if (_.isNil(masterWalletAddress) || _.isNil(walletGroupId)) {
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

            const masterWalletPrivateKey=encryptionLib.decrypt(masterWallet.encryptedPrivateKey)
            for (const wallet of wallets) {
                const task = await taskLib.getTask(this.id);
                const {context} = task;
                if (_.isEmpty(context)) {
                    throw new Error(`Task context is empty! taskId: ${this.id}`);
                }

                const {
                    minAmountToBuy,
                    maxAmountToBuy,
                } = context;
                if (_.isNil(minAmountToBuy) || _.isNil(maxAmountToBuy)) {
                    throw new Error(`Invalid task context! ${JSON.stringify(context)}`);
                }

                const amountToBuy=helperLib.getRandomValue(minAmountToBuy,maxAmountToBuy)

                try {
                    const fundingTransactionHash = await solanaLib.transferSol(
                        masterWalletPrivateKey,
                        wallet.address,
                        amountToBuy+AMOUNT_OF_SOL_FOR_GAS_AND_ACCOUNT_INITIALIZATION,
                    );
                    loggerLib.logInfo({
                        message: "Holder wallet funded!",
                        address: wallet.address,
                        amountSol: amountToBuy+AMOUNT_OF_SOL_FOR_GAS_AND_ACCOUNT_INITIALIZATION,
                        transactionHash: fundingTransactionHash,
                    })
                } catch (error) {
                    loggerLib.logError({
                        message: "Failed to fund holder wallet!",
                        address: wallet.address,
                        amountSol: amountToBuy+AMOUNT_OF_SOL_FOR_GAS_AND_ACCOUNT_INITIALIZATION,
                        // @ts-ignore
                        error: error.message,
                    })
                    continue;
                }

                try {
                    const buyTransactionHash = await dexInterface.buy(
                        dex,
                        poolAddress,
                        amountToBuy,
                        encryptionLib.decrypt(wallet.encryptedPrivateKey),
                    );
                    loggerLib.logInfo({
                        message: "Holder wallet bought!",
                        address: wallet.address,
                        amount: amountToBuy,
                        transactionHash: buyTransactionHash,
                    });
                } catch (error) {
                    loggerLib.logError({
                        message: "Failed to buy!",
                        address: wallet.address,
                        amount: amountToBuy,
                        // @ts-ignore
                        error: error.message,
                    })
                }
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
        await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason: util.inspect(error)});
        await taskLib.removeTaskFromPm2(taskId);
    }
})();

process.on("unhandledRejection", async (error) => {
    loggerLib.logError(`Unhandled promise rejection!`);
    loggerLib.logError(error);
    // @ts-ignore
    await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason:util.inspect(error)});
    await taskLib.removeTaskFromPm2(taskId);
});

process.on("uncaughtException", async (error) => {
    loggerLib.logError(`Uncaught exception!`);
    loggerLib.logError(error);
    // @ts-ignore
    await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason:util.inspect(error)});
    await taskLib.removeTaskFromPm2(taskId);
});
