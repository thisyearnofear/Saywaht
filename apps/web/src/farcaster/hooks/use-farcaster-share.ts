import { useState } from "react";
import { toast } from "sonner";
import { storageManager } from "@/lib/storage-manager";
import { sdk } from "@farcaster/miniapp-sdk";
import { hapticSelection, hapticImpact, hapticNotify } from "@/farcaster/utils/frame-utils";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useCanvasStore } from "@/stores/canvas-store";

/**
 * Hook to handle the Farcaster Share flow
 * 
 * CORE PRINCIPLES:
 * - MODULAR: Encapsulates complex share logic (Export -> Upload -> Deep Link)
 * - CLEAN: Separates business logic from UI components
 * - DRY: Reuses existing storage and export utilities
 */
export function useFarcasterShare() {
    const [isSharing, setIsSharing] = useState(false);
    const { tracks, getTotalDuration } = useTimelineStore();
    const { mediaItems } = useMediaStore();
    const { getFormat } = useCanvasStore();

    const shareToFarcaster = async () => {
        if (isSharing) return;
        setIsSharing(true);

        try {
            toast.loading("Preparing your reaction...", { id: "farcaster-share" });

            // 1. Export Video
            // Dynamic import for PERFORMANCE (Adaptive loading)
            const { exportVideo } = await import("@/lib/canvas-export-utils");

            // Ensure minimum duration for visibility
            const totalDuration = Math.max(getTotalDuration(), 5);

            const blob = await exportVideo(
                tracks,
                mediaItems,
                totalDuration,
                (progress) => {
                    toast.loading(`Rendering video... ${Math.round(progress)}%`, {
                        id: "farcaster-share",
                    });
                },
                {
                    format: getFormat(),
                    quality: "medium", // Balance quality/size for mobile upload
                    includeAudio: true,
                    method: "auto",
                    outputFormat: "mp4",
                }
            );

            // 2. Upload Video
            toast.loading("Uploading to decentralized storage...", { id: "farcaster-share" });
            const file = new File([blob], "reaction.mp4", { type: "video/mp4" });

            const uploadResult = await storageManager.uploadFile(file, {
                preferredProvider: "grove", // Use Grove for speed/reliability
                onProgress: (progress) => {
                    toast.loading(`Uploading... ${Math.round(progress)}%`, {
                        id: "farcaster-share",
                    });
                }
            });

            toast.success("Ready to share!", { id: "farcaster-share" });

            const text = "Check out my reaction video! 🎥✨ created with @saywaht";
            const embeds = [uploadResult.url];

            hapticSelection();
            hapticImpact('light');

            try {
                const composer = (sdk.actions as any).composeCast;
                if (typeof composer === "function") {
                    const result = await composer({ text, embeds, channelKey: undefined });
                    if (result?.cast?.hash) {
                        await (sdk.actions as any).viewCast({ hash: result.cast.hash });
                    }
                } else {
                    await sdk.actions.openUrl(
                        `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embeds[0])}`
                    );
                }
                hapticNotify('success');
            } catch {
                await sdk.actions.openUrl(
                    `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embeds[0])}`
                );
            }

        } catch (error) {
            console.error("Share failed:", error);
            toast.error("Failed to share video. Please try again.", { id: "farcaster-share" });
        } finally {
            setIsSharing(false);
        }
    };

    return {
        shareToFarcaster,
        isSharing
    };
}
