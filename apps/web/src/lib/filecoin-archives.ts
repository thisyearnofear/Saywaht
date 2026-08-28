"use client";

export interface FilecoinArchiveRecord {
  projectId: string;
  projectName: string;
  createdAt: string;
  videoUrl: string;
  videoCid?: string;
  transcriptUrl?: string;
  transcriptCid?: string;
  manifestUrl: string;
  manifestCid?: string;
  /**
   * Content signature — a stable hash of the timeline state at export time.
   * Used by the mint Preview step to decide whether to reuse this archive
   * (signature matches) or re-export (signature differs). Replaces the old
   * 30-minute clock that could reuse stale content or needlessly re-export.
   */
  contentSignature?: string;
}

const ARCHIVE_STORAGE_KEY = "saywaht-filecoin-archives";
const MAX_ARCHIVES = 25;

/**
 * Compute a stable content signature from the editor state.
 *
 * Captures the inputs that affect the rendered video: track clips (source +
 * timing), media item URLs, and the export format. A change to any of these
 * means the cached export is stale and must be re-rendered; no change means
 * the cached export is still valid regardless of how much time has passed.
 *
 * Uses a simple djb2 hash — not cryptographic, just collision-resistant
 * enough for cache-keying of editor state.
 */
export function computeContentSignature(
  tracks: unknown[],
  mediaItems: unknown[],
  format?: string,
): string {
  const payload = JSON.stringify({
    tracks: tracks.map((t: any) => ({
      id: t?.id,
      clips: (t?.clips || []).map((c: any) => ({
        id: c?.id,
        mediaId: c?.mediaId,
        start: c?.start,
        end: c?.end,
        sourceStart: c?.sourceStart,
      })),
    })),
    media: (mediaItems || []).map((m: any) => ({
      id: m?.id,
      url: m?.url,
      type: m?.type,
    })),
    format: format || "landscape",
  });

  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash * 33) ^ payload.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function loadFilecoinArchives(): FilecoinArchiveRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFilecoinArchive(record: FilecoinArchiveRecord): void {
  if (typeof window === "undefined") return;

  const archives = loadFilecoinArchives();
  const deduped = archives.filter(
    (item) =>
      !(
        item.projectId === record.projectId &&
        item.manifestUrl === record.manifestUrl
      )
  );
  const next = deduped.concat(record).slice(-MAX_ARCHIVES);
  window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(next));
}

export function clearFilecoinArchives(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ARCHIVE_STORAGE_KEY);
}
