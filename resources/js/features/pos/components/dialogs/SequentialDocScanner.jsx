import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Upload,
  RotateCw,
  Check,
  X,
  SkipForward,
  CheckCircle2,
  Eye,
  Trash2,
} from "lucide-react";
import axios from "axios";

const DOC_STEPS = [
  { key: "official_receipt", label: "Official Receipt Copy", required: true },
  { key: "customer_id", label: "Customer ID", required: true },
  { key: "customer_agreement", label: "Signed Agreement", required: true },
  { key: "other_supporting", label: "Other Supporting Documents", required: false },
];

function StepIndicator({ steps, currentStepIndex, documentUrls }) {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      {steps.flatMap((step, idx) => {
        const isCaptured = !!documentUrls[step.key];
        const isCurrent = idx === currentStepIndex;
        const isPast = idx < currentStepIndex;

        return [
          <div key={`${step.key}-step`} className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                isCaptured
                  ? "bg-emerald-500 text-white"
                  : isCurrent
                  ? "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-500/50"
                  : isPast
                  ? "bg-slate-400 dark:bg-slate-600 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              }`}
            >
              {isCaptured ? <Check className="w-3.5 h-3.5" /> : idx + 1}
            </div>
            <span
              className={`text-[11px] font-medium hidden sm:inline whitespace-nowrap ${
                isCurrent
                  ? "text-blue-700 dark:text-blue-300"
                  : isCaptured
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {step.label.split(" ").slice(0, 2).join(" ")}
            </span>
          </div>,
          ...(idx < steps.length - 1
            ? [
                <div
                  key={`${step.key}-divider`}
                  className={`flex-1 h-0.5 min-w-[12px] rounded ${
                    isCaptured
                      ? "bg-emerald-400 dark:bg-emerald-500"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />,
              ]
            : []),
        ];
      })}
    </div>
  );
}

function CaptureView({ stream, videoRef, canvasRef, onCapture, onFileUpload, uploading, fileInputRef, acceptedFormats }) {
  return (
    <>
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          onClick={onCapture}
          className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white"
          disabled={!stream || uploading}
        >
          <Camera className="w-4 h-4 mr-2" />
          Capture Photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={onFileUpload}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="dark:border-slate-700 dark:text-slate-300"
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </>
  );
}

function PreviewView({ imageUrl, onRetake, onConfirm, uploading }) {
  return (
    <>
      <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <img src={imageUrl} alt="Captured" className="w-full h-full object-contain" />
      </div>
      <div className="flex gap-3">
        <Button
          onClick={onRetake}
          variant="outline"
          className="flex-1 dark:border-slate-700 dark:text-slate-300"
          disabled={uploading}
        >
          <RotateCw className="w-4 h-4 mr-2" />
          Retake
        </Button>
        <Button
          onClick={onConfirm}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white"
          disabled={uploading}
        >
          <Check className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Use This Photo"}
        </Button>
      </div>
    </>
  );
}

