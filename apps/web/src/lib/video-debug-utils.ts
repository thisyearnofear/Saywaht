/**
 * Debug utilities for video timeline and canvas rendering issues
 */

export interface VideoDebugInfo {
    clipId: string;
    clipName: string;
    startTime: number;
    endTime: number;
    currentTime: number;
    videoTime: number;
    isActive: boolean;
    videoElement?: HTMLVideoElement;
    readyState?: number;
    currentVideoTime?: number;
}

/**
 * Get debug information for all video clips in timeline
 */
export function getVideoDebugInfo(
    tracks: any[],
    mediaItems: any[],
    currentTime: number
): VideoDebugInfo[] {
    const debugInfo: VideoDebugInfo[] = [];

    tracks.forEach((track) => {
        track.clips.forEach((clip: any) => {
            const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);

            if (mediaItem?.type === "video") {
                const clipStart = clip.startTime;
                const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
                const isActive = currentTime >= clipStart && currentTime < clipEnd;
                const videoTime = currentTime - clipStart + clip.trimStart;

                // Try to find the video element
                const videoElements = document.querySelectorAll('video');
                let videoElement: HTMLVideoElement | undefined;

                for (const video of videoElements) {
                    if (video.src === mediaItem.url) {
                        videoElement = video;
                        break;
                    }
                }

                debugInfo.push({
                    clipId: clip.id,
                    clipName: clip.name,
                    startTime: clipStart,
                    endTime: clipEnd,
                    currentTime,
                    videoTime,
                    isActive,
                    videoElement,
                    readyState: videoElement?.readyState,
                    currentVideoTime: videoElement?.currentTime,
                });
            }
        });
    });

    return debugInfo;
}

/**
 * Log video debug information to console
 */
export function logVideoDebugInfo(debugInfo: VideoDebugInfo[]): void {
    console.group("🎬 Video Debug Info");

    debugInfo.forEach((info) => {
        const status = info.isActive ? "🟢 ACTIVE" : "⚪ INACTIVE";
        const readyStateText = info.readyState ? getReadyStateText(info.readyState) : "N/A";

        console.log(`${status} ${info.clipName}`, {
            clipTime: `${info.startTime.toFixed(2)}s - ${info.endTime.toFixed(2)}s`,
            currentTime: `${info.currentTime.toFixed(2)}s`,
            videoTime: `${info.videoTime.toFixed(2)}s`,
            actualVideoTime: info.currentVideoTime?.toFixed(2) + "s" || "N/A",
            readyState: `${info.readyState} (${readyStateText})`,
            timeDiff: info.videoElement ?
                Math.abs((info.videoElement.currentTime || 0) - info.videoTime).toFixed(3) + "s" :
                "N/A"
        });
    });

    console.groupEnd();
}

/**
 * Get human-readable ready state text
 */
function getReadyStateText(readyState: number): string {
    switch (readyState) {
        case 0: return "HAVE_NOTHING";
        case 1: return "HAVE_METADATA";
        case 2: return "HAVE_CURRENT_DATA";
        case 3: return "HAVE_FUTURE_DATA";
        case 4: return "HAVE_ENOUGH_DATA";
        default: return "UNKNOWN";
    }
}

/**
 * Check for common video rendering issues
 */
export function checkVideoRenderingIssues(debugInfo: VideoDebugInfo[]): string[] {
    const issues: string[] = [];

    debugInfo.forEach((info) => {
        if (info.isActive) {
            // Check if video element exists
            if (!info.videoElement) {
                issues.push(`❌ ${info.clipName}: No video element found`);
                return;
            }

            // Check ready state
            if ((info.readyState || 0) < 2) {
                issues.push(`⚠️ ${info.clipName}: Video not ready (readyState: ${info.readyState})`);
            }

            // Check time sync
            const timeDiff = Math.abs((info.videoElement.currentTime || 0) - info.videoTime);
            if (timeDiff > 0.2) {
                issues.push(`⏰ ${info.clipName}: Time sync issue (diff: ${timeDiff.toFixed(3)}s)`);
            }

            // Check if video is paused when it should be playing
            if (info.videoElement.paused) {
                issues.push(`⏸️ ${info.clipName}: Video is paused but should be playing`);
            }
        }
    });

    return issues;
}

/**
 * Global debug function to call from browser console
 */
declare global {
    interface Window {
        debugVideoTimeline: () => void;
    }
}

if (typeof window !== "undefined") {
    window.debugVideoTimeline = () => {
        // This will be populated by the preview panel when debug mode is enabled
        console.log("Video timeline debug function - call from preview panel context");
    };
}