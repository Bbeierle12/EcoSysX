/**
 * Sensory module exports
 */

export {
  SensorType,
  EntityType,
  createVisionSensor,
  createSmellSensor,
  createProximitySensor,
  createEnergySensor,
} from './SensorTypes';

export type {
  BaseSensor,
  VisionSensor,
  SmellSensor,
  ProximitySensor,
  EnergySensor,
  Sensor,
} from './SensorTypes';

export {
  Direction,
  DIRECTION_ANGLES,
  DIRECTION_CONE_WIDTHS,
  rotationToVector,
  getWorldDirection,
  angleBetween,
  distance,
  normalize,
  directionTo,
  isInDirectionCone,
  getAllDirections,
  getFrontDirections,
} from './Direction';

export type {
  Vector2D,
} from './Direction';

export {
  SensorySystem,
  DEFAULT_SENSOR_CONFIG,
  createSensorySystem,
} from './SensorySystem';

export type {
  SensorConfig,
  AgentLike,
  FoodLike,
  WorldLike,
  DetailedSensoryInput,
} from './SensorySystem';

// Re-export SensoryInput from neural module for convenience
export type { SensoryInput } from '../neural/Brain';

// Trophic-aware sensory system
export {
  TrophicSensorySystem,
  DEFAULT_TROPHIC_SENSOR_CONFIG,
  createTrophicSensorySystem,
} from './TrophicSensorySystem';

export type {
  TrophicAgent,
  TrophicWorldLike,
  TrophicSensorConfig,
} from './TrophicSensorySystem';
