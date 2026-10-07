import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SCANNER_ELEMENT_ID = 'campus-events-qr-reader';

export default function QRScanner({ onScan, isPaused = false }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastScannedRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  // Initialize camera list
  useEffect(() => {
    let isMounted = true;

    async function initCameras() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isMounted) {
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Default to back/environment camera if possible
            const backCam = devices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          } else {
            setScannerError('No camera devices found on this device.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setScannerError(
            'Unable to access camera. Please allow camera permissions in your browser.'
          );
        }
      }
    }

    initCameras();

    return () => {
      isMounted = false;
    };
  }, []);

  // Start or stop camera based on selectedCameraId & isPaused
  useEffect(() => {
    if (!selectedCameraId || uploadMode || isPaused) {
      stopScanner();
      return;
    }

    startScanner(selectedCameraId);

    return () => {
      stopScanner();
    };
  }, [selectedCameraId, uploadMode, isPaused]);

  // Clean unmount teardown
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async (cameraId) => {
    try {
      setScannerError(null);

      // Stop existing instance if any
      await stopScanner();

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        cameraId,
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        (errorMessage) => {
          // Ignore intermittent scan parse errors while camera is moving
        }
      );

      setIsScanning(true);

      // Check torch capability
      try {
        const capabilities = scanner.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setTorchAvailable(true);
        } else {
          setTorchAvailable(false);
        }
      } catch (e) {
        setTorchAvailable(false);
      }
    } catch (err) {
      setIsScanning(false);
      setScannerError(err.message || 'Failed to start camera scanner.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        // Suppress cleanup error
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
        setTorchOn(false);
      }
    }
  };

  const handleSuccessfulScan = (decodedText) => {
    const now = Date.now();
    // Debounce duplicate rapid scans within 2 seconds
    if (lastScannedRef.current === decodedText && now - lastScanTimeRef.current < 2000) {
      return;
    }

    lastScannedRef.current = decodedText;
    lastScanTimeRef.current = now;

    // Haptic feedback if supported by browser
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    if (onScan) {
      onScan(decodedText);
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !torchAvailable) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, true);
      handleSuccessfulScan(decodedText);
    } catch (err) {
      setScannerError('Could not decode QR code from the selected image file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col items-center">
      {/* Scanner Header Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isScanning ? 'bg-emerald-400' : 'bg-gray-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isScanning ? 'bg-emerald-500' : 'bg-gray-500'
              }`}
            />
          </span>
          <span className="text-sm font-medium text-gray-300">
            {isScanning ? 'Scanner Active' : uploadMode ? 'Image Upload Mode' : 'Scanner Idle'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Torch toggle */}
          {torchAvailable && isScanning && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                torchOn
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              }`}
              title="Toggle Flashlight"
            >
              🔦 {torchOn ? 'Flash On' : 'Flash Off'}
            </button>
          )}

          {/* Toggle between Camera and Image File */}
          <button
            type="button"
            onClick={() => setUploadMode(!uploadMode)}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium border border-gray-700 transition-colors"
          >
            {uploadMode ? 'Switch to Camera' : 'Scan from Image'}
          </button>
        </div>
      </div>

      {/* Camera Selector */}
      {!uploadMode && cameras.length > 1 && (
        <div className="w-full mb-3">
          <label className="block text-xs font-medium text-gray-400 mb-1">Select Camera:</label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || `Camera ${cam.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* QR Reader Viewport */}
      <div className="w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden border-2 border-emerald-500/30 relative flex items-center justify-center">
        <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />

        {uploadMode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gray-900/90 text-center">
            <svg
              className="w-12 h-12 text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-300 font-medium mb-3">
              Upload a ticket QR code image
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileScan}
              className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Guidance Note */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        Point the camera at the attendee's ticket QR code. Check-in records automatically upon scan.
      </p>

      {/* Error Message */}
      {scannerError && (
        <div className="w-full mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs text-center">
          {scannerError}
        </div>
      )}
    </div>
  );
}
