import { decodeAudioToFloat32, extractAudioFromTimeline } from "@/lib/media/audio";
import { buildCaptionChunks, type CaptionChunk } from "@/lib/transcription/caption";
import type { MediaItem } from "@/stores/media-store";
import type { TimelineTrack } from "@/stores/timeline-store";
import { transcriptionService } from "@/services/transcription/service";
import type { TranscriptionLanguage } from "@/constants/transcription-constants";
import type { TextElement } from "@/lib/types";

export type CaptionPosition = "top" | "bottom";

export const CAPTION_POSITION_Y: Record<CaptionPosition, number> = {
  top: 0.12,
  bottom: 0.85,
};

const DEFAULT_STYLE: Pick<
  TextElement,
  "fontSize" | "fontWeight" | "color" | "textAlign" | "x" | "opacity" | "fontFamily"
> = {
  fontSize: 28,
  fontWeight: "bold",
  color: "#FFFFFF",
  textAlign: "center",
  x: 0.5,
  opacity: 1,
  fontFamily: "Inter",
};

const chunkCache = new Map<string, CaptionChunk[]>();
let activeToken = 0;

interface SharedOptions {
  language?: TranscriptionLanguage;
  onProgress?: (progress: { status: string; progress?: number }) => void;
  cancelPrevious?: boolean;
  snapStepSeconds?: number;
}

export interface CaptionGenerationResult {
  groupId: string;
  ids: string[];
  count: number;
  audioHash: string;
  fromCache: boolean;
}

interface MaterializeOptions {
  chunks: CaptionChunk[];
  addTextElement: (element: Omit<TextElement, "id">) => string;
  position?: CaptionPosition;
  styleOverrides?: Partial<TextElement>;
  groupId?: string;
  source: "timeline" | "voiceover";
  audioHash: string;
}

function hashSamples(samples: Float32Array): string {
  let h1 = 2166136261;
  const stride = Math.max(1, Math.floor(samples.length / 12000));

  for (let i = 0; i < samples.length; i += stride) {
    const v = Math.round((samples[i] || 0) * 32767);
    h1 ^= (v & 0xff);
    h1 = Math.imul(h1, 16777619);
    h1 ^= ((v >>> 8) & 0xff);
    h1 = Math.imul(h1, 16777619);
  }

  return `${samples.length.toString(16)}-${(h1 >>> 0).toString(16)}`;
}

function snapToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

function normalizeChunks(chunks: CaptionChunk[], step: number): CaptionChunk[] {
  if (step <= 0) return chunks;

  const normalized: CaptionChunk[] = [];
  let prevEnd = 0;

  for (const chunk of chunks) {
    const start = Math.max(prevEnd, snapToStep(chunk.startTime, step));
    const end = Math.max(start + step, snapToStep(chunk.startTime + chunk.duration, step));
    const normalizedChunk = {
      ...chunk,
      startTime: start,
      duration: end - start,
    };
    normalized.push(normalizedChunk);
    prevEnd = end;
  }

  return normalized;
}

async function transcribeBlobToChunks(
  blob: Blob,
  {
    language = "en",
    onProgress,
    cancelPrevious = true,
    snapStepSeconds = 1 / 30,
  }: SharedOptions = {}
): Promise<{ chunks: CaptionChunk[]; audioHash: string; fromCache: boolean }> {
  const { samples } = await decodeAudioToFloat32(blob);
  const audioHash = hashSamples(samples);
  const cacheKey = `${language}:${audioHash}`;

  if (chunkCache.has(cacheKey)) {
    return {
      chunks: normalizeChunks(chunkCache.get(cacheKey) || [], snapStepSeconds),
      audioHash,
      fromCache: true,
    };
  }

  if (cancelPrevious) {
    transcriptionService.cancel();
  }

  const token = ++activeToken;
  const result = await transcriptionService.transcribe({
    audioData: samples,
    language,
    onProgress,
  });

  if (token !== activeToken) {
    throw new Error("Transcription superseded by a newer request");
  }

  const chunks = buildCaptionChunks(result.segments);
  chunkCache.set(cacheKey, chunks);

  return {
    chunks: normalizeChunks(chunks, snapStepSeconds),
    audioHash,
    fromCache: false,
  };
}

function materializeCaptions({
  chunks,
  addTextElement,
  position = "bottom",
  styleOverrides,
  groupId,
  source,
  audioHash,
}: MaterializeOptions): CaptionGenerationResult {
  const resolvedGroupId = groupId || crypto.randomUUID();
  const y = CAPTION_POSITION_Y[position];
  const generatedAt = Date.now();

  const ids = chunks.map((chunk) =>
    addTextElement({
      ...DEFAULT_STYLE,
      ...styleOverrides,
      content: chunk.text,
      y,
      startTime: chunk.startTime,
      endTime: chunk.startTime + chunk.duration,
      isAutoCaption: true,
      captionGroupId: resolvedGroupId,
      captionSource: source,
      captionAudioHash: audioHash,
      captionGeneratedAt: generatedAt,
    })
  );

  return {
    groupId: resolvedGroupId,
    ids,
    count: ids.length,
    audioHash,
    fromCache: false,
  };
}

export async function generateCaptionsFromAudioBlob(
  blob: Blob,
  {
    addTextElement,
    position = "bottom",
    styleOverrides,
    source = "voiceover",
    groupId,
    ...options
  }: SharedOptions & {
    addTextElement: (element: Omit<TextElement, "id">) => string;
    position?: CaptionPosition;
    styleOverrides?: Partial<TextElement>;
    source?: "timeline" | "voiceover";
    groupId?: string;
  }
): Promise<CaptionGenerationResult> {
  const { chunks, audioHash, fromCache } = await transcribeBlobToChunks(blob, options);
  if (chunks.length === 0) {
    throw new Error("No speech detected");
  }

  const result = materializeCaptions({
    chunks,
    addTextElement,
    position,
    styleOverrides,
    source,
    groupId,
    audioHash,
  });

  return { ...result, fromCache };
}

export async function generateCaptionsFromTimeline(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[],
  options: SharedOptions & {
    addTextElement: (element: Omit<TextElement, "id">) => string;
    position?: CaptionPosition;
    styleOverrides?: Partial<TextElement>;
    groupId?: string;
  }
): Promise<CaptionGenerationResult> {
  const blobs = await extractAudioFromTimeline(tracks, mediaItems);
  if (blobs.length === 0) {
    throw new Error("No audio or video clips found on the timeline");
  }

  return generateCaptionsFromAudioBlob(blobs[0], {
    ...options,
    source: "timeline",
  });
}

export function updateCaptionGroupStyle(
  ids: string[],
  updates: Partial<TextElement>,
  updateTextElement: (id: string, updates: Partial<TextElement>) => void
): void {
  for (const id of ids) {
    updateTextElement(id, updates);
  }
}

export function clearCaptionChunkCache(): void {
  chunkCache.clear();
}
