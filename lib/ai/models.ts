export type GeminiModelEntry = {
  id: string;
  label: string;
};

/** Single Gemini model for DevFactory OS. */
export const GEMINI_MODELS: GeminiModelEntry[] = [
  { id: "gemini-flash-latest", label: "Gemini Flash (latest)" },
];

export const DEFAULT_MODEL_ID = "gemini-flash-latest";

export const ALLOWED_MODEL_IDS = new Set(GEMINI_MODELS.map((m) => m.id));
