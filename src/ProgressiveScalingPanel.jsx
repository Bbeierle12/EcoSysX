import React, { useState, useEffect, useRef } from 'react';

/**
 * Progressive Scaling Control Panel
 * Allows gradual increase of agent population with performance monitoring
 */
const ProgressiveScalingPanel = ({ 
  agents = [], 
  onAddAgents, 
  onRemoveAgents, 
  highPerformanceSystem,
  isVisible = true,
  position = 'bottom-left',
  maxAgents = 50000
}) => {
  const [scalingState, setScalingState] = useState({
    targetPopulation: agents.length,
    currentBatch: 0,
    batchSize: 100,
    autoScaling: false,
    scalingSpeed: 1000, // ms between batches
    performanceThreshold: 30, // minimum FPS to continue scaling
    maxReached: false
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageFps: 60,
    memoryUsage: 0,
    lastFpsCheck: []
  });

  const [scalingHistory, setScalingHistory] = useState([]);
  const autoScalingTimeoutRef = useRef(null);
  const performanceCheckRef = useRef(null);

  // Performance monitoring for scaling decisions
  useEffect(() => {
    if (!scalingState.autoScaling) return;

    const checkPerformance = () => {
      if (highPerformanceSystem) {
        try {
          const stats = highPerformanceSystem.getPerformanceStats();
          const fps = stats.currentFps || 0;
          
          setPerformanceMetrics(prev => {
            const newFpsHistory = [...prev.lastFpsCheck, fps].slice(-10);
            const avgFps = newFpsHistory.reduce((sum, f) => sum + f, 0) / newFpsHistory.length;
            
            return {
              averageFps: avgFps,
              memoryUsage: stats.memoryUsage || 0,
              lastFpsCheck: newFpsHistory
            };
          });
        } catch (error) {
          console.warn('Failed to get performance stats for scaling:', error);
        }
      }
    };

    performanceCheckRef.current = setInterval(checkPerformance, 500);
    return () => {
      if (performanceCheckRef.current) {
        clearInterval(performanceCheckRef.current);
      }
    };
  }, [scalingState.autoScaling, highPerformanceSystem]);

  // Auto-scaling logic
  useEffect(() => {
    if (!scalingState.autoScaling) return;
    if (agents.length >= scalingState.targetPopulation) {
      stopAutoScaling();
      return;
    }

    const shouldContinueScaling = () => {
      // Check performance threshold
      if (performanceMetrics.averageFps < scalingState.performanceThreshold) {
        console.log(`🛑 Auto-scaling paused: FPS (${performanceMetrics.averageFps.toFixed(1)}) below threshold (${scalingState.performanceThreshold})`);
        return false;
      }

      // Check memory constraints (if available)
      if (performanceMetrics.memoryUsage > 3000) { // 3GB limit for browser
        console.log(`🛑 Auto-scaling paused: Memory usage (${performanceMetrics.memoryUsage}MB) too high`);
        return false;
      }

      return true;
    };

    const performScalingBatch = () => {
      if (!shouldContinueScaling()) {
        stopAutoScaling();
        return;
      }

      const remaining = scalingState.targetPopulation - agents.length;
      const batchSize = Math.min(scalingState.batchSize, remaining);
      
      if (batchSize > 0) {
        console.log(`📈 Auto-scaling: Adding ${batchSize} agents (${agents.length} → ${agents.length + batchSize})`);
        
        // Record scaling event
        setScalingHistory(prev => [...prev, {
          timestamp: Date.now(),
          agentCount: agents.length + batchSize,
          fps: performanceMetrics.averageFps,
          memoryUsage: performanceMetrics.memoryUsage,
          batchSize
        }].slice(-50)); // Keep last 50 events

        if (onAddAgents) {
          onAddAgents(batchSize);
        }

        setScalingState(prev => ({ 
          ...prev, 
          currentBatch: prev.currentBatch + 1 
        }));

        // Schedule next batch
        autoScalingTimeoutRef.current = setTimeout(performScalingBatch, scalingState.scalingSpeed);
      } else {
        stopAutoScaling();
      }
    };

    autoScalingTimeoutRef.current = setTimeout(performScalingBatch, scalingState.scalingSpeed);
    
    return () => {
      if (autoScalingTimeoutRef.current) {
        clearTimeout(autoScalingTimeoutRef.current);
      }
    };
  }, [
    scalingState.autoScaling,
    scalingState.targetPopulation,
    scalingState.batchSize,
    scalingState.scalingSpeed,
    scalingState.performanceThreshold,
    agents.length,
    performanceMetrics.averageFps,
    performanceMetrics.memoryUsage,
    onAddAgents
  ]);

  const stopAutoScaling = () => {
    setScalingState(prev => ({ ...prev, autoScaling: false }));
    if (autoScalingTimeoutRef.current) {
      clearTimeout(autoScalingTimeoutRef.current);
      autoScalingTimeoutRef.current = null;
    }
  };

  const startAutoScaling = () => {
    if (agents.length >= scalingState.targetPopulation) {
      alert('Target population already reached!');
      return;
    }
    setScalingState(prev => ({ ...prev, autoScaling: true, currentBatch: 0 }));
  };

  const addAgentsBatch = (count) => {
    const newCount = Math.min(count, maxAgents - agents.length);
    if (newCount > 0 && onAddAgents) {
      onAddAgents(newCount);
      setScalingHistory(prev => [...prev, {
        timestamp: Date.now(),
        agentCount: agents.length + newCount,
        fps: performanceMetrics.averageFps,
        memoryUsage: performanceMetrics.memoryUsage,
        batchSize: newCount,
        manual: true
      }].slice(-50));
    }
  };

  const removeAgentsBatch = (count) => {
    const removeCount = Math.min(count, agents.length);
    if (removeCount > 0 && onRemoveAgents) {
      onRemoveAgents(removeCount);
    }
  };

  const getScalingStatus = () => {
    if (scalingState.autoScaling) return 'Scaling...';
    if (agents.length >= scalingState.targetPopulation) return 'Target Reached';
    if (performanceMetrics.averageFps < scalingState.performanceThreshold) return 'Performance Limited';
    return 'Ready';
  };

  const getStatusColor = () => {
    if (scalingState.autoScaling) return 'text-blue-400';
    if (agents.length >= scalingState.targetPopulation) return 'text-green-400';
    if (performanceMetrics.averageFps < scalingState.performanceThreshold) return 'text-red-400';
    return 'text-gray-400';
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!isVisible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 bg-black bg-opacity-75 text-white text-sm font-mono p-4 rounded-lg border border-gray-600 min-w-80`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-600">
        <h3 className="font-semibold text-purple-400">📈 Population Scaling</h3>
        <div className={`px-2 py-1 rounded text-xs ${getStatusColor()}`}>
          {getScalingStatus()}
        </div>
      </div>

      {/* Current Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span>Current Agents:</span>
          <span className="text-blue-400">{formatNumber(agents.length)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Target:</span>
          <span className="text-purple-400">{formatNumber(scalingState.targetPopulation)}</span>
        </div>

        <div className="flex justify-between">
          <span>Performance:</span>
          <span className={performanceMetrics.averageFps >= scalingState.performanceThreshold ? 'text-green-400' : 'text-red-400'}>
            {performanceMetrics.averageFps.toFixed(1)} FPS
          </span>
        </div>
      </div>

      {/* Target Population Control */}
      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Target Population:</label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min={agents.length}
            max={maxAgents}
            step="100"
            value={scalingState.targetPopulation}
            onChange={(e) => setScalingState(prev => ({ 
              ...prev, 
              targetPopulation: parseInt(e.target.value) 
            }))}
            className="flex-1"
            disabled={scalingState.autoScaling}
          />
          <input
            type="number"
            min={agents.length}
            max={maxAgents}
            value={scalingState.targetPopulation}
            onChange={(e) => setScalingState(prev => ({ 
              ...prev, 
              targetPopulation: parseInt(e.target.value) || agents.length 
            }))}
            className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white"
            disabled={scalingState.autoScaling}
          />
        </div>
      </div>

      {/* Scaling Parameters */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-gray-300 mb-1">Batch Size:</label>
          <input
            type="number"
            min="10"
            max="1000"
            step="10"
            value={scalingState.batchSize}
            onChange={(e) => setScalingState(prev => ({ 
              ...prev, 
              batchSize: parseInt(e.target.value) || 100 
            }))}
            className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white"
            disabled={scalingState.autoScaling}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Speed (ms between batches):</label>
          <input
            type="number"
            min="100"
            max="10000"
            step="100"
            value={scalingState.scalingSpeed}
            onChange={(e) => setScalingState(prev => ({ 
              ...prev, 
              scalingSpeed: parseInt(e.target.value) || 1000 
            }))}
            className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white"
            disabled={scalingState.autoScaling}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1">Min FPS Threshold:</label>
          <input
            type="number"
            min="10"
            max="60"
            step="5"
            value={scalingState.performanceThreshold}
            onChange={(e) => setScalingState(prev => ({ 
              ...prev, 
              performanceThreshold: parseInt(e.target.value) || 30 
            }))}
            className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white"
            disabled={scalingState.autoScaling}
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="space-y-2">
        {/* Auto Scaling */}
        <div className="flex space-x-2">
          {!scalingState.autoScaling ? (
            <button
              onClick={startAutoScaling}
              disabled={agents.length >= scalingState.targetPopulation}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm font-semibold"
            >
              🚀 Start Auto Scaling
            </button>
          ) : (
            <button
              onClick={stopAutoScaling}
              className="flex-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm font-semibold"
            >
              🛑 Stop Scaling
            </button>
          )}
        </div>

        {/* Manual Controls */}
        <div className="flex space-x-2">
          <button
            onClick={() => addAgentsBatch(scalingState.batchSize)}
            disabled={scalingState.autoScaling || agents.length >= maxAgents}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm"
          >
            +{scalingState.batchSize}
          </button>
          <button
            onClick={() => removeAgentsBatch(scalingState.batchSize)}
            disabled={scalingState.autoScaling || agents.length === 0}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm"
          >
            -{scalingState.batchSize}
          </button>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex space-x-2">
          {[100, 500, 1000].map(count => (
            <button
              key={count}
              onClick={() => addAgentsBatch(count)}
              disabled={scalingState.autoScaling || agents.length >= maxAgents}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
            >
              +{formatNumber(count)}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 pt-3 border-t border-gray-600">
        <div className="flex justify-between text-xs mb-1">
          <span>Progress</span>
          <span>{Math.round((agents.length / scalingState.targetPopulation) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded">
          <div 
            className="h-full bg-purple-500 rounded transition-all duration-300"
            style={{ width: `${Math.min(100, (agents.length / scalingState.targetPopulation) * 100)}%` }}
          />
        </div>
      </div>

      {/* Recent Scaling History */}
      {scalingHistory.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400 mb-1">Recent Changes:</div>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {scalingHistory.slice(-3).map((event, index) => (
              <div key={index} className="text-xs flex justify-between">
                <span className={event.manual ? 'text-yellow-400' : 'text-blue-400'}>
                  +{event.batchSize} → {formatNumber(event.agentCount)}
                </span>
                <span className="text-gray-400">
                  {event.fps.toFixed(0)}fps
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressiveScalingPanel;