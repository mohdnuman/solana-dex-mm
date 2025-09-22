import _ from "lodash";
import axios from "axios";
import {SystemProgram, LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";

import jitoConst from "../const/jito.const";

async function sendBundle(rawTransactions: string[]) {
    try {
        if (_.isEmpty(rawTransactions)) {
            throw new Error(`Missing args! rawTransactions: ${rawTransactions}`);
        }

        const resp = await axios.post(
            `https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles?uuid=${process.env["JITO_API_UUID"]}`,
            {
                jsonrpc: "2.0",
                id: 1,
                method: "sendBundle",
                params: [
                    rawTransactions
                ],
            },
        );

        if (
            _.isEmpty(resp) ||
            _.isEmpty(resp.data) ||
            _.isEmpty(resp.data.result)
        ) {
            throw new Error(`Failed to send bundle!`);
        }

        return resp.data.result;
    } catch (error) {
        throw error;
    }
}

function getTipInstruction(tipInSol: number, userAddress: string) {
    try {
        if (_.isNil(tipInSol) || _.isNil(userAddress)) {
            throw new Error(
                `Missing args! tipInSol: ${tipInSol} userAddress: ${userAddress}`,
            );
        }

        const userPublicKey = new PublicKey(userAddress);
        return SystemProgram.transfer({
            fromPubkey: userPublicKey,
            toPubkey: new PublicKey(jitoConst.JITO_TIP_ACCOUNT),
            lamports: tipInSol * LAMPORTS_PER_SOL,
        });
    } catch (error) {
        throw error;
    }
}


async function getBundleStats(bundleHash: string) {
    try {
        if (_.isEmpty(bundleHash)) {
            throw new Error(`Missing args! bundleHash: ${bundleHash}`);
        }

        const resp = await axios.post(
            "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
            {
                jsonrpc: "2.0",
                id: 1,
                method: "getBundleStatuses",
                params: [[bundleHash]],
            },
        );

        if (
            _.isEmpty(resp) ||
            _.isEmpty(resp.data) ||
            _.isEmpty(resp.data.result)
        ) {
            throw new Error(`Failed to get bundle stats!`);
        }

        return resp.data.result;
    } catch (error) {
        throw error;
    }
}

async function simulateBundle(transactions: any[]) {
    try {
        if (_.isEmpty(transactions)) {
            throw new Error(`Missing args! transactions: ${transactions}`);
        }

        const url = process.env["SOLANA_RPC_URL"];
        const body = {
            jsonrpc: "2.0",
            id: "1",
            method: "simulateBundle",
            params: [
                {
                    encodedTransactions: transactions.map((tx) =>
                        Buffer.from(tx.serialize()).toString("base64"),
                    ),
                },
            ],
        };

        const options = {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body),
        };

        // @ts-ignore
        const response = await fetch(url, options);
        const data = await response.json();
        if (
            _.isEmpty(data) ||
            _.isEmpty(data.result) ||
            _.isEmpty(data.result.value)
        ) {
            throw new Error(
                `Invalid response from simulateBundle: ${JSON.stringify(data)}`,
            );
        }

        const isSuccessful =
            !_.isNil(data.result.value.summary) &&
            data.result.value.summary === "succeeded";
        let errorTransactionHash = !isSuccessful
            ? data.result.value.summary.failed.tx_signature
            : null;
        let error = !isSuccessful ? data.result.value.summary.failed.error : null;

        return {
            isSuccessful,
            errorTransactionHash,
            error,
        };
    } catch (error) {
        throw error;
    }
}

export default {
    sendBundle: sendBundle,
    simulateBundle: simulateBundle,
    getBundleStats: getBundleStats,
    getTipInstruction: getTipInstruction,
};
