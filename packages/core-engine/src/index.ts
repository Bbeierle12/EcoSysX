/**
 * GenesisX Core Engine
 *
 * Unified ecosystem simulation engine combining:
 * - EcoSysX's provider-based backend system
 * - Tale-Weaver's data-driven species and elegant architecture
 * - digital-organisms' neural network evolution
 *
 * @module @genesisx/core-engine
 */

// Engine configuration and types
export * from './engine/EngineConfig';

// World and grid system
export { World, StandardLayers } from './world/World';
export type { Position, Region, WorldStats } from './world/World';
export { Grid, GridManager } from './world/Grid';
export type { TypedArray, GridDataType } from './world/Grid';

// Species system
export * from './species/SpeciesDefinition';

// Neural/Brain system
export * from './neural';

// Event system
export * from './events';

// Genetics system
export * from './genetics';

// Lineage system
export * from './lineage';

// Advanced speciation system (gen3sis + REvoSim)
export * from './speciation';

// Spatial indexing
export * from './spatial';

// Agent system
export * from './agents';

// Sensory system
export * from './sensory';

// Trophic system (emergent predator-prey dynamics)
export * from './trophic';

// Simulation system
export * from './simulation';

// Presets
export * from './presets';

// Rendering
export * from './rendering';

// Observation
export * from './observation';

// Utilities
export * from './utils';

// Version
export const VERSION = '0.1.0';
