import { NextRequest, NextResponse } from "next/server";
import { createCoinCall, setApiKey } from "@zoralabs/coins-sdk";

// Initialize API key server-side
const ZORA_API_KEY = process.env.ZORA_API_KEY;
if (ZORA_API_KEY) {
    setApiKey(ZORA_API_KEY);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        const { creator, name, symbol, metadata, currency, chainId, startingMarketCap, platformReferrer, additionalOwners, payoutRecipientOverride } = body;

        if (!creator || !name || !symbol || !metadata || !currency) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Call Zora SDK to get calldata (server-side with API key)
        const result = await createCoinCall({
            creator,
            name,
            symbol,
            metadata,
            currency,
            chainId,
            startingMarketCap,
            platformReferrer,
            additionalOwners,
            payoutRecipientOverride,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to create coin calldata:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create coin calldata" },
            { status: 500 }
        );
    }
}
