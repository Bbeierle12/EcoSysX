/**
 * Food.ts - Food/Resource system for the simulation
 *
 * Manages food entities that agents can consume for energy.
 */

export interface FoodConfig {
  energyValue: number;
  respawnDelay: number; // Ticks before respawning, 0 = no respawn
  decayRate: number; // Energy lost per tick, 0 = no decay
  maxEnergy?: number;
}

export const DEFAULT_FOOD_CONFIG: FoodConfig = {
  energyValue: 20,
  respawnDelay: 100,
  decayRate: 0,
  maxEnergy: 50,
};

export interface FoodState {
  id: string;
  x: number;
  y: number;
  energy: number;
  isConsumed: boolean;
  consumedAt?: number;
  spawnedAt: number;
}

export class Food {
  readonly id: string;
  x: number;
  y: number;
  energy: number;
  isConsumed: boolean;
  consumedAt?: number;
  readonly spawnedAt: number;

  private config: FoodConfig;

  constructor(
    id: string,
    x: number,
    y: number,
    config?: Partial<FoodConfig>,
    spawnedAt: number = 0
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.config = { ...DEFAULT_FOOD_CONFIG, ...config };
    this.energy = this.config.energyValue;
    this.isConsumed = false;
    this.spawnedAt = spawnedAt;
  }

  get position(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  update(currentTick: number): void {
    if (this.isConsumed) return;

    // Apply decay
    if (this.config.decayRate > 0) {
      this.energy -= this.config.decayRate;
      if (this.energy <= 0) {
        this.energy = 0;
        this.isConsumed = true;
        this.consumedAt = currentTick;
      }
    }
  }

  consume(currentTick: number): number {
    if (this.isConsumed) return 0;

    const energyGained = this.energy;
    this.energy = 0;
    this.isConsumed = true;
    this.consumedAt = currentTick;
    return energyGained;
  }

  canRespawn(currentTick: number): boolean {
    if (!this.isConsumed) return false;
    if (this.config.respawnDelay <= 0) return false;
    if (this.consumedAt === undefined) return false;

    return currentTick - this.consumedAt >= this.config.respawnDelay;
  }

  respawn(x?: number, y?: number): void {
    this.x = x ?? this.x;
    this.y = y ?? this.y;
    this.energy = this.config.energyValue;
    this.isConsumed = false;
    this.consumedAt = undefined;
  }

  getConfig(): FoodConfig {
    return { ...this.config };
  }

  toJSON(): FoodState {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      energy: this.energy,
      isConsumed: this.isConsumed,
      consumedAt: this.consumedAt,
      spawnedAt: this.spawnedAt,
    };
  }

  static fromJSON(state: FoodState, config?: Partial<FoodConfig>): Food {
    const food = new Food(state.id, state.x, state.y, config, state.spawnedAt);
    food.energy = state.energy;
    food.isConsumed = state.isConsumed;
    food.consumedAt = state.consumedAt;
    return food;
  }
}

export interface FoodManagerConfig {
  initialCount: number;
  maxCount: number;
  spawnRate: number; // Food per tick
  clusteringFactor: number; // 0 = uniform, 1 = highly clustered
  foodConfig: FoodConfig;
}

export const DEFAULT_FOOD_MANAGER_CONFIG: FoodManagerConfig = {
  initialCount: 50,
  maxCount: 200,
  spawnRate: 0.1,
  clusteringFactor: 0.3,
  foodConfig: DEFAULT_FOOD_CONFIG,
};

export class FoodManager {
  private foods: Map<string, Food> = new Map();
  private config: FoodManagerConfig;
  private worldWidth: number;
  private worldHeight: number;
  private idCounter: number = 0;
  private spawnAccumulator: number = 0;

  private stats = {
    totalSpawned: 0,
    totalConsumed: 0,
    totalDecayed: 0,
    totalRespawned: 0,
  };

