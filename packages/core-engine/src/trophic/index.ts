/**
 * trophic/index.ts - Trophic system module exports
 *
 * Provides emergent predator-prey dynamics with role detection
 * based on observed behavior rather than pre-assignment.
 */

export * from './types';
export * from './TrophicRoleTracker';
export * from './HuntingSystem';

export { default as TrophicRoleTracker } from './TrophicRoleTracker';
export { default as HuntingSystem } from './HuntingSystem';
