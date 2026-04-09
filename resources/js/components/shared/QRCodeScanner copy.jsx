import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CameraOff, RefreshCw, X, Loader2 } from "lucide-react";

export default function QRCodeScanner({ onScan, onClose, paused = false, className = "" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  
  // REFS for state that shouldn't trigger re-renders/camera restarts
  const onScanRef = useRef(onScan);
  const lastScannedRef = useRef(null);
  const timeoutRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  // Keep callback fresh
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startScanning = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    
    // Initialize detector once
    const hasBarcodeDetector = "BarcodeDetector" in window;
    const barcodeDetector = hasBarcodeDetector 
      ? new window.BarcodeDetector({ formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39"] }) 
      : null;

    const scan = async () => {
      // 1. Check valid state
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        animationRef.current = requestAnimationFrame(scan);
        return;
      }

      // 2. Handle Paused State (Don't process, just loop)
      if (paused) {
        animationRef.current = requestAnimationFrame(scan);
        return;
      }

      // 3. Ensure video has data
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
          // Draw frame to canvas
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          if (barcodeDetector) {
            const barcodes = await barcodeDetector.detect(canvas);
            
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;

              // 4. DEBOUNCE LOGIC (Using Refs to avoid re-renders)
              if (code !== lastScannedRef.current) {
                // New code detected
                lastScannedRef.current = code;
                onScanRef.current(code);

                // Set cooldown
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                  lastScannedRef.current = null;
                }, 2000); // 2 second cooldown before same code can be scanned again
              }
            }
          }
        } catch (err) {
          // Detection errors ignored
        }
      }

      // Continue loop
      animationRef.current = requestAnimationFrame(scan);
    };

    scan();
  }, [paused]); 

  // Initialize Camera
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready before starting scan loop
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setIsLoading(false);
            startScanning();
          });
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsLoading(false);
      setError("Camera access denied or unavailable.");
    }
  }, [facingMode, startScanning]);

  // Initial Setup
  useEffect(() => {
    startCamera();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [startCamera]);

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className={`w-full h-full object-cover transition-opacity ${paused ? 'opacity-50 grayscale' : 'opacity-100'}`}
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay: Only show when active */}
      {!isLoading && !error && !paused && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
              {/* Corner markers */}
              <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
              <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
              <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
              <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
              
              {/* REMOVED: The scanning line div was here */}
            </div>
          </div>
          <div className="absolute bottom-4 w-full text-center">
            <span className="text-white text-xs bg-black/60 px-3 py-1 rounded-full">
              Point at a QR Code
            </span>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white/90 text-black px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </div>
        </div>
      )}

      {/* Loading/Error States */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4 text-center">
          <CameraOff className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={() => startCamera()} size="sm" variant="secondary">
            Retry
          </Button>
        </div>
      )}

      {/* Controls */}
      {!isLoading && !error && (
        <div className="absolute top-3 right-3 flex gap-2">
           <Button 
            onClick={() => setFacingMode(prev => prev === "user" ? "environment" : "user")} 
            size="icon" 
            variant="secondary" 
            className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 border-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button 
              onClick={onClose} 
              size="icon" 
              variant="secondary" 
              className="h-8 w-8 bg-black/40 text-white hover:bg-black/60 border-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}