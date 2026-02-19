"use client";

import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to intelligently pre-load video assets into the browser cache
 * Targets the first few visible items to make the UI feel instantaneous
 */
export function useVideoPreloader(urls: string[]) {
    const preloadedUrls = useRef<Set<string>>(new Set());

    const preloadMedia = useCallback(async (url: string) => {
        if (!url || preloadedUrls.current.has(url) || typeof window === 'undefined') return;

        try {
            // Use Cache API if available for persistent storage
            if ('caches' in window) {
                const cache = await caches.open('video-previews');
                const match = await cache.match(url);
                if (match) {
                    preloadedUrls.current.add(url);
                    return;
                }

                // Fetch just the beginning of the file (first 512KB is enough for a quick start)
                const response = await fetch(url, {
                    headers: { 'Range': 'bytes=0-524288' },
                    priority: 'low'
                });

                if (response.ok) {
                    await cache.put(url, response.clone());
                    preloadedUrls.current.add(url);
                }
            } else {
                // Fallback to standard browser cache
                await fetch(url, { mode: 'no-cors', priority: 'low' } as any);
                preloadedUrls.current.add(url);
            }
        } catch (e) {
            // Silently fail as preloading is non-critical
        }
    }, []);

    useEffect(() => {
        // Only preload the first 5 items to avoid saturating mobile bandwidth
        const topUrls = urls.slice(0, 5);

        // Stagger the preloading to not interfere with initial page render
        const timer = setTimeout(() => {
            topUrls.forEach(url => {
                // Only preload if it's likely a video/heavy asset
                if (url && (url.includes('ipfs') || url.includes('pexels') || url.includes('.mp4'))) {
                    preloadMedia(url);
                }
            });
        }, 1500); // Wait 1.5s after mount before background preloading

        return () => clearTimeout(timer);
    }, [urls, preloadMedia]);

    return { preloadMedia };
}
