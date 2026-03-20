import { MediaItem } from "@/stores/media-store";
import { TimelineTrack } from "@/stores/timeline-store";

type ExportSurface = "download" | "mint";

const BACKEND_SUPPORTED_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "avi",
  "webm",
  "mp3",
  "wav",
  "aac",
  "jpg",
  "jpeg",
  "png",
  "gif",
]);

const MIME_EXTENSION_MAP: Record<string, string> = {
  "audio/aac": "aac",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "mp4",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-msvideo": "avi",
};

function normalizeExtension(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/^\./, "").trim().toLowerCase();
  return normalized || null;
}

function extractExtension(value?: string | null): string | null {
  if (!value) return null;
  const withoutQuery = value.split("?")[0]?.split("#")[0] ?? value;
  const fileName = withoutQuery.split("/").pop() ?? withoutQuery;
  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1) : "";
  return normalizeExtension(extension);
}

function stripExtension(value?: string | null): string {
  if (!value) return "";
  const fileName = value.split("/").pop() ?? value;
  return fileName.replace(/\.[^.]+$/, "");
}

function sanitizeFileStem(value: string, fallback: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);

  return normalized || fallback;
}

function getDefaultExtensionForType(type: MediaItem["type"]): string {
  switch (type) {
    case "audio":
      return "webm";
    case "image":
      return "png";
    case "video":
    default:
      return "mp4";
  }
}

function getExtensionFromMimeType(mimeType?: string | null): string | null {
  if (!mimeType) return null;
  return MIME_EXTENSION_MAP[mimeType.split(";")[0].trim().toLowerCase()] ?? null;
}

export interface BackendUploadPlan {
  compatible: boolean;
  fileName: string;
  reason?: string;
}

export function resolveBackendUploadPlan(
  item: MediaItem,
  blobType?: string | null
): BackendUploadPlan {
  const idSuffix = item.id.slice(0, 8);
  const fallbackStem = `media-${idSuffix}`;
  const stem = sanitizeFileStem(
    stripExtension(item.file?.name) || stripExtension(item.name) || stripExtension(item.url),
    fallbackStem
  );

  const extensionCandidates = [
    extractExtension(item.file?.name),
    extractExtension(item.name),
    extractExtension(item.url),
    getExtensionFromMimeType(blobType),
    getExtensionFromMimeType(item.file?.type),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const supportedExtension = extensionCandidates.find((candidate) =>
    BACKEND_SUPPORTED_EXTENSIONS.has(candidate)
  );

  if (supportedExtension) {
    return {
      compatible: true,
      fileName: `${stem}-${idSuffix}.${supportedExtension}`,
    };
  }

  const derivedExtension = getExtensionFromMimeType(blobType) || getExtensionFromMimeType(item.file?.type);
  if (derivedExtension) {
    return {
      compatible: false,
      fileName: `${stem}-${idSuffix}.${derivedExtension}`,
      reason: `${item.name} uses unsupported format .${derivedExtension} for backend export`,
    };
  }

  if (item.url.startsWith("blob:")) {
    const fallbackExtension = getDefaultExtensionForType(item.type);
    return {
      compatible: true,
      fileName: `${stem}-${idSuffix}.${fallbackExtension}`,
    };
  }

  return {
    compatible: false,
    fileName: `${stem}-${idSuffix}.${getDefaultExtensionForType(item.type)}`,
    reason: `Could not determine a backend-safe file type for ${item.name}`,
  };
}

export function assessBackendExportCompatibility(mediaItems: MediaItem[]): {
  compatible: boolean;
  reason?: string;
} {
  for (const item of mediaItems) {
    const isLocalUpload = item.file instanceof File || item.url.startsWith("blob:");
    if (!isLocalUpload) continue;

    const plan = resolveBackendUploadPlan(item);
    if (!plan.compatible) {
      return {
        compatible: false,
        reason: plan.reason,
      };
    }
  }

  return { compatible: true };
}

export function getExportRuntimeConfig({
  tracks,
  mediaItems,
  totalDuration,
  surface = "download",
}: {
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  totalDuration: number;
  surface?: ExportSurface;
}) {
  const clipCount = tracks.reduce((sum, track) => sum + track.clips.length, 0);
  const localMediaCount = mediaItems.filter(
    (item) => item.file instanceof File || item.url.startsWith("blob:")
  ).length;
  const remoteMediaCount = mediaItems.filter(
    (item) => item.url.startsWith("http") || item.url.startsWith("/")
  ).length;
  const backendCompatibility = assessBackendExportCompatibility(mediaItems);

  const timeoutBase =
    180_000 +
    totalDuration * 6_000 +
    clipCount * 12_000 +
    localMediaCount * 15_000 +
    remoteMediaCount * 10_000 +
    (surface === "mint" ? 60_000 : 0);

  return {
    clipCount,
    localMediaCount,
    remoteMediaCount,
    backendCompatible: backendCompatibility.compatible,
    backendCompatibilityReason: backendCompatibility.reason,
    backendTimeoutMs: Math.min(Math.max(timeoutBase, surface === "mint" ? 300_000 : 240_000), 900_000),
  };
}
