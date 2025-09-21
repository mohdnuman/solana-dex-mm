import _ from "lodash";
import path from "path";
import dotenv from "dotenv";

dotenv.config({path: path.join(__dirname, "/../../.env")});

import taskLib from "../../lib/task.lib";
import mongoLib from "../../lib/mongo.lib";
import configLib from "../../lib/config.lib";
import loggerLib from "../../lib/logger.lib";
import helperLib from "../../lib/helper.lib";
import solanaLib from "../../lib/solana.lib";
import walletLib from "../../lib/wallet.lib";
import dexInterface from "../../dex/interface.dex";

import taskStatusEnum from "../../enum/task.status.enum";

const args = process.argv.slice(2);
const taskId = args[0] as string;

class MakerTask {
    id: string = "";

    constructor(id: string) {
        this.id = id;
    }

    init = async () => {
        try {
            const config = await configLib.getConfig();
            const {dex, tokenAddress, poolAddress} = config;
            while (true) {
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

                const masterPayer = solanaLib.getPayer(masterWallet.privateKey);
                for (const wallet of wallets) {
                    const makerPayer = solanaLib.getPayer(wallet.privateKey);

                    const fundingTransactionHash = await solanaLib.transferSol(
                        masterWallet.privateKey,
                        wallet.address,
                        amountToTransfer,
                    );
                    loggerLib.logInfo({
                        message: "Maker wallet funded!",
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
                        message: "Maker wallet bought!",
                        address: wallet.address,
                        amount: amountToSwap,
                        transactionHash: buyTransactionHash,
                    });

                    await helperLib.sleep(3000);

                    let makerTokenBalance = await solanaLib.getBatchTokenBalance([wallet.address], tokenAddress);
                    makerTokenBalance = makerTokenBalance[0];

                    const sellTransactionHash = await dexInterface.sell(
                        dex,
                        poolAddress,
                        makerTokenBalance,
                        wallet.privateKey
                    );
                    loggerLib.logInfo({
                        message: "Maker wallet sold!",
                        address: wallet.address,
                        amount: makerTokenBalance,
                        transactionHash: sellTransactionHash,
                    });

                    await helperLib.sleep(3000);

                    let makerSolBalance = await solanaLib.getBatchSolBalance([wallet.address]);
                    makerSolBalance = makerSolBalance[0];
                    const closeAccountInstruction = solanaLib.getCloseTokenAccountInstruction(
                        wallet.address,
                        tokenAddress,
                        masterWalletAddress
                    );
                    const solTransferInstruction = solanaLib.getSolTransferInstruction(
                        wallet.address,
                        masterWalletAddress,
                        makerSolBalance
                    );
                    const solSweepingTransaction = await solanaLib.getSignedTransaction(
                        [closeAccountInstruction, solTransferInstruction],
                        masterPayer,
                        [masterPayer, makerPayer]
                    );
                    const sweepingTransactionHash = await solanaLib.sendTransaction(solSweepingTransaction);
                    loggerLib.logInfo({
                        message: "Maker wallet swept!",
                        address: wallet.address,
                        amountSol: makerSolBalance,
                        transactionHash: sweepingTransactionHash,
                    })
                }
            }
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

        const makerTask = new MakerTask(taskId);
        makerTask.init();
    } catch (error) {
        loggerLib.logError(error);
        //@ts-ignore
        await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason: error.message});
        await taskLib.removeTaskFromPm2(taskId);
    }
})();

process.on("unhandledRejection", async (error) => {
    loggerLib.logError(`Unhandled promise rejection!`);
    loggerLib.logError(error);
    //@ts-ignore
    await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason: error.message});
    await taskLib.removeTaskFromPm2(taskId);
});

process.on("uncaughtException", async (error) => {
    loggerLib.logError(`Uncaught exception!`);
    loggerLib.logError(error);
    //@ts-ignore
    await taskLib.updateTask(taskId, {status: taskStatusEnum.FAILED, failureReason: error.message});
    await taskLib.removeTaskFromPm2(taskId);
});
