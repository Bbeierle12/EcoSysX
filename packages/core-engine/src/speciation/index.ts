/**
 * speciation/index.ts - Advanced speciation module exports
 *
 * Provides gen3sis-inspired divergence tracking and REvoSim-style
 * reproductive isolation for realistic species emergence.
 */

export * from './types';
export * from './DivergenceMatrix';
export * from './ReproductiveIsolation';
export * from './SpeciationEngine';

export { default as DivergenceMatrix } from './DivergenceMatrix';
export { default as ReproductiveIsolation } from './ReproductiveIsolation';
export { default as SpeciationEngine } from './SpeciationEngine';
