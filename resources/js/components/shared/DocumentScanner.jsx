import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, Upload, RotateCw, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DocumentScanner({
  onFileCapture,
  onLocalFileCapture,
  buttonLabel = "Scan Document",
  acceptedFormats = "image/*,application/pdf",
  enableCamera = true,
  title = "Scan Document",
}) {
  const [showScanner, setShowScanner] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const startCamera = async () => {
    if (!enableCamera) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      alert('Unable to access camera. Please ensure camera permissions are granted or upload a file instead.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setCapturedImage({ blob, url });
      }, 'image/jpeg', 0.95);
    }
  };

  const retakePhoto = async () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.url);
      setCapturedImage(null);
    }
    if (enableCamera) {
      await startCamera();
    }
  };

  const handleUploadCapture = async () => {
    if (!capturedImage) return;
    
    setUploading(true);
    try {
      const file = new File([capturedImage.blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
      if (onLocalFileCapture) {
        onLocalFileCapture(file, capturedImage.url);
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onFileCapture(file_url);
      }
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload scanned document: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      if (onLocalFileCapture) {
        const previewUrl = URL.createObjectURL(file);
        onLocalFileCapture(file, previewUrl);
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onFileCapture(file_url);
      }
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    setCapturedImage(null);
    setShowScanner(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpen = () => {
    if (!enableCamera) {
      fileInputRef.current?.click();
      return;
    }
    setShowScanner(true);
    setTimeout(() => startCamera(), 100);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
        className="w-full"
      >
        {enableCamera ? <Camera className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
        {buttonLabel}
      </Button>

      {!enableCamera && (
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={handleFileUpload}
          className="hidden"
        />
      )}

      <Dialog open={enableCamera && showScanner} onOpenChange={(open) => {
        if (!open) handleClose();
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!capturedImage ? (
              <>
                {enableCamera && (
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}

                {!enableCamera && <canvas ref={canvasRef} className="hidden" />}

                <div className="flex gap-3">
                  {enableCamera && (
                    <Button
                      onClick={capturePhoto}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={!stream}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Capture Photo
                    </Button>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedFormats}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex-1"
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : enableCamera ? 'Upload File Instead' : 'Upload File'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <img
                    src={capturedImage.url}
                    alt="Captured"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={retakePhoto}
                    variant="outline"
                    className="flex-1"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    onClick={handleUploadCapture}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={uploading}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Use This Photo'}
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose} variant="outline" disabled={uploading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
