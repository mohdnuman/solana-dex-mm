import express from "express";

const router = express.Router();

import authMiddleware from "../middleware/auth.middleware";
import taskController from "../controller/task.controller";

router.get("/", authMiddleware.verifyJwt, taskController.getTasks);
router.get("/:taskType/context/schema", authMiddleware.verifyJwt, taskController.getTaskContextSchema);

router.post("/", authMiddleware.verifyJwt, taskController.createTask);
router.post("/:taskId/stop", authMiddleware.verifyJwt, taskController.stopTask);
router.post("/:taskId/resume", authMiddleware.verifyJwt, taskController.resumeTask);
router.post("/:taskId/delete", authMiddleware.verifyJwt, taskController.deleteTask);
router.post("/context/schema/validate", authMiddleware.verifyJwt, taskController.validateTaskContext);

router.put("/context/update", authMiddleware.verifyJwt, taskController.updateTaskContext);

export default router;

