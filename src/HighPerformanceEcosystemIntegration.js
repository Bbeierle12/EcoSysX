/**
 * High-Performance Integration Module for EcoSysX
 * Optimizes existing simulator for 382GB VRAM and maximum FPS
 */

import GPUMemoryManager from './GPUMemoryManager.js';
import InstancedAgentRenderer from './InstancedAgentRenderer.js';
import GPUComputeSystem from './GPUComputeSystem.js';

class HighPerformanceEcosystemIntegration {
  constructor(renderer, scene, maxAgents = 50000) {
    this.renderer = renderer;
    this.scene = scene;
    this.maxAgents = maxAgents;
    
    // Performance systems
    this.gpuMemoryManager = new GPUMemoryManager();
    this.instancedRenderer = new InstancedAgentRenderer(scene, maxAgents);
    this.gpuComputeSystem = new GPUComputeSystem(renderer, maxAgents);
    
    // Performance optimization settings
    this.optimizationLevel = 'maximum'; // maximum, balanced, quality
    this.useGPUCompute = true;
    this.useInstancedRendering = true;
    this.useLevelOfDetail = true;
    this.targetFPS = 120;
    
    // Performance monitoring
    this.frameTimeHistory = [];
    this.lastPerformanceReport = 0;
    this.performanceStats = {
      avgFPS: 0,
      frameTime: 0,
      renderTime: 0,
      computeTime: 0,
      memoryUsage: 0,
      gpuUtilization: 0
    };
    
    console.log(`🚀 High-Performance EcoSysX initialized for ${maxAgents} agents (Target: ${this.targetFPS} FPS)`);
    this.initializeOptimizations();
  }

  initializeOptimizations() {
    // Configure renderer for maximum performance
    this.optimizeRenderer();
    
    // Set optimization level
    this.setOptimizationLevel(this.optimizationLevel);
    
    // Initialize performance monitoring
    this.startPerformanceMonitoring();
    
    console.log('✅ High-performance optimizations initialized');
  }

  optimizeRenderer() {
    // Configure renderer for 382GB VRAM
    this.renderer.capabilities.maxTextures = 32;
    this.renderer.capabilities.maxVertexTextures = 16;
    this.renderer.capabilities.maxTextureSize = 16384; // 16K textures with massive VRAM
    
    // Enable advanced features
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Optimize for high framerate
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance
    this.renderer.info.autoReset = false; // Manual reset for better monitoring
    
    console.log('🔧 Renderer optimized for 382GB VRAM');
  }

  // Enhanced agent management system
  addAgent(agent) {
    if (this.useInstancedRendering) {
      return this.instancedRenderer.addAgent(agent);
    } else {
      // Fallback to traditional mesh creation with memory management
      const mesh = this.gpuMemoryManager.getAgentMesh(agent);
      this.scene.add(mesh);
      return true;
    }
  }

  removeAgent(agent) {
    if (this.useInstancedRendering) {
      return this.instancedRenderer.removeAgent(agent);
    } else {
      if (agent.mesh) {
        this.scene.remove(agent.mesh);
        this.gpuMemoryManager.returnAgentMesh(agent.mesh);
        agent.mesh = null;
      }
    }
  }

  // High-performance simulation step
  performSimulationStep(agents, environment, deltaTime = 0.016) {
    const stepStartTime = performance.now();
    
    // GPU compute for agent AI (if enabled)
    let computeTime = 0;
    if (this.useGPUCompute && agents.length > 500) {
      computeTime = this.gpuComputeSystem.computeAgentUpdate(agents, deltaTime);
    } else {
      // CPU fallback for smaller populations
      this.performCPUAgentUpdate(agents, environment, deltaTime);
    }
    
    // Render update
    const renderStartTime = performance.now();
    this.updateRendering(agents, environment);
    const renderTime = performance.now() - renderStartTime;
    
    // Performance tracking
    const totalTime = performance.now() - stepStartTime;
    this.updatePerformanceStats(totalTime, renderTime, computeTime);
    
    // Adaptive optimization based on performance
    this.adaptiveOptimization(totalTime);
    
    return {
      totalTime,
      renderTime,
      computeTime,
      fps: 1000 / totalTime
    };
  }

  performCPUAgentUpdate(agents, environment, deltaTime) {
    // Efficient CPU-based update for smaller populations
    agents.forEach(agent => {
      if (agent.isActive) {
        // Simplified update for performance
        this.fastAgentUpdate(agent, agents, environment, deltaTime);
      }
    });
  }

