import _ from "lodash";
import path from "path";
import dotenv from "dotenv";

dotenv.config({path: path.join(__dirname, "/../../.env")});

import taskLib from "../../lib/task.lib";
import mongoLib from "../../lib/mongo.lib";
import loggerLib from "../../lib/logger.lib";
import solanaLib from "../../lib/solana.lib";
import walletLib from "../../lib/wallet.lib";
import encryptionLib from "../../lib/encryption.lib";

import taskStatusEnum from "../../enum/task.status.enum";

const args = process.argv.slice(2);
const taskId = args[0] as string;

class SweepTask {
    id: string = "";

    constructor(id: string) {
        this.id = id;
    }

    init = async () => {
        try {
            const task = await taskLib.getTask(this.id);

            const {context} = task;
            if (_.isEmpty(context)) {
                throw new Error(`Task context is empty! taskId: ${this.id}`);
            }

            const {masterWalletAddress, walletGroupId} = context;
            if (_.isNil(masterWalletAddress) || _.isNil(walletGroupId)) {
                throw new Error(`Invalid task context! ${JSON.stringify(context)}`);
            }

            let wallets = await walletLib.getWallets(walletGroupId);
            if (_.isEmpty(wallets)) {
                throw new Error(
                    `No wallets found in group! walletGroupId: ${walletGroupId}`,
                );
            }

            const solBalances = await solanaLib.getBatchSolBalance(
                wallets.map((w: { address: any }) => w.address),
            );
            wallets = wallets.filter(
                (_: any, index: string | number) => solBalances[index] > 0,
            );

            if (_.isEmpty(wallets)) {
                throw new Error(
                    `No wallets with sufficient balance found in group! walletGroupId: ${walletGroupId}`,
                );
            }

            const masterWallet = await walletLib.getWallet(masterWalletAddress);
            if (_.isEmpty(masterWallet)) {
                throw new Error(
                    `Master wallet not found! address: ${masterWalletAddress}`,
                );
            }

            const masterWalletPrivateKey = encryptionLib.decrypt(masterWallet.encryptedPrivateKey);
            const masterPayer = solanaLib.getPayer(masterWalletPrivateKey);
            for (const wallet of wallets) {
                const walletPayer = solanaLib.getPayer(encryptionLib.decrypt(wallet.encryptedPrivateKey));

                let solBalance = await solanaLib.getBatchSolBalance([wallet.address]);
                solBalance = solBalance[0];

                const solTransferInstruction = solanaLib.getSolTransferInstruction(
                    wallet.address,
                    masterWalletAddress,
                    solBalance,
                );

                const solSweepingTransaction = await solanaLib.getSignedTransaction(
                    [solTransferInstruction],
                    masterPayer,
                    [masterPayer, walletPayer],
                );
                const sweepingTransactionHash = await solanaLib.sendTransaction(
                    solSweepingTransaction,
                    {
                        skipPreflight: true,
                    }
                );
                loggerLib.logInfo({
                    message: "All the sol from wallet swept!",
                    address: wallet.address,
                    amountSol: solBalance,
                    transactionHash: sweepingTransactionHash,
                });
            }

            await taskLib.updateTask(this.id, {status: taskStatusEnum.COMPLETED});
            await taskLib.removeTaskFromPm2(this.id);
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

        const sweepSolTask = new SweepTask(taskId);
        sweepSolTask.init();
    } catch (error) {
        loggerLib.logError(error);
        await taskLib.updateTask(taskId, {
            status: taskStatusEnum.FAILED,
            //@ts-ignore
            failureReason: error.message,
        });
        await taskLib.removeTaskFromPm2(taskId);
    }
})();

process.on("unhandledRejection", async (error) => {
    loggerLib.logError(`Unhandled promise rejection!`);
    loggerLib.logError(error);
    await taskLib.updateTask(taskId, {
        status: taskStatusEnum.FAILED,
        //@ts-ignore
        failureReason: error.message,
    });
    await taskLib.removeTaskFromPm2(taskId);
});

process.on("uncaughtException", async (error) => {
    loggerLib.logError(`Uncaught exception!`);
    loggerLib.logError(error);
    //@ts-ignore
    await taskLib.updateTask(taskId, {
        status: taskStatusEnum.FAILED,
        failureReason: error.message,
    });
    await taskLib.removeTaskFromPm2(taskId);
});
