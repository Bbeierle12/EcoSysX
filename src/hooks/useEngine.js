/**
 * React Hook for Genesis Engine Integration
 * 
 * Provides a React-friendly interface to the Genesis Engine via the EngineService.
 * Handles connection management, state synchronization, and event subscriptions.
 * 
 * Features:
 * - Automatic connection on mount
 * - Real-time state updates
 * - Error handling
 * - Cleanup on unmount
 * - TypeScript-friendly (with JSDoc)
 * 
 * Usage:
 * @example
 * function SimulationComponent() {
 *   const {
 *     connected,
 *     running,
 *     tick,
 *     snapshot,
 *     error,
 *     startSimulation,
 *     stopSimulation,
 *     stepSimulation
 *   } = useEngine();
 *   
 *   return (
 *     <div>
 *       <p>Connected: {connected ? 'Yes' : 'No'}</p>
 *       <p>Running: {running ? 'Yes' : 'No'}</p>
 *       <p>Tick: {tick}</p>
 *       <button onClick={() => startSimulation(config)}>Start</button>
 *       <button onClick={stopSimulation}>Stop</button>
 *       <button onClick={() => stepSimulation(10)}>Step 10</button>
 *     </div>
 *   );
 * }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { engineService } from '../services/EngineService';

/**
 * Hook for interacting with the Genesis Engine
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {string} options.wsUrl - WebSocket URL override
 * @param {string} options.apiUrl - HTTP API URL override
 * @returns {Object} Engine state and control functions
 */
export function useEngine(options = {}) {
  const {
    autoConnect = true,
    wsUrl,
    apiUrl
  } = options;
  
  // State
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(null);
  
  // Track if we've mounted
  const mounted = useRef(false);
  const unsubscribers = useRef([]);
  
  // Override service URLs if provided
  useEffect(() => {
    if (wsUrl) engineService.wsUrl = wsUrl;
    if (apiUrl) engineService.apiUrl = apiUrl;
  }, [wsUrl, apiUrl]);
  
  // Connect to engine on mount
  useEffect(() => {
    mounted.current = true;
    
    if (autoConnect) {
      engineService.connect()
        .then(() => {
          if (mounted.current) {
            setConnected(true);
            setError(null);
          }
        })
        .catch((err) => {
          if (mounted.current) {
            setError(err.message);
            setConnected(false);
          }
        });
    }
    
    // Cleanup on unmount
    return () => {
      mounted.current = false;
      unsubscribers.current.forEach(unsub => unsub());
      unsubscribers.current = [];
    };
  }, [autoConnect]);
  
  // Subscribe to engine events
  useEffect(() => {
    // Connection events
    unsubscribers.current.push(
      engineService.on('connected', () => {
        if (mounted.current) {
          setConnected(true);
          setError(null);
        }
      })
    );
    
    unsubscribers.current.push(
      engineService.on('disconnected', () => {
        if (mounted.current) {
          setConnected(false);
        }
      })
    );
    
    // Engine state events
    unsubscribers.current.push(
      engineService.on('engine:connected', (data) => {
        if (mounted.current) {
          setRunning(data.running || false);
          setTick(data.tick || 0);
        }
      })
    );
    
    unsubscribers.current.push(
      engineService.on('state:update', (data) => {
        if (mounted.current) {
          setRunning(data.running || false);
          setTick(data.tick || 0);
          if (data.snapshot) {
            setSnapshot(data.snapshot);
          }
        }
      })
    );
    
    unsubscribers.current.push(
      engineService.on('engine:started', (data) => {
        if (mounted.current) {
          setRunning(true);
          setTick(data.tick || 0);
          setProvider(data.provider);
          setError(null);
        }
      })
    );
    
    unsubscribers.current.push(
      engineService.on('engine:stopped', (data) => {
        if (mounted.current) {
          setRunning(false);
          setTick(data.tick || 0);
        }
      })
    );
    
    unsubscribers.current.push(
      engineService.on('engine:step', (data) => {
        if (mounted.current) {
          setTick(data.tick || 0);
        }
      })
    );
    
    unsubscribers.current.push(
      engineService.on('engine:stepped', (data) => {
        if (mounted.current) {
          setTick(data.newTick || data.tick || 0);
        }
      })
    );
    
    unsubscribers.current.push(
      engineService.on('snapshot:update', (data) => {
        if (mounted.current) {
          setSnapshot(data);
          if (data.tick !== undefined) {
            setTick(data.tick);
          }
        }
      })
    );
    
    // Error events
    unsubscribers.current.push(
      engineService.on('error', (data) => {
        if (mounted.current) {
          setError(data.message || 'Unknown error');
        }
      })
    );
    
    unsubscribers.current.push(
      engineService.on('engine:error', (data) => {
        if (mounted.current) {
          setError(data.message || 'Engine error');
        }
      })
    );
    
    return () => {
      unsubscribers.current.forEach(unsub => unsub());
      unsubscribers.current = [];
    };
  }, []);
  
  // Control functions
  const connect = useCallback(async () => {
    try {
      await engineService.connect();
      setConnected(true);
      setError(null);
    } catch (err) {
      setError(err.message);
      setConnected(false);
      throw err;
    }
  }, []);
  
  const disconnect = useCallback(() => {
    engineService.disconnect();
    setConnected(false);
  }, []);
  
  const startSimulation = useCallback((config, options = { provider: 'mock' }, autoRun = false) => {
    try {
      engineService.startSimulation(config, options, autoRun);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const stopSimulation = useCallback(() => {
    try {
      engineService.stopSimulation();
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const stepSimulation = useCallback((steps = 1) => {
    try {
      engineService.stepSimulation(steps);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const requestSnapshot = useCallback((kind = 'metrics') => {
    try {
      engineService.requestSnapshot(kind);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const requestState = useCallback(() => {
    try {
      engineService.requestState();
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  // HTTP API functions (for stateless queries)
  const getHealth = useCallback(async () => {
    try {
      const health = await engineService.getHealth();
      setError(null);
      return health;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const getStatus = useCallback(async () => {
    try {
      const status = await engineService.getStatus();
      setError(null);
      return status;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const getSnapshot = useCallback(async (kind = 'metrics') => {
    try {
      const snap = await engineService.getSnapshot(kind);
      setSnapshot(snap);
      setError(null);
      return snap;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  return {
    // State
    connected,
    running,
    tick,
    snapshot,
    error,
    provider,
    
    // Connection control
    connect,
    disconnect,
    
    // Simulation control
    startSimulation,
    stopSimulation,
    stepSimulation,
    requestSnapshot,
    requestState,
    
    // HTTP API
    getHealth,
    getStatus,
    getSnapshot,
    
    // Raw service access (for advanced usage)
    service: engineService
  };
}

export default useEngine;
