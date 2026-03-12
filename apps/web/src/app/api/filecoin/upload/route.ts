import { NextRequest, NextResponse } from "next/server";
import { FilCDNService, normalizeAndValidateFilecoinPrivateKey } from "@/lib/filcdn";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        let privateKey: string;
        try {
            privateKey = normalizeAndValidateFilecoinPrivateKey(process.env["FILECOIN_PRIVATE_KEY"]);
        } catch (configError) {
            console.error("Invalid FILECOIN_PRIVATE_KEY configuration:", configError);
            return NextResponse.json(
                {
                    error:
                        "FilCDN configuration error: FILECOIN_PRIVATE_KEY must be a valid 32-byte hex key (0x + 64 hex chars) and not a placeholder.",
                    success: false,
                },
                { status: 500 }
            );
        }

        const service = new FilCDNService({
            privateKey,
            walletAddress: process.env["FILECOIN_WALLET_ADDRESS"]
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
