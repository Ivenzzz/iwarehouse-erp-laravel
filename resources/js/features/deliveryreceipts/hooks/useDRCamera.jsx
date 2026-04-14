import { useState, useRef, useCallback } from "react";

export function useDRCamera({ onFileUpload, onError }) {
  const [cameraStream, setCameraStream] = useState(null);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [capturingFor, setCapturingFor] = useState('');
  const videoRef = useRef(null);

  const handleStartCamera = useCallback(async (uploadType) => {
    setCapturingFor(uploadType);
    setShowCameraDialog(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      onError?.('Could not access camera.');
      setShowCameraDialog(false);
    }
  }, [onError]);

  const handleStopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraDialog(false);
    setCapturingFor('');
  }, [cameraStream]);

  const handleCapturePhoto = useCallback(() => {
    if (!videoRef.current || !cameraStream) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await onFileUpload?.(capturingFor, file);
      handleStopCamera();
    }, 'image/jpeg', 0.9);
  }, [cameraStream, capturingFor, onFileUpload, handleStopCamera]);

  return {
    videoRef,
    showCameraDialog,
    handleStartCamera,
    handleStopCamera,
    handleCapturePhoto
  };
}