  constructor(
    worldWidth: number,
    worldHeight: number,
    config?: Partial<FoodManagerConfig>
  ) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.config = { ...DEFAULT_FOOD_MANAGER_CONFIG, ...config };
  }

  initialize(): void {
    this.foods.clear();
    this.idCounter = 0;
    this.spawnAccumulator = 0;

    // Spawn initial food
    for (let i = 0; i < this.config.initialCount; i++) {
      this.spawnFood(0);
    }
  }

  update(currentTick: number): void {

    // Update all food
    for (const food of this.foods.values()) {
      if (!food.isConsumed) {
        food.update(currentTick);
        if (food.isConsumed) {
          this.stats.totalDecayed++;
        }
      }
    }

    // Handle respawning
    for (const food of this.foods.values()) {
      if (food.canRespawn(currentTick)) {
        const pos = this.getSpawnPosition();
        food.respawn(pos.x, pos.y);
        this.stats.totalRespawned++;
      }
    }

    // Spawn new food based on spawn rate
    this.spawnAccumulator += this.config.spawnRate;
    while (this.spawnAccumulator >= 1 && this.getActiveCount() < this.config.maxCount) {
      this.spawnFood(currentTick);
      this.spawnAccumulator -= 1;
    }
  }

  spawnFood(currentTick: number, x?: number, y?: number): Food | null {
    if (this.foods.size >= this.config.maxCount) return null;

    const pos = x !== undefined && y !== undefined
      ? { x, y }
      : this.getSpawnPosition();

    const id = `food_${this.idCounter++}`;
    const food = new Food(id, pos.x, pos.y, this.config.foodConfig, currentTick);
    this.foods.set(id, food);
    this.stats.totalSpawned++;
    return food;
  }

  private getSpawnPosition(): { x: number; y: number } {
    if (this.config.clusteringFactor <= 0 || this.foods.size === 0) {
      // Uniform distribution
      return {
        x: Math.random() * this.worldWidth,
        y: Math.random() * this.worldHeight,
      };
    }

    // Cluster around existing food
    if (Math.random() < this.config.clusteringFactor) {
      const activeFoods = this.getActiveFood();
      if (activeFoods.length > 0) {
        const center = activeFoods[Math.floor(Math.random() * activeFoods.length)];
        const radius = 20 + Math.random() * 30;
        const angle = Math.random() * Math.PI * 2;
        return {
          x: ((center.x + Math.cos(angle) * radius) % this.worldWidth + this.worldWidth) % this.worldWidth,
          y: ((center.y + Math.sin(angle) * radius) % this.worldHeight + this.worldHeight) % this.worldHeight,
        };
      }
    }

    return {
      x: Math.random() * this.worldWidth,
      y: Math.random() * this.worldHeight,
    };
  }

  consumeFood(foodId: string, currentTick: number): number {
    const food = this.foods.get(foodId);
    if (!food) return 0;

    const energy = food.consume(currentTick);
    if (energy > 0) {
      this.stats.totalConsumed++;
    }
    return energy;
  }

  getFood(id: string): Food | undefined {
    return this.foods.get(id);
  }

  getAllFood(): Food[] {
    return Array.from(this.foods.values());
  }

  getActiveFood(): Food[] {
    return Array.from(this.foods.values()).filter(f => !f.isConsumed);
  }

  getActiveCount(): number {
    let count = 0;
    for (const food of this.foods.values()) {
      if (!food.isConsumed) count++;
    }
    return count;
  }

  getFoodNear(x: number, y: number, radius: number): Food[] {
    const result: Food[] = [];
    const radiusSq = radius * radius;

    for (const food of this.foods.values()) {
      if (food.isConsumed) continue;

      const dx = food.x - x;
      const dy = food.y - y;
      if (dx * dx + dy * dy <= radiusSq) {
        result.push(food);
      }
    }

    return result;
  }

  getClosestFood(x: number, y: number, maxRadius?: number): Food | null {
    let closest: Food | null = null;
    let closestDistSq = maxRadius ? maxRadius * maxRadius : Infinity;

    for (const food of this.foods.values()) {
      if (food.isConsumed) continue;

      const dx = food.x - x;
      const dy = food.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < closestDistSq) {
        closest = food;
        closestDistSq = distSq;
      }
    }

    return closest;
  }

  removeFood(id: string): boolean {
    return this.foods.delete(id);
  }

  clear(): void {
    this.foods.clear();
  }

  getStats() {
    return {
      ...this.stats,
      currentCount: this.foods.size,
      activeCount: this.getActiveCount(),
    };
  }

  getConfig(): FoodManagerConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<FoodManagerConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Reset manager for loading (doesn't trigger any callbacks)
   */
  clearForRestore(): void {
    this.foods.clear();
    this.idCounter = 0;
    this.spawnAccumulator = 0;
    this.stats = {
      totalSpawned: 0,
      totalConsumed: 0,
      totalDecayed: 0,
      totalRespawned: 0,
    };
  }

  /**
   * Restore a food item directly (for loading saves)
   */
  restoreFood(state: FoodState): Food {
    const food = Food.fromJSON(state, this.config.foodConfig);
    this.foods.set(food.id, food);

    // Update id counter to avoid collisions
    const numPart = parseInt(state.id.replace('food_', ''), 10);
    if (!isNaN(numPart) && numPart >= this.idCounter) {
      this.idCounter = numPart + 1;
    }

    return food;
  }

  /**
   * Restore statistics from a save file
   */
  restoreStats(stats: { totalSpawned?: number; totalConsumed?: number; totalDecayed?: number; totalRespawned?: number }): void {
    if (stats.totalSpawned !== undefined) this.stats.totalSpawned = stats.totalSpawned;
    if (stats.totalConsumed !== undefined) this.stats.totalConsumed = stats.totalConsumed;
    if (stats.totalDecayed !== undefined) this.stats.totalDecayed = stats.totalDecayed;
    if (stats.totalRespawned !== undefined) this.stats.totalRespawned = stats.totalRespawned;
  }
}
