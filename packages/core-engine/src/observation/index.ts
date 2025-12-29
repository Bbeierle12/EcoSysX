/**
 * Observation module exports
 *
 * The observation layer provides read-only access to simulation state.
 * All visualization/rendering code should use this module.
 */

export {
  Observer,
  createObserver,
  DEFAULT_OBSERVER_CONFIG,
} from './Observer';

export type {
  AgentView,
  FoodView,
  WorldView,
  StatsView,
  SimulationView,
  ObserverCallbacks,
  ObserverConfig,
} from './Observer';
