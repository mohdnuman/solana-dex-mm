import _ from "lodash";
import path from "path";

import pm2Lib from "../lib/pm2.lib";
import mongoLib from "../lib/mongo.lib";
import loggerLib from "../lib/logger.lib";
import helperLib from "../lib/helper.lib";

import taskModel from "../model/task.model";
import taskStatusEnum from "../enum/task.status.enum";
import taskTypeFilepathEnum from "../enum/task.type.filepath.enum";

const SLEEP_TIME_IN_MS = 1000;

class TaskOrchestrator {
    async init() {
        while (true) {
            const pendingTasks = await this.getPendingTasks();
            if (_.isEmpty(pendingTasks)) {
                await helperLib.sleep(SLEEP_TIME_IN_MS);
                continue;
            }

            for (const task of pendingTasks) {
                try {
                    await this.deployTask(task._id.toString(), task.type);
                    loggerLib.logInfo({
                        message: `Deployed task successfully!`,
                        taskId: task._id,
                        taskType: task.type
                    });
                } catch (error) {
                    await this.markTaskAsFailed(task._id);
                    loggerLib.logError({
                        message: `Failed to deploy task!`,
                        taskId: task._id,
                        taskType: task.type
                    })
                    loggerLib.logError(error);
                }
            }

            await helperLib.sleep(SLEEP_TIME_IN_MS);
        }
    }

    async getPendingTasks() {
        try {
            return await mongoLib.find(taskModel, {
                status: taskStatusEnum.PENDING
            });
        } catch (error) {
            throw error;
        }
    }

    async deployTask(id: string, type: string) {
        try {
            if (_.isEmpty(id) || _.isEmpty(type)) {
                throw new Error(`Missing args! id: ${id}, type: ${type}`);
            }

            const taskWithSameTypeCount = await mongoLib.count(taskModel, {
                type: type
            });

            const newTaskName = `${type}-${taskWithSameTypeCount + 1}`;
            //@ts-ignore
            const filepath = path.join(__dirname, "../../", taskTypeFilepathEnum[type]);
            //@ts-ignore
            await pm2Lib.start(newTaskName, filepath, [id]);

            await mongoLib.updateOne(
                taskModel,
                {_id: id},
                {
                    $set: {
                        name: newTaskName,
                        status: taskStatusEnum.RUNNING
                    }
                }
            );
        } catch (error) {
            throw error;
        }
    }

    async markTaskAsFailed(id: string) {
        try {
            if (_.isEmpty(id)) {
                throw new Error(`Missing args! id: ${id}`);
            }

            await mongoLib.updateOne(
                taskModel,
                {_id: id},
                {
                    $set: {
                        status: taskStatusEnum.FAILED
                    }
                }
            );
        } catch (error) {
            throw error;
        }
    }
}

export default new TaskOrchestrator();