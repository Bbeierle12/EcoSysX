package org.ecosysx.mason;

import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import sim.engine.Schedule;
import sim.engine.SimState;
import sim.engine.Steppable;
import sim.util.Bag;
import sim.util.Double2D;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * EcosystemModel for MASON implementation
 * Manages the environment and global simulation state
 */
public class EcosystemModel extends SimState {
    public int gridWidth;
    public int gridHeight;
    public double[][] resourceGrid;
    public double[][] wasteGrid;
    
    // Simulation parameters
    public double baseEnergyDecay = 0.5;
    public double resourceRegenerationRate = 0.01;
    public double restRecoveryRate = 2.0;
    
    // Agent management
    private List<EcosystemAgent> agents;
    private int nextAgentId = 1;
    
    // Statistics
    public int totalBirths = 0;
    public int totalDeaths = 0;
    public int totalInfections = 0;
    
    /**
     * Constructor
     */
    public EcosystemModel(long seed, int gridWidth, int gridHeight) {
        super(seed);
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.agents = new ArrayList<>();
        
        // Initialize grids
        this.resourceGrid = new double[gridWidth][gridHeight];
        this.wasteGrid = new double[gridWidth][gridHeight];
        
        // Initialize resources randomly
        for (int x = 0; x < gridWidth; x++) {
            for (int y = 0; y < gridHeight; y++) {
                resourceGrid[x][y] = random.nextDouble() * 100.0;
                wasteGrid[x][y] = 0.0;
            }
        }
    }
    
    /**
     * Start the simulation
     */
    public void start() {
        super.start();
        
        // Schedule environment updates
        schedule.scheduleRepeating(Schedule.EPOCH, 1, new Steppable() {
            public void step(SimState state) {
                updateEnvironment();
            }
        }, 1);
        
        // Schedule agent updates
        schedule.scheduleRepeating(Schedule.EPOCH, 2, new Steppable() {
            public void step(SimState state) {
                updateAgents();
            }
        }, 1);
    }
    
    /**
     * Update environment (resources, waste decay)
     */
    private void updateEnvironment() {
        // Resource regeneration
        for (int x = 0; x < gridWidth; x++) {
            for (int y = 0; y < gridHeight; y++) {
                double current = resourceGrid[x][y];
                if (current < 100.0) {
                    resourceGrid[x][y] = Math.min(100.0, 
                        current + resourceRegenerationRate * (100.0 - current));
                }
                
                // Waste decay
                wasteGrid[x][y] *= 0.95;
            }
        }
    }
    
    /**
     * Update all agents
     */
    private void updateAgents() {
        // Create copy to avoid concurrent modification
        List<EcosystemAgent> agentsCopy = new ArrayList<>(agents);
        
        for (EcosystemAgent agent : agentsCopy) {
            agent.step(this);
        }
        
        // Update statistics
        updateStatistics();
    }
    
    /**
     * Add agent to simulation
     */
    public void addAgent(EcosystemAgent agent) {
        agents.add(agent);
        totalBirths++;
    }
    
    /**
     * Remove agent from simulation
     */
    public void removeAgent(EcosystemAgent agent) {
        agents.remove(agent);
        totalDeaths++;
    }
    
    /**
     * Get next agent ID
     */
    public int getNextAgentId() {
        return nextAgentId++;
    }
    
    /**
     * Get nearby agents within radius
     */
    public Bag getNearbyAgents(Double2D position, double radius) {
        Bag nearbyAgents = new Bag();
        
        for (EcosystemAgent agent : agents) {
            double distance = position.distance(agent.position);
            if (distance <= radius) {
                nearbyAgents.add(agent);
            }
        }
        
        return nearbyAgents;
    }
    
    /**
     * Get current simulation step
     */
    public int getCurrentStep() {
        return (int) schedule.getSteps();
    }
    
    /**
     * Update simulation statistics
     */
    private void updateStatistics() {
        // Count health statuses
        int susceptible = 0, infected = 0, recovered = 0;
        
        for (EcosystemAgent agent : agents) {
            switch (agent.healthStatus) {
                case SUSCEPTIBLE:
                    susceptible++;
                    break;
                case INFECTED:
                    infected++;
                    break;
                case RECOVERED:
                    recovered++;
                    break;
            }
        }
        
        // Store counts for access (could use properties or fields)
    }
    
    /**
     * Create agents for initial population
     */
    public void createInitialPopulation(int populationSize, double initialInfectedFraction) {
        for (int i = 0; i < populationSize; i++) {
            Double2D position = new Double2D(
                random.nextDouble() * gridWidth,
                random.nextDouble() * gridHeight
            );
            
            EcosystemAgent agent = new EcosystemAgent(getNextAgentId(), position);
            
            // Set initial health status
            if (random.nextDouble() < initialInfectedFraction) {
                agent.healthStatus = EcosystemAgent.HealthStatus.INFECTED;
                agent.infectionStartStep = getCurrentStep();
            }
            
            addAgent(agent);
        }
    }
    
    /**
     * Get all agents (defensive copy)
     */
    public List<EcosystemAgent> getAllAgents() {
        return new ArrayList<>(agents);
    }
    
