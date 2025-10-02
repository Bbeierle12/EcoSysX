/**
 * Simple test version of the new App to verify core functionality
 */

import React, { useState, useEffect } from 'react';
import './App.css';

// Import Core Engine Components
import { EcosystemEngine } from './core/EcosystemEngine.js';
import { Agent, CausalAgent } from './core/AgentClasses.js';
import { Environment } from './core/Environment.js';

function SimpleTestApp() {
  const [engine, setEngine] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeEngine = async () => {
      try {
        console.log('Initializing test engine...');
        
        // Create environment
        const environment = new Environment();
        
        // Create engine instance
        const ecosystemEngine = new EcosystemEngine(environment);
        
        // Create test agents
        const testAgents = [];
        
        // Create 5 regular agents
        for (let i = 0; i < 5; i++) {
          const position = {
            x: (Math.random() - 0.5) * 173,
            y: 1,
            z: (Math.random() - 0.5) * 173
          };
          
          const agent = new Agent(`test_agent_${i}`, position);
          agent.isActive = true;
          testAgents.push(agent);
        }
        
        // Create 2 causal agents
        for (let i = 0; i < 2; i++) {
          const position = {
            x: (Math.random() - 0.5) * 173,
            y: 1,
            z: (Math.random() - 0.5) * 173
          };
          
          const causalAgent = new CausalAgent(`test_causal_${i}`, position);
          causalAgent.isActive = true;
          testAgents.push(causalAgent);
        }
        
        // Add agents to engine
        testAgents.forEach(agent => ecosystemEngine.addAgent(agent));
        
        // Start with one infected agent
        if (testAgents.length > 0) {
          testAgents[0].status = 'Infected';
        }
        
        // Set up event listeners
        ecosystemEngine.on('stepUpdated', (step) => {
          console.log('Step:', step);
        });
        
        ecosystemEngine.on('statisticsUpdated', (newStats) => {
          setStats(newStats);
        });
        
        setEngine(ecosystemEngine);
        console.log('Test engine initialized successfully');
        
      } catch (error) {
        console.error('Failed to initialize test engine:', error);
        setError(error.message);
      }
    };

    initializeEngine();
  }, []);

  const handleStart = () => {
    if (engine) {
      engine.start();
    }
  };

  const handlePause = () => {
    if (engine) {
      engine.pause();
    }
  };

  const handleStep = () => {
    if (engine) {
      engine.step();
    }
  };

  const handleReset = () => {
    if (engine) {
      engine.reset();
    }
  };

  if (error) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#ffe6e6' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }

  if (!engine) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Loading...</h2>
        <p>Initializing EcoSystem Engine...</p>
      </div>
    );
  }

  const engineState = engine.getState();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>EcoSysX Core Engine Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Engine Status</h3>
        <p>Running: {engineState.isRunning ? 'Yes' : 'No'}</p>
        <p>Step: {engineState.currentStep}</p>
        <p>Agents: {engineState.agentCount}</p>
        <p>Speed: {engineState.speed}x</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleStart} disabled={engineState.isRunning}>
          Start
        </button>
        <button onClick={handlePause} disabled={!engineState.isRunning} style={{ marginLeft: '10px' }}>
          Pause
        </button>
        <button onClick={handleStep} disabled={engineState.isRunning} style={{ marginLeft: '10px' }}>
          Step
        </button>
        <button onClick={handleReset} style={{ marginLeft: '10px' }}>
          Reset
        </button>
      </div>

      {stats && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Statistics</h3>
          <p>Population: {stats.population.total}</p>
          <p>Susceptible: {stats.population.susceptible}</p>
          <p>Infected: {stats.population.infected}</p>
          <p>Recovered: {stats.population.recovered}</p>
          <p>Average Energy: {stats.avgEnergy.toFixed(1)}</p>
          <p>Resources: {stats.resources || 'N/A'}</p>
        </div>
      )}

      <div>
        <h3>Agents</h3>
        <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ccc', padding: '10px' }}>
          {engine.agents.map(agent => (
            <div key={agent.id} style={{ marginBottom: '5px', fontSize: '12px' }}>
              {agent.id}: {agent.status} (Energy: {Math.round(agent.energy)}, Age: {agent.getAge ? agent.getAge(engineState.currentStep) : 0})
            </div>
          ))}
        </div>
      </div>
      
      {engine.environment && (
        <div style={{ marginTop: '20px' }}>
          <h3>Environment</h3>
          <p>Resources: {engine.environment.resources.size}</p>
          <p>Weather: {engine.environment.weatherSystem.determineWeatherCondition()}</p>
          <p>Temperature: {Math.round(engine.environment.weatherSystem.currentWeather.temperature)}°C</p>
        </div>
      )}
    </div>
  );
}

export default SimpleTestApp;