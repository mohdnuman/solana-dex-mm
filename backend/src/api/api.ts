import cors from "cors";
import express from "express";

import loggerLib from "../lib/logger.lib";
import globalConst from "../const/global.const";

import taskRoutes from "./route/task.route";
import walletRoutes from "./route/wallet.route"

async function init() {
    try {
        const app = express();

        app.use(cors());
        app.use(express.json());

        app.get("/status", (req
                            , res) => {
            return res.json({
                status: "OK",
            })
        });

        app.use("/task", taskRoutes);
        app.use("/wallet", walletRoutes);

        app.listen(globalConst.API_PORT, () => {
            loggerLib.logInfo({
                message: "API server running!",
                port: globalConst.API_PORT,
            });
        });
    } catch (error) {
        throw error;
    }
}

export default {
    init: init,
}