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
}

const ARCHIVE_STORAGE_KEY = "saywaht-filecoin-archives";
const MAX_ARCHIVES = 25;

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
