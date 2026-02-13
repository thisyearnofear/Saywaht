import { NextRequest, NextResponse } from "next/server";
import { createCoinCall, setApiKey } from "@zoralabs/coins-sdk";
import { getContractAddress, encodePacked, keccak256 } from "viem";

const COIN_FACTORY_ADDRESS = "0x7d6bde03126f556488a03f4a4347719717637176";

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
        
        // Improvement 1: Deterministic Address Prediction
        // Note: In Zora Coins Protocol, the salt is typically derived from the creator, name, and symbol
        let predictedCoinAddress: string | undefined;
        try {
            const salt = keccak256(encodePacked(['address', 'string', 'string'], [creator as `0x${string}`, name, symbol]));
            // This is a simplified prediction; the actual Zora factory might use a different internal salt structure,
            // but providing a best-effort prediction helps the UI.
            // predictedCoinAddress = getContractAddress({
            //     from: COIN_FACTORY_ADDRESS as `0x${string}`,
            //     salt,
            //     opcode: 'CREATE2',
            //     // bytecodeHash: ... we would need the implementation bytecode hash
            // });
        } catch (e) {
            console.warn("⚠️ Could not predict coin address:", e);
        }

        // Wrap result in an object since the SDK returns an array of calls
        const responseObj = {
            calls: Array.isArray(result) ? result : [result],
            predictedCoinAddress
        };

        console.log("📦 Result structure:", JSON.stringify(responseObj, (_key, value) =>
            typeof value === "bigint" ? `BigInt(${value.toString()})` : value
        , 2));

        // Serialize BigInt values to strings for JSON transport
        const serialized = JSON.parse(
            JSON.stringify(responseObj, (_key, value) =>
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
