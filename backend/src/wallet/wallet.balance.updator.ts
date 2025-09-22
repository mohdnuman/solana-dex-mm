import _ from "lodash";

import mongoLib from "../lib/mongo.lib";
import helperLib from "../lib/helper.lib";
import walletLib from "../lib/wallet.lib";
import loggerLib from "../lib/logger.lib";
import solanaLib from "../lib/solana.lib";
import configLib from "../lib/config.lib";

import globalConst from "../const/global.const";
import walletModel from "../model/wallet.model";
import walletGroupModel from "../model/wallet.group.model";

const SLEEP_TIME_IN_MS = 1000;

class WalletBalanceUpdator {
    init = async () => {
        try {
            const config = await configLib.getConfig();
            while (true) {
                const walletGroups = await walletLib.getWalletGroups();
                if (_.isEmpty(walletGroups)) {
                    await helperLib.sleep(SLEEP_TIME_IN_MS);
                    continue;
                }

                const nonMixingWalletGroups = walletGroups.filter((wg: any) => !wg.name.startsWith(globalConst.MIXING_WALLET_GROUP_NAME_PREFIX));
                if (_.isEmpty(nonMixingWalletGroups)) {
                    await helperLib.sleep(SLEEP_TIME_IN_MS);
                    continue;
                }

                for (const walletGroup of nonMixingWalletGroups) {
                    const {id} = walletGroup;
                    const wallets = await walletLib.getWallets(id);
                    const walletAddresses = wallets.map((wallet: any) => wallet.address);
                    const walletAddressChunks: string[][] = _.chunk(walletAddresses, 100);

                    const solBalanceCalls = walletAddressChunks.map((chunk: string[]) =>
                        helperLib.retryWrapper(solanaLib.getBatchSolBalance, [chunk], 5, 1000)
                    );
                    const solBalances = await Promise.all(solBalanceCalls);
                    const solBalancesFlat = _.flatten(solBalances);
                    const totalSolBalance = _.sum(solBalancesFlat);

                    const tokenBalanceCalls = walletAddressChunks.map((chunk: string[]) =>
                        helperLib.retryWrapper(solanaLib.getBatchTokenBalance, [chunk, config.tokenAddress], 5, 1000)
                    );
                    const tokenBalances = await Promise.all(tokenBalanceCalls);
                    const tokenBalancesFlat = _.flatten(tokenBalances);
                    const totalTokenBalance = _.sum(tokenBalancesFlat);

                    const walletUpdateOperations = walletAddresses.map((address: string, index: number) => ({
                        updateOne: {
                            filter: {address},
                            update: {
                                $set: {
                                    solBalance: solBalancesFlat[index],
                                    tokenBalance: tokenBalancesFlat[index],
                                }
                            }
                        }
                    }));
                    walletUpdateOperations.length > 0 && await mongoLib.bulkWrite(walletModel, walletUpdateOperations);

                    await mongoLib.updateOne(walletGroupModel, {_id: id}, {
                        $set: {
                            solBalance: totalSolBalance,
                            tokenBalance: totalTokenBalance,
                        }
                    })

                    loggerLib.logInfo({
                        message: "Updated wallet balances!",
                        walletGroupId: id,
                        totalSolBalance: totalSolBalance,
                        totalTokenBalance: totalTokenBalance,
                    })
                }

                await helperLib.sleep(SLEEP_TIME_IN_MS);
            }
        } catch (error) {
            throw error;
        }
    }
}

export default new WalletBalanceUpdator();

