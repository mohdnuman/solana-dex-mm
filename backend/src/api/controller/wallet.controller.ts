import _ from "lodash";

import walletLib from "../../lib/wallet.lib";
import loggerLib from "../../lib/logger.lib";

async function getWalletGroups(req: any, res: any) {
    try {
        const walletGroups = await walletLib.getWalletGroups();
        return res.status(200).json({
            message: `Wallet groups fetched successfully!`,
            walletGroups: walletGroups
        });
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function getWalletsForGroup(req: any, res: any) {
    try {
        const {groupId} = req.params;
        if (_.isEmpty(groupId)) {
            return res.status(400).json({error: `Missing params! groupId: ${groupId}`});
        }

        const wallets = await walletLib.getWallets(groupId);
        const walletsWithRequiredFields = wallets.map((wallet: any) => {
            return {
                address: wallet.address,
                solBalance: wallet.solBalance,
                tokenBalance: wallet.tokenBalance,
            }
        });

        return res.status(200).json({
            message: `Wallets fetched successfully!`,
            wallets: walletsWithRequiredFields
        });
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function addWalletGroup(req: any, res: any) {
    try {
        const {name, numberOfWallets} = req.body;
        if (_.isEmpty(name) || _.isNil(numberOfWallets)) {
            return res.status(400).json({error: `Missing fields in body! name: ${name}, numberOfWallets: ${numberOfWallets}`});
        }

        const walletGroupWithSameName = await walletLib.getWalletGroupByName(name);
        if (!_.isEmpty(walletGroupWithSameName)) {
            return res.status(400).json({error: `Wallet group with name ${name} already exists!`});
        }

        const walletGroupId = await walletLib.createWalletGroup(name, numberOfWallets);

        return res.status(201).json({message: `Wallet group created successfully!`, walletGroupId: walletGroupId});
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function exportWalletGroup(req: any, res: any) {
    try {
        const {groupId} = req.params;
        if (_.isEmpty(groupId)) {
            return res.status(400).json({error: `Missing params! groupId: ${groupId}`});
        }

        const wallets = await walletLib.getWallets(groupId);
        const walletPrivateKeys = wallets.map((wallet: any) => wallet.encryptedPrivateKey);
        const walletPrivateKeysText = walletPrivateKeys.join("\n");

        res.setHeader("Content-Type", "text/plain");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${groupId}_private_keys.txt"`,
        );

        return res.status(200).send(walletPrivateKeysText);
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

export default {
    addWalletGroup: addWalletGroup,
    getWalletGroups: getWalletGroups,
    exportWalletGroup: exportWalletGroup,
    getWalletsForGroup: getWalletsForGroup,
}