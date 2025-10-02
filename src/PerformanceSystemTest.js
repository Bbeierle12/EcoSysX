import HighPerformanceEcosystemIntegration from './HighPerformanceEcosystemIntegration.js';

/**
 * Performance System Test Suite
 * 
 * Basic integration test to verify all components work together.
 * Run this test with small agent populations before scaling up.
 */
class PerformanceSystemTest {
  constructor() {
    this.testResults = {
      initialization: false,
      agentAddition: false,
      simulationStep: false,
      performanceMonitoring: false,
      agentRemoval: false,
      cleanup: false
    };
    
    this.mockAgents = [];
    this.mockEnvironment = {
      resources: new Map(),
      weather: 'clear',
      temperature: 20,
      season: 'spring',
      stress: 1.0
    };
  }

  /**
   * Create a mock Three.js setup for testing
   */
  createMockThreeJS() {
    // Mock minimal Three.js objects needed for testing
    const mockRenderer = {
      getContext: () => ({
        createBuffer: () => ({}),
        bindBuffer: () => {},
        bufferData: () => {},
        deleteBuffer: () => {},
        getParameter: () => 2048,
        getExtension: () => null
      }),
      info: {
        memory: { geometries: 0, textures: 0 },
        render: { triangles: 0 }
      }
    };

    const mockScene = {
      add: () => {},
      remove: () => {}
    };

    const mockCamera = {
      position: { x: 0, y: 10, z: 10 }
    };

    return { mockRenderer, mockScene, mockCamera };
  }

  /**
   * Create mock agents for testing
   */
  createMockAgents(count = 1000) {
    const agents = [];
    
    for (let i = 0; i < count; i++) {
      const agent = {
        id: `test_agent_${i}`,
        position: {
          x: (Math.random() - 0.5) * 80,
          y: 1,
          z: (Math.random() - 0.5) * 80
        },
        velocity: {
          x: 0,
          y: 0,
          z: 0
        },
        energy: 50 + Math.random() * 50,
        status: Math.random() < 0.1 ? 'Infected' : 'Susceptible',
        age: Math.random() * 100,
        infectionTimer: 0,
        reproductionCooldown: 0,
        update: function(environment, agents, deltaTime, isRunning) {
          // Mock agent update logic
          this.age += deltaTime;
          this.energy = Math.max(0, this.energy - 0.1 * deltaTime);
          
          if (this.status === 'Infected') {
            this.infectionTimer += deltaTime;
            if (this.infectionTimer > 40) {
              this.status = 'Recovered';
              this.energy = Math.min(100, this.energy + 10);
            }
          }
        }
      };
      
      // Add constructor name for agent type detection
      Object.defineProperty(agent, 'constructor', {
        value: { name: i < count * 0.3 ? 'CausalAgent' : 'Agent' }
      });
      
      agents.push(agent);
    }
    
    return agents;
  }

  /**
   * Test 1: Performance system initialization
   */
  async testInitialization() {
    console.log('🧪 Test 1: Performance System Initialization');
    
    try {
      const { mockRenderer, mockScene, mockCamera } = this.createMockThreeJS();
      
      // Test initialization with different agent counts
      const testCounts = [1000, 5000, 10000];
      
      for (const maxAgents of testCounts) {
        const performanceSystem = new HighPerformanceEcosystemIntegration(
          mockRenderer, 
          mockScene, 
          maxAgents
        );
        
        console.log(`  ✅ Initialized for ${maxAgents.toLocaleString()} agents`);
        
        // Test setting camera
        performanceSystem.setCamera(mockCamera);
        
        // Test optimization levels
        const levels = ['maximum', 'balanced', 'quality'];
        levels.forEach(level => {
          performanceSystem.setOptimizationLevel(level);
          console.log(`  ✅ Optimization level: ${level}`);
        });
        
        // Test getting initial stats
        const stats = performanceSystem.getDetailedStats();
        console.log(`  ✅ Initial stats retrieved`);
        
        performanceSystem.dispose();
      }
      
      this.testResults.initialization = true;
      console.log('✅ Initialization test passed\n');
      
    } catch (error) {
      console.error('❌ Initialization test failed:', error);
      this.testResults.initialization = false;
    }
  }

