/**
 * lenia/index.ts - Flow-Lenia cellular substrate module
 *
 * Implements continuous cellular automaton with flow dynamics
 * for environmental substrate simulation.
 */

export * from './types';
export * from './LeniaKernel';
export * from './LeniaSubstrate';

export { default as LeniaKernel, GrowthFunction } from './LeniaKernel';
export { default as LeniaSubstrate } from './LeniaSubstrate';
