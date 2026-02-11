import { NextResponse } from "next/server";
import { setApiKey } from "@zoralabs/coins-sdk";

export async function GET() {
    try {
        const ZORA_API_KEY = process.env.ZORA_API_KEY;

        return NextResponse.json({
            hasApiKey: !!ZORA_API_KEY,
            apiKeyLength: ZORA_API_KEY?.length || 0,
            apiKeyPrefix: ZORA_API_KEY?.substring(0, 10) || 'none',
            nodeVersion: process.version,
            env: process.env.NODE_ENV,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
