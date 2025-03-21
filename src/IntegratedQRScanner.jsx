// Enhanced IntegratedQRScanner.jsx - Scanning and displaying QR codes
import React, { useState, useRef, useEffect } from 'react';
import useNostr from './useNostr';

const IntegratedQRScanner = ({ onShareWithKey }) => {
  const { publicKey, formatPublicKey } = useNostr();
  
  // State for mode and QR scanning
  const [selectedMode, setSelectedMode] = useState('display'); // 'display' or 'scan'
  const [scanning, setScanning] = useState(false);
  const [scannedKey, setScannedKey] = useState('');
  const [qrError, setQrError] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // Refs for video, canvas, QR code, and intervals
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const qrCodeRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const streamRef = useRef(null);

  // Add a log entry
  const addLog = (message) => {
    console.log(message); // Also log to console for debugging
    const timestamp = new Date().toISOString().substring(11, 19);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    // Load libraries based on mode
    const loadLibraries = async () => {
      if (selectedMode === 'display') {
        await loadQRCodeLibrary();
        generateQR();
      } else if (selectedMode === 'scan' && scanning) {
        await loadQRLibrary();
        startScanner();
      }
    };
    
    loadLibraries();
    
    // Clean up on unmount or mode change
    return () => {
      stopScanner();
    };
  }, [selectedMode, scanning, publicKey]);

  // Load QR code generation library
  const loadQRCodeLibrary = async () => {
    return new Promise((resolve, reject) => {
      if (window.QRCode) {
        addLog('QRCode library already loaded');
        resolve();
        return;
      }
      
      addLog('Loading QRCode generation library...');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      script.async = true;
      
      script.onload = () => {
        addLog('QRCode library loaded successfully');
        resolve();
      };
      
      script.onerror = (error) => {
        addLog(`Failed to load QRCode generator: ${error}`);
        reject(new Error('Failed to load QR code generator library'));
      };
      
      document.body.appendChild(script);
    });
  };

  // Generate QR code for display
  const generateQR = () => {
    if (!qrCodeRef.current || !window.QRCode) return;
    
    addLog('Generating QR code');
    qrCodeRef.current.innerHTML = '';
    
    try {
      // eslint-disable-next-line no-new
      new window.QRCode(qrCodeRef.current, {
        text: `nostr:${publicKey}`,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.H
      });
      addLog('QR code generated successfully');
    } catch (error) {
      addLog(`Error generating QR code: ${error.message}`);
      setQrError('Failed to generate QR code');
    }
  };

  // Load QR scanner library
  const loadQRLibrary = async () => {
    return new Promise((resolve, reject) => {
      if (window.jsQR) {
        addLog('jsQR library already loaded');
        resolve();
        return;
      }
      
      addLog('Loading jsQR library...');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      
      script.onload = () => {
        addLog('jsQR library loaded successfully');
        resolve();
      };
      
      script.onerror = (error) => {
        addLog(`Failed to load jsQR: ${error}`);
        reject(new Error('Failed to load QR scanner library'));
      };
      
      document.body.appendChild(script);
    });
  };

  // Stop camera and scanning
  const stopScanner = () => {
    addLog('Stopping scanner');
    
    // Clear scan interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        addLog(`Stopping track: ${track.kind}`);
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setScanning(false);
  };

  // Start camera and QR scanning
  const startScanner = async () => {
    try {
      setQrError(null);
      addLog('Starting scanner');
      
      // Load QR library if needed
      if (!window.jsQR) {
        await loadQRLibrary();
      }
      
      if (!window.jsQR) {
        throw new Error('QR scanner library not loaded');
      }
      
      // Request camera access
      addLog('Requesting camera access');
      const constraints = { 
        video: { facingMode: 'environment' },
        audio: false 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const videoTracks = stream.getVideoTracks();
      addLog(`Got stream with ${videoTracks.length} video tracks`);
      
      if (videoTracks.length === 0) {
        throw new Error('No video tracks available');
      }
      
      // Set up video element
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not available');
      }
      
      video.srcObject = stream;
      video.setAttribute('playsinline', true); // Required for iOS
      video.muted = true;
      
      // Wait for video to be ready to play
      addLog('Setting up video');
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          addLog(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
          resolve();
        };
      });
      
      // Play the video
      addLog('Starting video playback');
      await video.play();
      addLog('Video playback started');
      
      // Start QR code scanning
      addLog('Starting QR code scanning');
      scanIntervalRef.current = setInterval(() => {
        scanQRCode();
      }, 500);
      
      setScanning(true);
    } catch (error) {
      addLog(`Error: ${error.name} - ${error.message}`);
      setQrError(`${error.name}: ${error.message}`);
      stopScanner();
    }
  };

  // Process frames to find QR codes
  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current || !window.jsQR) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    try {
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data for QR processing
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Process with jsQR
      const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code) {
        addLog(`QR code found: ${code.data}`);
        
        // Process the QR code data
        let key = code.data;
        
        // Handle nostr: prefix
        if (key.startsWith('nostr:')) {
          key = key.substring(6);
        }
        
        // Validate as Nostr key
        if (/^npub1[a-z0-9]{58,59}$/.test(key) || /^[a-f0-9]{64}$/.test(key)) {
          addLog('Valid Nostr key found');
          setScannedKey(key);
          stopScanner();
          
          // Notify parent component
          if (onShareWithKey && typeof onShareWithKey === 'function') {
            onShareWithKey(key);
          }
        } else {
          addLog('QR code found but not a valid Nostr key');
        }
      }
    } catch (error) {
      addLog(`Error processing QR code: ${error.message}`);
    }
  };

  // Toggle scanner
  const toggleScanner = () => {
    if (scanning) {
      stopScanner();
    } else {
      setScanning(true);
    }
  };

  // Copy public key to clipboard
  const copyToClipboard = () => {
    if (!publicKey) return;
    
    navigator.clipboard.writeText(publicKey)
      .then(() => {
        addLog('Public key copied to clipboard');
        // Show temporary message
        const copyBtn = document.getElementById('copy-key-btn');
        if (copyBtn) {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 2000);
        }
      })
      .catch(error => {
        addLog(`Failed to copy to clipboard: ${error.message}`);
        setQrError('Failed to copy: ' + error.message);
      });
  };

  return (
    <div className="integrated-qr-scanner" style={{
      padding: '15px',
      margin: '20px 0',
      border: '1px solid #ccc',
      borderRadius: '8px',
      maxWidth: '500px'
    }}>
      <h3>Nostr QR Code</h3>
      
      {qrError && (
        <div style={{
          padding: '10px',
          margin: '10px 0',
          backgroundColor: '#f44336',
          color: 'white',
          borderRadius: '4px'
        }}>
          {qrError}
          <button 
            onClick={() => setQrError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              float: 'right',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '15px'
      }}>
        <button 
          onClick={() => setSelectedMode('display')}
          style={{
            padding: '10px 20px',
            backgroundColor: selectedMode === 'display' ? '#4CAF50' : '#f5f5f5',
            color: selectedMode === 'display' ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '4px 0 0 4px',
            cursor: 'pointer'
          }}
        >
          My QR Code
        </button>
        <button 
          onClick={() => {
            setSelectedMode('scan');
            setScannedKey('');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: selectedMode === 'scan' ? '#4CAF50' : '#f5f5f5',
            color: selectedMode === 'scan' ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '0 4px 4px 0',
            cursor: 'pointer'
          }}
        >
          Scan QR Code
        </button>
      </div>
      
      {selectedMode === 'display' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            padding: '10px',
            margin: '10px 0',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <code style={{ wordBreak: 'break-all' }}>
              {formatPublicKey(publicKey)}
            </code>
            <button 
              id="copy-key-btn"
              onClick={copyToClipboard}
              style={{
                padding: '5px 10px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Copy
            </button>
          </div>
          
          <div 
            ref={qrCodeRef}
            style={{
              padding: '15px',
              backgroundColor: 'white',
              borderRadius: '8px',
              margin: '15px 0'
            }}
          ></div>
          
          <p style={{ textAlign: 'center', color: '#666' }}>
            Share this QR code with others to let them connect to your grocery list.
          </p>
        </div>
      )}
      
      {selectedMode === 'scan' && (
        <div>
          {!scanning && !scannedKey && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '15px'
            }}>
              <button 
                onClick={toggleScanner}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Start Camera
              </button>
            </div>
          )}
          
          <div style={{
            width: '100%',
            height: '300px',
            backgroundColor: '#000',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '8px',
            border: scanning ? '2px solid #4CAF50' : '1px solid #ccc',
            display: scanning || scannedKey ? 'block' : 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {!scanning && !scannedKey && (
              <div style={{ color: 'white' }}>
                Camera inactive
              </div>
            )}
            
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: scanning ? 'block' : 'none'
              }}
              playsInline
              muted
            />
            
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            
            {scanning && (
              <>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    width: '200px',
                    height: '200px',
                    border: '3px solid #4CAF50',
                    borderRadius: '10px'
                  }}></div>
                </div>
                
                <button 
                  onClick={toggleScanner}
                  style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '8px 16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          
          {scannedKey && (
            <div style={{
              margin: '15px 0',
              padding: '10px',
              backgroundColor: '#e8f5e9',
              borderRadius: '4px'
            }}>
              <h4>Scanned Public Key:</h4>
              <code style={{
                display: 'block',
                padding: '8px',
                marginBottom: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                wordBreak: 'break-all'
              }}>
                {formatPublicKey(scannedKey)}
              </code>
              <div style={{
                display: 'flex',
                gap: '10px'
              }}>
                <button
                  onClick={() => {
                    if (onShareWithKey && typeof onShareWithKey === 'function') {
                      onShareWithKey(scannedKey);
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Share List with This User
                </button>
                <button
                  onClick={() => {
                    setScannedKey('');
                    toggleScanner();
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Scan Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
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

export default IntegratedQRScanner;