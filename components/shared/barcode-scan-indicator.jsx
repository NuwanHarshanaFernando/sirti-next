import React from 'react';
import { QrCode, Scan } from 'lucide-react';

const BarcodeScanIndicator = ({ isScanning, currentBuffer, className = '' }) => {
  if (!isScanning && !currentBuffer) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg animate-pulse">
        <Scan className="w-5 h-5" />
        <span className="font-medium">
          {isScanning ? 'Scanning barcode...' : 'Processing...'}
        </span>
        {currentBuffer && (
          <span className="text-blue-100 text-sm font-mono">
            ({currentBuffer.length} chars)
          </span>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanIndicator;
