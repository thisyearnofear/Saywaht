import { NextRequest, NextResponse } from "next/server";
import { Synapse } from "@filoz/synapse-sdk";

const FILECOIN_CALIBRATION_RPC =
  process.env.FILECOIN_CALIBRATION_RPC ||
  "https://api.calibration.node.glif.io/rpc/v1";

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Synapse status check timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function GET(_req: NextRequest) {
  try {
    const privateKey = process.env.FILECOIN_PRIVATE_KEY;
    const walletAddress = process.env.FILECOIN_WALLET_ADDRESS || null;

    if (!privateKey) {
      console.log("FilCDN not configured - FILECOIN_PRIVATE_KEY missing");
      return NextResponse.json({
        success: true,
        configured: false,
        allowanceSufficient: false,
        walletAddress,
      });
    }

    try {
      const synapse = await withTimeout(
        Synapse.create({
          withCDN: true,
          privateKey,
          rpcURL: FILECOIN_CALIBRATION_RPC,
        }),
        12000
      );

      const storageService = await withTimeout(synapse.createStorage({}), 12000);
      const preflight = await withTimeout(storageService.preflightUpload(1), 12000);
      const allowanceSufficient = Boolean(preflight?.allowanceCheck?.sufficient);
      const signerAddr = await withTimeout(synapse.getSigner().getAddress(), 12000);

      return NextResponse.json({
        success: true,
        configured: true,
        allowanceSufficient,
        walletAddress: walletAddress || signerAddr,
      });
    } catch (e) {
      return NextResponse.json({
        success: true,
        configured: true,
        allowanceSufficient: false,
        walletAddress,
        rpcURL: FILECOIN_CALIBRATION_RPC,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } catch (error) {
    console.error("FilCDN status check error:", error);
    return NextResponse.json({
      success: false,
      configured: false,
      allowanceSufficient: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
