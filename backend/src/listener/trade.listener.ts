import _ from "lodash";
import {connect, StringCodec} from "nats";

import loggerLib from "../lib/logger.lib";

import dexEnum from "../enum/dex.enum";
import globalConst from "../const/global.const";
import tradeTypeEnum from "../enum/trade.type.enum";

function resolveDex(dex: string) {
    try {
        if (_.isNil(dex)) {
            throw new Error(`Missing args! dex: ${dex}`);
        }

        switch (dex) {
            case "raydiumclmm":
                return dexEnum.RAYDIUM_CLMM;
            default:
                return "UNKNOWN";
        }
    } catch (error) {
        throw error;
    }
}

function mutateTrade(trade: any): {
    dex: string;
    slot: number;
    trader: string;
    timestamp: number;
    type: string;
    baseTokenMint: string;
    quoteTokenMint: string;
    baseTokenAmount: number;
    quoteTokenAmount: number;
    priceInTermsOfSol: number;
    priceInTermsOfUsd: number;
    transactionHash: string;
} {
    try {
        if (_.isNil(trade)) {
            throw new Error(`Missing args! trade: ${trade}`);
        }

        const dex = resolveDex(trade.dex);
        const slot = trade.slot;
        const trader = trade.trader;
        const sourceMint = trade.sourceMint;
        const destinationMint = trade.destinationMint;
        const solPrice = parseFloat(trade.solUsdPrice);
        const sourceAmount = parseFloat(trade.amountIn);
        const destinationAmount = parseFloat(trade.amountOut);
        const transactionHash = trade.signature;
        const timestamp = Math.floor(trade.blockTimestamp / 10 ** 6);

        if (sourceMint === globalConst.WSOL_ADDRESS) {
            return {
                dex: dex,
                slot: slot,
                trader: trader,
                timestamp: timestamp,
                type: tradeTypeEnum.BUY,
                baseTokenMint: destinationMint,
                quoteTokenMint: sourceMint,
                baseTokenAmount: destinationAmount,
                quoteTokenAmount: sourceAmount,
                priceInTermsOfSol: sourceAmount / destinationAmount,
                priceInTermsOfUsd: solPrice * (sourceAmount / destinationAmount),
                transactionHash: transactionHash,
            };
        }

        return {
            dex: dex,
            slot: slot,
            trader: trader,
            timestamp: timestamp,
            type: tradeTypeEnum.SELL,
            baseTokenMint: sourceMint,
            quoteTokenMint: destinationMint,
            baseTokenAmount: sourceAmount,
            quoteTokenAmount: destinationAmount,
            priceInTermsOfSol: destinationAmount / sourceAmount,
            priceInTermsOfUsd: solPrice * (destinationAmount / sourceAmount),
            transactionHash: transactionHash,
        };
    } catch (error) {
        throw error;
    }
}

async function init() {
    try {
        const sc = StringCodec();

        // @ts-ignore
        const nc = await connect({
            servers: process.env["NATS_URL"],
            user: process.env["NATS_USER"],
            pass: process.env["NATS_PASSWORD"],
        });
        loggerLib.logInfo("Listening to trades on NATS server!");

        // @ts-ignore
        const sub = nc.subscribe(process.env["NATS_SUBJECT"]);
        for await (const msg of sub) {
            const tradeStr = sc.decode(msg.data);
            const trade = JSON.parse(tradeStr);

            if (
                trade.sourceMint !== globalConst.WSOL_ADDRESS &&
                trade.destinationMint !== globalConst.WSOL_ADDRESS
            ) {
                continue;
            }

            const mutatedTrade = mutateTrade(trade);
            console.log(mutatedTrade);
        }

        await nc.drain();
    } catch (error) {
        throw error;
    }
}

export default {
    init: init,
};
