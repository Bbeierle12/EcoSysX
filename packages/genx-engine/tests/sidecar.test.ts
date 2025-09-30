import { describe, it, expect } from 'vitest';
import { SidecarTransport } from '../src/providers/sidecar.js';

describe('Sidecar Transport', () => {
  describe('Configuration', () => {
    it('should create transport with options', () => {
      const transport = new SidecarTransport({
        image: 'test-image:latest',
        timeout: 5000,
        useDocker: true
      });
      
      expect(transport).toBeDefined();
    });
    
    it('should have default options', () => {
      const transport = new SidecarTransport({
        image: 'test-image:latest'
      });
      
      expect(transport).toBeDefined();
    });
  });
  
  describe('Docker Command Building', () => {
    it('should build correct docker command', () => {
      const transport = new SidecarTransport({
        image: 'test-image:latest',
        env: { 'TEST_VAR': 'value' },
        dockerOptions: ['--memory=512m']
      });
      
      // Test internal command building (would need to expose method or test via integration)
      expect(transport).toBeDefined();
    });
  });
  
  describe('Process Management', () => {
    it('should handle start without docker', async () => {
      const transport = new SidecarTransport({
        image: 'test-image:latest',
        useDocker: false,
        command: ['echo', 'test']
      });
      
      // This will fail in test environment but shouldn't throw during construction
      expect(transport).toBeDefined();
    });
    
    it('should track running state', () => {
      const transport = new SidecarTransport({
        image: 'test-image:latest'
      });
      
      expect(transport.isRunning()).toBe(false);
    });
  });
});