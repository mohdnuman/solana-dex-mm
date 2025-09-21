import mongoose from "mongoose";

import taskTypeEnum from "../enum/task.type.enum";
import collectionEnum from "../enum/collection.enum";
import taskStatusEnum from "../enum/task.status.enum";

const taskSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: Object.values(taskTypeEnum)
    },
    name:{
        type: String,
        required: false,
        default: null
    },
    context: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: Object.values(taskStatusEnum),
        default: taskStatusEnum.PENDING
    },
    startedAt: {
        type: Date,
        required: false,
        default: null
    },
    endedAt: {
        type: Date,
        required: false,
        default: null
    },
    failureReason: {
        type: String,
        required: false,
        default: null
    }
}, {
    timestamps: true
});

export default mongoose.connection
    .useDb("solana_dex_mm")
    .model(collectionEnum.TASK, taskSchema);