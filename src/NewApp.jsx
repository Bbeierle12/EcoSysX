/**
 * New App Component - Integrates Core Engine with UI
 * 
 * This replaces the monolithic EcosystemSimulator with a clean separation
 * between the core simulation engine and the React/Three.js UI layer.
 */

import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Import Core Engine Components
import { EcosystemEngine } from './core/EcosystemEngine.js';
import { Agent, CausalAgent } from './core/AgentClasses.js';
import { Environment } from './core/Environment.js';

// Import UI Components
import { EcosystemUI } from './ui/EcosystemUI.jsx';

// Import LLM Service (if available)
// import { LLMService } from './LLMService.js';

function App() {
  const [engine, setEngine] = useState(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [error, setError] = useState(null);
  const engineRef = useRef(null);

  // Initialize the ecosystem engine
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        console.log('Initializing EcoSystem Engine...');
        
        // Create environment
        const environment = new Environment();
        
        // Create engine instance
        const ecosystemEngine = new EcosystemEngine(environment);
        
        // Initialize with some starting agents
        const initialAgents = createInitialAgents();
        initialAgents.forEach(agent => ecosystemEngine.addAgent(agent));
        
        // Try to initialize LLM service (optional)
        // try {
        //   const llmService = new LLMService();
        //   await llmService.initialize();
        //   ecosystemEngine.setLLMService(llmService);
        //   console.log('LLM service initialized successfully');
        // } catch (llmError) {
        //   console.warn('LLM service not available, using fallback reasoning:', llmError.message);
        // }
        
        // Store engine reference
        engineRef.current = ecosystemEngine;
        setEngine(ecosystemEngine);
        setIsEngineReady(true);
        
        console.log('EcoSystem Engine initialized successfully');
        
        // Add engine event listeners for debugging
        ecosystemEngine.on('stepCompleted', (step) => {
          console.log(`Simulation step ${step} completed`);
        });
        
        ecosystemEngine.on('agentAdded', (agent) => {
          console.log(`Agent ${agent.id} added to simulation`);
        });
        
        ecosystemEngine.on('agentRemoved', (agent) => {
          console.log(`Agent ${agent.id} removed from simulation`);
        });
        
      } catch (error) {
        console.error('Failed to initialize EcoSystem Engine:', error);
        setError(error.message);
      }
    };

    initializeEngine();

    // Cleanup on unmount
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current.removeAllListeners();
      }
    };
  }, []);

  // Create initial population of agents
  const createInitialAgents = () => {
    const agents = [];
    const numAgents = 20;
    const numCausalAgents = 8;
    
    // Create regular agents
    for (let i = 0; i < numAgents; i++) {
      const position = {
        x: (Math.random() - 0.5) * 30,
        y: 1,
        z: (Math.random() - 0.5) * 30
      };
      
      const agent = new Agent(`agent_${i}`, position);
      agent.isActive = true;
      agents.push(agent);
    }
    
    // Create causal (AI) agents
    for (let i = 0; i < numCausalAgents; i++) {
      const position = {
        x: (Math.random() - 0.5) * 30,
        y: 1,
        z: (Math.random() - 0.5) * 30
      };
      
      const causalAgent = new CausalAgent(`causal_agent_${i}`, position);
      causalAgent.isActive = true;
      // causalAgent.llmAvailable = true; // Enable when LLM service is available
      agents.push(causalAgent);
    }
    
    // Start with some infected agents for disease dynamics
    const infectedCount = Math.floor(agents.length * 0.1);
    for (let i = 0; i < infectedCount; i++) {
      agents[i].status = 'Infected';
    }
    
    console.log(`Created ${agents.length} initial agents (${numCausalAgents} AI agents)`);
    return agents;
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Engine Error</h2>
          <p className="text-gray-700 mb-4">
            Failed to initialize the EcoSystem Engine:
          </p>
          <pre className="bg-gray-100 p-3 rounded text-sm text-red-800 overflow-auto">
            {error}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isEngineReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-700">Initializing EcoSystem</h2>
          <p className="text-gray-500 mt-2">Setting up simulation engine...</p>
        </div>
      </div>
    );
  }

  // Main application with engine and UI
  return (
    <div className="App">
      <EcosystemUI engine={engine} />
      
      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-0 left-0 bg-black bg-opacity-75 text-white p-2 text-xs font-mono">
          Engine Status: {engine?.isRunning ? 'Running' : 'Stopped'} | 
          Step: {engine?.currentStep || 0} | 
          Agents: {engine?.agents?.length || 0} | 
          Resources: {engine?.environment?.resources?.size || 0}
        </div>
      )}
    </div>
  );
}

export default App;