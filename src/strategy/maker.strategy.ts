import _ from "lodash";

import helperLib from "../lib/helper.lib";
import loggerLib from "../lib/logger.lib";

import raydiumClmmDex from "../dex/raydium.clmm.dex";

export default class MakerStrategy {
    configProvider: any;
    isRunning: boolean = false;

    constructor(configProvider: any) {
        this.configProvider = configProvider;
    }

    start = async () => {
        this.isRunning = true;
        while (this.isRunning) {
            const config = this.configProvider.getConfig();

            for (const wallet of config.wallets) {
                await raydiumClmmDex.executeTransferAndSwap(
                    config.masterWallet.privateKey,
                    wallet.privateKey,
                    config.poolAddress,
                    config.transferAmountSol,
                    config.amountToSwapSol,
                );

                loggerLib.logInfo({
                    strategy: "MakerStrategy",
                    action: "Executed transfer and swap",
                    wallet: wallet.address,
                    pool: config.poolAddress,
                    transferAmountSol: config.transferAmountSol,
                    amountToSwapSol: config.amountToSwapSol,
                    walletIndex: config.wallets.indexOf(wallet) + 1,
                    totalWallets: config.wallets.length,
                });
            }

            await helperLib.sleep(1000);
        }
    };

    stop = () => {
        this.isRunning = false;
    };
}