import _, {isEmpty} from "lodash";

import taskLib from "../../lib/task.lib";
import loggerLib from "../../lib/logger.lib";
import schemaValidatorLib from "../../lib/schema.validator.lib";

import taskStatusEnum from "../../enum/task.status.enum";

async function getTasks(req: any, res: any) {
    try {
        const {status = null} = req.query;
        if (!_.isNil(status) && !Object.values(taskStatusEnum).includes(status as keyof typeof taskStatusEnum)) {
            return res.status(400).json({error: `Invalid status! status: ${status}`});
        }

        const tasks = await taskLib.getTasks(...(!isEmpty(status) ? [status as keyof typeof taskStatusEnum] : []));
        return res.status(200).json({
            message: `Tasks fetched successfully!`,
            tasks
        });
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function createTask(req: any, res: any) {
    try {
        const {type, context} = req.body;
        if (_.isEmpty(type) || _.isEmpty(context)) {
            return res.status(400).json({error: `Missing required fields in body! type: ${type}, context: ${context}`});
        }

        const validationResult = schemaValidatorLib.validateTaskContext(type, context);
        if (!validationResult.valid) {
            return res.status(400).json({
                error: 'Invalid task context',
                details: validationResult.errors
            });
        }

        const newTaskId = await taskLib.createTask(type, context);
        return res.status(200).json({message: `Task created successfully!`, taskId: newTaskId});
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function deleteTask(req: any, res: any) {
    try {
        const {taskId} = req.params;
        if (_.isEmpty(taskId)) {
            return res.status(400).json({error: `Missing params! taskId: ${taskId}`});
        }

        await taskLib.removeTaskFromPm2(taskId);
        await taskLib.updateTask(taskId, {status: taskStatusEnum.DELETED});
        return res.status(200).json({message: `Task deleted successfully!`});
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function stopTask(req: any, res: any) {
    try {
        const {taskId} = req.params;
        if (_.isEmpty(taskId)) {
            return res.status(400).json({error: `Missing params! taskId: ${taskId}`});
        }

        const task = await taskLib.getTask(taskId);
        if (task.status !== taskStatusEnum.RUNNING) {
            return res.status(400).json({error: `Task is not running! current status: ${task.status}`});
        }

        await taskLib.stopTaskOnPm2(taskId);
        await taskLib.updateTask(taskId, {status: taskStatusEnum.STOPPED});
        return res.status(200).json({message: `Task stopped successfully!`});
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function resumeTask(req: any, res: any) {
    try {
        const {taskId} = req.params;
        if (_.isEmpty(taskId)) {
            return res.status(400).json({error: `Missing params! taskId: ${taskId}`});
        }

        const task = await taskLib.getTask(taskId);
        if (task.status !== taskStatusEnum.STOPPED) {
            return res.status(400).json({error: `Task is not stopped! current status: ${task.status}`});
        }

        await taskLib.resumeTaskOnPm2(taskId);
        await taskLib.updateTask(taskId, {status: taskStatusEnum.RUNNING});
        return res.status(200).json({message: `Task resumed successfully!`});
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function updateTaskContext(req: any, res: any) {
    try {
        const {taskId, context} = req.body;
        if (_.isEmpty(taskId) || _.isEmpty(context)) {
            return res.status(400).json({error: `Missing required fields in body! taskId: ${taskId}, context: ${context}`});
        }

        await taskLib.updateTask(taskId, {context: context});
        return res.status(200).json({message: `Task context updated successfully!`});
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function getTaskContextSchema(req: any, res: any) {
    try {
        const {taskType} = req.params;
        if (_.isEmpty(taskType)) {
            return res.status(400).json({error: `Missing params! taskType: ${taskType}`});
        }

        const schema = schemaValidatorLib.getTaskSchema(taskType);
        if (!schema) {
            return res.status(404).json({error: `Schema not found for task type: ${taskType}`});
        }

        return res.status(200).json({
            message: `Schema fetched successfully!`,
            taskType,
            schema
        });
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

async function validateTaskContext(req: any, res: any) {
    try {
        const {taskType, context} = req.body;
        if (_.isEmpty(taskType) || _.isEmpty(context)) {
            return res.status(400).json({error: `Missing required fields in body! taskType: ${taskType}, context: ${context}`});
        }

        const validationResult = schemaValidatorLib.validateTaskContext(taskType, context);

        return res.status(200).json({
            message: `Context validation completed!`,
            valid: validationResult.valid,
            errors: validationResult.errors
        });
    } catch (error: any) {
        loggerLib.logError(error);
        return res.status(500).json({error: error.message});
    }
}

export default {
    getTasks: getTasks,
    stopTask: stopTask,
    resumeTask: resumeTask,
    createTask: createTask,
    deleteTask: deleteTask,
    updateTaskContext: updateTaskContext,
    validateTaskContext: validateTaskContext,
    getTaskContextSchema: getTaskContextSchema,
}