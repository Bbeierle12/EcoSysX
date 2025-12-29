/**
 * SensorTypes.ts - Sensor type definitions
 */

export enum SensorType {
  VISION = 'vision',
  SMELL = 'smell',
  PROXIMITY = 'proximity',
  ENERGY = 'energy',
}

export enum EntityType {
  FOOD = 'food',
  AGENT = 'agent',
  OBSTACLE = 'obstacle',
}

export interface BaseSensor {
  type: SensorType;
  range: number;
  enabled: boolean;
}

export interface VisionSensor extends BaseSensor {
  type: SensorType.VISION;
  angle: number;
  detectsFood: boolean;
  detectsAgents: boolean;
  detectsObstacles: boolean;
}

export interface SmellSensor extends BaseSensor {
  type: SensorType.SMELL;
  sensitivity: number;
  detectsFood: boolean;
}

export interface ProximitySensor extends BaseSensor {
  type: SensorType.PROXIMITY;
  detectsAll: boolean;
  entityTypes: EntityType[];
}

export interface EnergySensor extends BaseSensor {
  type: SensorType.ENERGY;
  normalizeMin: number;
  normalizeMax: number;
}

export type Sensor = VisionSensor | SmellSensor | ProximitySensor | EnergySensor;

export const createVisionSensor = (overrides?: Partial<VisionSensor>): VisionSensor => ({
  type: SensorType.VISION,
  range: 100,
  angle: Math.PI / 4,
  enabled: true,
  detectsFood: true,
  detectsAgents: true,
  detectsObstacles: true,
  ...overrides,
});

export const createSmellSensor = (overrides?: Partial<SmellSensor>): SmellSensor => ({
  type: SensorType.SMELL,
  range: 50,
  sensitivity: 0.5,
  enabled: true,
  detectsFood: true,
  ...overrides,
});

export const createProximitySensor = (overrides?: Partial<ProximitySensor>): ProximitySensor => ({
  type: SensorType.PROXIMITY,
  range: 30,
  enabled: true,
  detectsAll: true,
  entityTypes: [EntityType.FOOD, EntityType.AGENT, EntityType.OBSTACLE],
  ...overrides,
});

export const createEnergySensor = (overrides?: Partial<EnergySensor>): EnergySensor => ({
  type: SensorType.ENERGY,
  range: 0,
  enabled: true,
  normalizeMin: 0,
  normalizeMax: 100,
  ...overrides,
});
