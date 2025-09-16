import BN from "bn.js";
import _ from "lodash";
import Decimal from "decimal.js";
import { createCloseAccountInstruction } from "@solana/spl-token";
import { Raydium, TxVersion, PoolUtils } from "@raydium-io/raydium-sdk-v2";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";

import solanaLib from "../lib/solana.lib";

import globalConst from "../const/global.const";

async function initSdk() {
  try {
    const connection = solanaLib.getConnection();
    return await Raydium.load({
      // @ts-ignore
      connection: connection,
      cluster: "mainnet",
      disableFeatureCheck: true,
      disableLoadToken: true,
      blockhashCommitment: "finalized",
    });
  } catch (error) {
    throw error;
  }
}

async function getPoolInfo(poolAddress: string): Promise<any> {
  try {
    if (_.isEmpty(poolAddress)) {
      throw new Error(`Missing args! poolAddress: ${poolAddress}`);
    }

    const raydiumSdk = await initSdk();
    const poolInfo = await raydiumSdk.clmm.getPoolInfoFromRpc(poolAddress);

    if (_.isNil(poolInfo)) {
      throw new Error(`Pool not found! poolAddress: ${poolAddress}`);
    }

    return poolInfo.poolInfo;
  } catch (error) {
    throw error;
  }
}

async function getPoolKeys(poolAddress: string): Promise<any> {
  try {
    if (_.isEmpty(poolAddress)) {
      throw new Error(`Missing args! poolAddress: ${poolAddress}`);
    }

    const raydiumSdk = await initSdk();
    const poolKeys = await raydiumSdk.clmm.getClmmPoolKeys(poolAddress);

    if (_.isNil(poolKeys)) {
      throw new Error(`Pool keys not found! poolAddress: ${poolAddress}`);
    }

    return poolKeys;
  } catch (error) {
    throw error;
  }
}

async function getPrice(poolAddress: string): Promise<number> {
  try {
    if (_.isEmpty(poolAddress)) {
      throw new Error(`Missing args! poolAddress: ${poolAddress}`);
    }

    const poolInfo = await getPoolInfo(poolAddress);
    if (
      poolInfo["mintA"].address !== globalConst.WSOL_ADDRESS &&
      poolInfo["mintB"].address !== globalConst.WSOL_ADDRESS
    ) {
      throw new Error(`Pool is not a WSOL pool! poolAddress: ${poolAddress}`);
    }

    return poolInfo["mintA"].address === globalConst.WSOL_ADDRESS
      ? 1 / poolInfo.price
      : poolInfo.price;
  } catch (error) {
    throw error;
  }
}

async function getTokenAmountToSellToGetGivenSolAmount(
  poolAddress: string,
  amountOfSol: number,
  slippage: number = 1,
): Promise<number> {
  try {
    if (_.isEmpty(poolAddress) || _.isNil(amountOfSol)) {
      throw new Error(
        `Missing args! poolAddress: ${poolAddress}, amountOfSol: ${amountOfSol}`,
      );
    }

    const raydium = await initSdk();
    const poolInfo = await getPoolInfo(poolAddress);
    if (
      poolInfo["mintA"].address !== globalConst.WSOL_ADDRESS &&
      poolInfo["mintB"].address !== globalConst.WSOL_ADDRESS
    ) {
      throw new Error(`Pool is not a WSOL pool! poolAddress: ${poolAddress}`);
    }

    const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
      connection: raydium.connection,
      poolInfo,
    });
    const tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
      connection: raydium.connection,
      poolKeys: [clmmPoolInfo],
    });
    const baseToken =
      poolInfo["mintA"].address === globalConst.WSOL_ADDRESS
        ? poolInfo["mintB"]
        : poolInfo["mintA"];
    const baseTokenDecimals =
      poolInfo["mintA"].address === globalConst.WSOL_ADDRESS
        ? poolInfo["mintB"].decimals
        : poolInfo["mintA"].decimals;

    // @ts-ignore
    amountOfSol = new BN(amountOfSol * LAMPORTS_PER_SOL);
    const { minAmountOut } = await PoolUtils.computeAmountOutFormat({
      poolInfo: clmmPoolInfo,
      // @ts-ignore
      tickArrayCache: tickCache[poolAddress],
      // @ts-ignore
      amountIn: amountOfSol,
      tokenOut: baseToken,
      slippage: slippage / 100,
      epochInfo: await raydium.fetchEpochInfo(),
    });

    return (
      // @ts-ignore
      new Decimal(minAmountOut.amount.raw.toString()) /
      // @ts-ignore
      new Decimal(10 ** baseTokenDecimals)
    );
  } catch (error) {
    throw error;
  }
}

