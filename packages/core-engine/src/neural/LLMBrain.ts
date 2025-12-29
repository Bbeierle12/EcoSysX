/**
 * LLMBrain.ts - LLM-powered Brain implementation
 *
 * Uses a large language model for agent decision-making.
 * Supports caching and async-to-sync bridging for the Brain interface.
 */

import { Brain, SensoryInput, BrainOutput, BrainState } from './Brain';
import { LLMService } from './llm/LLMService';
import { formatPrompt, parseAction, AGENT_REASONING_PROMPT, SensoryInputForPrompt } from './llm/PromptTemplates';

export interface LLMBrainConfig {
  promptTemplate?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number; // Time in ms before cache entries expire
  maxCacheSize?: number;
  fallbackToRule?: boolean;
}

interface CacheEntry {
  output: BrainOutput;
  timestamp: number;
}

export class LLMBrain implements Brain {
  readonly type = 'llm';
  readonly label?: string;

  private llmService: LLMService;
  private config: Required<LLMBrainConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequest: Promise<BrainOutput> | null = null;
  private lastOutput: BrainOutput = { moveForward: 0.5, rotate: 0, action: 0 };

  private stats = {
    totalDecisions: 0,
    cacheHits: 0,
    cacheMisses: 0,
    llmCalls: 0,
    fallbackUsed: 0,
  };

  constructor(llmService: LLMService, config?: LLMBrainConfig, label?: string) {
    this.llmService = llmService;
    this.label = label;
    this.config = {
      promptTemplate: config?.promptTemplate ?? AGENT_REASONING_PROMPT,
      cacheEnabled: config?.cacheEnabled ?? true,
      cacheTTL: config?.cacheTTL ?? 5000,
      maxCacheSize: config?.maxCacheSize ?? 100,
      fallbackToRule: config?.fallbackToRule ?? true,
    };
  }

