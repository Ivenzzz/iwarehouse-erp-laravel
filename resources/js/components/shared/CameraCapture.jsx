import React, { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check, SwitchCamera, Loader2 } from "lucide-react";

export default function CameraCapture({ 
  onCapture, 
  onClose, 
  aspectRatio = "1/1",
  label = "Take Photo"
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError(err.message || "Unable to access camera. Please check permissions.");
    } finally {
      setIsLoading(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Scale to fit within 1024px bounding box
    const maxSide = 1024;
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
    const targetW = Math.round(srcW * scale);
    const targetH = Math.round(srcH * scale);

    canvas.width = targetW;
    canvas.height = targetH;
    context.drawImage(video, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      // Convert data URL to File
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file, capturedImage);
        });
    }
  }, [capturedImage, onCapture]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>
        <span className="text-white font-medium">{label}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={switchCamera}
          className="text-white hover:bg-white/20"
          disabled={!isStreaming}
        >
          <SwitchCamera className="w-6 h-6" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
        {isLoading && (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span>Starting camera...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 text-white p-6 text-center">
            <Camera className="w-12 h-12 text-red-400" />
            <p className="text-red-400">{error}</p>
            <Button onClick={startCamera} variant="outline" className="text-white border-white">
              Try Again
            </Button>
          </div>
        )}

        {!capturedImage ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`max-h-full max-w-full object-contain ${isLoading || error ? 'hidden' : ''}`}
            style={{ aspectRatio }}
          />
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            className="max-h-full max-w-full object-contain"
            style={{ aspectRatio }}
          />
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/80 flex items-center justify-center gap-6">
        {!capturedImage ? (
          <Button
            onClick={capturePhoto}
            disabled={!isStreaming}
            size="lg"
            className="w-20 h-20 rounded-full bg-white hover:bg-gray-200 text-black"
          >
            <Camera className="w-8 h-8" />
          </Button>
        ) : (
          <>
            <Button
              onClick={retakePhoto}
              variant="outline"
              size="lg"
              className="text-white border-white hover:bg-white/20"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Retake
            </Button>
            <Button
              onClick={confirmPhoto}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-5 h-5 mr-2" />
              Use Photo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}