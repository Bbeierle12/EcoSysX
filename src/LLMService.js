/**
 * LLM Service Module - Handles real LLM integration with Ollama
 * Provides API communication, prompt engineering, and response parsing
 * for EcoSysX ecosystem simulation agents
 */

// Available models and their capabilities
const DEFAULT_MODEL_CONFIGS = {
  'llama3.2:latest': {
    maxTokens: 4096,
    contextWindow: 8192,
    temperature: 0.7,
    capabilities: ['reasoning', 'analysis', 'decision-making']
  },
  'mistral:latest': {
    maxTokens: 4096,
    contextWindow: 8192,
    temperature: 0.7,
    capabilities: ['reasoning', 'analysis', 'decision-making']
  },
  'codellama:latest': {
    maxTokens: 4096,
    contextWindow: 8192,
    temperature: 0.6,
    capabilities: ['reasoning', 'analysis', 'decision-making']
  }
};

export class LLMService {
  constructor(config = {}) {
    this.endpoint = config.endpoint || 'http://localhost:11434';
    this.model = config.model || 'llama3.2:latest';
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 512;
    this.timeout = config.timeout || 10000; // 10 second timeout
    
    // Performance tracking
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbackUsed: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
    
    // Connection status
    this.isConnected = false;
    this.availableModels = [];
    this.lastConnectionCheck = 0;
    
    // Debug logging
    this.debug = config.debug || false;
  }

  /**
   * Check connection and retrieve available models
   */
  async checkConnection() {
    const now = Date.now();
    
    // Don't check too frequently (cache for 30 seconds)
    if (now - this.lastConnectionCheck < 30000 && this.isConnected) {
      return this.isConnected;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        this.availableModels = data.models || [];
        this.isConnected = this.availableModels.some(m => 
          m.name.includes('llama') || 
          m.name.includes('mistral') || 
          m.name.includes('codellama')
        );
        this.lastConnectionCheck = now;
        
        if (this.debug) {
          console.log(`🤖 LLM Service: Connected to Ollama, ${this.availableModels.length} models available`);
        }
      } else {
        this.isConnected = false;
      }
    } catch (error) {
      this.isConnected = false;
      if (this.debug) {
        console.log(`🤖 LLM Service: Connection failed - ${error.message}`);
      }
    }
    
