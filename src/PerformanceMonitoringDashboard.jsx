import React, { useState, useEffect, useRef } from 'react';

/**
 * Performance Monitoring Dashboard
 * Real-time display of system performance metrics during simulation
 */
const PerformanceMonitoringDashboard = ({ 
  highPerformanceSystem, 
  agents = [], 
  isVisible = true,
  position = 'top-right' 
}) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    frameTime: 0,
    agentCount: 0,
    memoryUsage: 0,
    gpuMemoryUsage: 0,
    renderMode: 'standard',
    instancedObjects: 0,
    gpuComputeEnabled: false,
    drawCalls: 0,
    triangles: 0,
    averageFps: 0,
    minFps: 60,
    maxFps: 0
  });

  const [performanceHistory, setPerformanceHistory] = useState([]);
  const fpsHistoryRef = useRef([]);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const measureStartRef = useRef(performance.now());

  // Performance measurement loop
  useEffect(() => {
    if (!isVisible) return;

    const measurePerformance = () => {
      const now = performance.now();
      const deltaTime = now - lastFrameTimeRef.current;
      const currentFps = deltaTime > 0 ? 1000 / deltaTime : 0;
      
      lastFrameTimeRef.current = now;
      frameCountRef.current++;

      // Update FPS history (keep last 60 frames)
      fpsHistoryRef.current.push(currentFps);
      if (fpsHistoryRef.current.length > 60) {
        fpsHistoryRef.current.shift();
      }

      // Calculate statistics every 30 frames for smoother updates
      if (frameCountRef.current % 30 === 0) {
        const avgFps = fpsHistoryRef.current.reduce((sum, fps) => sum + fps, 0) / fpsHistoryRef.current.length;
        const minFps = Math.min(...fpsHistoryRef.current);
        const maxFps = Math.max(...fpsHistoryRef.current);

        // Get memory information
        const memoryInfo = getMemoryInfo();
        
        // Get high-performance system metrics
        const hpMetrics = getHighPerformanceMetrics();

        setMetrics(prev => ({
          ...prev,
          fps: Math.round(currentFps),
          frameTime: Math.round(deltaTime * 100) / 100,
          agentCount: agents.length,
          averageFps: Math.round(avgFps),
          minFps: Math.round(minFps),
          maxFps: Math.round(maxFps),
          ...memoryInfo,
          ...hpMetrics
        }));

        // Update performance history for trending
        setPerformanceHistory(prev => {
          const newHistory = [...prev, {
            timestamp: now,
            fps: avgFps,
            agentCount: agents.length,
            memoryUsage: memoryInfo.memoryUsage
          }];
          // Keep only last 100 measurements
          return newHistory.slice(-100);
        });
      }
    };

    const interval = setInterval(measurePerformance, 16); // ~60fps measurement
    return () => clearInterval(interval);
  }, [isVisible, agents.length, highPerformanceSystem]);

  const getMemoryInfo = () => {
    if (performance.memory) {
      return {
        memoryUsage: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)),
        memoryLimit: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024))
      };
    }
    return { memoryUsage: 0, memoryLimit: 0 };
  };

  const getHighPerformanceMetrics = () => {
    if (!highPerformanceSystem) {
      return {
        renderMode: 'standard',
        instancedObjects: 0,
        gpuComputeEnabled: false,
        gpuMemoryUsage: 0,
        drawCalls: 0,
        triangles: 0
      };
    }

    try {
      const perfStats = highPerformanceSystem.getPerformanceStats();
      return {
        renderMode: 'high-performance',
        instancedObjects: perfStats.instancedObjects || 0,
        gpuComputeEnabled: perfStats.gpuComputeEnabled || false,
        gpuMemoryUsage: perfStats.gpuMemoryUsage || 0,
        drawCalls: perfStats.drawCalls || 0,
        triangles: perfStats.triangles || 0
      };
    } catch (error) {
      console.warn('Failed to get high-performance metrics:', error);
      return {
        renderMode: 'standard',
        instancedObjects: 0,
        gpuComputeEnabled: false,
        gpuMemoryUsage: 0,
        drawCalls: 0,
        triangles: 0
      };
    }
  };

  const getStatusColor = (fps) => {
    if (fps >= 45) return 'text-green-400';
    if (fps >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryStatusColor = (usage, limit) => {
    const percentage = limit > 0 ? (usage / limit) * 100 : 0;
    if (percentage < 70) return 'text-green-400';
    if (percentage < 90) return 'text-yellow-400';
    return 'text-red-400';
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
    <div className={`fixed ${positionClasses[position]} z-50 bg-black bg-opacity-75 text-white text-sm font-mono p-4 rounded-lg border border-gray-600 min-w-64`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-600">
        <h3 className="font-semibold text-blue-400">🚀 Performance Monitor</h3>
        <div className={`px-2 py-1 rounded text-xs ${metrics.renderMode === 'high-performance' ? 'bg-green-700' : 'bg-yellow-700'}`}>
          {metrics.renderMode === 'high-performance' ? 'GPU' : 'CPU'}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-2">
        {/* FPS Stats */}
        <div className="flex justify-between">
          <span>FPS:</span>
          <span className={getStatusColor(metrics.fps)}>
            {metrics.fps} ({metrics.frameTime}ms)
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Avg/Min/Max:</span>
          <span className="text-gray-300">
            {metrics.averageFps}/{metrics.minFps}/{metrics.maxFps}
          </span>
        </div>

        {/* Agent Stats */}
        <div className="flex justify-between">
          <span>Agents:</span>
          <span className="text-blue-400">{formatNumber(metrics.agentCount)}</span>
        </div>

        {/* Memory Stats */}
        <div className="flex justify-between">
          <span>Memory:</span>
          <span className={getMemoryStatusColor(metrics.memoryUsage, metrics.memoryLimit)}>
            {metrics.memoryUsage}MB
            {metrics.memoryLimit > 0 && ` / ${metrics.memoryLimit}MB`}
          </span>
        </div>

        {/* GPU Stats (if available) */}
        {metrics.renderMode === 'high-performance' && (
          <>
            <div className="flex justify-between">
              <span>GPU Memory:</span>
              <span className="text-purple-400">{metrics.gpuMemoryUsage}MB</span>
            </div>
            
            <div className="flex justify-between">
              <span>Instanced:</span>
              <span className="text-green-400">{formatNumber(metrics.instancedObjects)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Draw Calls:</span>
              <span className="text-yellow-400">{metrics.drawCalls}</span>
            </div>

            <div className="flex justify-between">
              <span>GPU Compute:</span>
              <span className={metrics.gpuComputeEnabled ? 'text-green-400' : 'text-gray-400'}>
                {metrics.gpuComputeEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </>
        )}

        {/* Performance Trend Indicator */}
        {performanceHistory.length > 10 && (
          <div className="flex justify-between">
            <span>Trend:</span>
            <span className={getTrendColor()}>
              {getTrendIndicator()}
            </span>
          </div>
        )}
      </div>

      {/* Performance Bar (Visual FPS indicator) */}
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="flex justify-between text-xs mb-1">
          <span>0</span>
          <span>30</span>
          <span>60</span>
        </div>
        <div className="h-2 bg-gray-700 rounded">
          <div 
            className={`h-full rounded transition-all duration-300 ${
              metrics.fps >= 45 ? 'bg-green-500' : 
              metrics.fps >= 25 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, (metrics.fps / 60) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  function getTrendColor() {
    if (performanceHistory.length < 10) return 'text-gray-400';
    
    const recent = performanceHistory.slice(-5);
    const older = performanceHistory.slice(-10, -5);
    const recentAvg = recent.reduce((sum, h) => sum + h.fps, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.fps, 0) / older.length;
    
    if (recentAvg > olderAvg + 2) return 'text-green-400';
    if (recentAvg < olderAvg - 2) return 'text-red-400';
    return 'text-yellow-400';
  }

  function getTrendIndicator() {
    if (performanceHistory.length < 10) return '—';
    
    const recent = performanceHistory.slice(-5);
    const older = performanceHistory.slice(-10, -5);
    const recentAvg = recent.reduce((sum, h) => sum + h.fps, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.fps, 0) / older.length;
    
    if (recentAvg > olderAvg + 2) return '↗ UP';
    if (recentAvg < olderAvg - 2) return '↘ DOWN';
    return '→ STABLE';
  }
};

export default PerformanceMonitoringDashboard;