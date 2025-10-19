/**
 * Engine Service for React Frontend
 * 
 * Provides a service layer for communicating with the Genesis Engine server.
 * Follows AGENTS.md integration protocols for WebSocket and HTTP communication.
 * 
 * Features:
 * - WebSocket connection for real-time updates
 * - HTTP REST API fallback for stateless queries
 * - Event-driven architecture with listeners
 * - Automatic reconnection handling
 * - Message buffering during disconnection
 * 
 * Usage:
 * @example
 * import { engineService } from './services/EngineService';
 * 
 * // Connect to engine
 * await engineService.connect();
 * 
 * // Subscribe to events
 * const unsubscribe = engineService.on('engine:step', (data) => {
 *   console.log('Simulation stepped:', data);
 * });
 * 
 * // Start simulation
 * await engineService.startSimulation(config);
 * 
 * @see AGENTS.md for integration conventions
 */
export class EngineService {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'http://localhost:3001';
    this.wsUrl = config.wsUrl || 'ws://localhost:8765';
    this.ws = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.autoReconnect = true;
    this.messageBuffer = [];
  }
  
  /**
   * Connect to the engine via WebSocket
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }
      
      console.log('🔌 Connecting to Genesis Engine at', this.wsUrl);
      
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ Connected to Genesis Engine');
          this.connected = true;
          this.reconnectAttempts = 0;
          
          // Send buffered messages
          this.flushMessageBuffer();
          
          // Emit connected event
          this.emit('connected', {});
          
          resolve();
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };
        
        this.ws.onclose = () => {
          console.log('🔌 Disconnected from Genesis Engine');
          this.connected = false;
          
          // Emit disconnected event
          this.emit('disconnected', {});
          
          // Attempt to reconnect
          if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the engine
   */
  disconnect() {
    this.autoReconnect = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
  }
  
  /**
   * Check if connected to engine
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Handle incoming WebSocket messages
   * @private
   */
  handleMessage(message) {
    const { event, data, timestamp } = message;
    
    // Log message for debugging
    console.debug('[EngineService]', event, data);
    
    // Notify all listeners for this event
    this.emit(event, data, timestamp);
    
    // Also notify wildcard listeners
    this.emit('*', { event, data, timestamp });
  }
  
  /**
   * Emit an event to all listeners
   * @private
   */
  emit(event, ...args) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
  
  /**
   * Subscribe to engine events
   * @param {string} event - Event name (e.g., 'engine:step', 'snapshot:update')
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      callback(...args);
    });
    return unsubscribe;
  }
  
  /**
   * Send command via WebSocket
   * @param {string} type - Command type
   * @param {Object} data - Command data
   * @private
   */
  sendCommand(type, data = {}) {
    const message = {
      type,
      data,
      timestamp: Date.now()
    };
    
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Buffer message for later
      this.messageBuffer.push(message);
      console.warn('Not connected, buffering message:', type);
      return;
    }
    
    this.ws.send(JSON.stringify(message));
  }
  
  /**
   * Flush buffered messages
   * @private
   */
  flushMessageBuffer() {
    if (this.messageBuffer.length === 0) {
      return;
    }
    
    console.log('📤 Flushing', this.messageBuffer.length, 'buffered messages');
    
    this.messageBuffer.forEach(message => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    });
    
    this.messageBuffer = [];
  }
  
  /**
   * Schedule reconnection attempt
   * @private
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    
    console.log(
      `🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`
    );
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay);
  }
  
  // =========================================================================
  // HTTP API Methods (Stateless)
  // =========================================================================
  
  /**
   * Get engine health status via HTTP
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    const response = await fetch(`${this.apiUrl}/health`);
    return await response.json();
  }
  
  /**
   * Get engine status via HTTP
   * @returns {Promise<Object>} Engine status
   */
  async getStatus() {
    const response = await fetch(`${this.apiUrl}/api/v1/status`);
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to get engine status');
    }
    
    return result.data;
  }
  
  /**
   * Get current snapshot via HTTP
   * @param {string} kind - 'metrics' or 'full'
   * @returns {Promise<Object>} Snapshot data
   */
  async getSnapshot(kind = 'metrics') {
    const response = await fetch(`${this.apiUrl}/api/v1/snapshot?kind=${kind}`);
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to get snapshot');
    }
    
    return result.data;
  }
  
  // =========================================================================
  // WebSocket Command Methods
  // =========================================================================
  
  /**
   * Request current engine state
   */
  requestState() {
    this.sendCommand('getState');
  }
  
  /**
   * Start simulation with configuration
   * @param {Object} config - Engine configuration (EngineConfigV1)
   * @param {Object} options - Engine options
   * @param {boolean} autoRun - Auto-run simulation
   */
  startSimulation(config, options = { provider: 'mock' }, autoRun = false) {
    this.sendCommand('start', { config, options, autoRun });
  }
  
  /**
   * Stop simulation
   */
  stopSimulation() {
    this.sendCommand('stop');
  }
  
  /**
   * Step simulation forward
   * @param {number} steps - Number of steps to execute
   */
  stepSimulation(steps = 1) {
    this.sendCommand('step', { steps });
  }
  
  /**
   * Request a snapshot
   * @param {string} kind - 'metrics' or 'full'
   */
  requestSnapshot(kind = 'metrics') {
    this.sendCommand('snapshot', { kind });
  }
  
  /**
   * Send ping to check connection
   */
  ping() {
    this.sendCommand('ping');
  }
}

// Export singleton instance
export const engineService = new EngineService();

// Export class for testing
export default EngineService;
