import { pipeline } from "@huggingface/transformers";
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

// Inline constants to avoid path alias issues in Web Workers
const TRANSCRIPTION_MODELS = [
  { id: "whisper-tiny", huggingFaceId: "onnx-community/whisper-tiny" },
  { id: "whisper-small", huggingFaceId: "onnx-community/whisper-small" },
] as const;

const DEFAULT_CHUNK_LENGTH_SECONDS = 30;
const DEFAULT_STRIDE_SECONDS = 5;

type TranscriptionModelId = (typeof TRANSCRIPTION_MODELS)[number]["id"];

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let cancelled = false;

interface InitMessage {
  type: "init";
  modelId: TranscriptionModelId;
}

interface TranscribeMessage {
  type: "transcribe";
  audioData: Float32Array;
  language: string;
}

interface CancelMessage {
  type: "cancel";
}

type WorkerMessage = InitMessage | TranscribeMessage | CancelMessage;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  if (type === "init") {
    await handleInit(event.data);
  } else if (type === "transcribe") {
    await handleTranscribe(event.data);
  } else if (type === "cancel") {
    cancelled = true;
    self.postMessage({ type: "cancelled" });
  }
};

async function handleInit({ modelId }: InitMessage) {
  try {
    const model = TRANSCRIPTION_MODELS.find((m) => m.id === modelId);
    if (!model) {
      self.postMessage({
        type: "init-error",
        error: `Unknown model: ${modelId}`,
      });
      return;
    }

    // eslint-disable-next-line no-restricted-syntax
    transcriber = (await (pipeline as any)(
      "automatic-speech-recognition",
      model.huggingFaceId,
      {
        dtype: "q4",
        device: "wasm",
        progress_callback: (progress: { status: string; progress?: number }) => {
          self.postMessage({ type: "init-progress", progress });
        },
      }
    )) as AutomaticSpeechRecognitionPipeline;

    self.postMessage({ type: "init-complete" });
  } catch (error) {
    self.postMessage({
      type: "init-error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleTranscribe({ audioData, language }: TranscribeMessage) {
  if (!transcriber) {
    self.postMessage({
      type: "transcribe-error",
      error: "Model not initialized",
    });
    return;
  }

  cancelled = false;

  try {
    const result = await transcriber(audioData, {
      language: language === "auto" ? undefined : language,
      chunk_length_s: DEFAULT_CHUNK_LENGTH_SECONDS,
      stride_length_s: DEFAULT_STRIDE_SECONDS,
      return_timestamps: true,
    });

    if (cancelled) {
      self.postMessage({ type: "cancelled" });
      return;
    }

    const output = Array.isArray(result) ? result[0] : result;
    const segments = (
      (output.chunks as Array<{
        text: string;
        timestamp: [number, number];
      }>) ?? []
    ).map((chunk) => ({
      text: chunk.text.trim(),
      start: chunk.timestamp[0],
      end: chunk.timestamp[1],
    }));

    self.postMessage({
      type: "transcribe-complete",
      text: output.text,
      segments,
    });
  } catch (error) {
    if (cancelled) {
      self.postMessage({ type: "cancelled" });
      return;
    }
    self.postMessage({
      type: "transcribe-error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
