import _, {isEmpty} from "lodash";

import pm2Lib from "./pm2.lib";
import mongoLib from "./mongo.lib";

import taskModel from "../model/task.model";
import taskStatusEnum from "../enum/task.status.enum";

async function getTasks(status: string | null = null) {
    try {
        if (!_.isEmpty(status) && !Object.values(taskStatusEnum).includes(status as keyof typeof taskStatusEnum)) {
            throw new Error(`Invalid status! status: ${status}`);
        }

        return await mongoLib.find(taskModel, {
            ...(!isEmpty(status) ? {status: status} : {})
        });
    } catch (error) {
        throw error;
    }
}

async function getTask(taskId: string) {
    try {
        if (_.isEmpty(taskId)) {
            throw new Error(`Missing args! taskId: ${taskId}`);
        }

        const task = await mongoLib.findOne(taskModel, {_id: taskId});
        if (_.isNil(task)) {
            throw new Error(`Task not found! taskId: ${taskId}`);
        }

        return task;
    } catch (error) {
        throw error;
    }
}

async function updateTask(taskId: string, updateFields: any) {
    try {
        if (_.isEmpty(taskId) || _.isEmpty(updateFields)) {
            throw new Error(`Missing args! taskId: ${taskId}, updateFields: ${JSON.stringify(updateFields)}`);
        }

        return await mongoLib.updateOne(taskModel, {_id: taskId}, updateFields);
    } catch (error) {
        throw error;
    }
}

async function removeTaskFromPm2(id: string) {
    try {
        if (_.isEmpty(id)) {
            throw new Error(`Missing args! id: ${id}`);
        }

        const {name} = await getTask(id);
        await pm2Lib.remove(name);
    } catch (error) {
        throw error;
    }
}

async function stopTaskOnPm2(id: string) {
    try {
        if (_.isEmpty(id)) {
            throw new Error(`Missing args! id: ${id}`);
        }

        const {name} = await getTask(id);
        await pm2Lib.stop(name);
    } catch (error) {
        throw error;
    }
}

async function resumeTaskOnPm2(id: string) {
    try {
        if (_.isEmpty(id)) {
            throw new Error(`Missing args! id: ${id}`);
        }

        const {name} = await getTask(id);
        await pm2Lib.resume(name);
    } catch (error) {
        throw error;
    }
}

async function createTask(type: string, context: object) {
    try {
        if (_.isEmpty(type) || _.isEmpty(context)) {
            throw new Error(`Missing args! type: ${type}, context: ${JSON.stringify(context)}`);
        }

        const newTask = await mongoLib.insertOne(taskModel, {
            type: type,
            context: context
        });

        return newTask.id;
    } catch (error) {
        throw error;
    }
}

export default {
    getTask: getTask,
    getTasks: getTasks,
    createTask: createTask,
    updateTask: updateTask,
    stopTaskOnPm2: stopTaskOnPm2,
    resumeTaskOnPm2: resumeTaskOnPm2,
    removeTaskFromPm2: removeTaskFromPm2
}
