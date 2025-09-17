import helperLib from "../lib/helper.lib";
import loggerLib from "../lib/logger.lib";

import raydiumClmmDex from "../dex/raydium.clmm.dex";

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

      const groupName = config.makerStrategy.makerStratWalletGroupName;
      const walletGroup = config.walletGroups.find(
        (group: WalletGroup) => group.name === groupName,
      );

      for (const wallet of walletGroup.wallets) {
        const txId = await raydiumClmmDex.executeTransferAndSwap(
          config.makerStrategy.masterWallet.privateKey,
          wallet.privateKey,
          config.poolAddress,
          config.makerStrategy.amountToTransfer,
          config.makerStrategy.amountToSwap,
        );

        loggerLib.logInfo({
          strategy: "MakerStrategy",
          action: "Executed transfer and swap",
          wallet: wallet.address,
          pool: config.poolAddress,
          transferAmountSol: config.makerStrategy.transferAmountSol,
          amountToTransfer: config.makerStrategy.amountToTransfer,
          walletIndex: walletGroup.wallets.indexOf(wallet) + 1,
          totalWallets: walletGroup.wallets.length,
          txId: txId,
        });
      }

      loggerLib.logInfo({
        strategy: "MakerStrategy",
        action: "Cycle complete, exiting the strategy",
      });
    }
  };
}
