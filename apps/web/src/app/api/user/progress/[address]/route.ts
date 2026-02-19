import { NextRequest } from "next/server";
import { db, eq, userProgress } from "@saywaht/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const normalizedAddress = address.toLowerCase();

    const result = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.walletAddress, normalizedAddress))
      .limit(1);

    if (result.length === 0) {
      // Create default progress if not found
      const [newProgress] = await db
        .insert(userProgress)
        .values({
          id: crypto.randomUUID(),
          walletAddress: normalizedAddress,
          level: "1",
          currentXp: "0",
          nextLevelXp: "100",
          streakDays: "0",
          completedMissionIds: "",
          totalCommentaries: "0",
        })
        .returning();

      return Response.json({ progress: newProgress });
    }

    return Response.json({ progress: result[0] });
  } catch (error) {
    console.error("Failed to fetch user progress:", error);
    return Response.json({ error: "Failed to fetch user progress" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const normalizedAddress = address.toLowerCase();
    const body = await request.json();

    // Validate body (only allow specific fields to be updated)
    const {
      level,
      currentXp,
      nextLevelXp,
      streakDays,
      completedMissionIds,
      totalCommentaries,
      lastActivityDate
    } = body;

    const [updated] = await db
      .insert(userProgress)
      .values({
        id: crypto.randomUUID(),
        walletAddress: normalizedAddress,
        level: String(level),
        currentXp: String(currentXp),
        nextLevelXp: String(nextLevelXp),
        streakDays: String(streakDays),
        completedMissionIds: completedMissionIds?.join?.(",") || "",
        totalCommentaries: String(totalCommentaries),
        lastActivityDate: lastActivityDate ? new Date(lastActivityDate) : null,
      })
      .onConflictDoUpdate({
        target: userProgress.walletAddress,
        set: {
          level: String(level),
          currentXp: String(currentXp),
          nextLevelXp: String(nextLevelXp),
          streakDays: String(streakDays),
          completedMissionIds: completedMissionIds?.join?.(",") || "",
          totalCommentaries: String(totalCommentaries),
          lastActivityDate: lastActivityDate ? new Date(lastActivityDate) : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return Response.json({ success: true, progress: updated });
  } catch (error) {
    console.error("Failed to update user progress:", error);
    return Response.json({ error: "Failed to update user progress" }, { status: 500 });
  }
}
