import { NextRequest, NextResponse } from "next/server";
import { Synapse } from "@filoz/synapse-sdk";

const FILECOIN_CALIBRATION_RPC = "https://api.calibration.node.glif.io/rpc/v1";

export async function GET(_req: NextRequest) {
  try {
    const privateKey = process.env.FILECOIN_PRIVATE_KEY;
    const walletAddress = process.env.FILECOIN_WALLET_ADDRESS || null;

    if (!privateKey) {
      return NextResponse.json({
        success: true,
        configured: false,
        allowanceSufficient: false,
        walletAddress,
      });
    }

    try {
      const synapse = await Synapse.create({
        withCDN: true,
        privateKey,
        rpcURL: FILECOIN_CALIBRATION_RPC,
      });

      const storageService = await synapse.createStorage({});

      const preflight = await storageService.preflightUpload(1);
      const allowanceSufficient = !!preflight?.allowanceCheck?.sufficient;

      const signerAddr = await synapse.getSigner().getAddress();

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
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      configured: false,
      allowanceSufficient: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

