import mongoose from "mongoose";

import collectionEnum from "../enum/collection.enum";

const walletSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
    },
    privateKey: {
        type: String,
        required: true
    },
    walletGroupId: {
        type: String,
        required: true
    },
    solBalance: {
        type: Number,
        required: true,
        default: 0
    },
    tokenBalance: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

walletSchema.index({walletGroupId: 1, solBalance: 1, tokenBalance: 1});

export default mongoose.connection
    .useDb("solana_dex_mm")
    .model(collectionEnum.WALLET, walletSchema);