/**
 * morphology/index.ts - Karl Sims-inspired hierarchical morphology module
 *
 * Provides genome-based body structure evolution with derived physical traits.
 */

export * from './types';
export * from './MorphologyGenome';
export * from './MorphologyDecoder';
export * from './MorphologicalAgent';

export { default as MorphologyGenome } from './MorphologyGenome';
export { default as MorphologyDecoder } from './MorphologyDecoder';
export { default as MorphologicalAgent } from './MorphologicalAgent';
