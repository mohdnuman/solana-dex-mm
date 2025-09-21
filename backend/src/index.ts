import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "/../.env") });

import pm2Lib from "./lib/pm2.lib";
import mongoLib from "./lib/mongo.lib";
import solanaLib from "./lib/solana.lib";
import loggerLib from "./lib/logger.lib";

import api from "./api/api";
import tradeListener from "./listener/trade.listener";
import taskOrchestrator from "./task/task.orchestrator";
import walletBalanceUpdator from "./wallet/wallet.balance.updator";

(async () => {
  try {
    await pm2Lib.connect();
    //@ts-ignore
    await mongoLib.connect(process.env["MONGO_URL"]);
    //@ts-ignore
    solanaLib.connectToCluster(process.env["SOLANA_RPC_URL"]);

    api.init();
    tradeListener.init()
    taskOrchestrator.init();
    walletBalanceUpdator.init();
  } catch (error) {
    loggerLib.logError(error);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (error) => {
  loggerLib.logError(`Unhandled promise rejection!`);
  loggerLib.logError(error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  loggerLib.logError(`Uncaught exception!`);
  loggerLib.logError(error);
  process.exit(1);
});