    return this.isConnected;
  }

  /**
   * Get the best available model for agent reasoning
   */
  getBestAvailableModel() {
    if (!this.availableModels.length) return this.model;
    
    // Priority order for ecosystem reasoning
    const preferredModels = ['llama3.2', 'mistral', 'llama3.1', 'llama2', 'codellama'];
    
    for (const preferred of preferredModels) {
      const match = this.availableModels.find(m => m.name.toLowerCase().includes(preferred));
      if (match) {
        return match.name;
      }
    }
    
    // Fall back to first available model
    return this.availableModels[0]?.name || this.model;
  }

  /**
   * Construct optimized prompt for ecosystem agent reasoning
   */
  buildEcosystemPrompt(agentData, observation, agents) {
    const { personality, id, age, energy, status } = agentData;
    const { nearbyAgents, nearbyInfected, nearestResourceDistance, nearbyCount } = observation;
    
    // Calculate dynamic context
    const populationPressure = agents.length > 50 ? 'high' : agents.length < 20 ? 'low' : 'moderate';
    const infectionRisk = nearbyInfected > 0 ? 'high' : 'low';
    const energyStatus = energy < 30 ? 'critical' : energy > 70 ? 'abundant' : 'moderate';
    const resourceAvailability = nearestResourceDistance < 10 ? 'nearby' : 'distant';
    
    const systemPrompt = `You are an autonomous agent in an ecosystem simulation. You must make survival decisions based on current conditions.

AGENT PROFILE:
- ID: ${id}
- Age: ${age} steps
- Personality: ${personality}
- Energy: ${energy}% (${energyStatus})
- Health Status: ${status}

CURRENT SITUATION:
- Population Pressure: ${populationPressure} (${agents.length} agents total)
- Nearby Agents: ${nearbyCount}
- Infection Risk: ${infectionRisk} (${nearbyInfected} infected nearby)
- Resource Availability: ${resourceAvailability} (nearest at ${nearestResourceDistance} units)

DECISION FRAMEWORK:
Consider these priorities in order:
1. Survival (avoid death from starvation/disease)
2. Energy management (find food when needed)
3. Disease avoidance (stay away from infected agents)
4. Reproduction (when energy is abundant and safe)
5. Exploration (when no immediate threats)

Respond with a JSON object containing:
{
  "reasoning": "Brief explanation of your decision logic",
  "action": "primary_action", // One of: forage, avoid, reproduce, explore, rest
  "intensity": 0.8, // Movement intensity 0.1-1.0
  "direction": "toward_resource|away_from_infected|random", // Movement direction strategy
  "confidence": 0.9 // How confident you are in this decision (0.1-1.0)
}

Make your decision now:`;

    return systemPrompt;
  }

  /**
   * Send request to Ollama API
   */
  async callLLM(prompt, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    
    // Check connection first
    const isConnected = await this.checkConnection();
    if (!isConnected) {
      this.stats.failedRequests++;
      throw new Error('LLM service not available');
    }
    
    const model = options.model || this.getBestAvailableModel();
    const temperature = options.temperature || this.temperature;
    const maxTokens = options.maxTokens || this.maxTokens;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const requestBody = {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: temperature,
          num_predict: maxTokens,
          top_k: 40,
          top_p: 0.9,
          stop: ["\n\n", "###"]
        }
      };
      
      if (this.debug) {
        console.log(`🤖 LLM Request to ${model}:`, { 
          promptLength: prompt.length, 
          temperature, 
          maxTokens 
        });
      }
      
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Empty response from LLM');
      }
      
      // Update performance stats
      const responseTime = Date.now() - startTime;
      this.stats.successfulRequests++;
      this.stats.totalResponseTime += responseTime;
      this.stats.avgResponseTime = this.stats.totalResponseTime / this.stats.successfulRequests;
      
      if (this.debug) {
        console.log(`🤖 LLM Response (${responseTime}ms):`, {
          model: model,
          responseLength: data.response.length,
          done: data.done
        });
      }
      
      return {
        response: data.response,
        model: model,
        responseTime: responseTime,
        success: true
      };
      
    } catch (error) {
      this.stats.failedRequests++;
      
      if (this.debug) {
        console.error(`🤖 LLM Request failed:`, error.message);
      }
      
      // Re-throw for handling by calling code
      throw new Error(`LLM request failed: ${error.message}`);
    }
  }

  /**
   * Parse LLM response for agent decision
   */
  parseLLMResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // Validate required fields
        if (!parsed.action || !parsed.reasoning) {
          throw new Error('Missing required fields in LLM response');
        }
        
        // Normalize and validate values
        const normalizedResponse = {
          reasoning: String(parsed.reasoning).substring(0, 500), // Limit length
          action: this.validateAction(parsed.action),
          intensity: this.clamp(parseFloat(parsed.intensity) || 0.5, 0.1, 1.0),
          direction: this.validateDirection(parsed.direction),
          confidence: this.clamp(parseFloat(parsed.confidence) || 0.7, 0.1, 1.0)
        };
        
        return {
          ...normalizedResponse,
          raw: response,
          success: true,
          parsed: true
        };
      } else {
        // Fallback: extract reasoning from natural language
        return this.parseNaturalLanguageResponse(response);
      }
    } catch (error) {
      if (this.debug) {
        console.warn(`🤖 Failed to parse LLM response:`, error.message);
      }
      
      // Return a fallback decision
      return {
        reasoning: "Failed to parse LLM response, using fallback logic",
        action: "explore",
        intensity: 0.5,
        direction: "random",
        confidence: 0.3,
        raw: response,
        success: false,
        parsed: false,
        error: error.message
      };
    }
  }

  /**
   * Parse natural language response when JSON parsing fails
   */
  parseNaturalLanguageResponse(response) {
    const text = response.toLowerCase();
    let action = "explore";
    let intensity = 0.5;
    let direction = "random";
    let confidence = 0.6;
    
    // Detect primary action from keywords
    if (text.includes("food") || text.includes("forage") || text.includes("resource")) {
      action = "forage";
      direction = "toward_resource";
      intensity = 0.8;
    } else if (text.includes("avoid") || text.includes("flee") || text.includes("infected")) {
      action = "avoid";
      direction = "away_from_infected";
      intensity = 0.7;
    } else if (text.includes("reproduce") || text.includes("mate") || text.includes("offspring")) {
      action = "reproduce";
      intensity = 0.3;
    } else if (text.includes("rest") || text.includes("wait") || text.includes("conserve")) {
      action = "rest";
      intensity = 0.1;
    }
    
    // Extract intensity cues
    if (text.includes("urgent") || text.includes("critical") || text.includes("danger")) {
      intensity = Math.min(1.0, intensity + 0.2);
    } else if (text.includes("careful") || text.includes("slow")) {
      intensity = Math.max(0.1, intensity - 0.2);
    }
    
    return {
      reasoning: response.substring(0, 200) + "...",
      action: action,
      intensity: intensity,
      direction: direction,
      confidence: confidence,
      raw: response,
      success: true,
      parsed: false // Natural language parsing
    };
  }

  /**
   * Validate and normalize action types
   */
  validateAction(action) {
    const validActions = ["forage", "avoid", "reproduce", "explore", "rest"];
    const actionStr = String(action).toLowerCase();
    
    if (validActions.includes(actionStr)) {
      return actionStr;
    }
    
    // Map common variations
    const actionMap = {
      "find_food": "forage",
      "search": "forage",
      "eat": "forage",
      "flee": "avoid",
      "escape": "avoid",
      "hide": "avoid",
      "mate": "reproduce",
      "breed": "reproduce",
      "wander": "explore",
      "move": "explore",
      "wait": "rest",
      "stay": "rest"
    };
    
    return actionMap[actionStr] || "explore";
  }

  /**
   * Validate and normalize direction strategies
   */
  validateDirection(direction) {
    const validDirections = ["toward_resource", "away_from_infected", "random"];
    const directionStr = String(direction).toLowerCase();
    
    if (validDirections.includes(directionStr)) {
      return directionStr;
    }
    
    // Map variations
    const directionMap = {
      "food": "toward_resource",
      "resource": "toward_resource",
      "away": "away_from_infected",
      "flee": "away_from_infected",
      "avoid": "away_from_infected"
    };
    
    return directionMap[directionStr] || "random";
  }

  /**
   * Utility function to clamp values within range
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulRequests / this.stats.totalRequests) 
        : 0,
      fallbackRate: this.stats.totalRequests > 0
        ? (this.stats.fallbackUsed / this.stats.totalRequests)
        : 0,
      isConnected: this.isConnected,
      availableModels: this.availableModels.length,
      currentModel: this.getBestAvailableModel()
    };
  }

  /**
   * Reset performance statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbackUsed: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    if (config.endpoint) this.endpoint = config.endpoint;
    if (config.model) this.model = config.model;
    if (config.temperature !== undefined) this.temperature = config.temperature;
    if (config.maxTokens) this.maxTokens = config.maxTokens;
    if (config.timeout) this.timeout = config.timeout;
    if (config.debug !== undefined) this.debug = config.debug;
    
    // Reset connection status to force recheck
    this.isConnected = false;
    this.lastConnectionCheck = 0;
  }
}

// Export singleton instance for use across the application
export const llmService = new LLMService({
  debug: true // Enable debug logging for development
});

// Export default class for custom instances
export default LLMService;