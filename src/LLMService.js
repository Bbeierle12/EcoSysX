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
    // Support both Ollama and Llama service backends
    this.backend = config.backend || 'auto'; // 'ollama', 'llama', or 'auto'
    this.ollamaEndpoint = config.ollamaEndpoint || 'http://localhost:11434';
    this.llamaEndpoint = config.llamaEndpoint || 'http://localhost:8000';
    this.endpoint = this.ollamaEndpoint; // Default to Ollama for backward compatibility
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
    this.activeBackend = null; // 'ollama' or 'llama'
    this.availableModels = [];
    this.lastConnectionCheck = 0;
    
    // Debug logging
    this.debug = config.debug || false;
  }

  /**
   * Check connection and retrieve available models
   * Supports both Ollama and Llama service backends
   */
  async checkConnection() {
    const now = Date.now();
    
    // Don't check too frequently (cache for 30 seconds)
    if (now - this.lastConnectionCheck < 30000 && this.isConnected) {
      return this.isConnected;
    }
    
    // Try Llama service first if in auto mode
    if (this.backend === 'auto' || this.backend === 'llama') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${this.llamaEndpoint}/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.model_loaded) {
            this.isConnected = true;
            this.activeBackend = 'llama';
            this.endpoint = this.llamaEndpoint;
            this.lastConnectionCheck = now;
            
            if (this.debug) {
              console.log(`🤖 LLM Service: Connected to Llama service (${data.model})`);
            }
            return true;
          }
        }
      } catch (error) {
        if (this.debug && this.backend === 'llama') {
          console.log(`🤖 LLM Service: Llama service not available - ${error.message}`);
        }
      }
    }
    
    // Fall back to Ollama
    if (this.backend === 'auto' || this.backend === 'ollama') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${this.ollamaEndpoint}/api/tags`, {
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
          
          if (this.isConnected) {
            this.activeBackend = 'ollama';
            this.endpoint = this.ollamaEndpoint;
            this.lastConnectionCheck = now;
            
            if (this.debug) {
              console.log(`🤖 LLM Service: Connected to Ollama, ${this.availableModels.length} models available`);
            }
            return true;
          }
        }
      } catch (error) {
        if (this.debug && this.backend === 'ollama') {
          console.log(`🤖 LLM Service: Ollama not available - ${error.message}`);
        }
      }
    }
    
    this.isConnected = false;
    this.activeBackend = null;
    return false;
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
    
    // Calculate dynamic context with enhanced environmental factors
    const populationPressure = agents.length > 50 ? 'high' : agents.length < 20 ? 'low' : 'moderate';
    const infectionRisk = nearbyInfected > 2 ? 'critical' : nearbyInfected > 0 ? 'high' : 'low';
    const energyStatus = energy < 20 ? 'critical' : energy < 40 ? 'low' : energy > 70 ? 'abundant' : 'moderate';
    const resourceAvailability = nearestResourceDistance < 5 ? 'immediate' : nearestResourceDistance < 15 ? 'nearby' : 'distant';
    
    // Social context analysis
    const socialContext = nearbyAgents.length > 0 ? this.analyzeSocialContext(nearbyAgents) : 'isolated';
    const agentTypes = nearbyAgents.reduce((acc, agent) => {
      acc[agent.type] = (acc[agent.type] || 0) + 1;
      return acc;
    }, {});
    
    // Enhanced survival analysis
    const survivalThreats = [];
    if (energy < 30) survivalThreats.push('energy_depletion');
    if (nearbyInfected > 0) survivalThreats.push('infection_risk');
    if (age > 150) survivalThreats.push('aging');
    if (nearestResourceDistance > 20) survivalThreats.push('resource_scarcity');

    const systemPrompt = `You are an intelligent agent in a complex ecosystem simulation. Make strategic survival decisions based on current conditions.

