package org.ecosysx.mason;

import com.google.gson.JsonObject;
import com.google.gson.JsonArray;

/**
 * MasonEngine - Main engine interface for Genesis integration
 */
public class MasonEngine {
    private JsonObject config;
    private EcosystemModel model;
    private int step;
    
    public MasonEngine(JsonObject config) {
        this.config = config;
        this.model = null;
        this.step = 0;
    }
    
    /**
     * Initialize the simulation
     */
    public void initialize(long masterSeed) {
        // Extract configuration parameters using Genesis schema
        JsonObject simulation = config.has("simulation") ? 
            config.getAsJsonObject("simulation") : new JsonObject();
        
        int gridSize = simulation.has("worldSize") ? 
            simulation.get("worldSize").getAsInt() : 50;
        int populationSize = simulation.has("populationSize") ? 
            simulation.get("populationSize").getAsInt() : 100;
        boolean enableDisease = simulation.has("enableDisease") ? 
            simulation.get("enableDisease").getAsBoolean() : true;
        
        // Disease parameters
        JsonObject disease = config.has("disease") ? 
            config.getAsJsonObject("disease") : new JsonObject();
        double initialInfectedFraction = disease.has("initialInfectionRate") ? 
            disease.get("initialInfectionRate").getAsDouble() : 0.05;
        
        // Create model
        model = new EcosystemModel(masterSeed, gridSize, gridSize);
        model.start();
        
        // Create initial population
        model.createInitialPopulation(populationSize, initialInfectedFraction);
        
        step = 0;
    }
    
    /**
     * Step the simulation forward
     */
    public void step() {
        if (model == null) {
            throw new IllegalStateException("Model not initialized");
        }
        
        model.schedule.step(model);
        step++;
    }
    
    /**
     * Get current simulation step
     */
    public int getCurrentStep() {
        return step;
    }
    
    /**
     * Create deterministic snapshot conforming to Genesis schema
     */
    public JsonObject createSnapshot(String kind) {
        if (model == null) {
            throw new IllegalStateException("Model not initialized");
        }
        
        // Calculate metrics
        JsonObject metrics = model.calculateMetrics();
        
        // Create provider info
        JsonObject provider = new JsonObject();
        provider.addProperty("name", "mason");
        provider.addProperty("version", "20");
        provider.addProperty("license", "Academic Free License");
        provider.addProperty("buildHash", "mason-v1.0.0");
        
        // Create snapshot according to Genesis schema
        JsonObject snapshot = new JsonObject();
        snapshot.addProperty("schema", "GENX_SNAP_V1");
        snapshot.addProperty("timeModel", "TIME_V1");
        snapshot.addProperty("tick", step);
        snapshot.addProperty("buildHash", "mason-v1.0.0");
        snapshot.addProperty("rngDigest", model.createRngDigest());
        snapshot.addProperty("simDigest", model.createSimDigest());
        snapshot.add("metrics", metrics);
        snapshot.add("provider", provider);
        
        // Add full state for "full" snapshots
        if ("full".equals(kind)) {
            JsonObject state = new JsonObject();
            state.add("agents", model.serializeAgents());
            state.add("environment", model.serializeEnvironment());
            snapshot.add("state", state);
        }
        
        return snapshot;
    }
    
    /**
     * Cleanup simulation resources
     */
    public void cleanup() {
        if (model != null) {
            model.finish();
            model = null;
        }
        step = 0;
    }
}