import { NextRequest, NextResponse } from "next/server";
import { createCoinCall, setApiKey } from "@zoralabs/coins-sdk";

export async function POST(request: NextRequest) {
    try {
        // Initialize API key for this request
        const ZORA_API_KEY = process.env.ZORA_API_KEY;

        if (!ZORA_API_KEY) {
            console.error("❌ ZORA_API_KEY not found in environment variables");
            return NextResponse.json(
                { error: "Server configuration error: API key not set" },
                { status: 500 }
            );
        }

        // Set API key for this request
        setApiKey(ZORA_API_KEY);
        console.log("✅ Zora API key set successfully");

        const body = await request.json();
        console.log("📝 Request body:", JSON.stringify(body, null, 2));

        // Validate required fields
        const { creator, name, symbol, metadata, currency, chainId, startingMarketCap, platformReferrer, additionalOwners, payoutRecipientOverride } = body;

        if (!creator || !name || !symbol || !metadata || !currency) {
            console.error("❌ Missing required fields:", { creator, name, symbol, metadata, currency });
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        console.log("🚀 Calling Zora SDK createCoinCall...");

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

        console.log("✅ Successfully got calldata from Zora SDK");
        console.log("📦 Result structure:", JSON.stringify(result, (_key, value) =>
            typeof value === "bigint" ? `BigInt(${value.toString()})` : value
        , 2));

        // Validate result structure
        if (!result || typeof result !== 'object') {
            console.error("❌ Invalid result from Zora SDK:", result);
            return NextResponse.json(
                { error: "Invalid response from Zora SDK" },
                { status: 500 }
            );
        }

        // Serialize BigInt values to strings for JSON transport
        const serialized = JSON.parse(
            JSON.stringify(result, (_key, value) =>
                typeof value === "bigint" ? value.toString() : value
            )
        );
        
        console.log("📤 Sending serialized response:", JSON.stringify(serialized, null, 2));
        return NextResponse.json(serialized);
    } catch (error) {
        console.error("❌ Failed to create coin calldata:", error);

        // Log more details about the error
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create coin calldata" },
            { status: 500 }
        );
    }
}