AGENT PROFILE:
- ID: ${id}
- Age: ${age} simulation steps (lifespan ~200 steps)  
- Personality: ${personality}
- Energy: ${energy}% (${energyStatus} - critical threshold: 20%)
- Health Status: ${status}
- Survival Threats: ${survivalThreats.length > 0 ? survivalThreats.join(', ') : 'none immediate'}

ENVIRONMENTAL SITUATION:
- Population Pressure: ${populationPressure} (${agents.length} agents total)
- Social Context: ${socialContext}
- Nearby Agents: ${nearbyCount} (Types: ${JSON.stringify(agentTypes)})
- Infection Risk: ${infectionRisk} (${nearbyInfected} infected agents nearby)
- Resource Availability: ${resourceAvailability} (nearest at ${nearestResourceDistance.toFixed(1)} units)

DECISION PRIORITIES (in order):
1. SURVIVAL: Avoid death from energy depletion (<20% = critical danger zone)
2. DISEASE AVOIDANCE: Maintain distance from infected agents (red agents spread disease)
3. ENERGY MANAGEMENT: Locate and consume resources when energy drops below 60%
4. REPRODUCTION: Consider reproduction when energy >70% and age >30 steps
5. SOCIAL STRATEGY: Leverage nearby agents for information or cooperation
6. EXPLORATION: Discover new areas when immediate needs are met

REASONING GUIDELINES:
- Be specific about WHY you're making each decision
- Consider both immediate and long-term consequences  
- Factor in your personality traits (${personality} agents have different risk tolerances)
- Account for environmental pressures and social dynamics
- Prioritize survival over all other goals

OUTPUT FORMAT - Respond with valid JSON only:
{
  "reasoning": "Clear explanation of your decision logic and key factors considered",
  "action": "primary_action",
  "intensity": 0.8,
  "direction": "strategic_direction", 
  "confidence": 0.9
}

Valid actions: forage, avoid, reproduce, explore, rest, help
Valid directions: toward_resource, away_from_infected, toward_agents, random
Intensity: 0.1 (minimal) to 1.0 (maximum effort)
Confidence: 0.1 (uncertain) to 1.0 (very confident)

