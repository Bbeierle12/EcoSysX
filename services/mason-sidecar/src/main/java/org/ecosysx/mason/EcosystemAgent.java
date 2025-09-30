package org.ecosysx.mason;

import sim.engine.Schedule;
import sim.engine.SimState;
import sim.util.Bag;
import sim.util.Double2D;
import sim.util.MutableDouble2D;

/**
 * EcosystemAgent for MASON implementation
 * Represents an individual agent in the ecosystem simulation
 */
public class EcosystemAgent {
    // Agent properties
    public int id;
    public Double2D position;
    public double energy;
    public int age;
    public int maxAge;
    
    // Movement properties
    public double speed;
    public double movementCost;
    
    // Disease model (SIR)
    public enum HealthStatus { SUSCEPTIBLE, INFECTED, RECOVERED, DEAD }
    public HealthStatus healthStatus;
    public int infectionDuration;
    public int infectionStartStep;
    public double recoveryProbability;
    public double transmissionProbability;
    public double deathProbability;
    
    // Reproduction properties
    public double reproductionThreshold;
    public double reproductionCost;
    public double reproductionProbability;
    public double offspringEnergy;
    
    // Behavioral state
    public enum BehaviorState { FORAGING, RESTING, REPRODUCING, FLEEING }
    public BehaviorState behaviorState;
    public int lastReproductionStep;
    
    // Spatial awareness
    public int perceptionRange;
    
    // Resource interaction
    public double resourceEfficiency;
    public double wasteProduction;
    
    /**
     * Constructor with default values
     */
    public EcosystemAgent(int id, Double2D position) {
        this.id = id;
        this.position = position;
        this.energy = 100.0;
        this.age = 0;
        this.maxAge = 1000;
        this.speed = 1.0;
        this.movementCost = 1.0;
        this.healthStatus = HealthStatus.SUSCEPTIBLE;
        this.infectionDuration = 0;
        this.infectionStartStep = 0;
        this.recoveryProbability = 0.1;
        this.transmissionProbability = 0.05;
        this.deathProbability = 0.01;
        this.reproductionThreshold = 150.0;
        this.reproductionCost = 50.0;
        this.reproductionProbability = 0.3;
        this.offspringEnergy = 75.0;
        this.behaviorState = BehaviorState.FORAGING;
        this.lastReproductionStep = 0;
        this.perceptionRange = 3;
        this.resourceEfficiency = 1.0;
        this.wasteProduction = 0.1;
    }
    
    /**
     * Agent step function - called each simulation step
     */
    public void step(EcosystemModel model) {
        // Aging and natural death
        age++;
        if (age >= maxAge || energy <= 0) {
            model.removeAgent(this);
            return;
        }
        
        // Health status updates
        updateHealthStatus(model);
        
        // Death from disease
        if (healthStatus == HealthStatus.DEAD) {
            model.removeAgent(this);
            return;
        }
        
        // Behavioral decision making
        chooseBehavior(model);
        
        // Execute behavior
        switch (behaviorState) {
            case FORAGING:
                forage(model);
                break;
            case REPRODUCING:
                attemptReproduction(model);
                break;
            case RESTING:
                rest(model);
                break;
            case FLEEING:
                flee(model);
                break;
        }
        
        // Movement (unless resting)
        if (behaviorState != BehaviorState.RESTING) {
            move(model);
        }
        
        // Energy decay
        energy -= model.baseEnergyDecay;
        
        // Disease transmission
        if (healthStatus == HealthStatus.INFECTED) {
            transmitDisease(model);
        }
    }
    
    /**
     * Update agent health status based on disease model
     */
    private void updateHealthStatus(EcosystemModel model) {
        if (healthStatus == HealthStatus.INFECTED) {
            infectionDuration++;
            
            // Check for recovery
            if (model.random.nextDouble() < recoveryProbability) {
                healthStatus = HealthStatus.RECOVERED;
                infectionDuration = 0;
            // Check for death from disease
            } else if (model.random.nextDouble() < deathProbability) {
                healthStatus = HealthStatus.DEAD;
            }
        }
    }
    
    /**
     * Choose behavior based on agent state and environment
     */
    private void chooseBehavior(EcosystemModel model) {
        // Sick agents rest more
        if (healthStatus == HealthStatus.INFECTED && model.random.nextDouble() < 0.7) {
            behaviorState = BehaviorState.RESTING;
            return;
        }
        
        // Low energy agents prioritize foraging
        if (energy < 50.0) {
            behaviorState = BehaviorState.FORAGING;
            return;
        }
        
        // High energy agents may reproduce
        if (energy >= reproductionThreshold && 
            model.getCurrentStep() - lastReproductionStep > 10) {
            behaviorState = BehaviorState.REPRODUCING;
            return;
        }
        
        // Check for threats (high density of infected agents)
        int nearbyInfected = countNearbyInfected(model);
        if (nearbyInfected > 2) {
            behaviorState = BehaviorState.FLEEING;
            return;
        }
        
        // Default to foraging
        behaviorState = BehaviorState.FORAGING;
    }
    
