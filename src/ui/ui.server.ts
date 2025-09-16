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
          bias: config.bias,
          tradesPerCycle: config.tradesPerCycle,
          volumePerMinute: config.volumePerMinute,
          volumeStratWalletGroupName: config.volumeStratWalletGroupName,
        };
        return res.status(200).json(editableConfig);
      } catch (error) {
        loggerLib.logError(error);
        return res.status(500).json({ error: "Failed to load configuration" });
      }
    });

    app.post("/api/config", (req, res) => {
      try {
        const allowedFields = [
          "bias",
          "tradesPerCycle",
          "volumePerMinute",
          "volumeStratWalletGroupName",
        ];
        const updateData: any = {};

        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            updateData[field] = req.body[field];
          }
        }

        configProvider.updateConfig(updateData);
        return res.json({
          success: true,
          message: "Configuration updated successfully",
        });
      } catch (error) {
        loggerLib.logError(error);
        return res
          .status(500)
          .json({ error: "Failed to update configuration" });
      }
    });

    app.get("/api/wallet-groups", (req, res) => {
      try {
        const config = configProvider.getConfig();
        const walletGroups = config.walletGroups || [];
        const walletGroupNames = configProvider.getWalletGroupNames();

        const groupsWithStats = walletGroups.map((group: any) => ({
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
          walletGroups: groupsWithStats,
          availableGroupNames: walletGroupNames,
        });
      } catch (error) {
        loggerLib.logError(error);
        return res.status(500).json({ error: "Failed to load wallet groups" });
      }
    });

    app.post("/api/wallet-groups", (req, res) => {
      try {
        const { groupName, walletCount } = req.body;

        if (
          !groupName ||
          typeof groupName !== "string" ||
          groupName.trim() === ""
        ) {
          return res.status(400).json({
            error: "Group name is required and must be a non-empty string",
          });
        }

        if (
          !walletCount ||
          typeof walletCount !== "number" ||
          walletCount < 1 ||
          walletCount > 100
        ) {
          return res
            .status(400)
            .json({ error: "Wallet count must be a number between 1 and 100" });
        }

        const trimmedGroupName = groupName.trim();
        const newGroup = configProvider.createWalletGroup(
          trimmedGroupName,
          walletCount,
        );

        return res.status(201).json({
          success: true,
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
        if (
          error instanceof Error &&
          error.message.includes("already exists")
        ) {
          return res.status(409).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to create wallet group" });
      }
    });

    app.get("/api/wallet-groups/:groupName/export", (req, res) => {
      try {
        const { groupName } = req.params;
        const config = configProvider.getConfig();
        const group = config.walletGroups.find(
          (g: any) => g.name === groupName,
        );

        if (!group) {
          return res.status(404).json({ error: "Wallet group not found" });
        }

        // Extract private keys
        const privateKeys = group.wallets.map(
          (wallet: any) => wallet.privateKey,
        );
        const privateKeysText = privateKeys.join("\n");

        // Set headers for file download
        res.setHeader("Content-Type", "text/plain");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${groupName}_private_keys.txt"`,
        );

        return res.send(privateKeysText);
      } catch (error) {
        loggerLib.logError(error);
        return res.status(500).json({ error: "Failed to export wallet group" });
      }
    });

    app.post("/api/wallet-groups/:groupName/add-wallets", (req, res) => {
      try {
        const { groupName } = req.params;
        const { walletCount } = req.body;

        if (
          !walletCount ||
          typeof walletCount !== "number" ||
          walletCount < 1 ||
          walletCount > 50
        ) {
          return res
            .status(400)
            .json({ error: "Wallet count must be a number between 1 and 50" });
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
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ error: error.message });
        }
        return res
          .status(500)
          .json({ error: "Failed to add wallets to group" });
      }
    });

    const { uiPort } = configProvider.getConfig();
    app.listen(uiPort, () => {
      loggerLib.logInfo({
        message: "UI server running!",
        port: uiPort,
      });
    });
  }
}