Analyze your situation and make your decision now:`;

    return systemPrompt;
  }

  analyzeSocialContext(nearbyAgents) {
    if (nearbyAgents.length === 0) return 'isolated';
    
    const infected = nearbyAgents.filter(a => a.status === 'Infected').length;
    const recovered = nearbyAgents.filter(a => a.status === 'Recovered').length;
    const causalAgents = nearbyAgents.filter(a => a.type === 'CausalAgent').length;
    
    if (infected > nearbyAgents.length * 0.6) return 'high_infection_zone';
    if (recovered > nearbyAgents.length * 0.5) return 'recovery_community';
    if (causalAgents > nearbyAgents.length * 0.7) return 'intelligent_cluster';
    if (nearbyAgents.length > 5) return 'crowded';
    return 'social_group';
  }

  /**
   * Send request to active LLM backend (Ollama or Llama service)
   */
  async callLLM(prompt, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    
    // Check connection first with enhanced validation
    const isConnected = await this.checkConnection();
    if (!isConnected) {
      this.stats.failedRequests++;
      throw new Error('LLM service not available - Neither Ollama nor Llama service are accessible');
    }
    
    // Route to appropriate backend
    if (this.activeBackend === 'llama') {
      return this.callLlamaService(prompt, options, startTime);
    } else {
      return this.callOllamaService(prompt, options, startTime);
    }
  }

  /**
   * Send request to Llama service
   */
  async callLlamaService(prompt, options = {}, startTime) {
    const temperature = options.temperature || this.temperature;
    const maxTokens = options.maxTokens || this.maxTokens;
    
    // Extract agent data from prompt for Llama service format
    const agentData = this.extractAgentDataFromPrompt(prompt);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const requestBody = {
        agent: agentData,
        max_tokens: maxTokens,
        temperature: temperature
      };
      
      if (this.debug) {
        console.log(`🤖 Llama Service Request:`, { agentData, temperature, maxTokens });
      }
      
      const response = await fetch(`${this.llamaEndpoint}/generate`, {
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
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.fallback) {
        throw new Error('Llama service returned fallback response');
      }
      
      // Update performance stats
      const responseTime = Date.now() - startTime;
      this.stats.successfulRequests++;
      this.stats.totalResponseTime += responseTime;
      this.stats.avgResponseTime = this.stats.totalResponseTime / this.stats.successfulRequests;
      
      if (this.debug) {
        console.log(`🤖 Llama Service Response (${responseTime}ms):`, {
          action: data.decision.action,
          confidence: data.decision.confidence,
          parsed: data.decision.parsed
        });
      }
      
      // Convert Llama service response to standard format
      return {
        response: JSON.stringify(data.decision),
        model: data.model,
        responseTime: data.response_time || responseTime,
        success: true,
        metadata: {
          backend: 'llama',
          parsed: data.decision.parsed
        }
      };
      
    } catch (error) {
      this.stats.failedRequests++;
      
      if (this.debug) {
        console.error(`🤖 Llama Service Request failed:`, error.message);
      }
      
      throw error;
    }
  }

  /**
   * Extract agent data from prompt for Llama service
   */
  extractAgentDataFromPrompt(prompt) {
    // Extract key values using regex
    const extractValue = (pattern) => {
      const match = prompt.match(pattern);
      return match ? match[1].trim() : null;
    };
    
    const extractNumber = (pattern) => {
      const value = extractValue(pattern);
      return value ? parseFloat(value) : 0;
    };
    
    return {
      id: extractValue(/ID:\s*([^\n]+)/) || 'unknown',
      energy: extractNumber(/Energy:\s*(\d+)%/),
      age: extractNumber(/Age:\s*(\d+)/),
      personality: extractValue(/Personality:\s*([^\n]+)/) || 'Balanced',
      status: extractValue(/Health Status:\s*([^\n]+)/) || 'Healthy',
      knownResources: extractNumber(/nearest at\s*([\d.]+)\s*units/) ? 1 : 0,
      knownAgents: extractNumber(/Nearby Agents:\s*(\d+)/),
      dangerZones: 0,
      nearbyInfected: extractNumber(/(\d+)\s*infected agents nearby/),
      recentMemory: prompt.substring(0, 200)
    };
  }

  /**
   * Send request to Ollama API
   */
  async callOllamaService(prompt, options = {}, startTime) {
    
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
          stop: ["\n\nHuman:", "###", "\n---"],
          // Enhanced stop sequences for better response quality
          repeat_penalty: 1.1,
          seed: options.seed || -1 // Allow deterministic responses if seed provided
        }
      };
      
      if (this.debug) {
        console.log(`🤖 LLM Request to ${model}:`, { 
          promptLength: prompt.length, 
          temperature, 
          maxTokens,
          timeout: this.timeout
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
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.response || data.response.trim().length === 0) {
        throw new Error('Empty or invalid response from LLM model');
      }
      
      // Enhanced response validation
      if (data.response.length < 10) {
        console.warn(`🤖 Suspiciously short LLM response: "${data.response}"`);
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
          done: data.done,
          totalDuration: data.total_duration,
          loadDuration: data.load_duration,
          promptEvalCount: data.prompt_eval_count,
          evalCount: data.eval_count
        });
      }
      
      return {
        response: data.response.trim(),
        model: model,
        responseTime: responseTime,
        success: true,
        metadata: {
          totalDuration: data.total_duration,
          loadDuration: data.load_duration,
          promptEvalCount: data.prompt_eval_count,
          evalCount: data.eval_count,
          evalDuration: data.eval_duration
        }
      };
      
    } catch (error) {
      this.stats.failedRequests++;
      
      let errorMessage = error.message;
      let errorType = 'unknown';
      
      if (error.name === 'AbortError') {
        errorType = 'timeout';
        errorMessage = `Request timed out after ${this.timeout}ms`;
      } else if (error.message.includes('ECONNREFUSED')) {
        errorType = 'connection_refused';
        errorMessage = 'Connection refused - Ollama may not be running';
      } else if (error.message.includes('fetch')) {
        errorType = 'network';
        errorMessage = 'Network error - Check Ollama endpoint configuration';
      }
      
      if (this.debug) {
        console.error(`🤖 LLM Request failed (${errorType}):`, {
          endpoint: this.endpoint,
          model: model,
          error: error.message,
          timeout: this.timeout,
          attempt: this.stats.totalRequests
        });
      }
      
      // Enhanced error for better debugging
      const enhancedError = new Error(`LLM request failed (${errorType}): ${errorMessage}`);
      enhancedError.type = errorType;
      enhancedError.originalError = error;
      enhancedError.endpoint = this.endpoint;
      enhancedError.model = model;
      
      throw enhancedError;
    }
  }

  /**
   * Parse LLM response for agent decision
   */
  parseLLMResponse(response) {
    try {
      // Enhanced JSON extraction with multiple fallback patterns
      let jsonStr = null;
      
      // Try to find JSON object in response
      const jsonMatches = [
        response.match(/\{[\s\S]*\}/), // Standard JSON object
        response.match(/```json\s*([\s\S]*?)\s*```/), // JSON in code blocks
        response.match(/```\s*([\s\S]*?)\s*```/), // Generic code blocks
        response.match(/\{\s*["\']reasoning["\'][\s\S]*\}/) // Reasoning-specific pattern
      ];
      
      for (const match of jsonMatches) {
        if (match) {
          jsonStr = match[1] || match[0];
          break;
        }
      }
      
      if (jsonStr) {
        // Clean up common JSON formatting issues
        jsonStr = jsonStr
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .trim();
          
        const parsed = JSON.parse(jsonStr);
        
        // Enhanced validation with better defaults
        if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
          throw new Error('Missing or invalid reasoning field');
        }
        
        const normalizedResponse = {
          reasoning: String(parsed.reasoning).substring(0, 800), // Increased limit for better reasoning
          action: this.validateAction(parsed.action),
          intensity: this.clamp(parseFloat(parsed.intensity) || 0.6, 0.1, 1.0),
          direction: this.validateDirection(parsed.direction),
          confidence: this.clamp(parseFloat(parsed.confidence) || 0.7, 0.1, 1.0),
          // Additional metadata for debugging
          originalAction: parsed.action,
          originalDirection: parsed.direction,
          parseMethod: 'json'
        };
        
        return {
          ...normalizedResponse,
          raw: response,
          success: true,
          parsed: true
        };
      } else {
        // Enhanced fallback: extract reasoning from natural language with better heuristics
        return this.parseNaturalLanguageResponse(response);
      }
    } catch (error) {
      console.warn(`🤖 JSON parsing failed: ${error.message}, attempting natural language parsing`);
      
      // Try natural language parsing as fallback
      const nlResult = this.parseNaturalLanguageResponse(response);
      
      if (nlResult.confidence > 0.3) {
        return nlResult;
      }
      
      // Last resort: return a safe default decision
      return {
        reasoning: `Failed to parse LLM response: "${error.message}". Using conservative survival strategy.`,
        action: "explore",
        intensity: 0.4,
        direction: "random",
        confidence: 0.2,
        raw: response,
        success: false,
        parsed: false,
        error: error.message,
        parseMethod: 'emergency_fallback'
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
    let reasoning = response.substring(0, 300);
    
    // Enhanced action detection with priority scoring
    const actionPatterns = {
      forage: {
        keywords: ['food', 'forage', 'resource', 'energy', 'eat', 'hungry', 'starv', 'feed', 'nourish'],
        priority: 0,
        defaultIntensity: 0.8,
        defaultDirection: 'toward_resource'
      },
      avoid: {
        keywords: ['avoid', 'flee', 'escape', 'danger', 'infected', 'disease', 'sick', 'threat', 'run', 'away'],
        priority: 0,
        defaultIntensity: 0.9,
        defaultDirection: 'away_from_infected'
      },
      reproduce: {
        keywords: ['reproduce', 'mate', 'offspring', 'breed', 'procreate', 'family', 'children'],
        priority: 0,
        defaultIntensity: 0.3,
        defaultDirection: 'toward_agents'
      },
      rest: {
        keywords: ['rest', 'wait', 'conserve', 'pause', 'stay', 'idle', 'calm', 'recover'],
        priority: 0,
        defaultIntensity: 0.1,
        defaultDirection: 'random'
      },
      help: {
        keywords: ['help', 'assist', 'aid', 'support', 'cooperate', 'share', 'collaborate'],
        priority: 0,
        defaultIntensity: 0.6,
        defaultDirection: 'toward_agents'
      },
      explore: {
        keywords: ['explore', 'search', 'wander', 'discover', 'investigate', 'scout', 'roam'],
        priority: 0,
        defaultIntensity: 0.5,
        defaultDirection: 'random'
      }
    };
    
    // Score each action based on keyword presence and context
    Object.entries(actionPatterns).forEach(([actionName, pattern]) => {
      pattern.keywords.forEach(keyword => {
        const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
        pattern.priority += matches;
        
        // Bonus for keywords in key positions (beginning, emphasis)
        if (text.indexOf(keyword) < 50) pattern.priority += 0.5; // Early mention
        if (text.includes(`"${keyword}"`) || text.includes(`*${keyword}*`)) pattern.priority += 0.5; // Emphasis
      });
    });
    
    // Select action with highest priority
    const selectedAction = Object.entries(actionPatterns)
      .sort(([,a], [,b]) => b.priority - a.priority)[0];
    
    if (selectedAction[1].priority > 0) {
      action = selectedAction[0];
      intensity = selectedAction[1].defaultIntensity;
      direction = selectedAction[1].defaultDirection;
      confidence = Math.min(0.8, 0.4 + selectedAction[1].priority * 0.1);
    }
    
    // Intensity modifiers based on context
    const urgencyKeywords = ['urgent', 'critical', 'immediate', 'emergency', 'crucial', 'vital'];
    const cautionKeywords = ['careful', 'slow', 'gentle', 'cautious', 'gradual', 'moderate'];
    
    if (urgencyKeywords.some(keyword => text.includes(keyword))) {
      intensity = Math.min(1.0, intensity + 0.3);
      confidence += 0.1;
    }
    
    if (cautionKeywords.some(keyword => text.includes(keyword))) {
      intensity = Math.max(0.1, intensity - 0.2);
      confidence += 0.05;
    }
    
    // Confidence modifiers
    const confidenceKeywords = ['certain', 'sure', 'confident', 'definitely', 'clearly'];
    const uncertaintyKeywords = ['maybe', 'perhaps', 'might', 'possibly', 'uncertain', 'unclear'];
    
    if (confidenceKeywords.some(keyword => text.includes(keyword))) {
      confidence = Math.min(1.0, confidence + 0.2);
    }
    
    if (uncertaintyKeywords.some(keyword => text.includes(keyword))) {
      confidence = Math.max(0.2, confidence - 0.2);
    }
    
    // Extract reasoning if available
    const reasoningPatterns = [
      /because\s+([^.!?]+)/i,
      /reasoning:\s*([^.!?\n]+)/i,
      /i think\s+([^.!?]+)/i,
      /therefore\s+([^.!?]+)/i,
      /since\s+([^.!?]+)/i
    ];
    
    for (const pattern of reasoningPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        reasoning = match[1].trim() + ". " + reasoning.substring(0, 200);
        confidence += 0.1;
        break;
      }
    }

    return {
      reasoning: reasoning,
      action: action,
      intensity: intensity,
      direction: direction,
      confidence: Math.min(1.0, confidence),
      raw: response,
      success: true,
      parsed: false, // Natural language parsing
      parseMethod: 'natural_language',
      actionPriorities: Object.fromEntries(
        Object.entries(actionPatterns).map(([name, pattern]) => [name, pattern.priority])
      )
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