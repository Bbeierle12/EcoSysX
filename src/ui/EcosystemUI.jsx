/**
 * UI Module for EcoSysX - React and Three.js Visualization
 * 
 * This module contains all UI-related components and visualization logic.
 * It communicates with the core engine via EventEmitter patterns.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Box, Plane } from '@react-three/drei';
import * as THREE from 'three';

// ================================
// AGENT VISUALIZATION COMPONENT
// ================================

function AgentMesh({ agent, isSelected, onSelect, instancedRenderer }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  useFrame(() => {
    if (meshRef.current && agent) {
      meshRef.current.position.set(agent.position.x, agent.position.y, agent.position.z);
      
      // Update color based on status
      const statusColors = {
        'Susceptible': new THREE.Color(0x00ff00),
        'Infected': new THREE.Color(0xff0000),
        'Recovered': new THREE.Color(0x0000ff)
      };
      
      if (meshRef.current.material) {
        meshRef.current.material.color = statusColors[agent.status] || statusColors['Susceptible'];
        meshRef.current.material.emissive = isSelected ? new THREE.Color(0x404040) : new THREE.Color(0x000000);
      }
    }
  });

  const scale = useMemo(() => {
    if (!agent?.genotype?.size) return [1, 1, 1];
    const size = agent.genotype.size;
    return [size, size, size];
  }, [agent?.genotype?.size]);

  if (!agent) return null;

  return (
    <Sphere
      ref={meshRef}
      args={[0.5, 16, 16]}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(agent);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <meshStandardMaterial
        color={agent.status === 'Infected' ? 'red' : agent.status === 'Recovered' ? 'blue' : 'green'}
        emissive={isSelected ? '#404040' : '#000000'}
        transparent
        opacity={hovered ? 0.8 : 1.0}
      />
    </Sphere>
  );
}

// ================================
// RESOURCE VISUALIZATION COMPONENT
// ================================

function ResourceMesh({ resource }) {
  const meshRef = useRef();
  
  const color = useMemo(() => {
    switch (resource.type) {
      case 'berry': return '#ff6b6b';
      case 'mushroom': return '#8b4513';
      case 'mineral': return '#87ceeb';
      case 'seed': return '#daa520';
      default: return '#90ee90';
    }
  }, [resource.type]);

  const scale = useMemo(() => {
    const size = Math.max(0.3, resource.value / 15);
    return [size, size, size];
  }, [resource.value]);

  return (
    <Box
      ref={meshRef}
      position={[resource.position.x, resource.position.y, resource.position.z]}
      args={[0.5, 0.5, 0.5]}
      scale={scale}
    >
      <meshStandardMaterial color={color} />
    </Box>
  );
}

// ================================
// TERRAIN VISUALIZATION COMPONENT
// ================================

function TerrainMesh({ terrainSystem }) {
  const groupRef = useRef();
  
  const terrainElements = useMemo(() => {
    const elements = [];
    
    // Generate terrain grid visualization
    for (let x = -20; x <= 20; x += 4) {
      for (let z = -20; z <= 20; z += 4) {
        const key = `${x},${z}`;
        const position = { x, z };
        const effects = terrainSystem.getTerrainEffects(position);
        
        // Elevation visualization
        const elevation = effects.elevation * 2;
        elements.push(
          <Box
            key={`terrain-${x}-${z}`}
            position={[x, elevation - 1, z]}
            args={[3.8, 0.2, 3.8]}
          >
            <meshStandardMaterial 
              color={`hsl(${120 + elevation * 60}, 50%, ${30 + elevation * 20}%)`}
            />
          </Box>
        );
        
        // Shelter visualization
        if (effects.isInShelter) {
          elements.push(
            <Box
              key={`shelter-${x}-${z}`}
              position={[x, elevation + 1, z]}
              args={[2, 1.5, 2]}
            >
              <meshStandardMaterial color="#654321" />
            </Box>
          );
        }
      }
    }
    
    return elements;
  }, [terrainSystem]);

  return <group ref={groupRef}>{terrainElements}</group>;
}

// ================================
// ENVIRONMENT VISUALIZATION COMPONENT
// ================================

function EnvironmentEffects({ environment }) {
  const particlesRef = useRef();
  const [weather, setWeather] = useState(null);
  
  useEffect(() => {
    if (environment?.weatherSystem) {
      setWeather(environment.weatherSystem.currentWeather);
    }
  }, [environment]);

  // Weather particle effects
  const particles = useMemo(() => {
    if (!weather) return [];
    
    const effects = [];
    
    // Rain particles
    if (weather.precipitation > 5) {
      for (let i = 0; i < Math.min(100, weather.precipitation * 2); i++) {
        effects.push(
          <Sphere
            key={`rain-${i}`}
            position={[
              (Math.random() - 0.5) * 40,
              5 + Math.random() * 10,
              (Math.random() - 0.5) * 40
            ]}
            args={[0.02, 4, 4]}
          >
            <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
          </Sphere>
        );
      }
    }
    
    return effects;
  }, [weather]);

  return <group ref={particlesRef}>{particles}</group>;
}

// ================================
// CAMERA CONTROLLER COMPONENT
// ================================

function CameraController({ selectedAgent, followMode }) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (followMode && selectedAgent) {
      const targetPosition = new THREE.Vector3(
        selectedAgent.position.x + 10,
        selectedAgent.position.y + 8,
        selectedAgent.position.z + 10
      );
      
      camera.position.lerp(targetPosition, 0.1);
      camera.lookAt(selectedAgent.position.x, selectedAgent.position.y, selectedAgent.position.z);
    }
  });

  return null;
}

// ================================
// SIMULATION CONTROLS PANEL
// ================================

function SimulationControls({ 
  engine, 
  isRunning, 
  onToggleSimulation, 
  onResetSimulation,
  onStepSimulation,
  currentStep,
  simSpeed,
  onSpeedChange 
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  return (
    <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg z-10">
      <h3 className="text-lg font-bold mb-3">Simulation Controls</h3>
      
      <div className="space-y-2">
        <div className="flex space-x-2">
          <button
            onClick={onToggleSimulation}
            className={`px-4 py-2 rounded font-medium ${
              isRunning 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          
          <button
            onClick={onStepSimulation}
            disabled={isRunning}
            className="px-4 py-2 rounded font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400"
          >
            Step
          </button>
          
          <button
            onClick={onResetSimulation}
            className="px-4 py-2 rounded font-medium bg-gray-500 hover:bg-gray-600 text-white"
          >
            Reset
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Speed:</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={simSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm">{simSpeed}x</span>
        </div>
        
        <div className="text-sm text-gray-600">
          Step: {currentStep} | Time: {Math.round(currentStep / 24 * 10) / 10} days
        </div>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
        
        {showAdvanced && (
          <div className="mt-2 space-y-2 border-t pt-2">
            <div className="text-sm">
              <label className="block font-medium">Population:</label>
              <span>{engine?.agents?.length || 0} agents</span>
            </div>
            
            <div className="text-sm">
              <label className="block font-medium">Resources:</label>
              <span>{engine?.environment?.resources?.size || 0} available</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ================================
// AGENT SELECTION PANEL
// ================================

function AgentSelectionPanel({ selectedAgent, onDeselectAgent, followMode, onToggleFollow }) {
  if (!selectedAgent) return null;
  
  const age = selectedAgent.getAge ? selectedAgent.getAge(0) : selectedAgent.age || 0;
  const ageDays = Math.round(age / 24 * 10) / 10;
  
  return (
    <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg z-10 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Agent Details</h3>
        <button
          onClick={onDeselectAgent}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div><strong>ID:</strong> {selectedAgent.id}</div>
        <div><strong>Status:</strong> 
          <span className={`ml-1 px-2 py-1 rounded text-xs ${
            selectedAgent.status === 'Infected' ? 'bg-red-200 text-red-800' :
            selectedAgent.status === 'Recovered' ? 'bg-blue-200 text-blue-800' :
            'bg-green-200 text-green-800'
          }`}>
            {selectedAgent.status}
          </span>
        </div>
        <div><strong>Energy:</strong> {Math.round(selectedAgent.energy)}/100</div>
        <div><strong>Age:</strong> {ageDays} days</div>
        
        {selectedAgent.genotype && (
          <div className="border-t pt-2">
            <strong>Genotype:</strong>
            <div className="ml-2">
              <div>Speed: {selectedAgent.genotype.speed?.toFixed(2)}</div>
              <div>Size: {selectedAgent.genotype.size?.toFixed(2)}</div>
              <div>Social Radius: {selectedAgent.genotype.socialRadius?.toFixed(1)}</div>
              <div>Resistance: {(selectedAgent.genotype.infectionResistance * 100)?.toFixed(0)}%</div>
            </div>
          </div>
        )}
        
        {selectedAgent instanceof Object && selectedAgent.constructor.name === 'CausalAgent' && (
          <div className="border-t pt-2">
            <strong>AI Agent:</strong>
            <div className="ml-2">
              <div>Personality: {selectedAgent.personality}</div>
              <div>Decisions: {selectedAgent.decisionCount}</div>
              <div>Trust Level: {(selectedAgent.calculateAverageTrust() * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}
        
        <div className="border-t pt-2">
          <button
            onClick={onToggleFollow}
            className={`px-3 py-1 rounded text-sm font-medium ${
              followMode 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            {followMode ? 'Unfollow' : 'Follow Camera'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================
// ENVIRONMENT STATUS PANEL
// ================================

function EnvironmentStatusPanel({ environment }) {
  const [envSummary, setEnvSummary] = useState(null);
  
  useEffect(() => {
    if (environment) {
      const summary = environment.getEnvironmentSummary();
      setEnvSummary(summary);
    }
  }, [environment]);

  if (!envSummary) return null;

  return (
    <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg z-10">
      <h3 className="text-lg font-bold mb-3">Environment Status</h3>
      
      <div className="space-y-2 text-sm">
        <div className="border-b pb-2">
          <strong>Weather:</strong>
          <div className="ml-2">
            <div>Condition: {envSummary.weather.condition}</div>
            <div>Temperature: {envSummary.weather.temperature}°C</div>
            <div>Wind: {envSummary.weather.windSpeed} km/h</div>
            <div>Humidity: {envSummary.weather.humidity}%</div>
            {envSummary.weather.precipitation > 0 && (
              <div>Rain: {envSummary.weather.precipitation} mm/h</div>
            )}
            {envSummary.weather.activePatterns.length > 0 && (
              <div>Active: {envSummary.weather.activePatterns.join(', ')}</div>
            )}
          </div>
        </div>
        
        <div className="border-b pb-2">
          <strong>Resources:</strong>
          <div className="ml-2">
            <div>Total: {envSummary.resources.total}</div>
            <div>Average Value: {envSummary.resources.averageValue.toFixed(1)}</div>
            {Object.entries(envSummary.resources.byType).map(([type, count]) => (
              <div key={type}>{type}: {count}</div>
            ))}
          </div>
        </div>
        
        <div>
          <strong>Environmental Stress:</strong>
          <div className="ml-2">
            <div>Overall: {(envSummary.environmentalStress.overallStress * 100).toFixed(0)}%</div>
            {envSummary.environmentalStress.heatStress > 0.1 && (
              <div>Heat: {(envSummary.environmentalStress.heatStress * 100).toFixed(0)}%</div>
            )}
            {envSummary.environmentalStress.coldStress > 0.1 && (
              <div>Cold: {(envSummary.environmentalStress.coldStress * 100).toFixed(0)}%</div>
            )}
            {envSummary.environmentalStress.stormStress > 0.1 && (
              <div>Storm: {(envSummary.environmentalStress.stormStress * 100).toFixed(0)}%</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================
// STATISTICS DASHBOARD
// ================================

function StatisticsDashboard({ analytics, isVisible, onToggle }) {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    if (analytics && isVisible) {
      const currentStats = analytics.getCurrentStatistics();
      setStats(currentStats);
    }
  }, [analytics, isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg z-10"
      >
        Show Stats
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 p-4 rounded-lg shadow-lg z-10 w-80 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Statistics</h3>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {stats && (
        <div className="space-y-3 text-sm">
          <div className="border-b pb-2">
            <strong>Population:</strong>
            <div className="ml-2">
              <div>Total: {stats.population.total}</div>
              <div>Susceptible: {stats.population.susceptible}</div>
              <div>Infected: {stats.population.infected}</div>
              <div>Recovered: {stats.population.recovered}</div>
              <div>Deaths: {stats.population.deaths}</div>
              <div>Births: {stats.population.births}</div>
            </div>
          </div>
          
          <div className="border-b pb-2">
            <strong>Health Metrics:</strong>
            <div className="ml-2">
              <div>Avg Energy: {stats.avgEnergy.toFixed(1)}</div>
              <div>Infection Rate: {(stats.infectionRate * 100).toFixed(1)}%</div>
              <div>Mortality Rate: {(stats.mortalityRate * 100).toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="border-b pb-2">
            <strong>Genetics:</strong>
            <div className="ml-2">
              <div>Avg Speed: {stats.avgGenetics.speed?.toFixed(2)}</div>
              <div>Avg Size: {stats.avgGenetics.size?.toFixed(2)}</div>
              <div>Avg Resistance: {(stats.avgGenetics.infectionResistance * 100)?.toFixed(0)}%</div>
            </div>
          </div>
          
          {stats.socialMetrics && (
            <div>
              <strong>Social Behavior:</strong>
              <div className="ml-2">
                <div>Messages Sent: {stats.socialMetrics.totalMessages}</div>
                <div>Avg Trust: {(stats.socialMetrics.averageTrust * 100).toFixed(0)}%</div>
                <div>Help Requests: {stats.socialMetrics.helpRequests}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================================
// MAIN SIMULATION SCENE COMPONENT
// ================================

function SimulationScene({ 
  engine, 
  selectedAgent, 
  onSelectAgent, 
  followMode,
  showTerrain = true,
  showResources = true,
  showWeatherEffects = true 
}) {
  const [agents, setAgents] = useState([]);
  const [resources, setResources] = useState([]);
  const [environment, setEnvironment] = useState(null);
  
  // Update scene data from engine events
  useEffect(() => {
    if (!engine) return;
    
    const updateAgents = () => setAgents([...engine.agents]);
    const updateResources = () => setResources(Array.from(engine.environment.resources.values()));
    const updateEnvironment = () => setEnvironment(engine.environment);
    
    engine.on('agentsUpdated', updateAgents);
    engine.on('resourcesUpdated', updateResources);
    engine.on('environmentUpdated', updateEnvironment);
    
    // Initial update
    updateAgents();
    updateResources();
    updateEnvironment();
    
    return () => {
      engine.off('agentsUpdated', updateAgents);
      engine.off('resourcesUpdated', updateResources);
      engine.off('environmentUpdated', updateEnvironment);
    };
  }, [engine]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      
      {/* Camera Controller */}
      <CameraController selectedAgent={selectedAgent} followMode={followMode} />
      
      {/* Terrain */}
      {showTerrain && environment?.terrainSystem && (
        <TerrainMesh terrainSystem={environment.terrainSystem} />
      )}
      
      {/* Agents */}
      {agents.map((agent) => (
        <AgentMesh
          key={agent.id}
          agent={agent}
          isSelected={selectedAgent?.id === agent.id}
          onSelect={onSelectAgent}
        />
      ))}
      
      {/* Resources */}
      {showResources && resources.map((resource) => (
        <ResourceMesh key={resource.id} resource={resource} />
      ))}
      
      {/* Weather Effects */}
      {showWeatherEffects && environment && (
        <EnvironmentEffects environment={environment} />
      )}
      
      {/* Ground Plane */}
      <Plane
        args={[50, 50]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        onClick={() => onSelectAgent(null)}
      >
        <meshStandardMaterial color="#90EE90" transparent opacity={0.3} />
      </Plane>
      
      {/* Orbit Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxDistance={50}
        minDistance={2}
      />
    </>
  );
}

// ================================
// MAIN UI CONTAINER COMPONENT
// ================================

export function EcosystemUI({ engine }) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [followMode, setFollowMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [showStats, setShowStats] = useState(false);
  const [showTerrain, setShowTerrain] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showWeatherEffects, setShowWeatherEffects] = useState(true);

  // Listen to engine events
  useEffect(() => {
    if (!engine) return;
    
    const handleStepUpdate = (step) => setCurrentStep(step);
    const handleStateChange = (state) => setIsRunning(state.isRunning);
    
    engine.on('stepUpdated', handleStepUpdate);
    engine.on('stateChanged', handleStateChange);
    
    return () => {
      engine.off('stepUpdated', handleStepUpdate);
      engine.off('stateChanged', handleStateChange);
    };
  }, [engine]);

  const handleToggleSimulation = useCallback(() => {
    if (isRunning) {
      engine?.pause();
    } else {
      engine?.start();
    }
  }, [engine, isRunning]);

  const handleResetSimulation = useCallback(() => {
    engine?.reset();
    setSelectedAgent(null);
    setFollowMode(false);
  }, [engine]);

  const handleStepSimulation = useCallback(() => {
    engine?.step();
  }, [engine]);

  const handleSelectAgent = useCallback((agent) => {
    setSelectedAgent(agent);
    if (!agent) {
      setFollowMode(false);
    }
  }, []);

  const handleToggleFollow = useCallback(() => {
    setFollowMode(!followMode);
  }, [followMode]);

  const handleSpeedChange = useCallback((speed) => {
    setSimSpeed(speed);
    engine?.setSpeed(speed);
  }, [engine]);

  if (!engine) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl text-gray-600">Loading EcoSystem Engine...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [15, 10, 15], fov: 75 }}
        style={{ background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)' }}
      >
        <SimulationScene
          engine={engine}
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
          followMode={followMode}
          showTerrain={showTerrain}
          showResources={showResources}
          showWeatherEffects={showWeatherEffects}
        />
      </Canvas>

      {/* UI Overlays */}
      <SimulationControls
        engine={engine}
        isRunning={isRunning}
        onToggleSimulation={handleToggleSimulation}
        onResetSimulation={handleResetSimulation}
        onStepSimulation={handleStepSimulation}
        currentStep={currentStep}
        simSpeed={simSpeed}
        onSpeedChange={handleSpeedChange}
      />

      <AgentSelectionPanel
        selectedAgent={selectedAgent}
        onDeselectAgent={() => handleSelectAgent(null)}
        followMode={followMode}
        onToggleFollow={handleToggleFollow}
      />

      <EnvironmentStatusPanel environment={engine?.environment} />

      <StatisticsDashboard
        analytics={engine?.analytics}
        isVisible={showStats}
        onToggle={() => setShowStats(!showStats)}
      />

      {/* View Options */}
      <div className="absolute top-4 center bg-white bg-opacity-90 p-2 rounded-lg shadow-lg z-10">
        <div className="flex space-x-4 text-sm">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showTerrain}
              onChange={(e) => setShowTerrain(e.target.checked)}
              className="mr-1"
            />
            Terrain
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showResources}
              onChange={(e) => setShowResources(e.target.checked)}
              className="mr-1"
            />
            Resources
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showWeatherEffects}
              onChange={(e) => setShowWeatherEffects(e.target.checked)}
              className="mr-1"
            />
            Weather
          </label>
        </div>
      </div>
    </div>
  );
}

export default EcosystemUI;