async function getSellTransaction(
  poolAddress: string,
  amountOfTokens: number,
  walletPrivateKey: string,
  slippage: number = 50,
) {
  try {
    if (
      _.isNil(poolAddress) ||
      _.isNil(amountOfTokens) ||
      _.isNil(walletPrivateKey)
    ) {
      throw new Error(
        `Missing args! poolAddress: ${poolAddress}, amountOfTokens: ${amountOfTokens}, walletPrivateKey: ${walletPrivateKey}`,
      );
    }

    const payer = solanaLib.getPayer(walletPrivateKey);

    const raydium = await initSdk();
    const poolKeys = await getPoolKeys(poolAddress);
    const poolInfo = await getPoolInfo(poolAddress);
    if (
      poolInfo["mintA"].address !== globalConst.WSOL_ADDRESS &&
      poolInfo["mintB"].address !== globalConst.WSOL_ADDRESS
    ) {
      throw new Error(`Pool is not a WSOL pool! poolAddress: ${poolAddress}`);
    }

    const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
      connection: raydium.connection,
      poolInfo,
    });
    const tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
      connection: raydium.connection,
      poolKeys: [clmmPoolInfo],
    });

    const quoteToken =
      poolInfo["mintA"].address === globalConst.WSOL_ADDRESS
        ? poolInfo["mintA"]
        : poolInfo["mintB"];
    const baseTokenMint =
      poolInfo["mintA"].address === globalConst.WSOL_ADDRESS
        ? poolInfo["mintB"].address
        : poolInfo["mintA"].address;
    const baseTokenDecimals =
      poolInfo["mintA"].address === globalConst.WSOL_ADDRESS
        ? poolInfo["mintB"].decimals
        : poolInfo["mintA"].decimals;
    // @ts-ignore
    amountOfTokens = new BN(amountOfTokens * 10 ** baseTokenDecimals);

    const { minAmountOut, remainingAccounts } =
      await PoolUtils.computeAmountOutFormat({
        poolInfo: clmmPoolInfo,
        // @ts-ignore
        tickArrayCache: tickCache[poolAddress],
        // @ts-ignore
        amountIn: amountOfTokens,
        tokenOut: quoteToken,
        slippage: slippage / 100,
        epochInfo: await raydium.fetchEpochInfo(),
      });

    raydium.setOwner(payer);
    const { builder } = await raydium.clmm.swap({
      poolInfo,
      poolKeys,
      inputMint: baseTokenMint,
      // @ts-ignore
      amountIn: amountOfTokens,
      amountOutMin: minAmountOut.amount.raw,
      observationId: new PublicKey(poolKeys.observationId),
      ownerInfo: {
        useSOLBalance: false,
        feePayer: payer.publicKey,
      },
      remainingAccounts: remainingAccounts,
      txVersion: TxVersion.V0,
      associatedOnly: true,
      checkCreateATAOwner: true,
    });
    // @ts-ignore
    const { instructions: swapInstructions } = builder;

    const quoteAssociatedTokenAddress =
      solanaLib.getAssociatedTokenAccountAddress(
        new PublicKey(globalConst.WSOL_ADDRESS),
        payer.publicKey,
      );
    const unwrapWsolInstruction = createCloseAccountInstruction(
      quoteAssociatedTokenAddress,
      payer.publicKey,
      payer.publicKey,
    );

    const transactionInstructions = [
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 200_000,
      }),
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 200_000,
      }),
      ...swapInstructions,
      unwrapWsolInstruction,
      // bloxRouteLib.getTipInstruction(orderConfig.tipAmount, payer),
      // bloxRouteLib.getMemoInstruction(),
    ];
    const transaction = await solanaLib.getSignedTransaction(
      transactionInstructions,
      payer,
      [payer],
    );

    return transaction;
  } catch (error) {
    throw error;
  }
}

