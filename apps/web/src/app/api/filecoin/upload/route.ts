import { NextRequest, NextResponse } from "next/server";
import { FilCDNService } from "@/lib/filcdn";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const privateKey = process.env.FILECOIN_PRIVATE_KEY;
        if (!privateKey) {
            console.error("FILECOIN_PRIVATE_KEY is missing");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const service = new FilCDNService({
            privateKey,
            walletAddress: process.env.FILECOIN_WALLET_ADDRESS
        });

        await service.initialize();
        const result = await service.uploadFile(file);

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Upload failed",
            success: false
        }, { status: 500 });
    }
}
