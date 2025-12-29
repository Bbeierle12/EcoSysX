/**
 * LLMService.ts - Abstract interface for LLM providers
 */

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  timeout?: number;
}

export interface LLMService {
  complete(prompt: string, options?: LLMOptions): Promise<string>;
  isAvailable(): boolean;
  getModelId?(): string;
}

export const DEFAULT_LLM_OPTIONS: LLMOptions = {
  maxTokens: 50,
  temperature: 0.3,
  stopSequences: ['\n', '.'],
  timeout: 5000,
};
