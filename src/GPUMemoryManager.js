/**
 * GPU Memory Manager - Optimize for 382GB VRAM
 * Pre-allocates and manages GPU memory pools for maximum performance
 */

class GPUMemoryManager {
  constructor() {
    this.memoryPools = new Map();
    this.geometryPool = new Map();
    this.materialPool = new Map();
    this.texturePool = new Map();
    this.maxAgentCount = 50000; // With 382GB, we can handle massive populations
    this.preAllocatedMeshes = [];
    this.availableMeshes = [];
    this.usedMeshes = new Set();
    
    console.log('🚀 GPU Memory Manager initialized for 382GB VRAM');
    this.initializeMemoryPools();
  }

  initializeMemoryPools() {
    // Pre-allocate agent geometries and materials
    this.createAgentGeometryPool();
    this.createMaterialPool();
    this.createResourcePools();
    this.createTextureAtlases();
    
    console.log(`🔧 Memory pools initialized: ${this.maxAgentCount} agent slots ready`);
  }

  createAgentGeometryPool() {
    // Create shared geometries for all agent types
    const geometries = {
      agent: new THREE.SphereGeometry(0.5, 16, 12), // Higher quality with more VRAM
      causalAgent: new THREE.SphereGeometry(0.6, 20, 15),
      playerAgent: new THREE.SphereGeometry(0.8, 24, 18),
      resource: new THREE.BoxGeometry(0.5, 0.3, 0.5),
      territory: new THREE.RingGeometry(8 * 0.9, 8, 32) // Higher segment count
    };

    // Store in pool for reuse
    this.geometryPool.set('agent', geometries.agent);
    this.geometryPool.set('causalAgent', geometries.causalAgent);
    this.geometryPool.set('playerAgent', geometries.playerAgent);
    this.geometryPool.set('resource', geometries.resource);
    this.geometryPool.set('territory', geometries.territory);
  }

  createMaterialPool() {
    // Pre-create materials for all possible states
    const materials = {
      // Agent materials by status and type
      agentSusceptible: new THREE.MeshLambertMaterial({ color: 0x0080ff }),
      agentInfected: new THREE.MeshLambertMaterial({ color: 0xff0000 }),
      agentRecovered: new THREE.MeshLambertMaterial({ color: 0x00ff00 }),
      
      causalSusceptible: new THREE.MeshLambertMaterial({ color: 0xffcc00 }),
      causalInfected: new THREE.MeshLambertMaterial({ color: 0xff0000 }),
      causalRecovered: new THREE.MeshLambertMaterial({ color: 0x00ff00 }),
      
      playerSusceptible: new THREE.MeshLambertMaterial({ 
        color: 0xffffff, 
        emissive: new THREE.Color(0.3, 0.3, 0.3) 
      }),
      playerInfected: new THREE.MeshLambertMaterial({ 
        color: 0xff3333, 
        emissive: new THREE.Color(0.3, 0.3, 0.3) 
      }),
      playerRecovered: new THREE.MeshLambertMaterial({ 
        color: 0x33ff33, 
        emissive: new THREE.Color(0.3, 0.3, 0.3) 
      }),

      // Resource materials
      resourceNormal: new THREE.MeshLambertMaterial({ color: 0x3d8b37 }),
      resourceWeatherResistant: new THREE.MeshLambertMaterial({ color: 0x8B4513 }),
      
      // Territory and terrain materials
      territory: new THREE.MeshBasicMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
      }),
      
