import { db, count, waitlist } from "@saywaht/db";

export async function getWaitlistCount() {
  try {
    const result = await db
      .select({ count: count() as any })
      .from(waitlist);
    return Number(result[0]?.count) || 0;
  } catch (error) {
    console.error("Failed to fetch waitlist count:", error);
    return 0;
  }
}
