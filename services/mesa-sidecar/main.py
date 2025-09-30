#!/usr/bin/env python3
"""
Mesa Sidecar - JSON-RPC Interface

Provides a JSON-RPC interface over stdio for the Mesa simulation engine.
Implements TIME_V1 semantics with deterministic serialization.
"""

import sys
import json
import logging
from typing import Dict, Any, Optional
from engine_mesa import MesaEngine

# Configure logging to stderr (stdout is for RPC)
logging.basicConfig(
    level=logging.INFO,
    format='[Mesa] %(levelname)s: %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

class MesaSidecar:
    def __init__(self):
        self.engine: Optional[MesaEngine] = None
        self.request_id = 0
        
    def run(self):
        """Main RPC loop - read requests from stdin, write responses to stdout"""
        logger.info("Mesa sidecar starting...")
        
        try:
            for line in sys.stdin:
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    request = json.loads(line)
                    response = self.handle_request(request)
                    
                    # Ensure response includes request ID
                    if 'id' in request:
                        response['id'] = request['id']
                    
                    # Write response to stdout
                    print(json.dumps(response), flush=True)
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON: {e}")
                    self.send_error(f"Invalid JSON: {e}")
                except Exception as e:
                    logger.error(f"Request handling error: {e}")
                    self.send_error(f"Request handling error: {e}")
                    
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        except Exception as e:
            logger.error(f"Fatal error: {e}")
        finally:
            if self.engine:
                self.engine.cleanup()
            logger.info("Mesa sidecar shutting down")
    
    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a single RPC request"""
        op = request.get('op')
        
        if op == 'init':
            return self.handle_init(request)
        elif op == 'step':
            return self.handle_step(request)
        elif op == 'snapshot':
            return self.handle_snapshot(request)
        elif op == 'stop':
            return self.handle_stop(request)
        elif op == 'info':
            return self.handle_info(request)
        else:
            return {'ok': False, 'error': f'Unknown operation: {op}'}
    
    def handle_init(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize the Mesa simulation"""
        try:
            cfg = request.get('cfg')
            seed = request.get('seed')
            
            if not cfg:
                return {'ok': False, 'error': 'Missing configuration'}
            if not seed:
                return {'ok': False, 'error': 'Missing seed'}
            
            logger.info(f"Initializing Mesa engine with seed {seed}")
            
            self.engine = MesaEngine(cfg, int(seed))
            
            return {'ok': True}
            
        except Exception as e:
            logger.error(f"Init error: {e}")
            return {'ok': False, 'error': str(e)}
    
    def handle_step(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Step the simulation"""
        try:
            if not self.engine:
                return {'ok': False, 'error': 'Engine not initialized'}
            
            n = request.get('n', 1)
            if not isinstance(n, int) or n <= 0:
                return {'ok': False, 'error': 'Invalid step count'}
            
            current_tick = self.engine.step(n)
            
            return {'tick': current_tick}
            
        except Exception as e:
            logger.error(f"Step error: {e}")
            return {'ok': False, 'error': str(e)}
    
    def handle_snapshot(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Take a simulation snapshot"""
        try:
            if not self.engine:
                return {'ok': False, 'error': 'Engine not initialized'}
            
            kind = request.get('kind', 'metrics')
            snapshot = self.engine.snapshot(kind)
            
            return {'snapshot': snapshot}
            
        except Exception as e:
            logger.error(f"Snapshot error: {e}")
            return {'ok': False, 'error': str(e)}
    
    def handle_stop(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Stop the simulation"""
        try:
            if self.engine:
                self.engine.cleanup()
                self.engine = None
            
            return {'ok': True}
            
        except Exception as e:
            logger.error(f"Stop error: {e}")
            return {'ok': False, 'error': str(e)}
    
    def handle_info(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Get provider information"""
        try:
            import mesa
            
            provider_info = {
                'name': 'mesa',
                'version': mesa.__version__,
                'license': 'Apache-2.0',
                'buildHash': self.get_build_hash()
            }
            
            return {'provider': provider_info}
            
        except Exception as e:
            logger.error(f"Info error: {e}")
            return {'ok': False, 'error': str(e)}
    
    def get_build_hash(self) -> str:
        """Get a hash representing the current build"""
        import hashlib
        import mesa
        import numpy
        
        # Create a deterministic build identifier
        build_info = f"mesa:{mesa.__version__}:numpy:{numpy.__version__}"
        return hashlib.blake3(build_info.encode()).hexdigest()[:16]
    
    def send_error(self, message: str) -> None:
        """Send an error response"""
        response = {'ok': False, 'error': message}
        print(json.dumps(response), flush=True)

if __name__ == '__main__':
    sidecar = MesaSidecar()
    sidecar.run()