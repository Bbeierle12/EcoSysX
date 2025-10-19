import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Diagnostic version of the ecosystem simulator
 * Shows what's loading and what's failing
 */
const DiagnosticApp = () => {
  const mountRef = useRef(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [sceneReady, setSceneReady] = useState(false);

  const log = (message, type = 'info') => {
    console.log(`[DIAGNOSTIC] ${message}`);
    setDiagnostics(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    log('🚀 Starting diagnostic initialization...', 'success');
    
    if (!mountRef.current) {
      log('❌ Mount ref is null!', 'error');
      return;
    }
    
    log('✅ Mount ref exists', 'success');
    log(`📐 Mount dimensions: ${mountRef.current.clientWidth}x${mountRef.current.clientHeight}`, 'info');

    try {
      // Check WebGL support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        log('❌ WebGL not supported!', 'error');
        return;
      }
      log('✅ WebGL supported', 'success');

      // Create scene
      log('Creating THREE.Scene...', 'info');
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87CEEB); // Sky blue
      log('✅ Scene created', 'success');

      // Create camera
      log('Creating camera...', 'info');
      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(50, 40, 50);
      camera.lookAt(0, 0, 0);
      log('✅ Camera created and positioned', 'success');

      // Create renderer
      log('Creating WebGL renderer...', 'info');
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      mountRef.current.appendChild(renderer.domElement);
      log('✅ Renderer created and attached to DOM', 'success');

      // Add controls
      log('Adding orbit controls...', 'info');
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      log('✅ Controls added', 'success');

      // Add lights
      log('Adding lights...', 'info');
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(20, 20, 20);
      scene.add(directionalLight);
      log('✅ Lights added', 'success');

      // Create ground
      log('Creating ground plane...', 'info');
      const groundGeometry = new THREE.PlaneGeometry(100, 100);
      const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x4a6741 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      log('✅ Ground added', 'success');

      // Add grid
      log('Adding grid helper...', 'info');
      const gridHelper = new THREE.GridHelper(100, 10, 0x2a4a2a, 0x1a3a1a);
      gridHelper.position.y = 0.1;
      scene.add(gridHelper);
      log('✅ Grid added', 'success');

      // Add some test agents (colorful spheres)
      log('Creating test agents...', 'info');
      const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
      for (let i = 0; i < 6; i++) {
        const geometry = new THREE.SphereGeometry(1, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: colors[i] });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(
          (Math.random() - 0.5) * 40,
          1,
          (Math.random() - 0.5) * 40
        );
        scene.add(sphere);
      }
      log(`✅ Added 6 test agents`, 'success');

      // Test render
      log('Testing initial render...', 'info');
      renderer.render(scene, camera);
      log('✅ Initial render complete!', 'success');

      setSceneReady(true);

      // Animation loop
      let frameCount = 0;
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
        
        if (frameCount === 0) {
          log('🎬 Animation loop started', 'success');
        }
        frameCount++;
      };
      animate();

      log('🎉 DIAGNOSTIC COMPLETE - Scene should be visible!', 'success');

      // Cleanup
      return () => {
        log('🧹 Cleaning up...', 'info');
        controls.dispose();
        renderer.dispose();
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
      };

    } catch (error) {
      log(`❌ CRITICAL ERROR: ${error.message}`, 'error');
      console.error('Full error:', error);
    }
  }, []);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex',
      backgroundColor: '#1a1a1a',
      overflow: 'hidden'
    }}>
      {/* 3D Canvas Container */}
      <div 
        ref={mountRef} 
        style={{ 
          flex: 1,
          position: 'relative',
          backgroundColor: sceneReady ? 'transparent' : '#333'
        }}
      />

      {/* Diagnostic Panel */}
      <div style={{
        width: '400px',
        backgroundColor: '#000',
        color: '#fff',
        padding: '20px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderLeft: '2px solid #444'
      }}>
        <h2 style={{ 
          margin: '0 0 15px 0', 
          color: '#4CAF50',
          fontSize: '18px',
          borderBottom: '2px solid #4CAF50',
          paddingBottom: '10px'
        }}>
          🔬 EcoSysX Diagnostics
        </h2>

        <div style={{
          backgroundColor: sceneReady ? '#1b4d1b' : '#4d1b1b',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '15px',
          border: `2px solid ${sceneReady ? '#4CAF50' : '#f44336'}`
        }}>
          <strong>Status: </strong>
          {sceneReady ? (
            <span style={{ color: '#4CAF50' }}>✅ SCENE READY</span>
          ) : (
            <span style={{ color: '#f44336' }}>⏳ Initializing...</span>
          )}
        </div>

        <h3 style={{ 
          fontSize: '14px', 
          marginBottom: '10px',
          color: '#2196F3'
        }}>
          📋 Initialization Log:
        </h3>

        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          backgroundColor: '#1a1a1a',
          padding: '10px',
          borderRadius: '5px'
        }}>
          {diagnostics.map((log, index) => (
            <div 
              key={index}
              style={{
                padding: '5px',
                marginBottom: '3px',
                borderLeft: `3px solid ${
                  log.type === 'error' ? '#f44336' :
                  log.type === 'success' ? '#4CAF50' : '#2196F3'
                }`,
                paddingLeft: '8px',
                backgroundColor: log.type === 'error' ? '#3d1a1a' : 'transparent'
              }}
            >
              <span style={{ color: '#888', fontSize: '10px' }}>{log.time}</span>
              {' '}
              <span style={{
                color: log.type === 'error' ? '#ff5252' :
                       log.type === 'success' ? '#69f0ae' : '#64b5f6'
              }}>
                {log.message}
              </span>
            </div>
          ))}
        </div>

        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#1a237e',
          borderRadius: '5px',
          border: '1px solid #3949ab'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#82b1ff' }}>
            💡 What You Should See:
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '20px',
            color: '#b3c7ff'
          }}>
            <li>Sky blue background</li>
            <li>Green ground plane with grid</li>
            <li>6 colorful spheres (agents)</li>
            <li>Ability to rotate camera with mouse</li>
          </ul>
          
          <div style={{ 
            marginTop: '15px',
            fontSize: '11px',
            color: '#90caf9'
          }}>
            <strong>Controls:</strong>
            <div>• Left mouse drag = Rotate</div>
            <div>• Scroll wheel = Zoom</div>
            <div>• Right mouse drag = Pan</div>
          </div>
        </div>

        {!sceneReady && diagnostics.length === 0 && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#4d1b1b',
            borderRadius: '5px',
            border: '1px solid #f44336',
            color: '#ff8a80'
          }}>
            ⚠️ No initialization logs yet. Check browser console (F12) for errors.
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticApp;
