import _ from "lodash";
import cors from "cors";
import path from "path";
import express from "express";

import loggerLib from "../lib/logger.lib";
import ConfigProvider from "../config/config.provider";

export default class UiServer {
    constructor(configProvider: ConfigProvider) {
        const app = express();

        app.use(cors());
        app.use(express.json());
        app.use(express.static(path.join(__dirname)));

        app.get("/", (req, res) => {
            return res.sendFile(path.join(__dirname, "../../public/index.html"));
        });

        app.get("/api/config", (req, res) => {
            try {
                const config = configProvider.getConfig();
                const editableConfig = {
                    volumeStrategy: config.volumeStrategy,
                    makerStrategy: config.makerStrategy,
                };
                return res.status(200).json(editableConfig);
            } catch (error) {
                loggerLib.logError(error);
                return res.status(500).json({error: "Failed to load configuration"});
            }
        });

        app.post("/api/config", (req, res) => {
            try {
                const updateData: any = {};

                if (req.body.volumeStrategy) {
                    updateData.volumeStrategy = req.body.volumeStrategy;
                }

                if (req.body.makerStrategy) {
                    updateData.makerStrategy = req.body.makerStrategy;
                }

                configProvider.updateConfig(updateData);
                return res.status(200).json({
                    message: "Configuration updated successfully",
                });
            } catch (error) {
                loggerLib.logError(error);
                return res
                    .status(500)
                    .json({error: "Failed to update configuration"});
            }
        });

        app.get("/api/wallet-groups", (req, res) => {
            try {
                const walletGroups = configProvider.getWalletGroups();

                const walletGroupsWithStats = walletGroups.map((group: any) => ({
                    name: group.name,
                    walletCount: group.wallets.length,
                    totalSolBalance: group.wallets.reduce(
                        (sum: number, wallet: any) => sum + (wallet.solBalance || 0),
                        0,
                    ),
                    totalTokenBalance: group.wallets.reduce(
                        (sum: number, wallet: any) => sum + (wallet.tokenBalance || 0),
                        0,
                    ),
                    wallets: group.wallets,
                }));

                return res.status(200).json({
                    walletGroups: walletGroupsWithStats,
                });
            } catch (error) {
                loggerLib.logError(error);
                return res.status(500).json({error: "Failed to load wallet groups"});
            }
        });

        app.post("/api/wallet-groups", (req, res) => {
            try {
                const {groupName, walletCount} = req.body;
                if (_.isEmpty(groupName) || _.isNil(walletCount)) {
                    return res
                        .status(400)
                        .json({error: `Missing required fields! groupName: ${groupName} walletCount: ${walletCount}`});
                }

                const trimmedGroupName = groupName.trim();
                const newGroup = configProvider.createWalletGroup(
                    trimmedGroupName,
                    walletCount,
                );

                return res.status(200).json({
                    message: `Created wallet group '${trimmedGroupName}' with ${walletCount} wallets`,
                    group: {
                        name: newGroup.name,
                        walletCount: newGroup.wallets.length,
                        totalSolBalance: 0,
                        totalTokenBalance: 0,
                    },
                });
            } catch (error) {
                loggerLib.logError(error);
                return res.status(500).json({error: "Failed to create wallet group"});
            }
        });

        app.get("/api/wallet-groups/:groupName/export", (req, res) => {
            try {
                const {groupName} = req.params;
                if (_.isEmpty(groupName)) {
                    return res.status(400).json({error: `Missing params! groupName: ${groupName}`});
                }

                const {walletGroups} = configProvider.getConfig();
                const walletGroup = walletGroups.find(
                    (g: any) => g.name === groupName,
                );
                if (!walletGroup) {
                    return res.status(404).json({error: "Wallet group not found"});
                }

                const privateKeys = walletGroup.wallets.map(
                    (wallet: any) => wallet.privateKey,
                );
                const privateKeysText = privateKeys.join("\n");

                res.setHeader("Content-Type", "text/plain");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="${groupName}_private_keys.txt"`,
                );

                return res.status(200).send(privateKeysText);
            } catch (error) {
                loggerLib.logError(error);
                return res.status(500).json({error: "Failed to export wallet group"});
            }
        });

        app.post("/api/wallet-groups/:groupName/add-wallets", (req, res) => {
            try {
                const {groupName} = req.params;
                const {walletCount} = req.body;
                if (_.isEmpty(groupName) || _.isNil(walletCount)) {
                    return res
                        .status(400)
                        .json({error: `Missing required fields! groupName: ${groupName} walletCount: ${walletCount}`});
                }

                const updatedGroup = configProvider.addWalletsToGroup(
                    groupName,
                    walletCount,
                );

                return res.status(200).json({
                    success: true,
                    message: `Added ${walletCount} wallets to group '${groupName}'`,
                    group: {
                        name: updatedGroup.name,
                        walletCount: updatedGroup.wallets.length,
                        totalSolBalance: updatedGroup.wallets.reduce(
                            (sum: number, wallet: any) => sum + (wallet.solBalance || 0),
                            0,
                        ),
                        totalTokenBalance: updatedGroup.wallets.reduce(
                            (sum: number, wallet: any) => sum + (wallet.tokenBalance || 0),
                            0,
                        ),
                    },
                });
            } catch (error) {
                loggerLib.logError(error);
                return res
                    .status(500)
                    .json({error: "Failed to add wallets to group"});
            }
        });

        const {uiPort} = configProvider.getConfig();
        app.listen(uiPort, () => {
            loggerLib.logInfo({
                message: "UI server running!",
                port: uiPort,
            });
        });
    }
}
