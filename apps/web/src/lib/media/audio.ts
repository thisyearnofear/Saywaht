import type { TimelineTrack } from "@/stores/timeline-store";
import type { MediaItem } from "@/stores/media-store";

interface DecodedAudio {
  samples: Float32Array;
  sampleRate: number;
}

export async function extractAudioFromTimeline(
  tracks: TimelineTrack[],
  mediaItems: MediaItem[]
): Promise<Blob[]> {
  const blobs: Blob[] = [];

  for (const track of tracks) {
    if (track.muted) continue;

    for (const clip of track.clips) {
      if (clip.audioMuted) continue;

      const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
      if (!mediaItem) continue;
      if (mediaItem.type !== "video" && mediaItem.type !== "audio") continue;

      const response = await fetch(mediaItem.url);
      const blob = await response.blob();
      blobs.push(blob);
    }
  }

  return blobs;
}

export async function decodeAudioToFloat32(
  blob: Blob
): Promise<DecodedAudio> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const { sampleRate, numberOfChannels, length } = audioBuffer;

    const mono = new Float32Array(length);
    if (numberOfChannels === 1) {
      audioBuffer.copyFromChannel(mono, 0);
    } else {
      for (let ch = 0; ch < numberOfChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          mono[i] += channelData[i];
        }
      }
      for (let i = 0; i < length; i++) {
        mono[i] /= numberOfChannels;
      }
    }

    return { samples: mono, sampleRate };
  } finally {
    await audioContext.close();
  }
}
