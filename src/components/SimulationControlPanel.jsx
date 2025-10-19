/**
 * Simple Simulation Control Panel
 * 
 * Demonstrates the useEngine hook integration with a minimal UI.
 * This can be integrated into the main EcoSysX React application.
 */

import { useState } from 'react';
import { useEngine } from '../hooks/useEngine';

/**
 * Create default configuration for testing
 */
function createDefaultConfig() {
  return {
    schema: "GENX_CFG_V1",
    simulation: {
      populationSize: 100,
      worldSize: 50,
      maxSteps: 1000,
      enableDisease: true,
      enableReproduction: true,
      enableEnvironment: true
    },
    agents: {
      initialEnergy: { min: 80, max: 120 },
      energyConsumption: { min: 0.5, max: 1.5 },
      reproductionThreshold: 150,
      deathThreshold: 0,
      movementSpeed: { min: 0.5, max: 2.0 }
    },
    disease: {
      initialInfectionRate: 0.05,
      transmissionRate: 0.1,
      recoveryTime: 14,
      contactRadius: 2.0
    },
    environment: {
      resourceRegenRate: 0.01,
      resourceDensity: 1.0,
      enableSeasons: false,
      enableWeather: false
    },
    rng: {
      masterSeed: "12345",
      streams: {
        movement: true,
        disease: true,
        births: true,
        mutation: true,
        llm: false
      }
    }
  };
}

export function SimulationControlPanel() {
  const {
    connected,
    running,
    tick,
    snapshot,
    error,
    provider,
    startSimulation,
    stopSimulation,
    stepSimulation,
    requestSnapshot
  } = useEngine();
  
  const [autoRun, setAutoRun] = useState(false);
  const [stepSize, setStepSize] = useState(1);
  
  const handleStart = () => {
    const config = createDefaultConfig();
    const options = { provider: 'mock' };
    startSimulation(config, options, autoRun);
  };
  
  const handleStep = () => {
    stepSimulation(stepSize);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Genesis Engine Control Panel</h1>
      
      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {provider && (
            <div className="text-sm text-gray-600">
              Provider: <span className="font-mono">{provider}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h3 className="text-red-800 font-semibold mb-1">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Simulation Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-4">Simulation Control</h2>
        
        <div className="space-y-4">
          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Status:</span>
              <div className="font-semibold">{running ? '▶️ Running' : '⏸️ Stopped'}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Current Tick:</span>
              <div className="font-semibold font-mono">{tick}</div>
            </div>
          </div>
          
          {/* Start Options */}
          {!running && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRun"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoRun" className="text-sm">
                Auto-run simulation (continuous stepping)
              </label>
            </div>
          )}
          
          {/* Control Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleStart}
              disabled={running || !connected}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              ▶️ Start
            </button>
            
            <button
              onClick={stopSimulation}
              disabled={!running}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              ⏹️ Stop
            </button>
            
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={stepSize}
                onChange={(e) => setStepSize(parseInt(e.target.value) || 1)}
                min="1"
                max="1000"
                className="w-20 px-2 py-2 border rounded"
              />
              <button
                onClick={handleStep}
                disabled={!running}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ⏭️ Step
              </button>
            </div>
            
            <button
              onClick={() => requestSnapshot('metrics')}
              disabled={!running}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              📸 Snapshot
            </button>
          </div>
        </div>
      </div>
      
      {/* Metrics Display */}
      {snapshot && snapshot.metrics && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Simulation Metrics</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Population</div>
              <div className="text-2xl font-bold">{snapshot.metrics.pop}</div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Mean Energy</div>
              <div className="text-2xl font-bold">
                {snapshot.metrics.energyMean?.toFixed(1) || '0.0'}
              </div>
            </div>
            
            <div className="p-3 bg-green-50 rounded">
              <div className="text-sm text-green-600">Susceptible</div>
              <div className="text-2xl font-bold text-green-700">
                {snapshot.metrics.sir?.S || 0}
              </div>
            </div>
            
            <div className="p-3 bg-red-50 rounded">
              <div className="text-sm text-red-600">Infected</div>
              <div className="text-2xl font-bold text-red-700">
                {snapshot.metrics.sir?.I || 0}
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm text-blue-600">Recovered</div>
              <div className="text-2xl font-bold text-blue-700">
                {snapshot.metrics.sir?.R || 0}
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Simulation Tick</div>
              <div className="text-2xl font-bold">{snapshot.tick}</div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Provider</div>
              <div className="text-sm font-mono font-bold">
                {snapshot.provider?.name || 'N/A'}
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Schema</div>
              <div className="text-sm font-mono font-bold">{snapshot.schema}</div>
            </div>
          </div>
          
          {/* SIR Percentage Bar */}
          {snapshot.metrics.sir && snapshot.metrics.pop > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">Disease Distribution</div>
              <div className="flex h-8 rounded overflow-hidden">
                <div
                  className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${(snapshot.metrics.sir.S / snapshot.metrics.pop * 100)}%` }}
                >
                  {snapshot.metrics.sir.S > 0 && `${Math.round(snapshot.metrics.sir.S / snapshot.metrics.pop * 100)}%`}
                </div>
                <div
                  className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${(snapshot.metrics.sir.I / snapshot.metrics.pop * 100)}%` }}
                >
                  {snapshot.metrics.sir.I > 0 && `${Math.round(snapshot.metrics.sir.I / snapshot.metrics.pop * 100)}%`}
                </div>
                <div
                  className="bg-blue-500 flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${(snapshot.metrics.sir.R / snapshot.metrics.pop * 100)}%` }}
                >
                  {snapshot.metrics.sir.R > 0 && `${Math.round(snapshot.metrics.sir.R / snapshot.metrics.pop * 100)}%`}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Instructions */}
      {!connected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <h3 className="text-yellow-800 font-semibold mb-2">⚠️ Not Connected</h3>
          <p className="text-yellow-700 mb-2">
            Make sure the Genesis Engine server is running:
          </p>
          <pre className="bg-yellow-100 p-2 rounded text-sm">
            npm run dev:engine
          </pre>
          <p className="text-yellow-700 text-sm mt-2">
            Server should be running at ws://localhost:8765
          </p>
        </div>
      )}
    </div>
  );
}

export default SimulationControlPanel;
