import helperLib from "../lib/helper.lib";
import loggerLib from "../lib/logger.lib";
import solanaLib from "../lib/solana.lib";

import dexInterface from "../dex/interface.dex";

const AMOUNT_TO_KEEP_IN_WALLET = 0.00045;

interface Wallet {
    address: string;
    privateKey: string;
}

interface WalletGroup {
    name: string;
    wallets: Wallet[];
}

export default class MakerStrategy {
    configProvider: any;

    constructor(configProvider: any) {
        this.configProvider = configProvider;
    }

    start = async () => {
        while (true) {
            const config = this.configProvider.getConfig();

            if (!config.makerStrategy.isEnabled) {
                await helperLib.sleep(5000);
                continue;
            }

            const groupName = config.makerStrategy.walletGroupName;
            const walletGroup = config.walletGroups.find(
                (group: WalletGroup) => group.name === groupName,
            );

            const {dex, poolAddress, tokenAddress, makerStrategy} = config;
            const {masterWalletPrivateKey, amountToTransfer, amountToSwap} = makerStrategy;
            const masterPayer = solanaLib.getPayer(masterWalletPrivateKey);
            const masterWalletAddress = solanaLib.getAddressFromPrivateKey(masterWalletPrivateKey);
            for (const wallet of walletGroup.wallets) {
                const makerPayer = solanaLib.getPayer(wallet.privateKey);

                const fundingTransactionHash = await solanaLib.transferSol(
                    masterWalletPrivateKey,
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
                    config.tokenAddress,
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
    };
}
