import { NextRequest, NextResponse } from "next/server";
import { Synapse } from "@filoz/synapse-sdk";

const FILECOIN_CALIBRATION_RPC = "https://api.calibration.node.glif.io/rpc/v1";

export async function GET(_req: NextRequest) {
  try {
    const privateKey = process.env.FILECOIN_PRIVATE_KEY;
    const walletAddress = process.env.FILECOIN_WALLET_ADDRESS || null;

    // QUICK FIX: Return unconfigured status to avoid crashes
    if (!privateKey) {
      console.log("FilCDN not configured - FILECOIN_PRIVATE_KEY missing");
      return NextResponse.json({
        success: true,
        configured: false,
        allowanceSufficient: false,
        walletAddress,
      });
    }

    // QUICK FIX: Skip Synapse initialization to avoid network timeouts
    console.log("FilCDN configured but skipping network check to avoid crashes");
    return NextResponse.json({
      success: true,
      configured: true,
      allowanceSufficient: false, // Conservative default
      walletAddress,
      note: "Network check disabled to prevent crashes"
    });

    /* ORIGINAL CODE - COMMENTED OUT TO PREVENT CRASHES
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
    */
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