    /**
     * Foraging behavior - look for resources
     */
    private void forage(EcosystemModel model) {
        int x = (int) position.x;
        int y = (int) position.y;
        
        if (x >= 0 && x < model.gridWidth && y >= 0 && y < model.gridHeight) {
            double resourceValue = model.resourceGrid[x][y];
            
            if (resourceValue > 0.0) {
                // Consume resource
                double energyGained = resourceValue * resourceEfficiency;
                energy += energyGained;
                
                // Reduce resource (with regeneration)
                model.resourceGrid[x][y] *= 0.8;
                
                // Produce waste
                double wasteProduced = energyGained * wasteProduction;
                model.wasteGrid[x][y] += wasteProduced;
            }
        }
    }
    
    /**
     * Reproduction behavior
     */
    private void attemptReproduction(EcosystemModel model) {
        if (energy >= reproductionThreshold && 
            model.random.nextDouble() < reproductionProbability) {
            
            // Create offspring
            createOffspring(model);
            
            // Pay reproduction cost
            energy -= reproductionCost;
            lastReproductionStep = model.getCurrentStep();
        }
    }
    
    /**
     * Create offspring with genetic variation
     */
    private void createOffspring(EcosystemModel model) {
        // Find nearby empty position
        Double2D offspringPos = findNearbyPosition(model);
        
        if (offspringPos != null) {
            EcosystemAgent offspring = new EcosystemAgent(model.getNextAgentId(), offspringPos);
            
            // Genetic inheritance with mutation
            offspring.speed = this.speed * (0.9 + 0.2 * model.random.nextDouble());
            offspring.reproductionThreshold = this.reproductionThreshold * (0.9 + 0.2 * model.random.nextDouble());
            offspring.recoveryProbability = this.recoveryProbability * (0.9 + 0.2 * model.random.nextDouble());
            offspring.energy = offspringEnergy;
            
            model.addAgent(offspring);
        }
    }
    
    /**
     * Resting behavior - recover energy slowly
     */
    private void rest(EcosystemModel model) {
        // Recover small amount of energy
        energy += model.restRecoveryRate;
        
        // Reduced movement cost while resting
        energy += movementCost * 0.5;
    }
    
    /**
     * Fleeing behavior - move away from threats
     */
    private void flee(EcosystemModel model) {
        // Simple flee behavior - move randomly with higher speed
        move(model, speed * 2.0);
    }
    
    /**
     * Move agent with energy cost
     */
    private void move(EcosystemModel model) {
        move(model, speed);
    }
    
    /**
     * Move agent with specified speed and energy cost
     */
    private void move(EcosystemModel model, double moveSpeed) {
        // Random walk with speed
        double angle = model.random.nextDouble() * 2 * Math.PI;
        double dx = Math.cos(angle) * moveSpeed;
        double dy = Math.sin(angle) * moveSpeed;
        
        double newX = position.x + dx;
        double newY = position.y + dy;
        
        // Clamp to grid bounds
        newX = Math.max(0, Math.min(model.gridWidth - 1, newX));
        newY = Math.max(0, Math.min(model.gridHeight - 1, newY));
        
        position = new Double2D(newX, newY);
        
        // Pay movement cost
        energy -= movementCost;
    }
    
    /**
     * Disease transmission between nearby agents
     */
    private void transmitDisease(EcosystemModel model) {
        Bag nearbyAgents = model.getNearbyAgents(position, 1.0);
        
        for (int i = 0; i < nearbyAgents.numObjs; i++) {
            EcosystemAgent neighbor = (EcosystemAgent) nearbyAgents.objs[i];
            
            if (neighbor != this && 
                neighbor.healthStatus == HealthStatus.SUSCEPTIBLE && 
                model.random.nextDouble() < transmissionProbability) {
                neighbor.healthStatus = HealthStatus.INFECTED;
                neighbor.infectionStartStep = model.getCurrentStep();
            }
        }
    }
    
    /**
     * Count nearby infected agents
     */
    private int countNearbyInfected(EcosystemModel model) {
        Bag nearbyAgents = model.getNearbyAgents(position, perceptionRange);
        int count = 0;
        
        for (int i = 0; i < nearbyAgents.numObjs; i++) {
            EcosystemAgent agent = (EcosystemAgent) nearbyAgents.objs[i];
            if (agent != this && agent.healthStatus == HealthStatus.INFECTED) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Find nearby empty position for offspring
     */
    private Double2D findNearbyPosition(EcosystemModel model) {
        for (int attempts = 0; attempts < 10; attempts++) {
            double angle = model.random.nextDouble() * 2 * Math.PI;
            double distance = 1 + model.random.nextDouble() * 3;
            
            double newX = position.x + Math.cos(angle) * distance;
            double newY = position.y + Math.sin(angle) * distance;
            
            // Clamp to grid bounds
            newX = Math.max(0, Math.min(model.gridWidth - 1, newX));
            newY = Math.max(0, Math.min(model.gridHeight - 1, newY));
            
            Double2D newPos = new Double2D(newX, newY);
            
            // Check if position is relatively free
            Bag nearby = model.getNearbyAgents(newPos, 0.5);
            if (nearby.numObjs < 3) {
                return newPos;
            }
        }
        
        return null; // Could not find suitable position
    }
}