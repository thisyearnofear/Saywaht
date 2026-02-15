import type { TranscriptionSegment } from "@/services/transcription/service";
import {
  DEFAULT_WORDS_PER_CAPTION,
  MIN_CAPTION_DURATION_SECONDS,
} from "@/constants/transcription-constants";

export interface CaptionChunk {
  text: string;
  startTime: number;
  duration: number;
}

export function buildCaptionChunks(
  segments: TranscriptionSegment[],
  wordsPerChunk: number = DEFAULT_WORDS_PER_CAPTION,
  minDuration: number = MIN_CAPTION_DURATION_SECONDS
): CaptionChunk[] {
  const chunks: CaptionChunk[] = [];

  for (const segment of segments) {
    const words = segment.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    const segmentDuration = segment.end - segment.start;
    const wordsPerSecond = words.length / segmentDuration;
    const groupCount = Math.ceil(words.length / wordsPerChunk);

    for (let i = 0; i < groupCount; i++) {
      const groupWords = words.slice(
        i * wordsPerChunk,
        (i + 1) * wordsPerChunk
      );
      const wordOffset = i * wordsPerChunk;
      const rawStart = segment.start + wordOffset / wordsPerSecond;
      const rawDuration = groupWords.length / wordsPerSecond;

      const duration = Math.max(rawDuration, minDuration);

      const prevEnd =
        chunks.length > 0
          ? chunks[chunks.length - 1].startTime +
            chunks[chunks.length - 1].duration
          : 0;
      const startTime = Math.max(rawStart, prevEnd);

      chunks.push({ text: groupWords.join(" "), startTime, duration });
    }
  }

  return chunks;
}
