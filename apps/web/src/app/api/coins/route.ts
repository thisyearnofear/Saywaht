import { NextRequest } from "next/server";
import { db, eq, desc, coins } from "@saywaht/db";

export async function GET(request: NextRequest) {
  try {
    const creator = request.nextUrl.searchParams.get("creator");

    const result = creator
      ? await db
          .select()
          .from(coins)
          .where(eq(coins.creatorAddress, creator))
          .orderBy(desc(coins.createdAt))
          .limit(50)
      : await db
          .select()
          .from(coins)
          .orderBy(desc(coins.createdAt))
          .limit(50);

    return Response.json({ coins: result });
  } catch (error) {
    console.error("Failed to fetch coins:", error);
    return Response.json({ coins: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, name, symbol, creatorAddress, txHash, metadataUri, thumbnailUrl } = body;

    if (!address || !name || !symbol || !creatorAddress) {
      return Response.json(
        { success: false, error: "Missing required fields: address, name, symbol, creatorAddress" },
        { status: 400 }
      );
    }

    const [coin] = await db
      .insert(coins)
      .values({
        id: crypto.randomUUID(),
        address,
        name,
        symbol,
        creatorAddress,
        txHash,
        metadataUri,
        thumbnailUrl,
      })
      .returning();

    return Response.json({ success: true, coin });
  } catch (error) {
    console.error("Failed to register coin:", error);
    return Response.json(
      { success: false, error: "Failed to register coin" },
      { status: 500 }
    );
  }
}
