// SimplifiedCameraTest.jsx - A minimal camera component for testing
import React, { useState, useRef, useEffect } from 'react';

const SimplifiedCameraTest = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Add a log entry
  const addLog = (message) => {
    console.log(message); // Also log to console for debugging
    const timestamp = new Date().toISOString().substring(11, 19);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Clean up function to stop camera
  const stopCamera = () => {
    addLog('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        addLog(`Stopping track: ${track.kind}`);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  // Start camera with simple configuration
  const startCamera = async () => {
    try {
      setError(null);
      addLog('Starting camera...');
      
      // Use basic constraints
      const constraints = { 
        video: { facingMode: 'environment' },
        audio: false 
      };
      
      addLog('Requesting camera with constraints: ' + JSON.stringify(constraints));
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      addLog(`Got stream with ${stream.getVideoTracks().length} video tracks`);
      streamRef.current = stream;
      
      if (videoRef.current) {
        addLog('Setting video source');
        videoRef.current.srcObject = stream;
        
        // Set up video element
        videoRef.current.onloadedmetadata = () => {
          addLog(`Video metadata loaded: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
        };
        
        videoRef.current.onplay = () => {
          addLog('Video playback started');
        };
        
        // Start playing
        try {
          addLog('Attempting to play video');
          await videoRef.current.play();
          addLog('Video is now playing');
          setIsActive(true);
        } catch (playError) {
          addLog(`Play error: ${playError.message}`);
          setError(`Failed to play video: ${playError.message}`);
          stopCamera();
        }
      }
    } catch (err) {
      addLog(`Camera error: ${err.name} - ${err.message}`);
      setError(`Failed to access camera: ${err.message}`);
      stopCamera();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div style={{
      padding: '15px',
      margin: '20px 0',
      border: '1px solid #ccc',
      borderRadius: '5px',
      background: '#f5f5f5',
      maxWidth: '500px'
    }}>
      <h3>Camera Test</h3>
      
      {error && (
        <div style={{
          padding: '10px',
          margin: '10px 0',
          backgroundColor: '#f44336',
          color: 'white',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '15px'
      }}>
        <button 
          onClick={isActive ? stopCamera : startCamera}
          style={{
            padding: '10px 20px',
            backgroundColor: isActive ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          {isActive ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>
      
      <div style={{
        width: '100%',
        height: '300px',
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {!isActive && !error && <div style={{color: 'white'}}>Camera inactive</div>}
        
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isActive ? 'block' : 'none'
          }}
          playsInline
          muted
          autoPlay
        />
      </div>
      
      <div style={{
        marginTop: '15px',
        maxHeight: '150px',
        overflowY: 'auto',
        backgroundColor: '#333',
        color: '#fff',
        padding: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderRadius: '4px'
      }}>
        {logs.length === 0 ? 'No logs yet' : logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
};

export default SimplifiedCameraTest;