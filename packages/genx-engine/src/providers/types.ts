/**
 * Provider Type Definitions
 * 
 * Common interfaces for all simulation providers
 */

import type { EngineProvider, EngineConfigV1, Snapshot, ProviderInfo } from '../types.js';

export interface ProviderConstructor {
  new (options?: ProviderOptions): EngineProvider;
}

export interface ProviderOptions {
  /** Provider-specific configuration */
  [key: string]: any;
}

// Re-export core types for convenience
export type {
  EngineProvider,
  EngineConfigV1,
  Snapshot,
  ProviderInfo
};