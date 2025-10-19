/**
 * Integration Tests for Engine Server
 * 
 * Tests the WebSocket and HTTP API integration between
 * the Genesis Engine server and clients (React/Qt).
 * 
 * Run with: npm test -- test/integration/engine-server.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { WebSocket } from 'ws';

const HTTP_PORT = 3001;
const WS_PORT = 8765;
const SERVER_STARTUP_TIME = 3000; // ms

describe('Engine Server Integration', () => {
  let serverProcess;
  
  beforeAll(async () => {
    // Start the engine server
    console.log('Starting engine server...');
    
    serverProcess = spawn('node', [
      '--loader',
      'tsx',
      'packages/genx-engine/src/server.ts'
    ], {
      env: {
        ...process.env,
        ENGINE_PORT: HTTP_PORT.toString(),
        WS_PORT: WS_PORT.toString()
      }
    });
    
    serverProcess.stdout.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, SERVER_STARTUP_TIME));
  });
  
  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });
  
  describe('HTTP API', () => {
    it('should respond to health check', async () => {
      const response = await fetch(`http://localhost:${HTTP_PORT}/health`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('engine');
      expect(data.engine).toHaveProperty('state');
    });
    
    it('should return engine status', async () => {
      const response = await fetch(`http://localhost:${HTTP_PORT}/api/v1/status`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('status', 'success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('running');
      expect(data.data).toHaveProperty('tick');
    });
    
    it('should reject snapshot request when not running', async () => {
      const response = await fetch(`http://localhost:${HTTP_PORT}/api/v1/snapshot?kind=metrics`);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('status', 'error');
      expect(data.message).toContain('not running');
    });
  });
  
  describe('WebSocket Connection', () => {
    let ws;
    
    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    it('should accept WebSocket connections', async () => {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      await new Promise((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
      });
      
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });
    
    it('should send engine:connected message on connection', async () => {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      const message = await new Promise((resolve, reject) => {
        ws.once('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
        ws.once('error', reject);
      });
      
      expect(message).toHaveProperty('event', 'engine:connected');
      expect(message).toHaveProperty('data');
      expect(message.data).toHaveProperty('running');
      expect(message.data).toHaveProperty('tick');
      expect(message.data).toHaveProperty('version');
    });
    
    it('should respond to ping with pong', async () => {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      await new Promise((resolve) => {
        ws.once('open', resolve);
      });
      
      // Skip the initial connection message
      await new Promise((resolve) => {
        ws.once('message', resolve);
      });
      
      // Send ping
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));
      
      // Wait for pong
      const message = await new Promise((resolve) => {
        ws.once('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      expect(message).toHaveProperty('event', 'pong');
      expect(message).toHaveProperty('data');
      expect(message.data).toHaveProperty('timestamp');
    });
    
    it('should handle getState command', async () => {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      await new Promise((resolve) => {
        ws.once('open', resolve);
      });
      
      // Skip the initial connection message
      await new Promise((resolve) => {
        ws.once('message', resolve);
      });
      
      // Send getState command
      ws.send(JSON.stringify({
        type: 'getState',
        timestamp: Date.now()
      }));
      
      // Wait for state update
      const message = await new Promise((resolve) => {
        ws.once('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      expect(message).toHaveProperty('event', 'state:update');
      expect(message).toHaveProperty('data');
      expect(message.data).toHaveProperty('running');
      expect(message.data).toHaveProperty('tick');
    });
  });
  
  describe('Simulation Control', () => {
    let ws;
    
    beforeAll(async () => {
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      await new Promise((resolve) => {
        ws.once('open', resolve);
      });
      
      // Skip initial connection message
      await new Promise((resolve) => {
        ws.once('message', resolve);
      });
    });
    
    afterAll(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    it('should start simulation', async () => {
      const config = {
        schema: "GENX_CFG_V1",
        simulation: {
          populationSize: 10,
          worldSize: 10,
          maxSteps: 100,
          enableDisease: false,
          enableReproduction: false,
          enableEnvironment: false
        },
        agents: {
          initialEnergy: { min: 100, max: 100 },
          energyConsumption: { min: 1, max: 1 },
          reproductionThreshold: 200,
          deathThreshold: 0,
          movementSpeed: { min: 1, max: 1 }
        },
        disease: {
          initialInfectionRate: 0,
          transmissionRate: 0,
          recoveryTime: 1,
          contactRadius: 1
        },
        environment: {
          resourceRegenRate: 0,
          resourceDensity: 0,
          enableSeasons: false,
          enableWeather: false
        },
        rng: {
          masterSeed: "test-seed",
          streams: {
            movement: true,
            disease: false,
            births: false,
            mutation: false,
            llm: false
          }
        }
      };
      
      ws.send(JSON.stringify({
        type: 'start',
        data: {
          config,
          options: { provider: 'mock' },
          autoRun: false
        },
        timestamp: Date.now()
      }));
      
      const message = await new Promise((resolve) => {
        ws.once('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      expect(message).toHaveProperty('event', 'engine:started');
      expect(message.data).toHaveProperty('tick', 0);
      expect(message.data).toHaveProperty('provider', 'mock');
    }, 10000); // 10 second timeout for slow systems
    
    it('should step simulation', async () => {
      ws.send(JSON.stringify({
        type: 'step',
        data: { steps: 5 },
        timestamp: Date.now()
      }));
      
      const message = await new Promise((resolve) => {
        ws.once('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      expect(message).toHaveProperty('event', 'engine:step');
      expect(message.data).toHaveProperty('steps', 5);
      expect(message.data).toHaveProperty('tick');
      expect(message.data.tick).toBeGreaterThan(0);
    });
    
    it('should get snapshot', async () => {
      ws.send(JSON.stringify({
        type: 'snapshot',
        data: { kind: 'metrics' },
        timestamp: Date.now()
      }));
      
      const message = await new Promise((resolve) => {
        ws.once('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      expect(message).toHaveProperty('event', 'snapshot:update');
      expect(message.data).toHaveProperty('schema', 'GENX_SNAP_V1');
      expect(message.data).toHaveProperty('metrics');
      expect(message.data.metrics).toHaveProperty('pop');
      expect(message.data.metrics).toHaveProperty('energyMean');
      expect(message.data.metrics).toHaveProperty('sir');
    });
    
    it('should stop simulation', async () => {
      ws.send(JSON.stringify({
        type: 'stop',
        timestamp: Date.now()
      }));
      
      const message = await new Promise((resolve) => {
        ws.once('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      expect(message).toHaveProperty('event', 'engine:stopped');
      expect(message.data).toHaveProperty('tick');
    });
  });
});
