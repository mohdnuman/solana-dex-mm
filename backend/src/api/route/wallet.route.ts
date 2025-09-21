import express from "express";

const router = express.Router();

import authMiddleware from "../middleware/auth.middleware";
import walletController from "../controller/wallet.controller";

router.get("/groups", authMiddleware.verifyJwt, walletController.getWalletGroups);
router.get("/group/:groupId", authMiddleware.verifyJwt, walletController.getWalletsForGroup);
router.get("/group/:groupId/export", authMiddleware.verifyJwt, walletController.exportWalletGroup);

router.post("/group/add", authMiddleware.verifyJwt, walletController.addWalletGroup);

export default router;