    /**
     * Calculate simulation metrics
     */
    public JsonObject calculateMetrics() {
        List<EcosystemAgent> agentList = getAllAgents();
        
        // SIR counts
        int susceptible = 0, infected = 0, recovered = 0;
        double totalEnergy = 0.0;
        
        for (EcosystemAgent agent : agentList) {
            switch (agent.healthStatus) {
                case SUSCEPTIBLE:
                    susceptible++;
                    break;
                case INFECTED:
                    infected++;
                    break;
                case RECOVERED:
                    recovered++;
                    break;
            }
            totalEnergy += agent.energy;
        }
        
        double energyMean = agentList.size() > 0 ? totalEnergy / agentList.size() : 0.0;
        double density = (double) agentList.size() / (gridWidth * gridHeight);
        
        // Create metrics JSON
        JsonObject metrics = new JsonObject();
        metrics.addProperty("pop", agentList.size());
        metrics.addProperty("energyMean", energyMean);
        
        JsonObject sir = new JsonObject();
        sir.addProperty("S", susceptible);
        sir.addProperty("I", infected);
        sir.addProperty("R", recovered);
        metrics.add("sir", sir);
        
        JsonObject spatial = new JsonObject();
        spatial.addProperty("density", density);
        spatial.addProperty("clustering", 0.0); // Placeholder
        metrics.add("spatial", spatial);
        
        return metrics;
    }
    
    /**
     * Serialize agents to Genesis schema format
     */
    public JsonArray serializeAgents() {
        JsonArray agentStates = new JsonArray();
        List<EcosystemAgent> agentList = getAllAgents();
        
        // Sort by ID for determinism
        Collections.sort(agentList, (a, b) -> Integer.compare(a.id, b.id));
        
        for (EcosystemAgent agent : agentList) {
            JsonObject agentState = new JsonObject();
            agentState.addProperty("id", String.valueOf(agent.id));
            
            JsonObject position = new JsonObject();
            position.addProperty("x", agent.position.x);
            position.addProperty("y", agent.position.y);
            agentState.add("position", position);
            
            JsonObject velocity = new JsonObject();
            velocity.addProperty("dx", 0.0);
            velocity.addProperty("dy", 0.0);
            agentState.add("velocity", velocity);
            
            agentState.addProperty("energy", agent.energy);
            
            // Map health status to SIR state
            int sirState = 0; // SUSCEPTIBLE
            if (agent.healthStatus == EcosystemAgent.HealthStatus.INFECTED) {
                sirState = 1;
            } else if (agent.healthStatus == EcosystemAgent.HealthStatus.RECOVERED) {
                sirState = 2;
            }
            agentState.addProperty("sirState", sirState);
            agentState.addProperty("daysInState", agent.infectionDuration);
            agentState.addProperty("ageTicks", agent.age);
            
            agentStates.add(agentState);
        }
        
        return agentStates;
    }
    
    /**
     * Serialize environment to Genesis schema format
     */
    public JsonObject serializeEnvironment() {
        // Flatten resource grid
        JsonArray resourceGridArray = new JsonArray();
        for (int y = 0; y < gridHeight; y++) {
            for (int x = 0; x < gridWidth; x++) {
                resourceGridArray.add((float) resourceGrid[x][y]);
            }
        }
        
        JsonObject environment = new JsonObject();
        environment.add("resourceGrid", resourceGridArray);
        environment.addProperty("tick", getCurrentStep());
        
        JsonObject weather = new JsonObject();
        weather.addProperty("temperature", 20.0);
        weather.addProperty("humidity", 0.5);
        weather.addProperty("windSpeed", 0.0);
        environment.add("weather", weather);
        
        return environment;
    }
    
    /**
     * Create RNG digest for deterministic verification
     */
    public String createRngDigest() {
        // Create deterministic representation of RNG state
        String rngState = String.valueOf(seed);
        return sha256Hash(rngState);
    }
    
    /**
     * Create simulation state digest for deterministic verification
     */
    public String createSimDigest() {
        StringBuilder stateBuilder = new StringBuilder();
        
        // Agent data (sorted by ID)
        List<EcosystemAgent> agentList = getAllAgents();
        Collections.sort(agentList, (a, b) -> Integer.compare(a.id, b.id));
        
        for (EcosystemAgent agent : agentList) {
            stateBuilder.append(agent.id).append(",");
            stateBuilder.append(agent.position.x).append(",");
            stateBuilder.append(agent.position.y).append(",");
            stateBuilder.append(agent.energy).append(",");
            stateBuilder.append(agent.healthStatus.ordinal()).append(",");
            stateBuilder.append(agent.age).append(";");
        }
        
        // Environment data
        double resourceSum = 0.0;
        for (int x = 0; x < gridWidth; x++) {
            for (int y = 0; y < gridHeight; y++) {
                resourceSum += resourceGrid[x][y];
            }
        }
        stateBuilder.append("ENV,").append(resourceSum).append(",").append(getCurrentStep());
        
        return sha256Hash(stateBuilder.toString());
    }
    
    /**
     * Calculate SHA-256 hash
     */
    private String sha256Hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes());
            StringBuilder hexString = new StringBuilder();
            
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return "sha256-error";
        }
    }
}