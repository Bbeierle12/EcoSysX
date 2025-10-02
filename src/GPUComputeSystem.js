/**
 * GPU Compute Shader System for Agent AI Processing
 * Leverages 382GB VRAM for massive parallel AI computation
 */

import * as THREE from 'three';

class GPUComputeSystem {
  constructor(renderer, maxAgents = 50000) {
    this.renderer = renderer;
    this.maxAgents = maxAgents;
    this.computeRenderer = new THREE.WebGLRenderer({ 
      canvas: document.createElement('canvas'),
      context: null,
      alpha: false,
      antialias: false
    });
    
    // GPU compute targets for agent data
    this.agentPositionsTexture = null;
    this.agentStatesTexture = null;
    this.agentDecisionsTexture = null;
    this.neighborhoodTexture = null;
    
    // Compute shaders
    this.updatePositionsShader = null;
    this.calculateNeighborhoodShader = null;
    this.aiDecisionShader = null;
    this.diseaseSpreadShader = null;
    
    console.log(`🚀 GPU Compute System initialized for ${maxAgents} agents`);
    this.initializeComputeTargets();
    this.createComputeShaders();
  }

  initializeComputeTargets() {
    // Calculate texture dimensions (square texture for agent data)
    const textureSize = Math.ceil(Math.sqrt(this.maxAgents));
    console.log(`📊 Creating ${textureSize}x${textureSize} compute textures for ${this.maxAgents} agents`);

    // Agent positions (RGBA = x, y, z, energy)
    this.agentPositionsTexture = new THREE.WebGLRenderTarget(textureSize, textureSize, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping
    });

