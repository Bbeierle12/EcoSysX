#!/usr/bin/env node

/**
 * Genesis Engine Server
 * 
 * Provides WebSocket and HTTP REST API access to the Genesis Engine.
 * Follows AGENTS.md integration protocols for service communication.
 * 
 * Features:
 * - WebSocket server for real-time updates (Qt GUI, React UI)
 * - HTTP REST API for stateless queries
 * - Health check endpoints
 * - Graceful shutdown handling
 * - Event-driven progress monitoring
 * 
 * Protocol:
 * - WebSocket: JSON messages with {type, data, timestamp}
 * - HTTP: RESTful endpoints following /api/v1/* pattern
 * - Events: Namespaced as 'engine:*', 'agent:*', 'state:*'
 */

import { GenesisEngine } from './engine.js';
import type { EngineConfigV1, Snapshot } from './types.js';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import express, { Request, Response } from 'express';
import cors from 'cors';

// Configuration
const HTTP_PORT = parseInt(process.env.ENGINE_PORT || '3001');
const WS_PORT = parseInt(process.env.WS_PORT || '8765');
const UPDATE_RATE = parseInt(process.env.UPDATE_RATE || '60');

// Express app for HTTP API
const app = express();
app.use(cors());
app.use(express.json());

// Genesis Engine instance
const engine = new GenesisEngine();
let simulationLoop: NodeJS.Timeout | null = null;
let lastStepTime = Date.now();

