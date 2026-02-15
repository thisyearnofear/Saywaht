import type {
  TranscriptionLanguage,
  TranscriptionModelId,
} from "@/constants/transcription-constants";
import { DEFAULT_MODEL } from "@/constants/transcription-constants";

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: TranscriptionLanguage;
}

interface TranscribeOptions {
  audioData: Float32Array;
  language?: TranscriptionLanguage;
  modelId?: TranscriptionModelId;
  onProgress?: (progress: { status: string; progress?: number }) => void;
}

class TranscriptionService {
  private worker: Worker | null = null;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL("./worker.ts", import.meta.url),
        { type: "module" }
      );
    }
    return this.worker;
  }

  async transcribe({
    audioData,
    language = "en",
    modelId = DEFAULT_MODEL,
    onProgress,
  }: TranscribeOptions): Promise<TranscriptionResult> {
    const worker = this.getWorker();

    await this.initModel(worker, modelId, onProgress);

    return new Promise<TranscriptionResult>((resolve, reject) => {
      worker.onmessage = (event) => {
        const { type } = event.data;

        if (type === "transcribe-complete") {
          resolve({
            text: event.data.text,
            segments: event.data.segments,
            language,
          });
        } else if (type === "transcribe-error") {
          reject(new Error(event.data.error));
        } else if (type === "cancelled") {
          reject(new Error("Transcription cancelled"));
        }
      };

      worker.postMessage({ type: "transcribe", audioData, language });
    });
  }

  private initModel(
    worker: Worker,
    modelId: TranscriptionModelId,
    onProgress?: (progress: { status: string; progress?: number }) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      worker.onmessage = (event) => {
        const { type } = event.data;

        if (type === "init-progress" && onProgress) {
          onProgress(event.data.progress);
        } else if (type === "init-complete") {
          resolve();
        } else if (type === "init-error") {
          reject(new Error(event.data.error));
        }
      };

      worker.postMessage({ type: "init", modelId });
    });
  }

  cancel(): void {
    this.worker?.postMessage({ type: "cancel" });
  }

  cleanup(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const transcriptionService = new TranscriptionService();
