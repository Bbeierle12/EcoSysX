/**
 * Genesis Engine SDK Types
 * 
 * Core types for the pluggable simulation engine system
 */

// ================================
// ENGINE CONFIGURATION
// ================================

export interface EngineConfigV1 {
  /** Configuration schema version */
  schema: "GENX_CFG_V1";
  
  /** Simulation parameters */
  simulation: {
    /** Initial population size */
    populationSize: number;
    /** World bounds (square grid) */
    worldSize: number;
    /** Maximum simulation steps */
    maxSteps?: number;
    /** Enable disease dynamics */
    enableDisease: boolean;
    /** Enable agent reproduction */
    enableReproduction: boolean;
    /** Enable environmental effects */
    enableEnvironment: boolean;
  };
  
  /** Agent configuration */
  agents: {
    /** Initial energy distribution */
    initialEnergy: { min: number; max: number };
    /** Energy consumption per step */
    energyConsumption: { min: number; max: number };
    /** Reproduction energy threshold */
    reproductionThreshold: number;
    /** Death energy threshold */
    deathThreshold: number;
    /** Movement speed range */
    movementSpeed: { min: number; max: number };
  };
  
  /** Disease parameters (SIR model) */
  disease: {
    /** Initial infection rate (0-1) */
    initialInfectionRate: number;
    /** Transmission probability per contact */
    transmissionRate: number;
    /** Recovery time in simulation steps */
    recoveryTime: number;
    /** Contact radius for disease spread */
    contactRadius: number;
  };
  
  /** Environment configuration */
  environment: {
    /** Resource regeneration rate */
    resourceRegenRate: number;
    /** Resource density (resources per unit area) */
    resourceDensity: number;
    /** Seasonal effects enabled */
    enableSeasons: boolean;
    /** Weather effects enabled */
    enableWeather: boolean;
  };
  
  /** Random number generation */
  rng: {
    /** Master seed for reproducibility */
    masterSeed: string;
    /** Per-subsystem stream configuration */
    streams: {
      movement: boolean;
      disease: boolean;
      births: boolean;
      mutation: boolean;
      llm: boolean;
    };
  };
}

// ================================
// SNAPSHOT AND STATE
// ================================

export interface AgentState {
  /** Agent unique identifier */
  id: string;
  /** Position in world coordinates */
  position: { x: number; y: number };
  /** Velocity vector */
  velocity: { dx: number; dy: number };
  /** Current energy level */
  energy: number;
  /** Disease state (S=0, I=1, R=2) */
  sirState: 0 | 1 | 2;
  /** Days in current disease state */
  daysInState: number;
  /** Age in simulation ticks */
  ageTicks: number;
}

export interface EnvironmentState {
  /** Resource grid (row-major) */
  resourceGrid: Float32Array;
  /** Current simulation tick */
  tick: number;
  /** Weather state */
  weather?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
  };
}

export interface SimulationMetrics {
  /** Total population */
  pop: number;
  /** Mean energy across all agents */
  energyMean: number;
  /** SIR disease statistics */
  sir: {
    /** Susceptible count */
    S: number;
    /** Infected count */
    I: number;
    /** Recovered count */
    R: number;
  };
  /** Age distribution */
  ageDist?: {
    /** Bins for age histogram */
    bins: number[];
    /** Counts per bin */
    counts: number[];
  };
  /** Spatial density metrics */
  spatial?: {
    /** Population density (agents per unit area) */
    density: number;
    /** Clustering coefficient */
    clustering: number;
  };
}

export interface ProviderInfo {
  /** Provider name (mesa, agentsjl, mason, internal) */
  name: string;
  /** Provider version */
  version: string;
  /** License identifier */
  license: string;
  /** Build hash for reproducibility */
  buildHash?: string;
}

export interface Snapshot {
  /** Snapshot schema version */
  schema: "GENX_SNAP_V1";
  /** Time model identifier */
  timeModel: "TIME_V1";
  /** Current simulation tick */
  tick: number;
  /** Provider build hash */
  buildHash: string;
  /** RNG state digest (BLAKE3 hex) */
  rngDigest: string;
  /** Simulation state digest (BLAKE3 hex) */
  simDigest: string;
  /** Aggregated metrics */
  metrics: SimulationMetrics;
  /** Provider information */
  provider: ProviderInfo;
  /** Full state (optional, for detailed snapshots) */
  state?: {
    agents: AgentState[];
    environment: EnvironmentState;
  };
}

// ================================
// PROVIDER INTERFACE
// ================================

export interface EngineProvider {
  /** Initialize the simulation */
  init(cfg: EngineConfigV1, masterSeed: bigint): Promise<void>;
  
  /** Step the simulation N times */
  step(n: number): Promise<number>;
  
  /** Take a snapshot of current state */
  snapshot(kind?: "full" | "metrics"): Promise<Snapshot>;
  
  /** Stop the simulation and cleanup */
  stop(): Promise<void>;
  
  /** Get provider information */
  info?(): Promise<ProviderInfo>;
}

// ================================
// RPC PROTOCOL
// ================================

export interface RPCRequest {
  /** Operation type */
  op: "init" | "step" | "snapshot" | "stop" | "info";
  /** Configuration (for init) */
  cfg?: EngineConfigV1;
  /** Seed (for init) */
  seed?: string;
  /** Step count (for step) */
  n?: number;
  /** Snapshot kind (for snapshot) */
  kind?: "full" | "metrics";
}

export interface RPCResponse {
  /** Success indicator */
  ok?: boolean;
  /** Current tick (for step) */
  tick?: number;
  /** Snapshot data (for snapshot) */
  snapshot?: Snapshot;
  /** Provider info (for info) */
  provider?: ProviderInfo;
  /** Error message (if ok=false) */
  error?: string;
}

// ================================
// ENGINE INTERFACE
// ================================

export interface EngineOptions {
  /** Provider to use */
  provider?: "internal" | "mesa" | "agentsjl" | "mason";
  /** Provider-specific options */
  providerOptions?: Record<string, any>;
  /** Docker image tags for sidecars */
  sidecarImages?: {
    mesa?: string;
    agentsjl?: string;
    mason?: string;
  };
}

export interface Engine {
  /** Start simulation with configuration */
  start(cfg: EngineConfigV1, options?: EngineOptions): Promise<void>;
  
  /** Step simulation */
  step(n?: number): Promise<number>;
  
  /** Get simulation snapshot */
  snapshot(kind?: "full" | "metrics"): Promise<Snapshot>;
  
  /** Stop simulation */
  stop(): Promise<void>;
  
  /** Get current tick */
  getCurrentTick(): number;
  
  /** Check if simulation is running */
  isRunning(): boolean;
}

// All types are exported inline above