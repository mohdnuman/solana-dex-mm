import joi from 'joi';

import dexEnum from '../enum/dex.enum';

 function validateConfig(config: any) {
    const schema = joi.object({
        uiPort: joi.number().required(),
        dex: joi.string().valid(...Object.values(dexEnum)).required(),
        tokenAddress: joi.string().required(),
        poolAddress: joi.string().required(),
        volumeStrategy: joi.object({
            isEnabled: joi.boolean().required(),
            bias: joi.number().min(-1).max(1).required(),
            tradesPerCycle: joi.number().min(1).max(500).required(),
            volumePerMinute: joi.number().min(0.0001).required(),
            walletGroupName: joi.string().required()
        }).required(),
        makerStrategy: joi.object({
            isEnabled: joi.boolean().required(),
            masterWalletPrivateKey: joi.string().required(),
            amountToTransfer: joi.number().min(0.002).required(),
            amountToSwap: joi.number().min(0.00001).required(),
            walletGroupName: joi.string().required()
        }).required(),
        walletGroups: joi.array().required()
    });

    const {error} = schema.validate(config);
    if (error) {
        throw new Error(`Config validation error: ${error.message}`);
    }
}

export default {
    validateConfig: validateConfig
}