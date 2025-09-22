import _ from "lodash";
import path from "path";
import util from "util";
import bs58 from "bs58";
import dotenv from "dotenv";
import {
    PublicKey,
    ComputeBudgetProgram,

} from "@solana/web3.js";
import {
    createAssociatedTokenAccountInstruction,
    createCloseAccountInstruction,
    createSyncNativeInstruction
} from "@solana/spl-token";

dotenv.config({path: path.join(__dirname, "/../../.env")});

import jitoLib from "../../lib/jito.lib";
import taskLib from "../../lib/task.lib";
import mongoLib from "../../lib/mongo.lib";
import loggerLib from "../../lib/logger.lib";
import solanaLib from "../../lib/solana.lib";
import walletLib from "../../lib/wallet.lib";
import encryptionLib from "../../lib/encryption.lib";

import globalConst from "../../const/global.const";
import taskStatusEnum from "../../enum/task.status.enum";
import walletGroupModel from "../../model/wallet.group.model";

const args = process.argv.slice(2);
const taskId = args[0] as string;

const SOL_FOR_JITO_TIPPING = 0.001;
const SOL_REQUIRED_FOR_GAS = 0.001;
const SOL_REQUIRED_FOR_RENT_EXEMPTION = 0.001;
const SOL_REQUIRED_FOR_ACCOUNT_INITIALIZATION = 0.002;

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

            const {masterWalletAddress, amountPerWallet, walletGroupId} = context;
            if (_.isNil(masterWalletAddress) || _.isNil(walletGroupId) || _.isNil(amountPerWallet)) {
                throw new Error(`Invalid task context! ${JSON.stringify(context)}`);
            }

            let wallets = await walletLib.getWallets(walletGroupId);
            if (_.isEmpty(wallets)) {
                throw new Error(
                    `No wallets found in group! walletGroupId: ${walletGroupId}`,
                );
            }

            const masterWallet = await walletLib.getWallet(masterWalletAddress);
            if (_.isEmpty(masterWallet)) {
                throw new Error(
                    `Master wallet not found! address: ${masterWalletAddress}`,
                );
            }

            const mixerWalletGroupId = await this.createMixingWallets(wallets.length);
            const mixerWallets = await walletLib.getWallets(mixerWalletGroupId);

            const masterWalletPrivateKey = encryptionLib.decrypt(masterWallet.encryptedPrivateKey);
            for (const [index,wallet] of wallets.entries()) {
                const mixerWallet= mixerWallets[index];
                const mixerWalletPrivateKey = encryptionLib.decrypt(mixerWallet.encryptedPrivateKey);

                await this.mixToSingleWallet(
                    masterWalletPrivateKey,
                    mixerWalletPrivateKey,
                    wallet.address,
                    amountPerWallet
                )
            }

            await taskLib.updateTask(this.id, {status: taskStatusEnum.COMPLETED});
            await taskLib.removeTaskFromPm2(this.id);
        } catch (error) {
            throw error;
        }
    };

    async createMixingWallets(numberOfWallets: number) {
        try {
            if (
                _.isNil(numberOfWallets)
            ) {
                throw new Error(
                    `Missing args! numberOfWallets: ${numberOfWallets}`,
                );
            }

            const mixingWalletGroupsCount = await mongoLib.count(
                walletGroupModel,
                {
                    name: {
                        $regex: `^${globalConst.MIXING_WALLET_GROUP_NAME_PREFIX}`,
                    },
                },
            );

            const walletGroupName = `${globalConst.MIXING_WALLET_GROUP_NAME_PREFIX}-${mixingWalletGroupsCount + 1}`;
            const groupId = await walletLib.createWalletGroup(
                walletGroupName,
                numberOfWallets,
            );

            loggerLib.logInfo(
                {
                    message: `Mixing Wallet Group Created`,
                    numberOfWallets: numberOfWallets,
                    walletGroupName: walletGroupName,
                    groupId: groupId,
                }
            );

            return groupId;
        } catch (error) {
            throw error;
        }
    }

    async mixToSingleWallet(
        sourceWalletPrivateKey: string,
        mixerWalletPrivateKey: string,
        destinationWalletAddress: string,
        amount: number,
    ) {
        try {
            if (
                _.isNil(destinationWalletAddress) ||
                _.isNil(sourceWalletPrivateKey) ||
                _.isNil(mixerWalletPrivateKey) ||
                _.isNil(amount)
            ) {
                throw new Error(
                    `Missing args! sourceWalletPrivateKey: ${sourceWalletPrivateKey}, destinationWalletAddress: ${destinationWalletAddress}, amount: ${amount} mixerWalletPrivateKey: ${mixerWalletPrivateKey}`,
                );
            }

            amount =
                amount +
                SOL_FOR_JITO_TIPPING +
                SOL_REQUIRED_FOR_GAS +
                SOL_REQUIRED_FOR_RENT_EXEMPTION +
                SOL_REQUIRED_FOR_ACCOUNT_INITIALIZATION;

            const sourceWalletPayer = solanaLib.getPayer(sourceWalletPrivateKey);
            const mixerWalletPayer = solanaLib.getPayer(mixerWalletPrivateKey);
            const mixerWalletAddress = solanaLib.getAddressFromPrivateKey(mixerWalletPrivateKey);
            const sourceWalletAddress = solanaLib.getAddressFromPrivateKey(sourceWalletPrivateKey);

            const mixerFundingInstruction = solanaLib.getSolTransferInstruction(
                sourceWalletAddress,
                mixerWalletAddress,
                amount,
            );
            const mixerFundingTransaction = await solanaLib.getSignedTransaction(
                [mixerFundingInstruction],
                sourceWalletPayer,
                [sourceWalletPayer]
            );

            const wsolTokenAccountPublicKey =
                solanaLib.getAssociatedTokenAccountAddress(
                    new PublicKey(globalConst.WSOL_ADDRESS),
                    new PublicKey(mixerWalletAddress),
                    false,
                );
            const computeBudgetPriceInstruction =
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 200_000,
                });
            const computeBudgetLimitInstruction =
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200_000,
                });
            const accountInitializationInstruction =
                createAssociatedTokenAccountInstruction(
                    new PublicKey(mixerWalletAddress),
                    wsolTokenAccountPublicKey,
                    new PublicKey(mixerWalletAddress),
                    new PublicKey(globalConst.WSOL_ADDRESS),
                );
            const solTransferInstruction = solanaLib.getSolTransferInstruction(
                mixerWalletAddress,
                wsolTokenAccountPublicKey.toString(),
                amount -
                SOL_FOR_JITO_TIPPING -
                SOL_REQUIRED_FOR_GAS -
                SOL_REQUIRED_FOR_RENT_EXEMPTION -
                SOL_REQUIRED_FOR_ACCOUNT_INITIALIZATION,
            );
            const solSyncInstruction = createSyncNativeInstruction(
                wsolTokenAccountPublicKey,
            );
            const accountCloseInstruction = createCloseAccountInstruction(
                wsolTokenAccountPublicKey,
                new PublicKey(destinationWalletAddress),
                new PublicKey(mixerWalletAddress),
            );
            const tipInstruction = jitoLib.getTipInstruction(
                SOL_FOR_JITO_TIPPING,
                mixerWalletAddress
            );

            const mixingInstructions = [
                computeBudgetPriceInstruction,
                computeBudgetLimitInstruction,
                accountInitializationInstruction,
                solTransferInstruction,
                solSyncInstruction,
                accountCloseInstruction,
                tipInstruction,
            ];
            const mixingTransaction = await solanaLib.getSignedTransaction(
                mixingInstructions,
                mixerWalletPayer,
                [mixerWalletPayer]
            );

            const mixerFundingRawTransaction =bs58.encode(mixerFundingTransaction.serialize());
            const mixingRawTransaction = bs58.encode(mixingTransaction.serialize());
            const mixingBundleHash = await jitoLib.sendBundle([
                mixerFundingRawTransaction,
                mixingRawTransaction,
            ]);
            loggerLib.logInfo(
                {
                    message: `Mixing bundle sent`,
                    sourceWalletAddress: sourceWalletAddress,
                    mixerWalletAddress: mixerWalletAddress,
                    destinationWalletAddress: destinationWalletAddress,
                    amount: amount,
                    mixingBundleHash: mixingBundleHash,
                }
            );
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

        const sweepSolTask = new SweepTask(taskId);
        sweepSolTask.init();
    } catch (error) {
        loggerLib.logError(error);
        await taskLib.updateTask(taskId, {
            status: taskStatusEnum.FAILED,
            //@ts-ignore
            failureReason:  util.inspect(error),
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
        failureReason: util.inspect(error),
    });
    await taskLib.removeTaskFromPm2(taskId);
});

process.on("uncaughtException", async (error) => {
    loggerLib.logError(`Uncaught exception!`);
    loggerLib.logError(error);
    //@ts-ignore
    await taskLib.updateTask(taskId, {
        status: taskStatusEnum.FAILED,
        failureReason: util.inspect(error),
    });
    await taskLib.removeTaskFromPm2(taskId);
});