  fastAgentUpdate(agent, agents, environment, deltaTime) {
    // Optimized agent update focusing on essential behaviors
    
    // Energy consumption
    const baseEnergyLoss = 0.5 * deltaTime * 60; // Per second
    const statusMultiplier = agent.status === 'Infected' ? 1.5 : 1.0;
    agent.energy = Math.max(0, agent.energy - baseEnergyLoss * statusMultiplier);
    
    // Simple movement
    if (agent.targetPosition || agent.velocity) {
      this.updateAgentMovement(agent, deltaTime);
    }
    
    // Disease progression (simplified)
    if (agent.status === 'Infected') {
      agent.infectionTimer += deltaTime * 60;
      if (agent.infectionTimer > 40) { // 40 seconds
        agent.status = 'Recovered';
        agent.energy = Math.min(100, agent.energy + 10);
      }
    }
    
    // Resource collection
    this.fastResourceCollection(agent, environment);
  }

  updateAgentMovement(agent, deltaTime) {
    if (agent.targetPosition) {
      // Move towards target
      const dx = agent.targetPosition.x - agent.position.x;
      const dz = agent.targetPosition.z - agent.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > 0.5) {
        const speed = agent.moveSpeed || 2.0;
        const moveDistance = speed * deltaTime;
        const moveRatio = Math.min(moveDistance / distance, 1.0);
        
        agent.position.x += dx * moveRatio;
        agent.position.z += dz * moveRatio;
      } else {
        agent.targetPosition = null;
      }
    }
    
    // Apply velocity
    if (agent.velocity) {
      agent.position.x += agent.velocity.x * deltaTime;
      agent.position.z += agent.velocity.z * deltaTime;
      
      // Damping
      agent.velocity.x *= 0.95;
      agent.velocity.z *= 0.95;
    }
    