async function getBuyTransaction(
  poolAddress: string,
  amountOfSol: number,
  walletPrivateKey: string,
  slippage = 50,
) {
  try {
    if (
      _.isNil(poolAddress) ||
      _.isNil(amountOfSol) ||
      _.isNil(walletPrivateKey)
    ) {
      throw new Error(
        `Missing args! poolAddress: ${poolAddress}, amountOfSol: ${amountOfSol}, walletPrivateKey: ${walletPrivateKey}`,
      );
    }

    const payer = solanaLib.getPayer(walletPrivateKey);

    const raydium = await initSdk();
    const poolKeys = await getPoolKeys(poolAddress);
    const poolInfo = await getPoolInfo(poolAddress);
    if (
      poolInfo["mintA"].address !== globalConst.WSOL_ADDRESS &&
      poolInfo["mintB"].address !== globalConst.WSOL_ADDRESS
    ) {
      throw new Error(`Pool is not a WSOL pool! poolAddress: ${poolAddress}`);
    }

    const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
      connection: raydium.connection,
      poolInfo,
    });
    const tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
      connection: raydium.connection,
      poolKeys: [clmmPoolInfo],
    });

    const baseToken =
      poolInfo["mintA"].address === globalConst.WSOL_ADDRESS
        ? poolInfo["mintB"]
        : poolInfo["mintA"];
    // @ts-ignore
    amountOfSol = new BN(amountOfSol * LAMPORTS_PER_SOL);

    const { minAmountOut, remainingAccounts } =
      await PoolUtils.computeAmountOutFormat({
        poolInfo: clmmPoolInfo,
        // @ts-ignore
        tickArrayCache: tickCache[poolAddress],
        // @ts-ignore
        amountIn: amountOfSol,
        tokenOut: baseToken,
        slippage: slippage / 100,
        epochInfo: await raydium.fetchEpochInfo(),
      });

    raydium.setOwner(payer);
    const { builder } = await raydium.clmm.swap({
      poolInfo,
      poolKeys,
      inputMint: globalConst.WSOL_ADDRESS,
      // @ts-ignore
      amountIn: amountOfSol,
      amountOutMin: minAmountOut.amount.raw,
      observationId: new PublicKey(poolKeys.observationId),
      ownerInfo: {
        useSOLBalance: true,
        feePayer: payer.publicKey,
      },
      remainingAccounts: remainingAccounts,
      txVersion: TxVersion.V0,
      associatedOnly: true,
      checkCreateATAOwner: true,
    });
    // @ts-ignore
    const { instructions: swapInstructions, endInstructions } = builder;

    const transactionInstructions = [
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 200_000,
      }),
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 200_000,
      }),
      ...swapInstructions,
      ...endInstructions,
      // bloxRouteLib.getTipInstruction(orderConfig.tipAmount, payer),
      // bloxRouteLib.getMemoInstruction(),
    ];
    const transaction = await solanaLib.getSignedTransaction(
      transactionInstructions,
      payer,
      [payer],
    );

    return transaction;
  } catch (error) {
    throw error;
  }
}

async function buy(
  poolAddress: string,
  amountInSol: number,
  walletPrivateKey: string,
): Promise<string> {
  try {
    if (
      _.isEmpty(poolAddress) ||
      _.isNil(amountInSol) ||
      _.isNil(walletPrivateKey)
    ) {
      throw new Error(
        `Missing args! poolAddress: ${poolAddress}, amountInSol: ${amountInSol} walletPrivateKey: ${walletPrivateKey}`,
      );
    }

    const connection = solanaLib.getConnection();
    const transaction = await getBuyTransaction(
      poolAddress,
      amountInSol,
      walletPrivateKey,
    );
    return await connection.sendTransaction(transaction);
  } catch (error) {
    throw error;
  }
}

async function sell(
  poolAddress: string,
  amount: number,
  walletPrivateKey: string,
): Promise<string> {
  try {
    if (
      _.isEmpty(poolAddress) ||
      _.isNil(amount) ||
      _.isNil(walletPrivateKey)
    ) {
      throw new Error(
        `Missing args! poolAddress: ${poolAddress}, amount: ${amount} walletPrivateKey: ${walletPrivateKey}`,
      );
    }

    const connection = solanaLib.getConnection();
    const transaction = await getSellTransaction(
      poolAddress,
      amount,
      walletPrivateKey,
    );
    return await connection.sendTransaction(transaction);
  } catch (error) {
    throw error;
  }
}

export default {
  buy: buy,
  sell: sell,
  getPrice: getPrice,
  getPoolInfo: getPoolInfo,
  getTokenAmountToSellToGetGivenSolAmount:
    getTokenAmountToSellToGetGivenSolAmount,
};