// Connected WebSocket clients
const wsClients = new Set<WebSocket>();

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcastToClients(event: string, data: any): void {
  const message = JSON.stringify({
    event,
    data,
    timestamp: Date.now()
  });
  
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

/**
 * Health check endpoint (per AGENTS.md)
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    engine: {
      state: engine.isRunning() ? 'running' : 'idle',
      tick: engine.getCurrentTick(),
      clients: wsClients.size
    }
  });
});

/**
 * Get engine status
 */
app.get('/api/v1/status', async (req: Request, res: Response) => {
  try {
    const providerInfo = await engine.getProviderInfo();
    
    res.json({
      status: 'success',
      data: {
        running: engine.isRunning(),
        tick: engine.getCurrentTick(),
        provider: providerInfo
      },
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get current simulation snapshot
 */
app.get('/api/v1/snapshot', async (req: Request, res: Response) => {
  try {
    if (!engine.isRunning()) {
      return res.status(400).json({
        status: 'error',
        message: 'Engine not running. Start simulation first.'
      });
    }
    
    const kind = (req.query.kind as string) || 'metrics';
    if (kind !== 'metrics' && kind !== 'full') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid snapshot kind. Must be "metrics" or "full".'
      });
    }
    
    const snapshot = await engine.snapshot(kind);
    
    res.json({
      status: 'success',
      data: snapshot,
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Start simulation with configuration
 */
app.post('/api/v1/start', async (req: Request, res: Response) => {
  try {
    if (engine.isRunning()) {
      return res.status(400).json({
        status: 'error',
        message: 'Simulation already running'
      });
    }
    
    const config: EngineConfigV1 = req.body.config;
    const options = req.body.options || { provider: 'mock' };
    
    await engine.start(config, options);
    
    res.status(200).json({
      status: 'success',
      data: { started: true },
      meta: { timestamp: new Date().toISOString() }
    });
    
    // Notify WebSocket clients
    broadcastToClients('engine:started', {
      tick: engine.getCurrentTick(),
      provider: options.provider
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Stop simulation
 */
app.post('/api/v1/stop', async (req: Request, res: Response) => {
  try {
    if (simulationLoop) {
      clearInterval(simulationLoop);
      simulationLoop = null;
    }
    
    await engine.stop();
    
    res.json({
      status: 'success',
      data: { stopped: true },
      meta: { timestamp: new Date().toISOString() }
    });
    
    // Notify WebSocket clients
    broadcastToClients('engine:stopped', {
      tick: engine.getCurrentTick()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Step simulation forward
 */
app.post('/api/v1/step', async (req: Request, res: Response) => {
  try {
    if (!engine.isRunning()) {
      return res.status(400).json({
        status: 'error',
        message: 'Engine not running. Start simulation first.'
      });
    }
    
    const steps = parseInt(req.body.steps || '1');
    if (steps <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Steps must be positive'
      });
    }
    
    const newTick = await engine.step(steps);
    
    res.json({
      status: 'success',
      data: { tick: newTick },
      meta: { timestamp: new Date().toISOString() }
    });
    
    // Notify WebSocket clients
    broadcastToClients('engine:step', {
      steps,
      tick: newTick
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Handle WebSocket messages from clients
 */
function handleWebSocketMessage(ws: WebSocket, message: string): void {
  try {
    const msg = JSON.parse(message);
    
    switch (msg.type) {
      case 'getState':
        handleGetState(ws);
        break;
        
      case 'start':
        handleStartSimulation(ws, msg.data);
        break;
        
      case 'stop':
        handleStopSimulation(ws);
        break;
        
      case 'step':
        handleStepSimulation(ws, msg.data);
        break;
        
      case 'snapshot':
        handleGetSnapshot(ws, msg.data);
        break;
        
      case 'ping':
        ws.send(JSON.stringify({
          event: 'pong',
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        }));
        break;
        
      default:
        ws.send(JSON.stringify({
          event: 'error',
          data: { message: `Unknown message type: ${msg.type}` },
          timestamp: Date.now()
        }));
    }
  } catch (error) {
    ws.send(JSON.stringify({
      event: 'error',
      data: { 
        message: error instanceof Error ? error.message : 'Invalid message format'
      },
      timestamp: Date.now()
    }));
  }
}

/**
 * Handle getState message
 */
async function handleGetState(ws: WebSocket): Promise<void> {
  try {
    const running = engine.isRunning();
    const tick = engine.getCurrentTick();
    let snapshot: Snapshot | null = null;
    
    if (running) {
      snapshot = await engine.snapshot('metrics');
    }
    
    ws.send(JSON.stringify({
      event: 'state:update',
      data: {
        running,
        tick,
        snapshot
      },
      timestamp: Date.now()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      event: 'error',
      data: { message: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now()
    }));
  }
}

/**
 * Handle start simulation message
 */
async function handleStartSimulation(ws: WebSocket, data: any): Promise<void> {
  try {
    if (engine.isRunning()) {
      ws.send(JSON.stringify({
        event: 'error',
        data: { message: 'Simulation already running' },
        timestamp: Date.now()
      }));
      return;
    }
    
    const config: EngineConfigV1 = data.config || GenesisEngine.createDefaultConfig();
    const options = data.options || { provider: 'mock' };
    
    await engine.start(config, options);
    
    // Start simulation loop if auto-run is enabled
    if (data.autoRun) {
      startSimulationLoop();
    }
    
    ws.send(JSON.stringify({
      event: 'engine:started',
      data: {
        tick: engine.getCurrentTick(),
        provider: options.provider
      },
      timestamp: Date.now()
    }));
    
    // Broadcast to all clients
    broadcastToClients('engine:started', {
      tick: engine.getCurrentTick(),
      provider: options.provider
    });
  } catch (error) {
    ws.send(JSON.stringify({
      event: 'error',
      data: { message: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now()
    }));
  }
}

/**
 * Handle stop simulation message
 */
async function handleStopSimulation(ws: WebSocket): Promise<void> {
  try {
    if (simulationLoop) {
      clearInterval(simulationLoop);
      simulationLoop = null;
    }
    
    await engine.stop();
    
    ws.send(JSON.stringify({
      event: 'engine:stopped',
      data: { tick: engine.getCurrentTick() },
      timestamp: Date.now()
    }));
    
    // Broadcast to all clients
    broadcastToClients('engine:stopped', {
      tick: engine.getCurrentTick()
    });
  } catch (error) {
    ws.send(JSON.stringify({
      event: 'error',
      data: { message: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now()
    }));
  }
}

/**
 * Handle step simulation message
 */
async function handleStepSimulation(ws: WebSocket, data: any): Promise<void> {
  try {
    if (!engine.isRunning()) {
      ws.send(JSON.stringify({
        event: 'error',
        data: { message: 'Engine not running' },
        timestamp: Date.now()
      }));
      return;
    }
    
    const steps = data.steps || 1;
    const newTick = await engine.step(steps);
    
    ws.send(JSON.stringify({
      event: 'engine:step',
      data: { steps, tick: newTick },
      timestamp: Date.now()
    }));
    
    // Broadcast to all clients
    broadcastToClients('engine:step', {
      steps,
      tick: newTick
    });
  } catch (error) {
    ws.send(JSON.stringify({
      event: 'error',
      data: { message: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now()
    }));
  }
}

/**
 * Handle get snapshot message
 */
async function handleGetSnapshot(ws: WebSocket, data: any): Promise<void> {
  try {
    if (!engine.isRunning()) {
      ws.send(JSON.stringify({
        event: 'error',
        data: { message: 'Engine not running' },
        timestamp: Date.now()
      }));
      return;
    }
    
    const kind = data.kind || 'metrics';
    const snapshot = await engine.snapshot(kind);
    
    ws.send(JSON.stringify({
      event: 'snapshot:update',
      data: snapshot,
      timestamp: Date.now()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      event: 'error',
      data: { message: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now()
    }));
  }
}

/**
 * Start automatic simulation loop
 */
function startSimulationLoop(): void {
  if (simulationLoop) {
    return; // Already running
  }
  
  simulationLoop = setInterval(async () => {
    if (!engine.isRunning()) {
      if (simulationLoop) {
        clearInterval(simulationLoop);
        simulationLoop = null;
      }
      return;
    }
    
    try {
      const now = Date.now();
      const deltaTime = (now - lastStepTime) / 1000;
      lastStepTime = now;
      
      await engine.step(1);
      
      // Broadcast step update to all clients
      broadcastToClients('engine:step', {
        steps: 1,
        tick: engine.getCurrentTick(),
        deltaTime
      });
      
      // Send metrics snapshot every 10 steps
      if (engine.getCurrentTick() % 10 === 0) {
        const snapshot = await engine.snapshot('metrics');
        broadcastToClients('snapshot:update', snapshot);
      }
    } catch (error) {
      console.error('Error in simulation loop:', error);
      broadcastToClients('error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        phase: 'simulation_loop'
      });
      
      if (simulationLoop) {
        clearInterval(simulationLoop);
        simulationLoop = null;
      }
    }
  }, 1000 / UPDATE_RATE);
}

// Subscribe to engine events and broadcast to WebSocket clients
engine.on('started', (data: any) => {
  broadcastToClients('engine:started', data);
});

engine.on('stepped', (data: any) => {
  broadcastToClients('engine:stepped', data);
});

engine.on('stopped', () => {
  broadcastToClients('engine:stopped', {});
});

engine.on('error', (data: any) => {
  broadcastToClients('engine:error', data);
  console.error('Engine error:', data);
});

// Start HTTP server
const httpServer = createServer(app);
httpServer.listen(HTTP_PORT, () => {
  console.log(`✅ Genesis Engine HTTP API running at http://localhost:${HTTP_PORT}`);
  console.log(`   Health check: http://localhost:${HTTP_PORT}/health`);
  console.log(`   API endpoints: http://localhost:${HTTP_PORT}/api/v1/*`);
});

// Start WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws: WebSocket) => {
  console.log('✅ Client connected via WebSocket');
  wsClients.add(ws);
  
  // Send initial connection message
  ws.send(JSON.stringify({
    event: 'engine:connected',
    data: {
      running: engine.isRunning(),
      tick: engine.getCurrentTick(),
      version: '1.0.0'
    },
    timestamp: Date.now()
  }));
  
  // Handle incoming messages
  ws.on('message', (message: Buffer) => {
    handleWebSocketMessage(ws, message.toString());
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('❌ Client disconnected');
    wsClients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});

console.log(`✅ WebSocket server running at ws://localhost:${WS_PORT}`);

// Graceful shutdown (per AGENTS.md)
process.on('SIGTERM', async () => {
  console.log('Shutting down Genesis Engine server...');
  
  // Stop simulation loop
  if (simulationLoop) {
    clearInterval(simulationLoop);
    simulationLoop = null;
  }
  
  // Stop engine
  if (engine.isRunning()) {
    await engine.stop();
  }
  
  // Close WebSocket connections
  wsClients.forEach(ws => {
    ws.send(JSON.stringify({
      event: 'server:shutdown',
      data: { message: 'Server shutting down' },
      timestamp: Date.now()
    }));
    ws.close();
  });
  
  // Close servers
  wss.close();
  httpServer.close();
  
  console.log('✅ Shutdown complete');
  process.exit(0);
});

process.on('SIGINT', async () => {
  process.emit('SIGTERM' as any);
});

console.log('');
console.log('🚀 Genesis Engine Server Started');
console.log('================================');
console.log(`   HTTP API: http://localhost:${HTTP_PORT}`);
console.log(`   WebSocket: ws://localhost:${WS_PORT}`);
console.log(`   Update Rate: ${UPDATE_RATE} Hz`);
console.log('');
console.log('Press Ctrl+C to stop');
console.log('');