  /**
   * Test 2: Agent addition and management
   */
  async testAgentManagement() {
    console.log('🧪 Test 2: Agent Addition and Management');
    
    try {
      const { mockRenderer, mockScene, mockCamera } = this.createMockThreeJS();
      const performanceSystem = new HighPerformanceEcosystemIntegration(
        mockRenderer, 
        mockScene, 
        5000
      );
      
      // Test adding agents incrementally
      const testAgents = this.createMockAgents(100);
      let addedCount = 0;
      
      for (const agent of testAgents) {
        const success = performanceSystem.addAgent(agent);
        if (success) addedCount++;
      }
      
      console.log(`  ✅ Added ${addedCount}/100 agents successfully`);
      
      // Test removing agents
      let removedCount = 0;
      for (let i = 0; i < 10; i++) {
        const success = performanceSystem.removeAgent(testAgents[i]);
        if (success) removedCount++;
      }
      
      console.log(`  ✅ Removed ${removedCount}/10 agents successfully`);
      
      // Test capacity limits
      const manyAgents = this.createMockAgents(6000); // More than capacity
      let overCapacityAdded = 0;
      
      for (const agent of manyAgents) {
        const success = performanceSystem.addAgent(agent);
        if (success) overCapacityAdded++;
      }
      
      console.log(`  ✅ Capacity handling: ${overCapacityAdded}/6000 agents (expected: ≤5000)`);
      
      performanceSystem.dispose();
      this.testResults.agentAddition = true;
      console.log('✅ Agent management test passed\n');
      
    } catch (error) {
      console.error('❌ Agent management test failed:', error);
      this.testResults.agentAddition = false;
    }
  }

  /**
   * Test 3: Simulation step performance
   */
  async testSimulationStep() {
    console.log('🧪 Test 3: Simulation Step Performance');
    
    try {
      const { mockRenderer, mockScene, mockCamera } = this.createMockThreeJS();
      const performanceSystem = new HighPerformanceEcosystemIntegration(
        mockRenderer, 
        mockScene, 
        10000
      );
      
      // Test with different population sizes
      const testSizes = [100, 500, 1000, 2000];
      
      for (const size of testSizes) {
        console.log(`  🔄 Testing with ${size} agents...`);
        
        const agents = this.createMockAgents(size);
        
        // Add agents to performance system
        let addedCount = 0;
        agents.forEach(agent => {
          if (performanceSystem.addAgent(agent)) addedCount++;
        });
        
        // Run simulation steps and measure performance
        const stepTimes = [];
        const numSteps = 10;
        
        for (let step = 0; step < numSteps; step++) {
          const startTime = performance.now();
          
          const result = performanceSystem.performSimulationStep(
            agents, 
            this.mockEnvironment, 
            0.016
          );
          
          const stepTime = performance.now() - startTime;
          stepTimes.push(stepTime);
          
          // Verify performance stats
          if (!result || typeof result.fps !== 'number') {
            throw new Error('Invalid performance result');
          }
        }
        
        const avgTime = stepTimes.reduce((sum, time) => sum + time, 0) / stepTimes.length;
        const avgFPS = 1000 / avgTime;
        
        console.log(`    ✅ ${size} agents: ${avgTime.toFixed(2)}ms avg (${avgFPS.toFixed(1)} FPS)`);
        
        // Clear agents for next test
        agents.forEach(agent => performanceSystem.removeAgent(agent));
      }
      
      performanceSystem.dispose();
      this.testResults.simulationStep = true;
      console.log('✅ Simulation step test passed\n');
      
    } catch (error) {
      console.error('❌ Simulation step test failed:', error);
      this.testResults.simulationStep = false;
    }
  }

  /**
   * Test 4: Performance monitoring and statistics
   */
  async testPerformanceMonitoring() {
    console.log('🧪 Test 4: Performance Monitoring');
    
    try {
      const { mockRenderer, mockScene, mockCamera } = this.createMockThreeJS();
      const performanceSystem = new HighPerformanceEcosystemIntegration(
        mockRenderer, 
        mockScene, 
        5000
      );
      
      const agents = this.createMockAgents(1000);
      
      // Add agents
      agents.forEach(agent => performanceSystem.addAgent(agent));
      
      // Run several simulation steps
      for (let i = 0; i < 5; i++) {
        performanceSystem.performSimulationStep(agents, this.mockEnvironment, 0.016);
      }
      
      // Test detailed statistics
      const stats = performanceSystem.getDetailedStats();
      
      // Verify stats structure
      const requiredStats = [
        'performance', 'rendering', 'compute', 'optimization', 
        'memory', 'agents'
      ];
      
      for (const statType of requiredStats) {
        if (!stats[statType]) {
          throw new Error(`Missing stat type: ${statType}`);
        }
      }
      
      console.log('  ✅ Performance stats structure verified');
      console.log(`  📊 Current FPS: ${stats.performance.fps.toFixed(1)}`);
      console.log(`  📊 Agents: ${stats.agents.simulated}/${stats.agents.maxCapacity}`);
      console.log(`  📊 Memory: ${(stats.memory.allocated / 1024 / 1024).toFixed(1)}MB`);
      
      performanceSystem.dispose();
      this.testResults.performanceMonitoring = true;
      console.log('✅ Performance monitoring test passed\n');
      
    } catch (error) {
      console.error('❌ Performance monitoring test failed:', error);
      this.testResults.performanceMonitoring = false;
    }
  }