  think(input: SensoryInput): BrainOutput {
    this.stats.totalDecisions++;

    // Check cache first
    const cacheKey = this.getCacheKey(input);
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        this.stats.cacheHits++;
        return cached.output;
      }
      this.stats.cacheMisses++;
    }

    // Start async LLM call if not already pending
    if (!this.pendingRequest) {
      this.pendingRequest = this.asyncThink(input, cacheKey);
      this.pendingRequest.finally(() => {
        this.pendingRequest = null;
      });
    }

    // Return last known output or fallback
    if (this.config.fallbackToRule) {
      this.stats.fallbackUsed++;
      return this.ruleFallback(input);
    }

    return this.lastOutput;
  }

  private async asyncThink(input: SensoryInput, cacheKey: string): Promise<BrainOutput> {
    try {
      // Convert SensoryInput to prompt format
      const promptInput: SensoryInputForPrompt = {
        energy: input.energy,
        frontFood: input.front,
        frontLeftFood: input.frontLeft,
        frontRightFood: input.frontRight,
      };

      const prompt = formatPrompt(this.config.promptTemplate, promptInput);

      this.stats.llmCalls++;
      const response = await this.llmService.complete(prompt);
      const action = parseAction(response);

      const output = this.actionToOutput(action);
      this.lastOutput = output;

      // Cache the result
      if (this.config.cacheEnabled) {
        this.cacheResult(cacheKey, output);
      }

      return output;
    } catch (error) {
      // On error, use rule-based fallback
      return this.ruleFallback(input);
    }
  }

  private actionToOutput(action: string): BrainOutput {
    switch (action) {
      case 'MOVE_FORWARD':
        return { moveForward: 1, rotate: 0, action: 0 };
      case 'TURN_LEFT':
        return { moveForward: 0, rotate: 0.5, action: 0 };
      case 'TURN_RIGHT':
        return { moveForward: 0, rotate: -0.5, action: 0 };
      case 'EAT':
        return { moveForward: 0.2, rotate: 0, action: 1 };
      case 'REPRODUCE':
        return { moveForward: 0, rotate: 0, action: 2 };
      case 'IDLE':
      default:
        return { moveForward: 0, rotate: 0, action: 0 };
    }
  }

  private ruleFallback(input: SensoryInput): BrainOutput {
    // Simple rule-based fallback when LLM is not available
    const { front, frontLeft, frontRight, energy } = input;

    // Low energy - seek food aggressively
    if (energy < 0.2) {
      if (front > 0.1) {
        return { moveForward: 1, rotate: 0, action: 1 };
      }
      if (frontLeft > frontRight) {
        return { moveForward: 0.3, rotate: 0.5, action: 0 };
      }
      if (frontRight > frontLeft) {
        return { moveForward: 0.3, rotate: -0.5, action: 0 };
      }
      return { moveForward: 0.8, rotate: 0, action: 0 };
    }

    // Normal behavior
    if (front > 0.3) {
      return { moveForward: front, rotate: 0, action: front > 0.5 ? 1 : 0 };
    }
    if (frontLeft > 0.1) {
      return { moveForward: 0.4, rotate: frontLeft * 0.5, action: 0 };
    }
    if (frontRight > 0.1) {
      return { moveForward: 0.4, rotate: -frontRight * 0.5, action: 0 };
    }

    // Explore
    const randomTurn = Math.random() < 0.1 ? (Math.random() - 0.5) * 0.4 : 0;
    return { moveForward: 0.5, rotate: randomTurn, action: 0 };
  }

  private getCacheKey(input: SensoryInput): string {
    // Quantize inputs for better cache hits
    const quantize = (n: number) => Math.round(n * 10) / 10;
    return `${quantize(input.front)},${quantize(input.frontLeft)},${quantize(input.frontRight)},${quantize(input.energy)}`;
  }

  private cacheResult(key: string, output: BrainOutput): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.config.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      output,
      timestamp: Date.now(),
    });
  }

  mutate(_mutationRate: number = 0.1, _mutationStrength: number = 0.2): Brain {
    // LLM brains don't mutate in the traditional sense
    // We can adjust the prompt template slightly or other parameters
    const newConfig: LLMBrainConfig = {
      ...this.config,
      // Could add prompt variation here in the future
    };

    return new LLMBrain(this.llmService, newConfig, this.label);
  }

  clone(): Brain {
    const cloned = new LLMBrain(this.llmService, { ...this.config }, this.label);
    return cloned;
  }

  crossover(other: Brain): Brain {
    // LLM brains crossover by potentially mixing configurations
    if (other instanceof LLMBrain) {
      const newConfig: LLMBrainConfig = {
        promptTemplate: Math.random() < 0.5 ? this.config.promptTemplate : other.config.promptTemplate,
        cacheEnabled: Math.random() < 0.5 ? this.config.cacheEnabled : other.config.cacheEnabled,
        cacheTTL: Math.random() < 0.5 ? this.config.cacheTTL : other.config.cacheTTL,
        fallbackToRule: Math.random() < 0.5 ? this.config.fallbackToRule : other.config.fallbackToRule,
      };
      return new LLMBrain(this.llmService, newConfig, this.label);
    }
    return this.clone();
  }

  serialize(): BrainState {
    return {
      type: 'llm',
      version: 1,
      config: {
        label: this.label,
      },
      data: {
        llmConfig: {
          promptTemplate: this.config.promptTemplate,
          cacheEnabled: this.config.cacheEnabled,
          cacheTTL: this.config.cacheTTL,
          maxCacheSize: this.config.maxCacheSize,
          fallbackToRule: this.config.fallbackToRule,
        },
        stats: this.stats,
      },
    };
  }

  getComplexity(): number {
    // LLM brains have high complexity due to the language model
    return 1000;
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  getConfig(): Required<LLMBrainConfig> {
    return { ...this.config };
  }

  clearCache(): void {
    this.cache.clear();
  }

  isLLMAvailable(): boolean {
    return this.llmService.isAvailable();
  }
}

// Factory function for creating LLMBrain (requires LLMService instance)
export function createLLMBrainFactory(llmService: LLMService) {
  return (state: BrainState): Brain => {
    const data = state.data as { llmConfig?: LLMBrainConfig };
    return new LLMBrain(llmService, data?.llmConfig, state.config?.label);
  };
}

export const LLM_BRAIN_TYPE = 'llm';
