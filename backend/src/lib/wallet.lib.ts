import _ from "lodash";

import mongoLib from "./mongo.lib";
import solanaLib from "./solana.lib";
import encryptionLib from "./encryption.lib";

import walletModel from "../model/wallet.model";
import walletGroupModel from "../model/wallet.group.model";

async function getRandomWalletFromGroup(walletGroupId: string, minSolBalance: number = 0, minTokenBalance: number = 0) {
    try {
        if (_.isEmpty(walletGroupId)) {
            throw new Error(`Missing args! walletGroupId: ${walletGroupId}`);
        }

        const wallets = await mongoLib.find(walletModel, {
            walletGroupId: walletGroupId,
            solBalance: {$gte: minSolBalance},
            tokenBalance: {$gte: minTokenBalance}
        });
        if (_.isEmpty(wallets)) {
            return null;
        }

        return _.sample(wallets);
    } catch (error) {
        throw error;
    }
}

async function getWallets(walletGroupId: string) {
    try {
        if (_.isEmpty(walletGroupId)) {
            throw new Error(`Missing args! walletGroupId: ${walletGroupId}`);
        }

        return await mongoLib.find(walletModel, {
            walletGroupId: walletGroupId,
        });
    } catch (error) {
        throw error;
    }
}

async function getWallet(address: string) {
    try {
        if (_.isEmpty(address)) {
            throw new Error(`Missing args! address: ${address}`);
        }

        return await mongoLib.findOne(walletModel, {
            address: address,
        });
    } catch (error) {
        throw error;
    }
}

async function getWalletGroups() {
    try {
        return await mongoLib.find(walletGroupModel, {});
    } catch (error) {
        throw error;
    }
}

async function getWalletGroupByName(name: string) {
    try {
        if (_.isEmpty(name)) {
            throw new Error(`Missing args! name: ${name}`);
        }

        return await mongoLib.findOne(walletGroupModel, {
            name: name,
        });
    } catch (error) {
        throw error;
    }
}

async function createWalletGroup(name: string, numberOfWallets: number) {
    try {
        if (_.isEmpty(name) || _.isNil(numberOfWallets)) {
            throw new Error(`Missing args! name: ${name}, numberOfWallets: ${numberOfWallets}`);
        }

        const walletGroupWithSameName = await getWalletGroupByName(name);
        if (!_.isEmpty(walletGroupWithSameName)) {
            throw new Error(`Wallet group with name ${name} already exists!`);
        }

        const walletGroup = await mongoLib.insertOne(walletGroupModel, {
            name: name,
            numberOfWallets: numberOfWallets,
        });

        const wallets = _.range(numberOfWallets).map(() => {
            return solanaLib.generateWallet()
        });
        const walletInsertionOperations = wallets.map((wallet) => {
            return {
                updateOne: {
                    filter: {address: wallet.address},
                    update: {
                        $set: {
                            address: wallet.address,
                            encryptedPrivateKey: encryptionLib.encrypt(wallet.privateKey),
                            walletGroupId: walletGroup._id
                        }
                    },
                    upsert: true
                }
            };
        });
        await mongoLib.bulkWrite(walletModel, walletInsertionOperations);

        return walletGroup._id;
    } catch (error) {
        throw error;
    }
}


export default {
    getWallet: getWallet,
    getWallets: getWallets,
    getWalletGroups: getWalletGroups,
    createWalletGroup: createWalletGroup,
    getWalletGroupByName: getWalletGroupByName,
    getRandomWalletFromGroup: getRandomWalletFromGroup
}