    // Boundary constraints
    const bounds = 80;
    agent.position.x = Math.max(-bounds, Math.min(bounds, agent.position.x));
    agent.position.z = Math.max(-bounds, Math.min(bounds, agent.position.z));
  }

  fastResourceCollection(agent, environment) {
    // Spatial partitioning would go here for better performance
    // For now, simple distance check
    let closestResource = null;
    let minDistance = 3.0;
    
    environment.resources.forEach((resource, id) => {
      const dx = agent.position.x - resource.position.x;
      const dz = agent.position.z - resource.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestResource = { id, resource };
      }
    });
    
    if (closestResource) {
      const energyGain = closestResource.resource.value * (agent.phenotype?.efficiency || 1.0);
      agent.energy = Math.min(100, agent.energy + energyGain);
      environment.consumeResource(closestResource.id);
    }
  }

  updateRendering(agents, environment) {
    if (this.useInstancedRendering) {
      // Update instanced rendering
      this.instancedRenderer.batchUpdateAgents(agents);
      
      // Level of detail if enabled
      if (this.useLevelOfDetail && this.camera) {
        this.instancedRenderer.updateLOD(this.camera.position, agents);
      }
    } else {
      // Traditional mesh updates
      agents.forEach(agent => {
        if (agent.mesh) {
          agent.mesh.position.set(agent.position.x, agent.position.y, agent.position.z);
          this.gpuMemoryManager.updateMeshForAgent(agent.mesh, agent);
        }
      });
    }
  }

  updatePerformanceStats(totalTime, renderTime, computeTime) {
    this.frameTimeHistory.push(totalTime);
    if (this.frameTimeHistory.length > 60) { // Keep last 60 frames
      this.frameTimeHistory.shift();
    }
    
    // Calculate average FPS
    if (this.frameTimeHistory.length > 10) {
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      this.performanceStats.avgFPS = Math.round(1000 / avgFrameTime);
      this.performanceStats.frameTime = avgFrameTime;
    }
    
    this.performanceStats.renderTime = renderTime;
    this.performanceStats.computeTime = computeTime;
    
    // GPU memory usage
    if (this.renderer.info) {
      this.performanceStats.memoryUsage = this.renderer.info.memory;
      this.performanceStats.gpuUtilization = this.calculateGPUUtilization();
    }
    
    // Reset renderer info
    this.renderer.info.reset();
  }

  calculateGPUUtilization() {
    // Estimate GPU utilization based on various factors
    const memoryPressure = this.gpuMemoryManager.getMemoryUsage().memoryPressure;
    const renderComplexity = Math.min(1.0, this.renderer.info.render.triangles / 1000000); // 1M triangles as baseline
    const computeLoad = this.performanceStats.computeTime / this.performanceStats.frameTime;
    
    return Math.round((memoryPressure * 0.3 + renderComplexity * 0.4 + computeLoad * 0.3) * 100);
  }

  adaptiveOptimization(frameTime) {
    const targetFrameTime = 1000 / this.targetFPS;
    
    if (frameTime > targetFrameTime * 1.2) {
      // Performance is suffering, reduce quality
      this.reduceQuality();
    } else if (frameTime < targetFrameTime * 0.8) {
      // Performance headroom, increase quality
      this.increaseQuality();
    }
  }

  reduceQuality() {
    if (this.optimizationLevel === 'quality') {
      this.setOptimizationLevel('balanced');
    } else if (this.optimizationLevel === 'balanced') {
      this.setOptimizationLevel('maximum');
    }
    
    // Additional emergency optimizations
    if (this.performanceStats.avgFPS < this.targetFPS * 0.7) {
      this.enableEmergencyOptimizations();
    }
  }

  increaseQuality() {
    if (this.optimizationLevel === 'maximum' && this.performanceStats.avgFPS > this.targetFPS * 1.1) {
      this.setOptimizationLevel('balanced');
    } else if (this.optimizationLevel === 'balanced' && this.performanceStats.avgFPS > this.targetFPS * 1.2) {
      this.setOptimizationLevel('quality');
    }
  }

  enableEmergencyOptimizations() {
    console.log('🚨 Emergency optimizations activated');
    
    // Reduce render resolution temporarily
    const currentPixelRatio = this.renderer.getPixelRatio();
    if (currentPixelRatio > 1.0) {
      this.renderer.setPixelRatio(Math.max(1.0, currentPixelRatio * 0.8));
    }
    
    // Disable shadows temporarily
    this.renderer.shadowMap.enabled = false;
    
    // More aggressive LOD
    if (this.instancedRenderer) {
      this.instancedRenderer.setOptimizationLevel('maximum');
    }
  }

  setOptimizationLevel(level) {
    this.optimizationLevel = level;
    
    switch (level) {
      case 'maximum':
        this.useGPUCompute = true;
        this.useInstancedRendering = true;
        this.useLevelOfDetail = true;
        this.renderer.shadowMap.enabled = false;
        this.renderer.setPixelRatio(1.0);
        break;
        
      case 'balanced':
        this.useGPUCompute = true;
        this.useInstancedRendering = true;
        this.useLevelOfDetail = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
        break;
        
      case 'quality':
        this.useGPUCompute = false; // Use CPU for better accuracy
        this.useInstancedRendering = false; // Individual meshes for quality
        this.useLevelOfDetail = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(Math.min(2.0, window.devicePixelRatio));
        break;
    }
    
    console.log(`🔧 Optimization level set to: ${level}`);
    
    // Update subsystems
    if (this.instancedRenderer) {
      this.instancedRenderer.setOptimizationLevel(level);
    }
  }

  startPerformanceMonitoring() {
    setInterval(() => {
      this.reportPerformance();
    }, 5000); // Report every 5 seconds
  }

  reportPerformance() {
    const now = performance.now();
    if (now - this.lastPerformanceReport > 4500) { // Avoid overlap
      console.log(`📊 Performance Report:
        🎯 FPS: ${this.performanceStats.avgFPS} (Target: ${this.targetFPS})
        ⏱️ Frame: ${this.performanceStats.frameTime.toFixed(2)}ms
        🎨 Render: ${this.performanceStats.renderTime.toFixed(2)}ms
        🧮 Compute: ${this.performanceStats.computeTime.toFixed(2)}ms
        💾 GPU Util: ${this.performanceStats.gpuUtilization}%
        🔧 Mode: ${this.optimizationLevel}
        📈 Instances: ${this.instancedRenderer.getPerformanceStats().totalInstances}`);
      
      this.lastPerformanceReport = now;
    }
  }

  // Set camera reference for LOD calculations
  setCamera(camera) {
    this.camera = camera;
  }

  // Get comprehensive performance statistics
  getDetailedStats() {
    return {
      performance: this.performanceStats,
      optimization: {
        level: this.optimizationLevel,
        gpuCompute: this.useGPUCompute,
        instancedRendering: this.useInstancedRendering,
        levelOfDetail: this.useLevelOfDetail
      },
      memory: this.gpuMemoryManager.getMemoryUsage(),
      rendering: this.instancedRenderer.getPerformanceStats(),
      compute: this.gpuComputeSystem.getPerformanceStats(),
      recommendations: this.getOptimizationRecommendations()
    };
  }

  getOptimizationRecommendations() {
    const recommendations = [];
    
    if (this.performanceStats.avgFPS < this.targetFPS * 0.8) {
      recommendations.push('Consider reducing agent count or increasing optimization level');
    }
    
    if (this.performanceStats.gpuUtilization > 90) {
      recommendations.push('GPU at capacity - excellent utilization of 382GB VRAM');
    }
    
    if (this.performanceStats.renderTime > this.performanceStats.frameTime * 0.7) {
      recommendations.push('Render-bound - consider using instanced rendering');
    }
    
    if (this.performanceStats.computeTime > this.performanceStats.frameTime * 0.5) {
      recommendations.push('Compute-bound - GPU compute shaders recommended');
    }
    
    return recommendations;
  }

  dispose() {
    this.gpuMemoryManager.dispose();
    this.instancedRenderer.dispose();
    this.gpuComputeSystem.dispose();
    
    console.log('🗑️ High-Performance Integration disposed');
  }
}

export default HighPerformanceEcosystemIntegration;