/**
 * Neural Module - Brain and Neural Network System for GenesisX
 */

// Brain interface and registry
export {
  BrainRegistry,
  DEFAULT_BRAIN_OUTPUT,
  DEFAULT_SENSORY_INPUT,
} from './Brain';

export type {
  Brain,
  BrainConfig,
  BrainFactory,
  BrainOutput,
  BrainState,
  SensoryInput,
} from './Brain';

// Neural Network
export {
  NeuralNetwork,
  DEFAULT_NETWORK_CONFIG,
} from './NeuralNetwork';

export type {
  NetworkWeights,
  NeuralNetworkConfig,
} from './NeuralNetwork';

// Neural Brain (neural network-based)
export {
  NeuralBrain,
  NEURAL_BRAIN_TYPE,
  NEURAL_BRAIN_VERSION,
} from './NeuralBrain';

// Rule Brain (simple rule-based)
export {
  RuleBrain,
  RULE_BRAIN_TYPE,
} from './RuleBrain';

export type {
  RuleBrainConfig,
} from './RuleBrain';

// LLM Brain (LLM-powered)
export {
  LLMBrain,
  LLM_BRAIN_TYPE,
  createLLMBrainFactory,
} from './LLMBrain';

export type {
  LLMBrainConfig,
} from './LLMBrain';

// LLM Infrastructure
export {
  DEFAULT_LLM_OPTIONS,
} from './llm/LLMService';

export type {
  LLMService,
  LLMOptions,
} from './llm/LLMService';

export {
  MockLLMService,
} from './llm/MockLLMService';

export {
  AGENT_REASONING_PROMPT,
  formatPrompt,
  parseAction,
} from './llm/PromptTemplates';

export type {
  SensoryInputForPrompt,
} from './llm/PromptTemplates';
