/**
 * Events module - Unified event bus system for GenesisX
 */

export * from './EventTypes';
export { EventBus, getDefaultEventBus, setDefaultEventBus } from './EventBus';
export type { EventBusConfig, EventBusStats, EventObserver } from './EventBus';
