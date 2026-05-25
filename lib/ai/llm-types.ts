/** Token usage shared by Gemini (and usage feedback / KernelBar). */
export type LlmUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
};