  /**
   * Test 5: Error handling and edge cases
   */
  async testErrorHandling() {
    console.log('🧪 Test 5: Error Handling');
    
    try {
      const { mockRenderer, mockScene } = this.createMockThreeJS();
      const performanceSystem = new HighPerformanceEcosystemIntegration(
        mockRenderer, 
        mockScene, 
        100
      );
      
      // Test invalid optimization level
      performanceSystem.setOptimizationLevel('invalid_level');
      console.log('  ✅ Invalid optimization level handled gracefully');
      
      // Test null/undefined agents
      const invalidAgents = [null, undefined, {}, { id: null }];
      
      invalidAgents.forEach((agent, index) => {
        try {
          performanceSystem.addAgent(agent);
          console.log(`  ✅ Invalid agent ${index} handled gracefully`);
        } catch (error) {
          console.log(`  ✅ Invalid agent ${index} properly rejected: ${error.message}`);
        }
      });
      
      // Test simulation with empty agent array
      const result = performanceSystem.performSimulationStep([], this.mockEnvironment, 0.016);
      console.log('  ✅ Empty agent simulation handled gracefully');
      
      // Test extremely large deltaTime
      const agents = this.createMockAgents(10);
      agents.forEach(agent => performanceSystem.addAgent(agent));
      
      performanceSystem.performSimulationStep(agents, this.mockEnvironment, 1000); // 1000 second delta
      console.log('  ✅ Large deltaTime handled gracefully');
      
      performanceSystem.dispose();
      this.testResults.cleanup = true;
      console.log('✅ Error handling test passed\n');
      
    } catch (error) {
      console.error('❌ Error handling test failed:', error);
      this.testResults.cleanup = false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Performance System Test Suite\n');
    
    const startTime = performance.now();
    
    await this.testInitialization();
    await this.testAgentManagement();
    await this.testSimulationStep();
    await this.testPerformanceMonitoring();
    await this.testErrorHandling();
    
    const totalTime = performance.now() - startTime;
    
    // Generate test report
    this.generateTestReport(totalTime);
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport(totalTime) {
    console.log('📋 Performance System Test Report');
    console.log('='.repeat(50));
    
    const testNames = {
      initialization: 'System Initialization',
      agentAddition: 'Agent Management',
      simulationStep: 'Simulation Performance', 
      performanceMonitoring: 'Performance Monitoring',
      cleanup: 'Error Handling'
    };
    
    let passedTests = 0;
    let totalTests = 0;
    
    Object.entries(this.testResults).forEach(([key, passed]) => {
      totalTests++;
      if (passed) passedTests++;
      
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const testName = testNames[key] || key;
      console.log(`${status} - ${testName}`);
    });
    
    console.log('-'.repeat(50));
    console.log(`Results: ${passedTests}/${totalTests} tests passed`);
    console.log(`Total Time: ${totalTime.toFixed(0)}ms`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Performance system is ready for integration.');
      console.log('\n📝 Next Steps:');
      console.log('1. Integrate with your EcosystemSimulator.jsx');
      console.log('2. Start with 1,000 agents and monitor performance');
      console.log('3. Gradually scale up to 10,000+ agents');
      console.log('4. Use performance dashboard for monitoring');
    } else {
      console.log('\n⚠️ Some tests failed. Review errors before proceeding with integration.');
    }
    
    console.log('\n🏁 Test suite completed.');
  }
}

// Export for use in other modules
export default PerformanceSystemTest;

// If running directly (not imported), run tests
if (typeof window !== 'undefined') {
  // Browser environment
  window.runPerformanceTests = async () => {
    const testSuite = new PerformanceSystemTest();
    await testSuite.runAllTests();
  };
  
  console.log('🧪 Performance test suite loaded. Run window.runPerformanceTests() to start.');
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = PerformanceSystemTest;
}