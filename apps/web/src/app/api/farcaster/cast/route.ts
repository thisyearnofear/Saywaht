import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const hash = searchParams.get("hash");

    if (!hash) {
        return NextResponse.json({ error: "Hash required" }, { status: 400 });
    }

    try {
        const response = await fetch(`https://client.warpcast.com/v2/cast?hash=${hash}`);

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch from Warpcast" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Cast fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
