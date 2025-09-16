import _ from "lodash";
import bs58 from "bs58";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
    Connection,
    Keypair,
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";

import globalLib from "./global.lib";
import loggerLib from "./logger.lib";
import globalKeyEnum from "../enum/global.key.enum";

const MAX_ACCOUNTS_PER_MULTI_REQUEST = 100;

function connectToCluster(rpcUrl: string) {
    globalLib.setGlobalKey(
        globalKeyEnum.SOLANA_CONNECTION,
        new Connection(rpcUrl, "confirmed"),
    );

    loggerLib.logInfo(`Connected to solana cluster!`);
}

function isConnectionEstablished() {
    return globalLib.getGlobalKey(globalKeyEnum.SOLANA_CONNECTION) !== undefined;
}

function getConnection() {
    if (!isConnectionEstablished()) {
        throw new Error("Connection is not established!");
    }

    return globalLib.getGlobalKey(globalKeyEnum.SOLANA_CONNECTION);
}

function getPayer(privateKey: string): Keypair {
    try {
        return Keypair.fromSecretKey(bs58.decode(privateKey));
    } catch (error) {
        throw error;
    }
}

function getAssociatedTokenAccountAddress(
    tokenMintPublicKey: PublicKey,
    ownerPublicKey: PublicKey,
    allowOwnerOffCurve: boolean = false,
): PublicKey {
    try {
        if (_.isEmpty(tokenMintPublicKey) || _.isEmpty(ownerPublicKey)) {
            throw new Error(
                `Missing args! tokenMintPublicKey: ${tokenMintPublicKey} ownerPublicKey: ${ownerPublicKey}`,
            );
        }

        if (
            !allowOwnerOffCurve &&
            !PublicKey.isOnCurve(ownerPublicKey.toBuffer())
        ) {
            throw new Error("Owner is off curve");
        }

        const [address] = PublicKey.findProgramAddressSync(
            [
                ownerPublicKey.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                tokenMintPublicKey.toBuffer(),
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        return address;
    } catch (error) {
        throw error;
    }
}

async function getSignedTransaction(
    instructions: any[],
    payer: Keypair,
    signers: Keypair[],
): Promise<any> {
    try {
        if (_.isEmpty(instructions) || _.isEmpty(payer) || _.isEmpty(signers)) {
            throw new Error(
                `Missing args! instructions: ${instructions} payer: ${payer} signers: ${signers}`,
            );
        }

        const connection = getConnection();
        const {blockhash} = await connection.getLatestBlockhash({
            commitment: "confirmed",
        });

        const messageV0 = new TransactionMessage({
            payerKey: payer.publicKey,
            recentBlockhash: blockhash,
            instructions: instructions,
        }).compileToV0Message();
        const transaction = new VersionedTransaction(messageV0);
        transaction.sign(signers);

        return transaction;
    } catch (error) {
        throw error;
    }
}

async function getTokenInfo(tokenMintAddress: string): Promise<{
    decimals: number;
    mintAuthority: string;
    freezeAuthority: string;
    totalSupply: number;
}> {
    try {
        const connection = getConnection();
        const tokenMintKey = new PublicKey(tokenMintAddress);

        const tokenInfo = await connection.getParsedAccountInfo(tokenMintKey);

        const tokenDecimals = tokenInfo.value.data.parsed.info.decimals;
        const mintAuthority = tokenInfo.value.data.parsed.info.mintAuthority;
        const freezeAuthority = tokenInfo.value.data.parsed.info.freezeAuthority;
        const totalSupply = parseInt(tokenInfo.value.data.parsed.info.supply);

        return {
            decimals: tokenDecimals,
            mintAuthority: mintAuthority,
            freezeAuthority: freezeAuthority,
            totalSupply: totalSupply,
        };
    } catch (error) {
        throw error;
    }
}

async function getBatchSolBalance(walletAddresses: string[]) {
    try {
        if (_.isEmpty(walletAddresses)) {
            throw new Error(`Missing args! walletAddresses: ${walletAddresses}`);
        }

        if (walletAddresses.length > MAX_ACCOUNTS_PER_MULTI_REQUEST) {
            throw new Error(
                `Too many wallet addresses! Max ${MAX_ACCOUNTS_PER_MULTI_REQUEST} allowed, got: ${walletAddresses.length}`,
            );
        }

        const connection = getConnection();
        const walletPublicKeys = walletAddresses.map(
            (address) => new PublicKey(address),
        );
        const balances = await connection.getMultipleAccountsInfo(walletPublicKeys);
        return balances.map((balance: any) => {
            if (_.isNil(balance)) {
                return 0;
            }
            return balance.lamports / 10 ** 9;
        });
    } catch (error) {
        throw error;
    }
}

async function getBatchTokenBalance(
    walletAddresses: string[],
    tokenMintAddress: string,
) {
    try {
        if (_.isEmpty(walletAddresses) || _.isEmpty(tokenMintAddress)) {
            throw new Error(
                ` Missing args! walletAddresses: ${walletAddresses} tokenMintAddress: ${tokenMintAddress}`,
            );
        }

        if (walletAddresses.length > MAX_ACCOUNTS_PER_MULTI_REQUEST) {
            throw new Error(
                `Too many wallet addresses! Max ${MAX_ACCOUNTS_PER_MULTI_REQUEST} allowed, got: ${walletAddresses.length}`,
            );
        }

        const connection = getConnection();
        const tokenMintPublicKey = new PublicKey(tokenMintAddress);
        const associatedTokenAccountPublicKeys = walletAddresses.map((address) =>
            getAssociatedTokenAccountAddress(
                tokenMintPublicKey,
                new PublicKey(address),
            ),
        );

        const accountInfos = await connection.getMultipleAccountsInfo(
            associatedTokenAccountPublicKeys,
        );

        const tokenInfo = await getTokenInfo(tokenMintAddress);
        const decimals = tokenInfo.decimals;

        return accountInfos.map((accountInfo: any) => {
            if (!accountInfo || !accountInfo.data || accountInfo.data.length < 64) {
                return 0;
            }

            const amount = accountInfo.data.readBigUInt64LE(64);
            return Number(amount) / Math.pow(10, decimals);
        });
    } catch (error) {
        throw error;
    }
}

function generateWallet() {
    try {
        const keypair = Keypair.generate();

        const address = keypair.publicKey.toBase58();
        const privateKey = bs58.encode(keypair.secretKey);

        return {
            address: address,
            privateKey: privateKey,
        };
    } catch (error) {
        throw error;
    }
}

export default {
    getPayer: getPayer,
    getTokenInfo: getTokenInfo,
    getConnection: getConnection,
    generateWallet: generateWallet,
    connectToCluster: connectToCluster,
    getBatchSolBalance: getBatchSolBalance,
    getBatchTokenBalance: getBatchTokenBalance,
    getSignedTransaction: getSignedTransaction,
    isConnectionEstablished: isConnectionEstablished,
    getAssociatedTokenAccountAddress: getAssociatedTokenAccountAddress,
};