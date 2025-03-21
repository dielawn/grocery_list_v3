// NostrDebug.jsx - A component to help debug Nostr and camera issues
import React, { useState, useEffect } from 'react';
import useNostr from './useNostr';

const NostrDebug = () => {
  const { isConnected, publicKey } = useNostr();
  const [cameraInfo, setCameraInfo] = useState('Not checked');
  const [browserInfo, setBrowserInfo] = useState({});
  const [logs, setLogs] = useState([]);

  // Add a log entry
  const addLog = (message) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Get browser information
  useEffect(() => {
    const ua = navigator.userAgent;
    const browser = {
      userAgent: ua,
      isAndroid: /android/i.test(ua),
      isIOS: /iphone|ipad|ipod/i.test(ua),
      isChrome: /chrome|chromium/i.test(ua),
      isSafari: /safari/i.test(ua) && !/chrome|chromium/i.test(ua),
      isFirefox: /firefox/i.test(ua),
    };
    
    setBrowserInfo(browser);
    addLog(`Browser detected: ${JSON.stringify(browser, null, 2)}`);
  }, []);

  // Check camera availability
  const checkCamera = async () => {
    try {
      addLog('Checking camera availability...');
      setCameraInfo('Checking...');
      
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addLog('MediaDevices API not available');
        setCameraInfo('ERROR: MediaDevices API not available');
        return;
      }
      
      // List available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      addLog(`Found ${videoDevices.length} video devices`);
      
      if (videoDevices.length === 0) {
        setCameraInfo('No cameras found');
        return;
      }
      
      // Log camera info
      const cameraList = videoDevices.map((device, index) => 
        `Camera ${index + 1}: ${device.label || 'Label not available'} (${device.deviceId.substring(0, 8)}...)`
      ).join(', ');
      
      addLog(`Cameras: ${cameraList}`);
      
      // Try to access camera
      addLog('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const tracks = stream.getVideoTracks();
      addLog(`Access granted: ${tracks.length} video tracks`);
      
      if (tracks.length > 0) {
        const settings = tracks[0].getSettings();
        setCameraInfo(`Camera working: ${tracks[0].label}, ${settings.width}x${settings.height}`);
        
        // Clean up
        tracks.forEach(track => track.stop());
      } else {
        setCameraInfo('Camera access granted but no video tracks found');
      }
    } catch (error) {
      addLog(`Camera error: ${error.name} - ${error.message}`);
      setCameraInfo(`ERROR: ${error.name} - ${error.message}`);
    }
  };

  // Test QR library
  const testQRLibrary = async () => {
    try {
      addLog('Testing jsQR library...');
      
      if (window.jsQR) {
        addLog('jsQR is already loaded');
      } else {
        addLog('Loading jsQR library...');
        
        const jsQRScript = document.createElement('script');
        jsQRScript.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
        jsQRScript.async = true;
        
        const loadPromise = new Promise((resolve, reject) => {
          jsQRScript.onload = resolve;
          jsQRScript.onerror = reject;
        });
        
        document.body.appendChild(jsQRScript);
        
        await loadPromise;
        addLog('jsQR loaded successfully');
      }
      
      if (window.jsQR) {
        addLog('jsQR library is available and ready');
      } else {
        addLog('ERROR: jsQR failed to load correctly');
      }
    } catch (error) {
      addLog(`QR library error: ${error.message}`);
    }
  };

  return (
    <div style={{
      padding: '15px',
      margin: '20px 0',
      border: '1px solid #ccc',
      borderRadius: '5px',
      backgroundColor: 'var(--background-color2)'
    }}>
      <h3>Nostr Debug Panel</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <p><strong>Nostr Connection:</strong> {isConnected ? 'Connected' : 'Disconnected'}</p>
        <p><strong>Public Key:</strong> {publicKey ? publicKey.substring(0, 10) + '...' : 'None'}</p>
        <p><strong>Camera Status:</strong> {cameraInfo}</p>
        <p><strong>Device:</strong> {browserInfo.isAndroid ? 'Android' : browserInfo.isIOS ? 'iOS' : 'Desktop'}</p>
        <p><strong>Browser:</strong> {
          browserInfo.isChrome ? 'Chrome' : 
          browserInfo.isSafari ? 'Safari' : 
          browserInfo.isFirefox ? 'Firefox' : 'Other'
        }</p>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button 
          onClick={checkCamera}
          style={{
            padding: '8px 15px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check Camera
        </button>
        
        <button 
          onClick={testQRLibrary}
          style={{
            padding: '8px 15px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test QR Library
        </button>
      </div>
      
      <div>
        <h4>Debug Logs</h4>
        <div style={{
          height: '200px',
          overflowY: 'scroll',
          backgroundColor: '#333',
          color: '#fff',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          borderRadius: '4px'
        }}>
          {logs.length === 0 ? 'No logs yet' : logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NostrDebug;