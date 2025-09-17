import _ from "lodash";

import dexEnum from "../enum/dex.enum";
import raydiumClmmDex from "./raydium.clmm.dex";

function getDexHandler(dex: string): any {
    try {
        if (_.isNil(dex)) {
            throw new Error(`Missing args! dex: ${dex}`);
        }

        switch (dex) {
            case dexEnum.RAYDIUM_CLMM:
                return raydiumClmmDex;
            default:
                throw new Error(`Dex not supported! dex: ${dex}`);
        }
    } catch (error) {
        throw error;
    }
}

async function buy(
    dex: string,
    address: string,
    amountOfSol: number,
    walletPrivateKey: string,
): Promise<string> {
    try {
        if (
            _.isNil(dex) ||
            _.isNil(address) ||
            _.isNil(amountOfSol) ||
            _.isNil(walletPrivateKey)
        ) {
            throw new Error(
                `Missing args! dex: ${dex}, address: ${address}, amountOfSol: ${amountOfSol}, walletPrivateKey: ${walletPrivateKey}`,
            );
        }

        // @ts-ignore
        if (!Object.values(dexEnum).includes(dex)) {
            throw new Error(`Dex not supported! dex: ${dex}`);
        }

        const dexHandler = getDexHandler(dex);
        return await dexHandler.buy(address, amountOfSol, walletPrivateKey);
    } catch (error) {
        throw error;
    }
}

async function sell(
    dex: string,
    address: string,
    amountOfTokens: number,
    walletPrivateKey: string,
): Promise<string> {
    try {
        if (
            _.isNil(dex) ||
            _.isNil(address) ||
            _.isNil(amountOfTokens) ||
            _.isNil(walletPrivateKey)
        ) {
            throw new Error(
                `Missing args! dex: ${dex}, address: ${address}, amountOfTokens: ${amountOfTokens}, walletPrivateKey: ${walletPrivateKey}`,
            );
        }

        // @ts-ignore
        if (!Object.values(dexEnum).includes(dex)) {
            throw new Error(`Dex not supported! dex: ${dex}`);
        }

        const dexHandler = getDexHandler(dex);
        return await dexHandler.sell(address, amountOfTokens, walletPrivateKey);
    } catch (error) {
        throw error;
    }
}

async function getPrice(dex: string, address: string): Promise<number> {
    try {
        if (_.isNil(dex) || _.isNil(address)) {
            throw new Error(`Missing args! dex: ${dex}, address: ${address}`);
        }

        // @ts-ignore
        if (!Object.values(dexEnum).includes(dex)) {
            throw new Error(`Dex not supported! dex: ${dex}`);
        }

        const dexHandler = getDexHandler(dex);
        return dexHandler.getPrice(address);
    } catch (error) {
        throw error;
    }
}

async function getTokenAmountToSellToGetGivenSolAmount(dex: string, poolAddress: string, amount: number): Promise<number> {
    try {
        if (_.isNil(dex) || _.isNil(amount) || _.isNil(poolAddress)) {
            throw new Error(`Missing args! dex: ${dex}, amount: ${amount} poolAddress: ${poolAddress}`);
        }

        // @ts-ignore
        if (!Object.values(dexEnum).includes(dex)) {
            throw new Error(`Dex not supported! dex: ${dex}`);
        }

        const dexHandler = getDexHandler(dex);
        return await dexHandler.getTokenAmountToSellToGetGivenSolAmount(poolAddress, amount);
    } catch (error) {
        throw error;
    }
}


export default {
    buy: buy,
    sell: sell,
    getPrice: getPrice,
    getTokenAmountToSellToGetGivenSolAmount: getTokenAmountToSellToGetGivenSolAmount,
};
