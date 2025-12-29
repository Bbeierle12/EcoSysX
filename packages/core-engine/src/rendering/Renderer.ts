/**
 * Renderer.ts - Abstract rendering interface
 *
 * Defines the contract for rendering the simulation.
 * Implementations can target Canvas2D, WebGL, terminal, etc.
 */

import { SimulationEngine } from '../simulation/SimulationEngine';

export interface RenderConfig {
  backgroundColor: string;
  agentColor: string;
  agentDeadColor: string;
  foodColor: string;
  foodDepletedColor: string;
  showAgentDirection: boolean;
  showAgentEnergy: boolean;
  showFoodEnergy: boolean;
  showGrid: boolean;
  gridColor: string;
  gridSpacing: number;
  agentSize: number;
  foodSize: number;
  scale: number;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  backgroundColor: '#1a1a2e',
  agentColor: '#4ade80',
  agentDeadColor: '#6b7280',
  foodColor: '#fbbf24',
  foodDepletedColor: '#78350f',
  showAgentDirection: true,
  showAgentEnergy: true,
  showFoodEnergy: false,
  showGrid: false,
  gridColor: '#333344',
  gridSpacing: 50,
  agentSize: 8,
  foodSize: 6,
  scale: 1.0,
};

export interface RenderStats {
  fps: number;
  frameTime: number;
  entitiesRendered: number;
}

/**
 * Abstract renderer interface
 */
export interface IRenderer {
  readonly width: number;
  readonly height: number;
  readonly config: RenderConfig;

  initialize(): void;
  render(simulation: SimulationEngine): void;
  resize(width: number, height: number): void;
  setConfig(config: Partial<RenderConfig>): void;
  getStats(): RenderStats;
  destroy(): void;
}

/**
 * Entity rendering data (for custom renderers)
 */
export interface AgentRenderData {
  id: string;
  x: number;
  y: number;
  rotation: number;
  energy: number;
  maxEnergy: number;
  isAlive: boolean;
  speciesId: string;
  generation: number;
}

export interface FoodRenderData {
  id: string;
  x: number;
  y: number;
  energy: number;
  maxEnergy: number;
  isConsumed: boolean;
}

/**
 * Extract render data from simulation
 */
export function extractRenderData(simulation: SimulationEngine): {
  agents: AgentRenderData[];
  food: FoodRenderData[];
  worldWidth: number;
  worldHeight: number;
  tick: number;
} {
  const agentManager = simulation.getAgentManager();
  const foodManager = simulation.getFoodManager();
  const config = simulation.getConfig();

  const agents: AgentRenderData[] = agentManager.getAllAgents().map(agent => ({
    id: agent.id,
    x: agent.position.x,
    y: agent.position.y,
    rotation: agent.rotation,
    energy: agent.energy,
    maxEnergy: agent.getConfig().maxEnergy,
    isAlive: agent.alive(),
    speciesId: agent.speciesId,
    generation: agent.generation,
  }));

  const food: FoodRenderData[] = foodManager.getAllFood().map(f => ({
    id: f.id,
    x: f.x,
    y: f.y,
    energy: f.energy,
    maxEnergy: f.getConfig().energyValue,
    isConsumed: f.isConsumed,
  }));

  return {
    agents,
    food,
    worldWidth: config.world.dimensions.width,
    worldHeight: config.world.dimensions.height,
    tick: simulation.getCurrentTick(),
  };
}

/**
 * Color utilities for rendering
 */
export function energyToColor(
  energy: number,
  maxEnergy: number,
  baseColor: string,
  depletedColor: string
): string {
  const ratio = Math.max(0, Math.min(1, energy / maxEnergy));
  return interpolateColor(depletedColor, baseColor, ratio);
}

export function interpolateColor(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return color2;

  const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio);

  return rgbToHex(r, g, b);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Generation-based color palette
 */
export function generationToColor(generation: number): string {
  const hue = (generation * 37) % 360; // Golden angle for good distribution
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Species-based color palette (deterministic)
 */
export function speciesIdToColor(speciesId: string): string {
  let hash = 0;
  for (let i = 0; i < speciesId.length; i++) {
    hash = speciesId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}
