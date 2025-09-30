package org.ecosysx.mason;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Map;

/**
 * MASON sidecar for Genesis Engine
 * Handles JSON-RPC communication over stdin/stdout
 */
public class MasonSidecar {
    private static final Gson gson = new Gson();
    private MasonEngine engine;
    
    public MasonSidecar() {
        this.engine = null;
    }
    
    /**
     * Main entry point
     */
    public static void main(String[] args) {
        MasonSidecar sidecar = new MasonSidecar();
        sidecar.run();
    }
    
    /**
     * Main event loop
     */
    public void run() {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        PrintWriter writer = new PrintWriter(System.out, true);
        
        try {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) {
                    continue;
                }
                
                try {
                    JsonObject request = JsonParser.parseString(line).getAsJsonObject();
                    JsonObject response = handleRequest(request);
                    writer.println(gson.toJson(response));
                    writer.flush();
                } catch (Exception e) {
                    JsonObject errorResponse = createErrorResponse(null, e.getMessage());
                    writer.println(gson.toJson(errorResponse));
                    writer.flush();
                }
            }
        } catch (IOException e) {
            System.err.println("IO Error: " + e.getMessage());
        } finally {
            if (engine != null) {
                engine.cleanup();
            }
        }
    }
    
    /**
     * Handle JSON-RPC request and return response
     */
    private JsonObject handleRequest(JsonObject request) {
        String op = request.has("op") ? request.get("op").getAsString() : "";
        Integer id = request.has("id") ? request.get("id").getAsInt() : null;
        
        try {
            switch (op) {
                case "init":
                    return handleInit(request, id);
                case "step":
                    return handleStep(request, id);
                case "snapshot":
                    return handleSnapshot(request, id);
                case "stop":
                    return handleStop(request, id);
                case "info":
                    return handleInfo(request, id);
                default:
                    return createErrorResponse(id, "Unknown operation: " + op);
            }
        } catch (Exception e) {
            return createErrorResponse(id, e.getMessage());
        }
    }
    
    /**
     * Initialize the simulation engine
     */
    private JsonObject handleInit(JsonObject request, Integer id) {
        JsonObject cfg = request.getAsJsonObject("cfg");
        String seedStr = request.has("seed") ? request.get("seed").getAsString() : "12345";
        long masterSeed = Long.parseLong(seedStr);
        
        engine = new MasonEngine(cfg);
        engine.initialize(masterSeed);
        
        JsonObject response = new JsonObject();
        response.addProperty("ok", true);
        if (id != null) response.addProperty("id", id);
        return response;
    }
    
    /**
     * Step the simulation forward
     */
    private JsonObject handleStep(JsonObject request, Integer id) {
        if (engine == null) {
            return createErrorResponse(id, "Engine not initialized");
        }
        
        int n = request.has("n") ? request.get("n").getAsInt() : 1;
        
        for (int i = 0; i < n; i++) {
            engine.step();
        }
        
        JsonObject response = new JsonObject();
        response.addProperty("ok", true);
        response.addProperty("tick", engine.getCurrentStep());
        if (id != null) response.addProperty("id", id);
        return response;
    }
    
    /**
     * Create deterministic snapshot
     */
    private JsonObject handleSnapshot(JsonObject request, Integer id) {
        if (engine == null) {
            return createErrorResponse(id, "Engine not initialized");
        }
        
        String kind = request.has("kind") ? request.get("kind").getAsString() : "metrics";
        JsonObject snapshot = engine.createSnapshot(kind);
        
        JsonObject response = new JsonObject();
        response.addProperty("ok", true);
        response.add("snapshot", snapshot);
        if (id != null) response.addProperty("id", id);
        return response;
    }
    
    /**
     * Stop the simulation
     */
    private JsonObject handleStop(JsonObject request, Integer id) {
        if (engine != null) {
            engine.cleanup();
            engine = null;
        }
        
        JsonObject response = new JsonObject();
        response.addProperty("ok", true);
        if (id != null) response.addProperty("id", id);
        return response;
    }
    
    /**
     * Get engine information
     */
    private JsonObject handleInfo(JsonObject request, Integer id) {
        JsonObject providerInfo = new JsonObject();
        providerInfo.addProperty("name", "mason");
        providerInfo.addProperty("version", "20");
        providerInfo.addProperty("license", "Academic Free License");
        providerInfo.addProperty("buildHash", "mason-v1.0.0");
        
        JsonObject response = new JsonObject();
        response.addProperty("ok", true);
        response.add("provider", providerInfo);
        if (id != null) response.addProperty("id", id);
        return response;
    }
    
    /**
     * Create error response
     */
    private JsonObject createErrorResponse(Integer id, String message) {
        JsonObject response = new JsonObject();
        response.addProperty("ok", false);
        response.addProperty("error", message);
        if (id != null) response.addProperty("id", id);
        return response;
    }
}