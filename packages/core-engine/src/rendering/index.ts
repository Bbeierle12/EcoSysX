/**
 * Rendering module exports
 */

// Renderer interface and utilities
export {
  DEFAULT_RENDER_CONFIG,
  extractRenderData,
  energyToColor,
  interpolateColor,
  hexToRgb,
  rgbToHex,
  generationToColor,
  speciesIdToColor,
} from './Renderer';

export type {
  RenderConfig,
  RenderStats,
  IRenderer,
  AgentRenderData,
  FoodRenderData,
} from './Renderer';

// Console renderer
export {
  ConsoleRenderer,
  DEFAULT_CONSOLE_CONFIG,
} from './ConsoleRenderer';

export type {
  ConsoleRendererConfig,
} from './ConsoleRenderer';
