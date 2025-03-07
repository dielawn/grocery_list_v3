// NostrQRCode.jsx
import React, { useState, useRef, useEffect } from 'react';
import useNostr from './useNostr';
import './NostrQRCode.css';

const NostrQRCode = ({ onShareWithKey }) => {
  const { publicKey, formatPublicKey } = useNostr();
  const [selectedMode, setSelectedMode] = useState('display'); // 'display' or 'scan'
  const [qrValue, setQrValue] = useState('');
  const [qrError, setQrError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannedKey, setScannedKey] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const qrCodeRef = useRef(null);

  useEffect(() => {
    // Load QR code libraries dynamically
    const loadQRLibs = async () => {
      try {
        // Only load QR generation if in display mode
        if (selectedMode === 'display') {
          if (!window.QRCode) {
            const qrScript = document.createElement('script');
            qrScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
            qrScript.async = true;
            qrScript.onload = generateQR;
            document.body.appendChild(qrScript);
          } else {
            generateQR();
          }
        }
        
        // Only load QR scanner if in scan mode
        if (selectedMode === 'scan' && scanning) {
          if (!window.jsQR) {
            const jsQRScript = document.createElement('script');
            jsQRScript.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
            jsQRScript.async = true;
            jsQRScript.onload = startScanner;
            document.body.appendChild(jsQRScript);
          } else {
            startScanner();
          }
        }
      } catch (error) {
        console.error('Error loading QR libraries:', error);
        setQrError('Failed to load QR code libraries');
      }
    };

    loadQRLibs();

    // Cleanup function
    return () => {
      if (scanning) {
        stopScanner();
      }
    };
  }, [selectedMode, scanning, publicKey]);

  const generateQR = () => {
    setQrValue(`nostr:${publicKey}`);
    
    if (qrCodeRef.current) {
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
      } catch (error) {
        console.error('Error generating QR code:', error);
        setQrError('Failed to generate QR code');
      }
    }
  };

  const startScanner = async () => {
    if (!window.jsQR) {
      setQrError('QR scanner library not loaded');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start scanning loop
        requestAnimationFrame(scanQRCode);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      setQrError('Failed to access camera. Please ensure you have granted camera permissions.');
      setScanning(false);
    }
  };

  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current || !window.jsQR) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Set canvas size to match video
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data for scanning
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Scan for QR code
      const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code) {
        // Check if it's a valid Nostr key
        let key = code.data;
        
        // Handle nostr: prefix
        if (key.startsWith('nostr:')) {
          key = key.substring(6);
        }
        
        // Check if it's a valid npub
        if (/^npub1[a-z0-9]{58,59}$/.test(key) || /^[a-f0-9]{64}$/.test(key)) {
          setScannedKey(key);
          stopScanner();
          
          // Call the onShareWithKey callback if provided
          if (onShareWithKey && typeof onShareWithKey === 'function') {
            onShareWithKey(key);
          }
        }
      }
      
      // Continue scanning
      requestAnimationFrame(scanQRCode);
    } else {
      // Video not ready yet, try again
      requestAnimationFrame(scanQRCode);
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const toggleScanner = () => {
    if (scanning) {
      stopScanner();
    } else {
      setScanning(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicKey)
      .then(() => {
        // Show a temporary "Copied!" message
        const copyBtn = document.getElementById('copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };

  return (
    <div className="nostr-qr-container">
      <div className="qr-mode-toggle">

        <button 
          className={`mode-btn ${selectedMode === 'scan' ? 'active' : ''}`}
          onClick={() => setSelectedMode('scan')}
        >
          <span className="material-symbols-outlined">qr_code_scanner</span>
          Scan QR
        </button>
      </div>

      {qrError && (
        <div className="qr-error">
          {qrError}
          <button 
            className="close-error"
            onClick={() => setQrError(null)}
          >
            ×
          </button>
        </div>
      )}

      {selectedMode === 'display' && (
        <div className="display-qr-section">
          <h3>Your Nostr Public Key</h3>
          <div className="public-key-display">
            <code>{formatPublicKey(publicKey)}</code>
            <button 
              id="copy-btn"
              className="copy-btn"
              onClick={copyToClipboard}
            >
              Copy
            </button>
          </div>
          <div 
            ref={qrCodeRef} 
            className="qr-code-container"
          ></div>
          <p className="qr-instructions">
            Share this QR code with others to let them connect to your grocery list.
          </p>
        </div>
      )}

      {selectedMode === 'scan' && (
        <div className="scan-qr-section">
          <h3>Scan a Nostr QR Code</h3>
          
          {!scanning && !scannedKey && (
            <div className="scanner-controls">
              <button 
                className="camera-btn"
                onClick={toggleScanner}
              >
                <span className="material-symbols-outlined">photo_camera</span>
                Start Camera
              </button>
              <p className="qr-instructions">
                Scan someone's Nostr QR code to connect to their grocery list.
              </p>
            </div>
          )}
          
          {scanning && (
            <div className="camera-container">
              <video ref={videoRef} className="camera-preview"></video>
              <canvas ref={canvasRef} className="qr-canvas"></canvas>
              <div className="scanner-overlay">
                <div className="scanner-marker"></div>
              </div>
              <button 
                className="stop-camera-btn"
                onClick={toggleScanner}
              >
                Cancel
              </button>
            </div>
          )}
          
          {scannedKey && (
            <div className="scanned-key-result">
              <h4>Scanned Public Key:</h4>
              <code>{formatPublicKey(scannedKey)}</code>
              <div className="scanned-actions">
                <button
                  className="share-btn"
                  onClick={() => {
                    if (onShareWithKey && typeof onShareWithKey === 'function') {
                      onShareWithKey(scannedKey);
                    }
                  }}
                >
                  Share List with This User
                </button>
                <button
                  className="reset-btn"
                  onClick={() => {
                    setScannedKey('');
                  }}
                >
                  Scan Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NostrQRCode;