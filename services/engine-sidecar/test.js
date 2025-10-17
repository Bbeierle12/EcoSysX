#!/usr/bin/env node

/**
 * Simple test script for engine-sidecar
 * Sends a sequence of JSON-RPC commands and validates responses
 */

import { spawn } from 'child_process';
import * as readline from 'readline';

class SidecarTester {
  constructor() {
    this.sidecar = null;
    this.rl = null;
    this.responses = [];
  }
  
  async start() {
    console.log('🧪 Starting sidecar test...\n');
    
    // Launch sidecar
    this.sidecar = spawn('node', ['main.js'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });
    
    // Setup line reader for responses
    this.rl = readline.createInterface({
      input: this.sidecar.stdout,
      terminal: false
    });
    
    this.rl.on('line', (line) => {
      const response = JSON.parse(line);
      this.responses.push(response);
      console.log('📥 Response:', JSON.stringify(response, null, 2));
    });
    
    // Wait a bit for sidecar to initialize
    await this.sleep(500);
  }
  
  sendCommand(command) {
    console.log('\n📤 Command:', JSON.stringify(command));
    this.sidecar.stdin.write(JSON.stringify(command) + '\n');
  }
  
  async waitForResponse(timeout = 5000) {
    const startCount = this.responses.length;
    const startTime = Date.now();
    
    while (this.responses.length === startCount) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for response');
      }
      await this.sleep(100);
    }
    
    return this.responses[this.responses.length - 1];
  }
  
  async runTests() {
    try {
      // Test 1: Ping
      console.log('\n=== Test 1: Ping ===');
      this.sendCommand({ op: 'ping' });
      let response = await this.waitForResponse();
      this.assert(response.success === true, 'Ping should succeed');
      this.assert(response.data.status === 'idle', 'Status should be idle');
      console.log('✅ Ping test passed');
      
      // Test 2: Init (will fail without provider containers, but should respond)
      console.log('\n=== Test 2: Init ===');
      this.sendCommand({ 
        op: 'init',
        data: { 
          provider: 'mesa',
          config: null // Use default config
        }
      });
      response = await this.waitForResponse(10000); // Init can take longer
      // We expect this to fail without Mesa container, but should get a response
      console.log(response.success ? '✅ Init succeeded (Mesa available!)' : 'ℹ️  Init failed (Mesa not available, expected)');
      
      // Only continue if init succeeded
      if (response.success) {
        // Test 3: Step
        console.log('\n=== Test 3: Step ===');
        this.sendCommand({ op: 'step', data: { steps: 5 } });
        response = await this.waitForResponse();
        this.assert(response.success === true, 'Step should succeed');
        this.assert(response.data.tick >= 5, 'Tick should be at least 5');
        console.log('✅ Step test passed');
        
        // Test 4: Snapshot
        console.log('\n=== Test 4: Snapshot ===');
        this.sendCommand({ op: 'snapshot', data: { kind: 'metrics' } });
        response = await this.waitForResponse();
        this.assert(response.success === true, 'Snapshot should succeed');
        this.assert(response.data.snapshot.metrics !== undefined, 'Should have metrics');
        console.log('✅ Snapshot test passed');
        
        // Test 5: Stop
        console.log('\n=== Test 5: Stop ===');
        this.sendCommand({ op: 'stop' });
        response = await this.waitForResponse();
        this.assert(response.success === true, 'Stop should succeed');
        console.log('✅ Stop test passed');
      }
      
      // Test 6: Ping again (should be idle)
      console.log('\n=== Test 6: Ping After Stop ===');
      this.sendCommand({ op: 'ping' });
      response = await this.waitForResponse();
      this.assert(response.success === true, 'Ping should succeed');
      this.assert(response.data.status === 'idle', 'Status should be idle after stop');
      console.log('✅ Final ping test passed');
      
      console.log('\n🎉 All tests passed!');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      throw error;
    }
  }
  
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async stop() {
    console.log('\n🛑 Stopping sidecar...');
    this.sidecar.stdin.end();
    await this.sleep(500);
    this.sidecar.kill();
  }
}

// Run tests
async function main() {
  const tester = new SidecarTester();
  
  try {
    await tester.start();
    await tester.runTests();
    await tester.stop();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    await tester.stop();
    process.exit(1);
  }
}

main();
