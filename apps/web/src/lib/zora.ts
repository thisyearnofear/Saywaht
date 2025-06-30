import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// This is a placeholder function. In a real application, you would use the
// Zora API to fetch coins created by your platform.
export async function getLatestCommentaries() {
  // For now, we'll return a mock array of commentaries.
  return [
    {
      id: "1",
      name: "Funny Cat Video",
      symbol: "CAT",
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      creatorAddress: "0x123...",
    },
    {
      id: "2",
      name: "Bird with a Voice",
      symbol: "BIRD",
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      creatorAddress: "0x456...",
    },
    {
      id: "3",
      name: "Dog's Inner Monologue",
      symbol: "DOG",
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      creatorAddress: "0x789...",
    },
  ];
}