export default function SequentialDocScanner({ open, onOpenChange, documentUrls, onDocumentCapture }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(null); // { key, url } for reviewing already-captured

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentStep = DOC_STEPS[currentStepIndex];
  const isComplete = currentStepIndex >= DOC_STEPS.length;

  // Find first uncaptured step on open
  useEffect(() => {
    if (open) {
      const firstUncaptured = DOC_STEPS.findIndex((s) => !documentUrls[s.key]);
      setCurrentStepIndex(firstUncaptured >= 0 ? firstUncaptured : DOC_STEPS.length);
      setCapturedImage(null);
      setPreviewMode(null);
    }
  }, [open]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Camera access error:", error);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start camera when step changes (and not in preview/complete mode)
  useEffect(() => {
    if (open && !isComplete && !capturedImage && !previewMode) {
      // Small delay so video element mounts
      const timer = setTimeout(() => startCamera(), 150);
      return () => clearTimeout(timer);
    }
  }, [open, currentStepIndex, isComplete, capturedImage, previewMode, startCamera]);

  // Cleanup camera on close
  useEffect(() => {
    if (!open) {
      stopCamera();
      setCapturedImage(null);
      setPreviewMode(null);
    }
  }, [open]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setCapturedImage({ blob, url: URL.createObjectURL(blob) });
        stopCamera();
      },
      "image/jpeg",
      0.95
    );
  };

  const retakePhoto = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.url);
      setCapturedImage(null);
    }
    startCamera();
  };

  const advanceToNextStep = useCallback(() => {
    const nextUncaptured = DOC_STEPS.findIndex(
      (s, idx) => idx > currentStepIndex && !documentUrls[s.key]
    );
    if (nextUncaptured >= 0) {
      setCapturedImage(null);
      setCurrentStepIndex(nextUncaptured);
    } else {
      // All done
      setCapturedImage(null);
      setCurrentStepIndex(DOC_STEPS.length);
      stopCamera();
    }
  }, [currentStepIndex, documentUrls, stopCamera]);

  const confirmCapture = async () => {
    if (!capturedImage || !currentStep) return;
    setUploading(true);
    try {
      const file = new File([capturedImage.blob], `scan_${currentStep.key}_${Date.now()}.jpg`, { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post(route("pos.uploads.store"), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      URL.revokeObjectURL(capturedImage.url);
      onDocumentCapture(currentStep.key, data.file_url);
      // Auto-advance
      advanceToNextStep();
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentStep) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post(route("pos.uploads.store"), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onDocumentCapture(currentStep.key, data.file_url);
      advanceToNextStep();
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSkip = () => {
    advanceToNextStep();
  };

  const handleClose = () => {
    stopCamera();
    onOpenChange(false);
  };

  // Handle reviewing / retaking an already-captured doc
  const handleRetakeCaptured = (stepKey) => {
    onDocumentCapture(stepKey, null);
    const stepIdx = DOC_STEPS.findIndex((s) => s.key === stepKey);
    setPreviewMode(null);
    setCapturedImage(null);
    setCurrentStepIndex(stepIdx);
  };

  // Summary view when all done
  const renderSummary = () => (
    <div className="space-y-3 p-2">
      <div className="text-center py-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Documents Captured</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Review your scanned documents below</p>
      </div>
      <div className="space-y-2">
        {DOC_STEPS.map((step) => {
          const url = documentUrls[step.key];
          return (
            <div
              key={step.key}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                url
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                  : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                {url ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                )}
                <span className={`text-sm font-medium ${url ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>
                  {step.label}
                  {step.required && <span className="text-red-500 ml-0.5">*</span>}
                </span>
              </div>
              {url ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewMode({ key: step.key, url })}
                    className="h-7 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                  >
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRetakeCaptured(step.key)}
                    className="h-7 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <RotateCw className="w-3 h-3 mr-1" /> Retake
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const idx = DOC_STEPS.findIndex((s) => s.key === step.key);
                    setCapturedImage(null);
                    setCurrentStepIndex(idx);
                  }}
                  className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                >
                  <Camera className="w-3 h-3 mr-1" /> Scan
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white">
          <Check className="w-4 h-4 mr-2" /> Done
        </Button>
      </div>
    </div>
  );

  // Preview mode for reviewing existing captures
  const renderPreview = () => (
    <div className="space-y-4 p-2">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <img src={previewMode.url} alt="Document" className="w-full h-full object-contain" />
      </div>
      <div className="flex gap-3">
        <Button
          onClick={() => handleRetakeCaptured(previewMode.key)}
          variant="outline"
          className="flex-1 dark:border-slate-700 dark:text-slate-300"
        >
          <RotateCw className="w-4 h-4 mr-2" /> Retake
        </Button>
        <Button
          onClick={() => setPreviewMode(null)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white"
        >
          <Check className="w-4 h-4 mr-2" /> OK
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
        <DialogHeader className="bg-[#002060] dark:bg-slate-950 text-white p-4 flex flex-row items-center justify-between border-b border-blue-900 dark:border-slate-800">
          <div>
            <DialogTitle className="text-base font-bold text-white">
              {previewMode
                ? `Viewing: ${DOC_STEPS.find((s) => s.key === previewMode.key)?.label}`
                : isComplete
                ? "Document Summary"
                : `Step ${currentStepIndex + 1}/${DOC_STEPS.length}: ${currentStep?.label}`}
            </DialogTitle>
            <DialogDescription className="text-blue-100 dark:text-slate-300 mt-1">
              Capture or upload each required transaction document.
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/10 h-8 w-8 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <StepIndicator steps={DOC_STEPS} currentStepIndex={currentStepIndex} documentUrls={documentUrls} />

        <div className="p-4 space-y-4">
          {previewMode ? (
            renderPreview()
          ) : isComplete ? (
            renderSummary()
          ) : (
            <>
              {/* Current step label */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {currentStep.label}
                  {currentStep.required && <span className="text-red-500 ml-0.5">*</span>}
                </p>
                {!currentStep.required && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <SkipForward className="w-3 h-3 mr-1" /> Skip
                  </Button>
                )}
              </div>

              {/* Camera / Preview */}
              {!capturedImage ? (
                <CaptureView
                  stream={stream}
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  onCapture={capturePhoto}
                  onFileUpload={handleFileUpload}
                  uploading={uploading}
                  fileInputRef={fileInputRef}
                  acceptedFormats="image/*,application/pdf"
                />
              ) : (
                <PreviewView
                  imageUrl={capturedImage.url}
                  onRetake={retakePhoto}
                  onConfirm={confirmCapture}
                  uploading={uploading}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
