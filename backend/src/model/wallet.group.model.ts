import mongoose from "mongoose";

import collectionEnum from "../enum/collection.enum";

const walletGroupSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        unique: true
    },
    numberOfWallets: {
        type: Number,
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

export default mongoose.connection
    .useDb("solana_dex_mm")
    .model(collectionEnum.WALLET_GROUP, walletGroupSchema);