import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function CameraOnlyUpload({ label, onUpload, uploadedUrls = [], multiple = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (error) {
      toast.error('Failed to access camera: ' + error.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    setIsUploading(true);

    canvas.toBlob(async (blob) => {
      try {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        onUpload(file_url);
        toast.success('Photo captured and uploaded');
        
        if (!multiple) {
          stopCamera();
        }
      } catch (error) {
        toast.error('Failed to upload photo: ' + error.message);
      } finally {
        setIsUploading(false);
      }
    }, 'image/jpeg', 0.9);
  };

  const removePhoto = (url) => {
    // Call parent with null to signal removal
    onUpload(null, url);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold">{label}</label>
      
      {!isCameraActive ? (
        <Button
          type="button"
          variant="outline"
          onClick={startCamera}
          className="w-full flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Take Photo
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-48 object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={isUploading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={stopCamera}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {uploadedUrls.length > 0 && (
        <div className="space-y-1">
          {uploadedUrls.map((url, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold">Photo {idx + 1} uploaded</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removePhoto(url)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        📸 Camera-only upload prevents fake evidence
      </p>
    </div>
  );
}