    // Agent states (RGBA = age, status, energy, reproductionCooldown)
    this.agentStatesTexture = new THREE.WebGLRenderTarget(textureSize, textureSize, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping
    });

    // AI decisions (RGBA = moveX, moveZ, action, confidence)
    this.agentDecisionsTexture = new THREE.WebGLRenderTarget(textureSize, textureSize, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping
    });

    // Neighborhood information (RGBA = nearbyCount, infectiousCount, resourceDistance, threatLevel)
    this.neighborhoodTexture = new THREE.WebGLRenderTarget(textureSize, textureSize, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping
    });

    console.log('✅ GPU compute targets initialized');
  }

  createComputeShaders() {
    // Neighborhood calculation shader
    this.calculateNeighborhoodShader = new THREE.ShaderMaterial({
      uniforms: {
        agentPositions: { value: null },
        agentStates: { value: null },
        textureSize: { value: Math.ceil(Math.sqrt(this.maxAgents)) },
        maxAgents: { value: this.maxAgents },
        neighborRadius: { value: 8.0 },
        worldBounds: { value: new THREE.Vector2(346, 346) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D agentPositions;
        uniform sampler2D agentStates;
        uniform float textureSize;
        uniform int maxAgents;
        uniform float neighborRadius;
        uniform vec2 worldBounds;
        varying vec2 vUv;

        void main() {
          int agentIndex = int(floor(vUv.x * textureSize) + floor(vUv.y * textureSize) * textureSize);
          
          if (agentIndex >= maxAgents) {
            gl_FragColor = vec4(0.0);
            return;
          }

          vec4 myPosition = texture2D(agentPositions, vUv);
          vec4 myState = texture2D(agentStates, vUv);
          
          if (myPosition.w <= 0.0) { // Dead agent (energy <= 0)
            gl_FragColor = vec4(0.0);
            return;
          }

          float nearbyCount = 0.0;
          float infectiousCount = 0.0;
          float minResourceDistance = 1000.0;
          float threatLevel = 0.0;

          // Check all other agents in a more efficient manner
          for (int y = 0; y < int(textureSize); y++) {
            for (int x = 0; x < int(textureSize); x++) {
              int otherIndex = x + y * int(textureSize);
              if (otherIndex >= maxAgents || otherIndex == agentIndex) continue;
              
              vec2 otherUV = vec2(float(x) + 0.5, float(y) + 0.5) / textureSize;
              vec4 otherPosition = texture2D(agentPositions, otherUV);
              vec4 otherState = texture2D(agentStates, otherUV);
              
              if (otherPosition.w <= 0.0) continue; // Skip dead agents
              
              float distance = length(myPosition.xyz - otherPosition.xyz);
              
              if (distance < neighborRadius) {
                nearbyCount += 1.0;
                
                // Check if infectious (status = 1.0 means infected)
                if (otherState.y > 0.9 && otherState.y < 1.1) {
                  infectiousCount += 1.0;
                  threatLevel += (neighborRadius - distance) / neighborRadius;
                }
              }
            }
          }

          gl_FragColor = vec4(nearbyCount, infectiousCount, minResourceDistance, threatLevel);
        }
      `
    });

    // AI decision making shader (simplified neural network)
    this.aiDecisionShader = new THREE.ShaderMaterial({
      uniforms: {
        agentPositions: { value: null },
        agentStates: { value: null },
        neighborhood: { value: null },
        textureSize: { value: Math.ceil(Math.sqrt(this.maxAgents)) },
        maxAgents: { value: this.maxAgents },
        time: { value: 0.0 },
        randomSeed: { value: Math.random() * 1000 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D agentPositions;
        uniform sampler2D agentStates;
        uniform sampler2D neighborhood;
        uniform float textureSize;
        uniform int maxAgents;
        uniform float time;
        uniform float randomSeed;
        varying vec2 vUv;

        // Simple neural network activation function
        float sigmoid(float x) {
          return 1.0 / (1.0 + exp(-x));
        }

        // Pseudo-random number generator
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123 + randomSeed);
        }

        // Simplified AI decision making
        vec4 makeDecision(vec4 position, vec4 state, vec4 neighbors) {
          float energy = position.w;
          float age = state.x;
          float status = state.y;
          float nearbyCount = neighbors.x;
          float threatLevel = neighbors.w;
          
          // Input layer (6 inputs)
          vec3 inputs1 = vec3(
            energy / 100.0,
            age / 200.0,
            status / 2.0
          );
          vec3 inputs2 = vec3(
            nearbyCount / 10.0,
            threatLevel,
            sin(time * 0.1) // Environmental factor
          );

          // Hidden layer weights (simplified)
          float h1 = sigmoid(dot(inputs1, vec3(0.8, -0.3, 0.5)) + dot(inputs2, vec3(-0.4, 0.7, 0.2)));
          float h2 = sigmoid(dot(inputs1, vec3(-0.2, 0.6, -0.8)) + dot(inputs2, vec3(0.5, -0.9, 0.3)));
          float h3 = sigmoid(dot(inputs1, vec3(0.4, -0.7, 0.1)) + dot(inputs2, vec3(-0.6, 0.2, 0.8)));

          // Output layer (movement and action)
          float moveX = sigmoid(h1 * 0.7 + h2 * -0.3 + h3 * 0.5) * 2.0 - 1.0;
          float moveZ = sigmoid(h1 * -0.4 + h2 * 0.8 + h3 * -0.2) * 2.0 - 1.0;
          float action = sigmoid(h1 * 0.3 + h2 * 0.5 + h3 * 0.9);
          float confidence = (h1 + h2 + h3) / 3.0;

          // Add randomness for exploration
          float randomFactor = random(vUv + time * 0.01);
          moveX += (randomFactor - 0.5) * 0.2;
          moveZ += (random(vUv * 2.0 + time * 0.01) - 0.5) * 0.2;

          // Threat avoidance (stronger influence when infected agents nearby)
          if (threatLevel > 0.3 && status < 0.5) { // Susceptible and threatened
            moveX *= -1.0; // Reverse direction
            moveZ *= -1.0;
            confidence *= 0.8;
          }

          return vec4(moveX, moveZ, action, confidence);
        }

        void main() {
          int agentIndex = int(floor(vUv.x * textureSize) + floor(vUv.y * textureSize) * textureSize);
          
          if (agentIndex >= maxAgents) {
            gl_FragColor = vec4(0.0);
            return;
          }

          vec4 position = texture2D(agentPositions, vUv);
          vec4 state = texture2D(agentStates, vUv);
          vec4 neighbors = texture2D(neighborhood, vUv);
          
          if (position.w <= 0.0) { // Dead agent
            gl_FragColor = vec4(0.0);
            return;
          }

          vec4 decision = makeDecision(position, state, neighbors);
          gl_FragColor = decision;
        }
      `
    });

    // Position update shader
    this.updatePositionsShader = new THREE.ShaderMaterial({
      uniforms: {
        agentPositions: { value: null },
        agentStates: { value: null },
        agentDecisions: { value: null },
        textureSize: { value: Math.ceil(Math.sqrt(this.maxAgents)) },
        maxAgents: { value: this.maxAgents },
        deltaTime: { value: 0.016 }, // ~60fps
        worldBounds: { value: new THREE.Vector2(173, 173) },
        moveSpeed: { value: 1.5 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D agentPositions;
        uniform sampler2D agentStates;
        uniform sampler2D agentDecisions;
        uniform float textureSize;
        uniform int maxAgents;
        uniform float deltaTime;
        uniform vec2 worldBounds;
        uniform float moveSpeed;
        varying vec2 vUv;

        void main() {
          int agentIndex = int(floor(vUv.x * textureSize) + floor(vUv.y * textureSize) * textureSize);
          
          if (agentIndex >= maxAgents) {
            gl_FragColor = vec4(0.0);
            return;
          }

          vec4 currentPos = texture2D(agentPositions, vUv);
          vec4 state = texture2D(agentStates, vUv);
          vec4 decision = texture2D(agentDecisions, vUv);
          
          if (currentPos.w <= 0.0) { // Dead agent
            gl_FragColor = vec4(0.0);
            return;
          }

          // Apply movement based on AI decision
          vec3 newPosition = currentPos.xyz;
          newPosition.x += decision.x * moveSpeed * deltaTime;
          newPosition.z += decision.y * moveSpeed * deltaTime;
          
          // Boundary checking and bouncing
          if (abs(newPosition.x) > worldBounds.x) {
            newPosition.x = sign(newPosition.x) * worldBounds.x;
          }
          if (abs(newPosition.z) > worldBounds.y) {
            newPosition.z = sign(newPosition.z) * worldBounds.y;
          }

          // Energy consumption
          float energyConsumption = 0.5 * deltaTime * 60.0; // 0.5 per second
          if (state.y > 0.9) energyConsumption *= 1.5; // Infected agents consume more
          
          float newEnergy = max(0.0, currentPos.w - energyConsumption);

          gl_FragColor = vec4(newPosition, newEnergy);
        }
      `
    });

    // Disease spread shader
    this.diseaseSpreadShader = new THREE.ShaderMaterial({
      uniforms: {
        agentPositions: { value: null },
        agentStates: { value: null },
        neighborhood: { value: null },
        textureSize: { value: Math.ceil(Math.sqrt(this.maxAgents)) },
        maxAgents: { value: this.maxAgents },
        infectiousRadius: { value: 5.0 },
        infectionRate: { value: 0.15 },
        recoveryTime: { value: 40.0 },
        randomSeed: { value: Math.random() * 1000 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D agentPositions;
        uniform sampler2D agentStates;
        uniform sampler2D neighborhood;
        uniform float textureSize;
        uniform int maxAgents;
        uniform float infectiousRadius;
        uniform float infectionRate;
        uniform float recoveryTime;
        uniform float randomSeed;
        varying vec2 vUv;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123 + randomSeed);
        }

        void main() {
          int agentIndex = int(floor(vUv.x * textureSize) + floor(vUv.y * textureSize) * textureSize);
          
          if (agentIndex >= maxAgents) {
            gl_FragColor = vec4(0.0);
            return;
          }

          vec4 position = texture2D(agentPositions, vUv);
          vec4 state = texture2D(agentStates, vUv);
          vec4 neighbors = texture2D(neighborhood, vUv);
          
          if (position.w <= 0.0) { // Dead agent
            gl_FragColor = vec4(0.0);
            return;
          }

          float age = state.x;
          float status = state.y; // 0.0 = Susceptible, 1.0 = Infected, 2.0 = Recovered
          float energy = position.w;
          float reproductionCooldown = state.w;
          float infectionTimer = state.z;

          // Update age
          age += 1.0;

          // Update reproduction cooldown
          reproductionCooldown = max(0.0, reproductionCooldown - 1.0);

          // Disease progression
          if (status > 0.9 && status < 1.1) { // Currently infected
            infectionTimer += 1.0;
            if (infectionTimer > recoveryTime) {
              status = 2.0; // Recovered
              energy = min(100.0, energy + 10.0); // Recovery bonus
            }
          } else if (status < 0.1) { // Currently susceptible
            float infectiousCount = neighbors.y;
            if (infectiousCount > 0.0) {
              float infectionProbability = infectionRate * infectiousCount / 10.0;
              if (random(vUv) < infectionProbability) {
                status = 1.0; // Infected
                infectionTimer = 0.0;
              }
            }
          }

          gl_FragColor = vec4(age, status, infectionTimer, reproductionCooldown);
        }
      `
    });

    console.log('✅ GPU compute shaders created');
  }

  // Update all agents using GPU compute
  computeAgentUpdate(agents, deltaTime) {
    const startTime = performance.now();
    
    // Upload agent data to GPU textures
    this.uploadAgentData(agents);
    
    // Execute compute passes
    this.executeComputePass('neighborhood');
    this.executeComputePass('decisions');
    this.executeComputePass('positions', { deltaTime });
    this.executeComputePass('disease');
    
    // Download results back to agents
    this.downloadAgentData(agents);
    
    const computeTime = performance.now() - startTime;
    
    if (computeTime > 16) { // Log if slower than 60fps
      console.log(`🔧 GPU compute: ${agents.length} agents processed in ${computeTime.toFixed(2)}ms`);
    }
    
    return computeTime;
  }

  uploadAgentData(agents) {
    const textureSize = Math.ceil(Math.sqrt(this.maxAgents));
    const positionsData = new Float32Array(textureSize * textureSize * 4);
    const statesData = new Float32Array(textureSize * textureSize * 4);
    
    agents.forEach((agent, index) => {
      if (index >= this.maxAgents) return;
      
      const i = index * 4;
      
      // Positions (x, y, z, energy)
      positionsData[i] = agent.position.x;
      positionsData[i + 1] = agent.position.y;
      positionsData[i + 2] = agent.position.z;
      positionsData[i + 3] = agent.energy;
      
      // States (age, status, infectionTimer, reproductionCooldown)
      statesData[i] = agent.age || 0;
      statesData[i + 1] = agent.status === 'Susceptible' ? 0 : 
                          agent.status === 'Infected' ? 1 : 2;
      statesData[i + 2] = agent.infectionTimer || 0;
      statesData[i + 3] = agent.reproductionCooldown || 0;
    });
    
    // Upload to GPU
    this.uploadTextureData(this.agentPositionsTexture, positionsData, textureSize);
    this.uploadTextureData(this.agentStatesTexture, statesData, textureSize);
  }

  uploadTextureData(renderTarget, data, textureSize) {
    const texture = new THREE.DataTexture(data, textureSize, textureSize, THREE.RGBAFormat, THREE.FloatType);
    texture.needsUpdate = true;
    
    // Use a temporary scene to upload data
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    
    // Cleanup
    texture.dispose();
    geometry.dispose();
    material.dispose();
  }

  executeComputePass(passType, params = {}) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    let material, renderTarget;
    
    switch (passType) {
      case 'neighborhood':
        material = this.calculateNeighborhoodShader.clone();
        material.uniforms.agentPositions.value = this.agentPositionsTexture.texture;
        material.uniforms.agentStates.value = this.agentStatesTexture.texture;
        renderTarget = this.neighborhoodTexture;
        break;
        
      case 'decisions':
        material = this.aiDecisionShader.clone();
        material.uniforms.agentPositions.value = this.agentPositionsTexture.texture;
        material.uniforms.agentStates.value = this.agentStatesTexture.texture;
        material.uniforms.neighborhood.value = this.neighborhoodTexture.texture;
        material.uniforms.time.value = performance.now() * 0.001;
        renderTarget = this.agentDecisionsTexture;
        break;
        
      case 'positions':
        material = this.updatePositionsShader.clone();
        material.uniforms.agentPositions.value = this.agentPositionsTexture.texture;
        material.uniforms.agentStates.value = this.agentStatesTexture.texture;
        material.uniforms.agentDecisions.value = this.agentDecisionsTexture.texture;
        material.uniforms.deltaTime.value = params.deltaTime || 0.016;
        renderTarget = this.agentPositionsTexture;
        break;
        
      case 'disease':
        material = this.diseaseSpreadShader.clone();
        material.uniforms.agentPositions.value = this.agentPositionsTexture.texture;
        material.uniforms.agentStates.value = this.agentStatesTexture.texture;
        material.uniforms.neighborhood.value = this.neighborhoodTexture.texture;
        material.uniforms.randomSeed.value = Math.random() * 1000;
        renderTarget = this.agentStatesTexture;
        break;
        
      default:
        console.warn(`Unknown compute pass: ${passType}`);
        return;
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    
    // Cleanup
    geometry.dispose();
    material.dispose();
  }

  downloadAgentData(agents) {
    // Read back position and state data from GPU
    const textureSize = Math.ceil(Math.sqrt(this.maxAgents));
    const positionsBuffer = new Float32Array(textureSize * textureSize * 4);
    const statesBuffer = new Float32Array(textureSize * textureSize * 4);
    
    this.renderer.readRenderTargetPixels(this.agentPositionsTexture, 0, 0, textureSize, textureSize, positionsBuffer);
    this.renderer.readRenderTargetPixels(this.agentStatesTexture, 0, 0, textureSize, textureSize, statesBuffer);
    
    // Update agent objects with GPU results
    agents.forEach((agent, index) => {
      if (index >= this.maxAgents) return;
      
      const i = index * 4;
      
      // Update positions
      agent.position.x = positionsBuffer[i];
      agent.position.y = positionsBuffer[i + 1];
      agent.position.z = positionsBuffer[i + 2];
      agent.energy = positionsBuffer[i + 3];
      
      // Update states
      agent.age = statesBuffer[i];
      const status = statesBuffer[i + 1];
      agent.status = status < 0.5 ? 'Susceptible' : 
                     status < 1.5 ? 'Infected' : 'Recovered';
      agent.infectionTimer = statesBuffer[i + 2];
      agent.reproductionCooldown = statesBuffer[i + 3];
      
      // Update mesh if available
      if (agent.mesh) {
        agent.mesh.position.set(agent.position.x, agent.position.y, agent.position.z);
        agent.updateMeshColor();
      }
    });
  }

  // Get compute performance statistics
  getPerformanceStats() {
    return {
      maxAgents: this.maxAgents,
      textureSize: Math.ceil(Math.sqrt(this.maxAgents)),
      gpuMemoryUsage: this.estimateGPUMemory(),
      computeCapability: 'Shader-based parallel processing',
      parallelThreads: Math.ceil(Math.sqrt(this.maxAgents)) ** 2
    };
  }

  estimateGPUMemory() {
    const textureSize = Math.ceil(Math.sqrt(this.maxAgents));
    const bytesPerTexel = 4 * 4; // 4 floats * 4 bytes each
    const texturesCount = 4; // positions, states, decisions, neighborhood
    
    const memoryBytes = textureSize * textureSize * bytesPerTexel * texturesCount;
    return `${(memoryBytes / 1048576).toFixed(2)} MB`;
  }

  dispose() {
    // Dispose all compute targets
    [this.agentPositionsTexture, this.agentStatesTexture, 
     this.agentDecisionsTexture, this.neighborhoodTexture].forEach(target => {
      if (target) target.dispose();
    });
    
    // Dispose shaders
    [this.updatePositionsShader, this.calculateNeighborhoodShader, 
     this.aiDecisionShader, this.diseaseSpreadShader].forEach(shader => {
      if (shader) shader.dispose();
    });
    
    this.computeRenderer.dispose();
    console.log('🗑️ GPU Compute System disposed');
  }
}

export default GPUComputeSystem;