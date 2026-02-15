export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
] as const;

export type TranscriptionLanguage =
  (typeof SUPPORTED_LANGUAGES)[number]["code"];

export type TranscriptionModelId = "whisper-tiny" | "whisper-small";

export interface TranscriptionModel {
  id: TranscriptionModelId;
  huggingFaceId: string;
  label: string;
  description: string;
}

export const TRANSCRIPTION_MODELS: TranscriptionModel[] = [
  {
    id: "whisper-tiny",
    huggingFaceId: "onnx-community/whisper-tiny",
    label: "Whisper Tiny",
    description: "Fastest, lower accuracy",
  },
  {
    id: "whisper-small",
    huggingFaceId: "onnx-community/whisper-small",
    label: "Whisper Small",
    description: "Good balance of speed and accuracy",
  },
];

export const DEFAULT_MODEL: TranscriptionModelId = "whisper-small";
export const DEFAULT_CHUNK_LENGTH_SECONDS = 30;
export const DEFAULT_STRIDE_SECONDS = 5;
export const DEFAULT_WORDS_PER_CAPTION = 3;
export const MIN_CAPTION_DURATION_SECONDS = 0.8;
