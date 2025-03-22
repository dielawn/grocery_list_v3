// ModifiedQRScanner.jsx - Modified version of IntegratedQRScanner that can start in scan mode
import React, { useState, useRef, useEffect } from 'react';
import IntegratedQRScanner from './IntegratedQRScanner';

const ModifiedQRScanner = ({ onShareWithKey, onClose }) => {
  // We'll use this component to control the IntegratedQRScanner
  // and make it automatically start scanning
  
  // This component will do a few things:
  // 1. Render the IntegratedQRScanner
  // 2. After render, use a timeout to click the scan button
  // 3. After scan button is clicked, use another timeout to click the camera button
  
  const [step, setStep] = useState(0);
  const containerRef = useRef(null);
  
  useEffect(() => {
    // After initial render, find and click the scan button
    if (step === 0) {
      const timer1 = setTimeout(() => {
        try {
          const scanButton = containerRef.current?.querySelector('button[style*="backgroundColor: #f5f5f5"]:last-child');
          if (scanButton) {
            scanButton.click();
            setStep(1);
          }
        } catch (error) {
          console.error("Failed to click scan button:", error);
        }
      }, 200);
      
      return () => clearTimeout(timer1);
    }
    
    // After clicking scan button, find and click the camera button
    if (step === 1) {
      const timer2 = setTimeout(() => {
        try {
          const cameraButton = containerRef.current?.querySelector('button[style*="backgroundColor: #4CAF50"]');
          if (cameraButton) {
            cameraButton.click();
            setStep(2);
          }
        } catch (error) {
          console.error("Failed to click camera button:", error);
        }
      }, 200);
      
      return () => clearTimeout(timer2);
    }
  }, [step]);
  
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <IntegratedQRScanner onShareWithKey={onShareWithKey} />
      
      {/* Custom close button that's always visible */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          backgroundColor: 'var(--background-color)',
          color: 'var(--text-color)',
          border: 'none',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
};

export default ModifiedQRScanner;