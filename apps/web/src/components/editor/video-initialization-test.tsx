"use client";

import { useEffect, useState } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";

/**
 * Simple test component to verify video initialization
 * Add this temporarily to debug video issues
 */
export function VideoInitializationTest() {
    const { tracks } = useTimelineStore();
    const { mediaItems } = useMediaStore();
    const { currentTime } = usePlaybackStore();
    const [testResults, setTestResults] = useState<string[]>([]);

    useEffect(() => {
        const results: string[] = [];

        // Check if we have any video clips
        const videoClips = tracks.flatMap(track =>
            track.clips.filter(clip => {
                const mediaItem = mediaItems.find(item => item.id === clip.mediaId);
                return mediaItem?.type === "video";
            }).map(clip => ({
                clip,
                track,
                mediaItem: mediaItems.find(item => item.id === clip.mediaId)
            }))
        );

        results.push(`Found ${videoClips.length} video clips in timeline`);

        // Check active clips at current time
        const activeClips = videoClips.filter(({ clip }) => {
            const clipStart = clip.startTime;
            const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);
            return currentTime >= clipStart && currentTime < clipEnd;
        });

        results.push(`${activeClips.length} video clips active at time ${currentTime.toFixed(2)}s`);

        // Check video elements in DOM
        const videoElements = document.querySelectorAll('video');
        results.push(`Found ${videoElements.length} video elements in DOM`);

        // Check video element states
        videoElements.forEach((video, index) => {
            const readyStateText = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][video.readyState] || 'UNKNOWN';
            results.push(`Video ${index + 1}: ${readyStateText} (${video.readyState}), src: ${video.src ? 'set' : 'missing'}`);
        });

        setTestResults(results);
    }, [tracks, mediaItems, currentTime]);

    // Only show in development
    if (process.env.NODE_ENV !== "development") {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white text-xs p-3 rounded max-w-sm z-50">
            <div className="font-bold mb-2">🎬 Video Debug</div>
            {testResults.map((result, index) => (
                <div key={index} className="mb-1">{result}</div>
            ))}
            <div className="mt-2 text-gray-400">
                Time: {currentTime.toFixed(2)}s
            </div>
        </div>
    );
}