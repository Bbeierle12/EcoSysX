#!/usr/bin/env python3
"""
Mesa Engine Implementation

Implements the EcoSysX simulation using Mesa with TIME_V1 semantics,
deterministic serialization, and proper RNG seeding.
"""

import struct
import hashlib
import json
import random
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from mesa import Agent, Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
import logging

logger = logging.getLogger(__name__)

class EcosystemAgent(Agent):
    """Individual agent in the ecosystem simulation"""
    
    def __init__(self, unique_id: str, model: 'EcosystemModel'):
        super().__init__(unique_id, model)
        
        # Position and movement
        self.pos = (0.0, 0.0)  # Will be set by model
        self.velocity = (0.0, 0.0)
        
        # Core attributes
        self.energy = 100.0
        self.sir_state = 0  # 0=Susceptible, 1=Infected, 2=Recovered
        self.days_in_state = 0
        self.age_ticks = 0
        
        # Initialize from model configuration
        cfg = model.config
        self.energy = random.uniform(
            cfg['agents']['initialEnergy']['min'],
            cfg['agents']['initialEnergy']['max']
        )
        self.movement_speed = random.uniform(
            cfg['agents']['movementSpeed']['min'],
            cfg['agents']['movementSpeed']['max']
        )
        self.energy_consumption = random.uniform(
            cfg['agents']['energyConsumption']['min'],
            cfg['agents']['energyConsumption']['max']
        )
        
        # Disease state
        if model.disease_enabled and random.random() < cfg['disease']['initialInfectionRate']:
            self.sir_state = 1  # Start infected
            self.days_in_state = random.randint(0, cfg['disease']['recoveryTime'] // 2)
    
    def step(self) -> None:
        """Execute one simulation step (1 hour in TIME_V1)"""
        model = self.model
        
        # Age increment (1 tick = 1 hour)
        self.age_ticks += 1
        
        # Energy consumption
        self.energy -= self.energy_consumption
        
        # Movement
        self._move()
        
        # Disease dynamics
        if model.disease_enabled:
            self._update_disease()
        
        # Resource foraging
        self._forage()
        
        # Death check
        if self.energy <= model.config['agents']['deathThreshold']:
            model.schedule.remove(self)
            model.grid.remove_agent(self)
            return
        
        # Reproduction check
        if (self.energy > model.config['agents']['reproductionThreshold'] and
            model.reproduction_enabled and
            random.random() < 0.01):  # 1% chance per hour
            self._reproduce()
    
    def _move(self) -> None:
        """Handle agent movement"""
        # Simple random walk with momentum
        dx = self.velocity[0] * 0.8 + random.uniform(-0.5, 0.5) * self.movement_speed
        dy = self.velocity[1] * 0.8 + random.uniform(-0.5, 0.5) * self.movement_speed
        
        self.velocity = (dx, dy)
        
        # Update position
        new_x = self.pos[0] + dx
        new_y = self.pos[1] + dy
        
        # Wrap around world boundaries
        world_size = self.model.config['simulation']['worldSize']
        new_x = new_x % world_size
        new_y = new_y % world_size
        
        self.pos = (new_x, new_y)
        
        # Update grid position (discrete)
        grid_x = int(new_x)
        grid_y = int(new_y)
        self.model.grid.move_agent(self, (grid_x, grid_y))
    
    def _update_disease(self) -> None:
        """Update disease state according to SIR model"""
        self.days_in_state += 1 / 24.0  # 1 hour increment
        
        if self.sir_state == 1:  # Infected
            # Check for recovery
            if self.days_in_state >= self.model.config['disease']['recoveryTime'] / 24.0:
                self.sir_state = 2  # Recovered
                self.days_in_state = 0
                return
            
            # Infect nearby susceptible agents
            neighbors = self.model.grid.get_neighbors(
                self.pos,
                moore=True,
                radius=self.model.config['disease']['contactRadius']
            )
            
            for neighbor in neighbors:
                if (neighbor.sir_state == 0 and  # Susceptible
                    random.random() < self.model.config['disease']['transmissionRate']):
                    neighbor.sir_state = 1  # Infected
                    neighbor.days_in_state = 0
    
    def _forage(self) -> None:
        """Forage for resources"""
        if not self.model.environment_enabled:
            return
        
        # Simple resource foraging - gain energy if in resource-rich area
        grid_x, grid_y = int(self.pos[0]), int(self.pos[1])
        if (0 <= grid_x < self.model.grid.width and 
            0 <= grid_y < self.model.grid.height):
            
            resource_value = self.model.resource_grid[grid_y, grid_x]
            if resource_value > 0:
                energy_gain = min(resource_value, 10.0)  # Max 10 energy per forage
                self.energy += energy_gain
                self.model.resource_grid[grid_y, grid_x] -= energy_gain
    
    def _reproduce(self) -> None:
        """Create offspring agent"""
        # Energy cost for reproduction
        self.energy -= 20.0
        
        # Create offspring near parent
        offspring_id = f"agent_{self.model.next_agent_id()}"
        offspring = EcosystemAgent(offspring_id, self.model)
        
        # Place near parent
        offset_x = random.uniform(-2, 2)
        offset_y = random.uniform(-2, 2)
        world_size = self.model.config['simulation']['worldSize']
        offspring.pos = (
            (self.pos[0] + offset_x) % world_size,
            (self.pos[1] + offset_y) % world_size
        )
        
        # Add to model
        self.model.schedule.add(offspring)
        grid_pos = (int(offspring.pos[0]), int(offspring.pos[1]))
        self.model.grid.place_agent(offspring, grid_pos)

class EcosystemModel(Model):
    """Mesa model implementing the ecosystem simulation"""
    
    def __init__(self, config: Dict[str, Any], seed: int):
        super().__init__()
        
        self.config = config
        self.seed = seed
        self.tick = 0
        self._agent_counter = 0
        
        # Set random seeds for reproducibility
        random.seed(seed)
        np.random.seed(seed)
        
        # Model configuration
        sim_cfg = config['simulation']
        self.disease_enabled = sim_cfg['enableDisease']
        self.reproduction_enabled = sim_cfg['enableReproduction'] 
        self.environment_enabled = sim_cfg['enableEnvironment']
        
        # Create grid
        world_size = sim_cfg['worldSize']
        self.grid = MultiGrid(world_size, world_size, True)
        
        # Create scheduler with fixed order for determinism
        self.schedule = RandomActivation(self)
        self.schedule.random = random  # Use seeded random
        
        # Initialize resource grid
        if self.environment_enabled:
            self.resource_grid = np.random.uniform(
                0, 100, (world_size, world_size)
            ).astype(np.float32)
        else:
            self.resource_grid = np.zeros((world_size, world_size), dtype=np.float32)
        
        # Create initial population
        self._create_initial_population()
        
        # Data collection
        self.datacollector = DataCollector(
            model_reporters={
                "Population": lambda m: m.schedule.get_agent_count(),
                "Susceptible": lambda m: sum(1 for a in m.schedule.agents if a.sir_state == 0),
                "Infected": lambda m: sum(1 for a in m.schedule.agents if a.sir_state == 1),
                "Recovered": lambda m: sum(1 for a in m.schedule.agents if a.sir_state == 2),
                "AvgEnergy": lambda m: np.mean([a.energy for a in m.schedule.agents]) if m.schedule.agents else 0
            }
        )
        
        # Initial data collection
        self.datacollector.collect(self)
        
        logger.info(f"Mesa model initialized with {self.schedule.get_agent_count()} agents")
    
    def _create_initial_population(self) -> None:
        """Create the initial agent population"""
        pop_size = self.config['simulation']['populationSize']
        world_size = self.config['simulation']['worldSize']
        
        for i in range(pop_size):
            agent_id = f"agent_{self.next_agent_id()}"
            agent = EcosystemAgent(agent_id, self)
            
            # Random position
            x = random.uniform(0, world_size)
            y = random.uniform(0, world_size)
            agent.pos = (x, y)
            
            # Add to model
            self.schedule.add(agent)
            grid_pos = (int(x), int(y))
            self.grid.place_agent(agent, grid_pos)
    
    def next_agent_id(self) -> int:
        """Get next unique agent ID"""
        self._agent_counter += 1
        return self._agent_counter
    
    def step(self) -> None:
        """Execute one simulation step (1 hour in TIME_V1)"""
        # Fixed step order for determinism:
        # 1. SENSE (implicit in agent behavior)
        # 2. SIR (disease updates)
        # 3. MOVEMENT 
        # 4. ENERGETICS (energy consumption/foraging)
        # 5. RESOURCE_REGEN
        # 6. AGING (implicit in agent step)
        
        # Agent steps (handles SIR, movement, energetics, aging)
        self.schedule.step()
        
        # Resource regeneration
        if self.environment_enabled:
            self._regenerate_resources()
        
        # Increment tick
        self.tick += 1
        
        # Data collection
        self.datacollector.collect(self)
    
    def _regenerate_resources(self) -> None:
        """Regenerate environmental resources"""
        regen_rate = self.config['environment']['resourceRegenRate']
        
        # Add random resources
        mask = np.random.random(self.resource_grid.shape) < regen_rate / 24.0  # Per hour
        self.resource_grid[mask] += np.random.uniform(1, 5, np.sum(mask))
        
        # Cap at maximum
        self.resource_grid = np.clip(self.resource_grid, 0, 100)

class MesaEngine:
    """Main engine interface for Mesa simulation"""
    
    def __init__(self, config: Dict[str, Any], seed: int):
        self.config = config
        self.seed = seed
        self.model: Optional[EcosystemModel] = None
        self._rng_calls = {
            'movement': 0,
            'disease': 0,
            'births': 0,
            'mutation': 0,
            'llm': 0
        }
        
        # Initialize model
        self.model = EcosystemModel(config, seed)
        logger.info(f"Mesa engine initialized with seed {seed}")
    
    def step(self, n: int) -> int:
        """Step the simulation N times"""
        if not self.model:
            raise RuntimeError("Model not initialized")
        
        for _ in range(n):
            self.model.step()
            
        return self.model.tick
    
    def snapshot(self, kind: str = "metrics") -> Dict[str, Any]:
        """Take a simulation snapshot"""
        if not self.model:
            raise RuntimeError("Model not initialized")
        
        # Collect current metrics
        agents = list(self.model.schedule.agents)
        
        # Sort agents by ID for deterministic ordering
        agents.sort(key=lambda a: a.unique_id)
        
        sir_counts = {'S': 0, 'I': 0, 'R': 0}
        total_energy = 0.0
        
        for agent in agents:
            if agent.sir_state == 0:
                sir_counts['S'] += 1
            elif agent.sir_state == 1:
                sir_counts['I'] += 1
            else:
                sir_counts['R'] += 1
            total_energy += agent.energy
        
        metrics = {
            'pop': len(agents),
            'energyMean': total_energy / len(agents) if agents else 0.0,
            'sir': sir_counts
        }
        
        # Create serialized state for digest
        state_bytes = self._serialize_state(agents)
        sim_digest = hashlib.blake3(state_bytes).hexdigest()
        
        # RNG digest from call counts
        rng_state = json.dumps(self._rng_calls, sort_keys=True).encode()
        rng_digest = hashlib.blake3(rng_state).hexdigest()
        
        snapshot = {
            'schema': 'GENX_SNAP_V1',
            'timeModel': 'TIME_V1',
            'tick': self.model.tick,
            'buildHash': self._get_build_hash(),
            'rngDigest': rng_digest,
            'simDigest': sim_digest,
            'metrics': metrics,
            'provider': {
                'name': 'mesa',
                'version': self._get_mesa_version(),
                'license': 'Apache-2.0'
            }
        }
        
        # Add full state for "full" snapshots
        if kind == "full":
            snapshot['state'] = {
                'agents': [self._agent_to_dict(agent) for agent in agents],
                'environment': {
                    'resourceGrid': self.model.resource_grid.flatten().tolist(),
                    'tick': self.model.tick
                }
            }
        
        return snapshot
    
    def _serialize_state(self, agents: List[EcosystemAgent]) -> bytes:
        """Serialize state in deterministic little-endian format"""
        buffer = bytearray()
        
        # Serialize agents in fixed order
        for agent in agents:
            # Position (Float32 LE)
            buffer.extend(struct.pack('<f', float(agent.pos[0])))
            buffer.extend(struct.pack('<f', float(agent.pos[1])))
            
            # Velocity (Float32 LE)
            buffer.extend(struct.pack('<f', float(agent.velocity[0])))
            buffer.extend(struct.pack('<f', float(agent.velocity[1])))
            
            # Energy (Float32 LE)
            buffer.extend(struct.pack('<f', float(agent.energy)))
            
            # SIR state (Uint8)
            buffer.extend(struct.pack('B', agent.sir_state))
            
            # Days in state (Uint32 LE)
            buffer.extend(struct.pack('<I', int(agent.days_in_state * 24)))  # Convert to hours
            
            # Age in ticks (Uint32 LE)
            buffer.extend(struct.pack('<I', agent.age_ticks))
        
        # Serialize resource grid (Float32 LE, row-major)
        resource_flat = self.model.resource_grid.flatten()
        for value in resource_flat:
            buffer.extend(struct.pack('<f', float(value)))
        
        return bytes(buffer)
    
    def _agent_to_dict(self, agent: EcosystemAgent) -> Dict[str, Any]:
        """Convert agent to dictionary representation"""
        return {
            'id': agent.unique_id,
            'position': {'x': agent.pos[0], 'y': agent.pos[1]},
            'velocity': {'dx': agent.velocity[0], 'dy': agent.velocity[1]},
            'energy': agent.energy,
            'sirState': agent.sir_state,
            'daysInState': agent.days_in_state,
            'ageTicks': agent.age_ticks
        }
    
    def _get_build_hash(self) -> str:
        """Get deterministic build hash"""
        import mesa
        import numpy
        
        build_info = f"mesa:{mesa.__version__}:numpy:{numpy.__version__}:seed:{self.seed}"
        return hashlib.blake3(build_info.encode()).hexdigest()[:16]
    
    def _get_mesa_version(self) -> str:
        """Get Mesa version"""
        import mesa
        return mesa.__version__
    
    def cleanup(self) -> None:
        """Cleanup resources"""
        self.model = None
        logger.info("Mesa engine cleaned up")