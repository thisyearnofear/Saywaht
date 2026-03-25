import { useState } from "react";
import { toast } from "sonner";
import { storageManager } from "@/lib/storage-manager";
import { getFarcasterSdk } from "@/lib/farcaster-sdk";
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

            // 1. Capture Thumbnail and Export Video in parallel for speed
            const { exportVideo, captureFrameAsBlob } = await import("@/lib/canvas-export-utils");
            
            // Try to capture thumbnail first (fast)
            let thumbnailBlob: Blob | null = null;
            try {
              thumbnailBlob = await captureFrameAsBlob(0.9);
            } catch (err) {
              console.warn("Frame capture failed, using video-only share", err);
            }

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

            // 2. Upload Video and Thumbnail
            toast.loading("Uploading to decentralized storage...", { id: "farcaster-share" });
            const videoFile = new File([blob], "reaction.mp4", { type: "video/mp4" });
            
            const [videoResult, thumbResult] = await Promise.all([
               storageManager.uploadFile(videoFile, { preferredProvider: "grove" }),
               thumbnailBlob ? storageManager.uploadFile(new File([thumbnailBlob], "thumbnail.jpg", { type: "image/jpeg" }), { preferredProvider: "grove" }) : Promise.resolve(null)
            ]);

            toast.success("Ready to share!", { id: "farcaster-share" });

            const text = "Check out my reaction video! 🎥✨ created with @saywaht";
            const embeds = [videoResult.url];
            if (thumbResult) embeds.unshift(thumbResult.url); // Use thumbnail first for rich preview

            await hapticSelection();
            await hapticImpact('light');

            try {
                const sdk = await getFarcasterSdk();
                if (!sdk) {
                    throw new Error("Farcaster SDK not available");
                }
                
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
                await hapticNotify('success');
            } catch {
                // Fallback: open in browser
                if (typeof window !== 'undefined') {
                    window.open(
                        `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embeds[0])}`,
                        '_blank'
                    );
                }
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