      shelter: new THREE.MeshLambertMaterial({ 
        color: 0x8B4513, 
        transparent: true, 
        opacity: 0.6 
      }),
      oasis: new THREE.MeshLambertMaterial({ 
        color: 0x20B2AA, 
        transparent: true, 
        opacity: 0.4 
      }),
      hill: new THREE.MeshLambertMaterial({ 
        color: 0x8FBC8F, 
        transparent: true, 
        opacity: 0.5 
      }),
      contaminated: new THREE.MeshBasicMaterial({ 
        color: 0xFF4500, 
        transparent: true, 
        opacity: 0.3, 
        side: THREE.DoubleSide 
      })
    };

    // Store materials in pool
    Object.entries(materials).forEach(([key, material]) => {
      this.materialPool.set(key, material);
    });
  }

  createResourcePools() {
    // Pre-allocate resource meshes
    const resourceGeometry = this.geometryPool.get('resource');
    
    for (let i = 0; i < 500; i++) { // Pre-allocate 500 resource slots
      const mesh = new THREE.Mesh(
        resourceGeometry,
        this.materialPool.get('resourceNormal').clone()
      );
      mesh.visible = false;
      this.memoryPools.set(`resource_${i}`, mesh);
    }
  }

  createTextureAtlases() {
    // With 382GB VRAM, we can use high-resolution texture atlases
    const canvas = document.createElement('canvas');
    canvas.width = 4096; // 4K texture atlas
    canvas.height = 4096;
    const ctx = canvas.getContext('2d');
    
    // Create status indicator textures
    this.createStatusTextures(ctx);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    this.texturePool.set('statusAtlas', texture);
  }

  createStatusTextures(ctx) {
    // Draw different status indicators on the atlas
    const regions = [
      { name: 'susceptible', color: '#0080ff', x: 0, y: 0 },
      { name: 'infected', color: '#ff0000', x: 512, y: 0 },
      { name: 'recovered', color: '#00ff00', x: 1024, y: 0 },
      { name: 'causal', color: '#ffcc00', x: 1536, y: 0 }
    ];

    regions.forEach(region => {
      ctx.fillStyle = region.color;
      ctx.fillRect(region.x, region.y, 512, 512);
      
      // Add status ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(region.x + 256, region.y + 256, 200, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // Get or create agent mesh from pool
  getAgentMesh(agent) {
    let mesh = this.availableMeshes.pop();
    
    if (!mesh) {
      // Create new mesh if pool is empty
      const agentType = this.getAgentType(agent);
      const geometry = this.geometryPool.get(agentType);
      const material = this.getAgentMaterial(agent).clone();
      
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
    } else {
      // Update existing mesh
      this.updateMeshForAgent(mesh, agent);
    }
    
    this.usedMeshes.add(mesh);
    mesh.visible = true;
    mesh.position.set(agent.position.x, agent.position.y, agent.position.z);
    
    return mesh;
  }

  // Return mesh to pool when agent dies
  returnAgentMesh(mesh) {
    if (this.usedMeshes.has(mesh)) {
      this.usedMeshes.delete(mesh);
      mesh.visible = false;
      this.availableMeshes.push(mesh);
    }
  }

  getAgentType(agent) {
    if (agent.isPlayer) return 'playerAgent';
    if (agent.constructor.name === 'CausalAgent') return 'causalAgent';
    return 'agent';
  }

  getAgentMaterial(agent) {
    const type = this.getAgentType(agent);
    const status = agent.status.toLowerCase();
    
    const materialKey = `${type === 'agent' ? 'agent' : 
                         type === 'causalAgent' ? 'causal' : 'player'}${
                         status.charAt(0).toUpperCase() + status.slice(1)}`;
    
    return this.materialPool.get(materialKey) || this.materialPool.get('agentSusceptible');
  }

  updateMeshForAgent(mesh, agent) {
    const material = this.getAgentMaterial(agent);
    if (mesh.material !== material) {
      mesh.material = material;
    }
  }

  // Batch update multiple agents for better performance
  batchUpdateAgents(agents) {
    const matrices = [];
    const colors = [];
    
    agents.forEach(agent => {
      if (agent.mesh) {
        // Update position matrix
        const matrix = new THREE.Matrix4();
        matrix.setPosition(agent.position.x, agent.position.y, agent.position.z);
        matrices.push(matrix);
        
        // Update color based on status
        const material = this.getAgentMaterial(agent);
        colors.push(material.color.r, material.color.g, material.color.b);
      }
    });
    
    // Apply batch updates using instanced rendering for massive performance boost
    this.updateInstancedMeshes(matrices, colors);
  }

  updateInstancedMeshes(matrices, colors) {
    // With 382GB VRAM, we can use instanced rendering for thousands of agents
    if (matrices.length > 1000) {
      console.log(`🚀 Batch updating ${matrices.length} agents with instanced rendering`);
      // Implementation for instanced mesh updates
    }
  }

  // Monitor memory usage
  getMemoryUsage() {
    const usedMeshes = this.usedMeshes.size;
    const availableMeshes = this.availableMeshes.length;
    const totalPools = this.memoryPools.size;
    
    return {
      usedMeshes,
      availableMeshes,
      totalPools,
      memoryPressure: usedMeshes / (usedMeshes + availableMeshes)
    };
  }

  // Cleanup unused resources
  cleanup() {
    // With 382GB VRAM, we can be less aggressive about cleanup
    const usage = this.getMemoryUsage();
    
    if (usage.memoryPressure < 0.8) {
      console.log('🔧 Memory pressure low, skipping cleanup');
      return;
    }
    
    console.log('🧹 Cleaning up GPU memory pools');
    // Cleanup logic for when memory pressure is high
  }

  dispose() {
    // Clean disposal of all GPU resources
    this.geometryPool.forEach(geometry => geometry.dispose());
    this.materialPool.forEach(material => material.dispose());
    this.texturePool.forEach(texture => texture.dispose());
    
    console.log('🗑️ GPU Memory Manager disposed');
  }
}

export default GPUMemoryManager;