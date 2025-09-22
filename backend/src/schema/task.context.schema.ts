import taskTypeEnum from "../enum/task.type.enum";

const taskSchemas: any = {
    [taskTypeEnum.VOLUME]: {
        bias: {
            type: 'number',
            required: true,
            description: 'Buy/sell bias (-1 for sell heavy, 0 for neutral, 1 for buy heavy)',
            min: -1,
            max: 1,
            example: 0.2
        },
        volumePerMinute: {
            type: 'number',
            required: true,
            description: 'Target volume per minute in SOL',
            min: 0,
            example: 10.5
        },
        tradesPerCycle: {
            type: 'number',
            required: true,
            description: 'Number of trades to execute per cycle',
            min: 1,
            example: 5
        },
        walletGroupId: {
            type: 'string',
            required: true,
            description: 'ID of the wallet group to use for trading',
            example: '507f1f77bcf86cd799439011'
        }
    },
    [taskTypeEnum.MAKER]: {
        masterWalletAddress: {
            type: 'string',
            required: true,
            description: 'Master wallet address that funds and receives profits',
            example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
        },
        minAmountToBuy: {
            type: 'number',
            required: true,
            description: 'Minimum amount of SOL to swap for tokens',
            min: 0,
            example: 0.01
        },
        maxAmountToBuy: {
            type: 'number',
            required: true,
            description: 'Maximum amount of SOL to swap for tokens',
            min: 0,
            example: 0.05
        },
        walletGroupId: {
            type: 'string',
            required: true,
            description: 'ID of the wallet group to use as maker wallets',
            example: '507f1f77bcf86cd799439011'
        }
    },
    [taskTypeEnum.HOLDER]: {
        masterWalletAddress: {
            type: 'string',
            required: true,
            description: 'Master wallet address that funds the holder wallets',
            example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
        },
        minAmountToBuy: {
            type: 'number',
            required: true,
            description: 'Minimum amount of SOL to swap for tokens',
            min: 0,
            example: 0.01
        },
        maxAmountToBuy: {
            type: 'number',
            required: true,
            description: 'Maximum amount of SOL to swap for tokens',
            min: 0,
            example: 0.05
        },
        walletGroupId: {
            type: 'string',
            required: true,
            description: 'ID of the wallet group to use as holder wallets',
            example: '507f1f77bcf86cd799439011'
        }
    },
    [taskTypeEnum.MIXER]: {
        masterWalletAddress: {
            type: 'string',
            required: true,
            description: 'Master wallet address that funds the wallets',
            example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
        },
        amountPerWallet: {
            type: 'number',
            required: true,
            description: 'Amount of SOL to send to each wallet',
            example: 0.01
        },
        walletGroupId: {
            type: 'string',
            required: true,
            description: 'ID of the wallet group to fund',
            example: '507f1f77bcf86cd799439011'
        }
    },
    [taskTypeEnum.SWEEP]: {
        masterWalletAddress: {
            type: 'string',
            required: true,
            description: 'Master wallet address that receives the funds',
            example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
        },
        walletGroupId: {
            type: 'string',
            required: true,
            description: 'ID of the wallet group to fund',
            example: '507f1f77bcf86cd799439011'
        }
    }
};

export default taskSchemas;