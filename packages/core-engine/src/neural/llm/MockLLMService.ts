/**
 * MockLLMService.ts - Testing mock for LLM service
 */

import { LLMService, LLMOptions } from './LLMService';

export class MockLLMService implements LLMService {
  private available: boolean = true;
  private responseDelay: number = 0;
  private customResponses: Map<string, string> = new Map();

  constructor(options?: { delay?: number; available?: boolean }) {
    this.responseDelay = options?.delay ?? 0;
    this.available = options?.available ?? true;
  }

  async complete(prompt: string, _options?: LLMOptions): Promise<string> {
    if (!this.available) {
      throw new Error('MockLLMService is not available');
    }

    if (this.responseDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.responseDelay));
    }

    for (const [pattern, response] of this.customResponses) {
      if (prompt.includes(pattern)) {
        return response;
      }
    }

    return this.generateDeterministicResponse(prompt);
  }

  isAvailable(): boolean {
    return this.available;
  }

  getModelId(): string {
    return 'mock-llm-v1';
  }

  setCustomResponse(pattern: string, response: string): void {
    this.customResponses.set(pattern, response);
  }

  clearCustomResponses(): void {
    this.customResponses.clear();
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  private generateDeterministicResponse(prompt: string): string {
    const promptLower = prompt.toLowerCase();

    if (
      promptLower.includes('energy: 1') ||
      promptLower.includes('energy: 2') ||
      promptLower.includes('energy: 0')
    ) {
      if (promptLower.includes('food ahead: yes')) {
        return 'EAT';
      }
      return 'MOVE_FORWARD';
    }

    if (
      promptLower.includes('energy: 8') ||
      promptLower.includes('energy: 9') ||
      promptLower.includes('energy: 100')
    ) {
      if (promptLower.includes('can reproduce: yes')) {
        return 'REPRODUCE';
      }
    }

    if (
      promptLower.includes('food ahead: yes') ||
      promptLower.includes('food visible ahead: yes')
    ) {
      return 'EAT';
    }

    if (promptLower.includes('food to left: yes')) {
      return 'TURN_LEFT';
    }

    if (promptLower.includes('food to right: yes')) {
      return 'TURN_RIGHT';
    }

    return 'MOVE_FORWARD';
  }
}
