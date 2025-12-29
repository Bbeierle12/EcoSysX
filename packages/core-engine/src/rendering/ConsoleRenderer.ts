/**
 * ConsoleRenderer.ts - Text-based renderer for headless environments
 *
 * Outputs simulation state to console. Useful for:
 * - Server-side simulations
 * - Debugging
 * - CLI tools
 */

import { SimulationEngine } from '../simulation/SimulationEngine';
import { IRenderer, RenderConfig, DEFAULT_RENDER_CONFIG, RenderStats } from './Renderer';

export interface ConsoleRendererConfig {
  width: number;
  height: number;
  showStats: boolean;
  showPopulation: boolean;
  showFood: boolean;
  updateInterval: number; // ms between outputs
  clearScreen: boolean;
}

export const DEFAULT_CONSOLE_CONFIG: ConsoleRendererConfig = {
  width: 80,
  height: 24,
  showStats: true,
  showPopulation: true,
  showFood: true,
  updateInterval: 500,
  clearScreen: true,
};

export class ConsoleRenderer implements IRenderer {
  readonly width: number;
  readonly height: number;
  readonly config: RenderConfig;

  private consoleConfig: ConsoleRendererConfig;
  private lastRenderTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private lastFpsUpdate: number = 0;

  constructor(config?: Partial<ConsoleRendererConfig>) {
    this.consoleConfig = { ...DEFAULT_CONSOLE_CONFIG, ...config };
    this.width = this.consoleConfig.width;
    this.height = this.consoleConfig.height;
    this.config = DEFAULT_RENDER_CONFIG;
  }

  initialize(): void {
    this.lastRenderTime = Date.now();
    this.lastFpsUpdate = Date.now();
    this.frameCount = 0;
  }

  render(simulation: SimulationEngine): void {
    const now = Date.now();

    // Rate limit output
    if (now - this.lastRenderTime < this.consoleConfig.updateInterval) {
      return;
    }

    this.lastRenderTime = now;
    this.frameCount++;

    // Update FPS
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    const output: string[] = [];

    // Clear screen if enabled
    if (this.consoleConfig.clearScreen) {
      output.push('\x1B[2J\x1B[0f'); // ANSI clear screen
    }

    // Header
    output.push('═'.repeat(this.width));
    output.push(this.centerText('GenesisX Simulation', this.width));
    output.push('═'.repeat(this.width));

    // Stats
    if (this.consoleConfig.showStats) {
      const stats = simulation.getStatistics().getSummary();
      output.push('');
      output.push(`  Tick: ${stats.currentTick.toLocaleString()}`);
      output.push(`  Runtime: ${(stats.runTimeSeconds).toFixed(1)}s`);
      output.push(`  TPS: ${stats.averageTicksPerSecond.toFixed(1)}`);
      output.push(`  FPS (render): ${this.fps}`);
    }

    // Population
    if (this.consoleConfig.showPopulation) {
      const agentManager = simulation.getAgentManager();
      const agentStats = agentManager.getStats();
      output.push('');
      output.push('─'.repeat(this.width));
      output.push('  POPULATION');
      output.push('─'.repeat(this.width));
      output.push(`  Current: ${agentStats.alivePopulation}`);
      output.push(`  Total spawned: ${agentStats.totalSpawned}`);
      output.push(`  Total died: ${agentStats.totalDied}`);
      output.push(`  Reproduced: ${agentStats.totalReproduced}`);
      output.push(`  Max generation: ${agentStats.maxGenerationReached}`);

      // Population bar
      const maxPop = simulation.getAgentManager().getConfig().maxPopulation;
      const barWidth = this.width - 20;
      const filledWidth = Math.round((agentStats.alivePopulation / maxPop) * barWidth);
      const bar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);
      output.push(`  [${bar}] ${agentStats.alivePopulation}/${maxPop}`);
    }

    // Food
    if (this.consoleConfig.showFood) {
      const foodManager = simulation.getFoodManager();
      const foodStats = foodManager.getStats();
      output.push('');
      output.push('─'.repeat(this.width));
      output.push('  FOOD');
      output.push('─'.repeat(this.width));
      output.push(`  Active: ${foodStats.activeCount}`);
      output.push(`  Total spawned: ${foodStats.totalSpawned}`);
      output.push(`  Consumed: ${foodStats.totalConsumed}`);

      // Food bar
      const maxFood = simulation.getFoodManager().getConfig().maxCount;
      const barWidth = this.width - 20;
      const filledWidth = Math.round((foodStats.activeCount / maxFood) * barWidth);
      const bar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);
      output.push(`  [${bar}] ${foodStats.activeCount}/${maxFood}`);
    }

    // Footer
    output.push('');
    output.push('═'.repeat(this.width));
    output.push(this.centerText(`State: ${simulation.getState()}`, this.width));
    output.push('═'.repeat(this.width));

    // Output
    console.log(output.join('\n'));
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  resize(width: number, height: number): void {
    (this as { width: number }).width = width;
    (this as { height: number }).height = height;
    this.consoleConfig.width = width;
    this.consoleConfig.height = height;
  }

  setConfig(config: Partial<RenderConfig>): void {
    Object.assign(this.config, config);
  }

  setConsoleConfig(config: Partial<ConsoleRendererConfig>): void {
    Object.assign(this.consoleConfig, config);
  }

  getStats(): RenderStats {
    return {
      fps: this.fps,
      frameTime: this.consoleConfig.updateInterval,
      entitiesRendered: 0, // Console doesn't render individual entities
    };
  }

  destroy(): void {
    // Nothing to clean up
  }
}
