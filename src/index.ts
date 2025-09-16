import path from "path";
import dotenv from "dotenv";

dotenv.config({path: path.join(__dirname, "/../.env")});

import UiServer from "./ui/ui.server";
import solanaLib from "./lib/solana.lib";
import loggerLib from "./lib/logger.lib";
import ConfigProvider from "./config/config.provider";
import VolumeStrategy from "./strategy/volume.strategy";

(async () => {
    try {
        // @ts-ignore
        solanaLib.connectToCluster(process.env["SOLANA_RPC_URL"]);

        const configProvider = new ConfigProvider(
            path.resolve(__dirname, "../config.json"),
        );
        new UiServer(configProvider);

        const strategy = new VolumeStrategy(configProvider);
        await strategy.start();
    } catch (error) {
        loggerLib.logError(error);
        process.exit(1);
    }
})();

process.on("unhandledRejection", error => {
    loggerLib.logError(`Unhandled promise rejection!`);
    loggerLib.logError(error);
    process.exit(1);
})

process.on("uncaughtException", error => {
    loggerLib.logError(`Uncaught exception!`);
    loggerLib.logError(error);
    process.exit(1);
})
