import mongoose from "mongoose";

import dexEnum from "../enum/dex.enum";
import collectionEnum from "../enum/collection.enum";

const configSchema = new mongoose.Schema({
    dex: {
        type: String,
        required: true,
        enum: Object.values(dexEnum)
    },
    tokenAddress: {
        type: String,
        required: true
    },
    poolAddress: {
        type: String,
        required: true,
    },
}, {
    timestamps: true
});

export default mongoose.connection
    .useDb("solana_dex_mm")
    .model(collectionEnum.CONFIG, configSchema);