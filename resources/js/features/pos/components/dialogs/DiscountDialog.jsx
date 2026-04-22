import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, CheckCircle, Loader2, Percent, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "@/shared/hooks/use-toast";

export default function DiscountDialog({
  open,
  onOpenChange,
  onApplyDiscount,
  currentDiscount = 0,
  posSessionId = null,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [discountAmount, setDiscountAmount] = useState(String(currentDiscount || 0));
  const [oicPin, setOicPin] = useState("");
  const [proofImageFile, setProofImageFile] = useState(null);
  const [proofImagePreviewUrl, setProofImagePreviewUrl] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const getFirstErrorMessage = (error, fallback) => {
    const validationErrors = error?.response?.data?.errors;
    if (validationErrors && typeof validationErrors === "object") {
      const firstFieldErrors = Object.values(validationErrors).find((messages) => Array.isArray(messages) && messages.length > 0);
      if (firstFieldErrors?.[0]) {
        return firstFieldErrors[0];
      }
    }

    return error?.response?.data?.message || fallback;
  };

  const clearProofImage = () => {
    if (proofImagePreviewUrl) {
      URL.revokeObjectURL(proofImagePreviewUrl);
    }

    setProofImageFile(null);
    setProofImagePreviewUrl(null);
  };

  const setProofImageFromFile = (file) => {
    if (!file) {
      return;
    }

    clearProofImage();
    setProofImageFile(file);
    setProofImagePreviewUrl(URL.createObjectURL(file));
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      clearProofImage();
      return;
    }

    setDiscountAmount(String(currentDiscount || 0));
    setOicPin("");
    clearProofImage();
    setIsUploadingPhoto(false);
    setIsVerifyingPin(false);

    return () => {
      stopCamera();
      clearProofImage();
    };
  }, [open, currentDiscount]);

  const startCamera = async () => {
    stopCamera();

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      toast({
        variant: "destructive",
        description: "Camera access is not supported on this device or browser.",
      });
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
    } catch (error) {
      console.error("Discount validation camera error:", error);
      stopCamera();
      toast({
        variant: "destructive",
        description: error.message || "Unable to access the camera. Check browser permissions and try again.",
      });
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      toast({
        variant: "destructive",
        description: "Unable to initialize the camera capture surface.",
      });
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setIsUploadingPhoto(true);

    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => {
          if (!value) {
            reject(new Error("Unable to capture the validation photo."));
            return;
          }

          resolve(value);
        }, "image/jpeg", 0.92);
      });

      const file = new File([blob], `discount-validation-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      setProofImageFromFile(file);
      stopCamera();
      toast({ description: "Validation photo captured." });
    } catch (error) {
      toast({
        variant: "destructive",
        description: error?.message || "Failed to capture validation photo.",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    stopCamera();
    setProofImageFromFile(file);
    toast({ description: "Validation photo selected." });
    event.target.value = "";
  };

  const handleApply = async () => {
    const amount = Math.max(0, parseFloat(discountAmount) || 0);

    if (amount <= 0) {
      onApplyDiscount({
        amount: 0,
        discount_proof_image_url: null,
        discount_proof_file: null,
        discount_validated_at: null,
      });
      toast({ description: "Discount cleared." });
      onOpenChange(false);
      return;
    }

    if (!posSessionId) {
      toast({
        variant: "destructive",
        description: "An active POS session is required before applying discounts.",
      });
      return;
    }

    if (!oicPin.trim()) {
      toast({
        variant: "destructive",
        description: "OIC PIN is required before applying a discount.",
      });
      return;
    }

    if (!proofImageFile) {
      toast({
        variant: "destructive",
        description: "Capture or upload the discount validation photo before applying a discount.",
      });
      return;
    }

    setIsVerifyingPin(true);

    try {
      const { data } = await axios.post(route("pos.discounts.verify-oic"), {
        pos_session_id: posSessionId,
        pin: oicPin.trim(),
      });

      const discountValidatedAt = new Date().toISOString();

      onApplyDiscount({
        amount,
        discount_proof_image_url: null,
        discount_proof_file: proofImageFile,
        discount_validated_at: discountValidatedAt,
      });

      toast({
        description: data.employee?.full_name
          ? `Discount authorized by ${data.employee.full_name}.`
          : "Discount applied successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        description: getFirstErrorMessage(error, "Invalid OIC PIN."),
      });
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleClear = () => {
    stopCamera();
    setDiscountAmount("0");
    setOicPin("");
    clearProofImage();
    onApplyDiscount({
      amount: 0,
      discount_proof_image_url: null,
      discount_proof_file: null,
      discount_validated_at: null,
    });
    toast({ description: "Discount cleared." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 dark:border-slate-800 shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-slate-100 font-bold">
            <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Add Discount
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 p-4">
          <div className="space-y-2">
            <Label htmlFor="discount-amount" className="text-gray-700 dark:text-slate-300">Discount Amount (P)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-semibold">P</span>
              <Input
                id="discount-amount"
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                className="pl-8 text-lg font-semibold bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-500 placeholder:text-gray-400 dark:placeholder:text-slate-600"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="oic-pin" className="text-gray-700 dark:text-slate-300">OIC PIN</Label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <Input
                id="oic-pin"
                type="password"
                value={oicPin}
                onChange={(event) => setOicPin(event.target.value)}
                className="pl-9 bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="Enter OIC PIN"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-gray-700 dark:text-slate-300">Discount Validation Photo</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Capture a fresh photo or upload an image for each discount approval.</p>
              </div>
              {proofImagePreviewUrl ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Ready
                </span>
              ) : null}
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {proofImagePreviewUrl ? (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <img
                  src={proofImagePreviewUrl}
                  alt="Discount validation proof"
                  className="h-48 w-full rounded-lg object-cover"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearProofImage}
                    className="border-gray-200 dark:border-slate-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      clearProofImage();
                      startCamera();
                    }}
                    className="border-gray-200 dark:border-slate-700"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Retake
                    </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      clearProofImage();
                      fileInputRef.current?.click();
                    }}
                    className="border-gray-200 dark:border-slate-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Replace File
                  </Button>
                </div>
              </div>
            ) : isCameraActive ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <video
                  ref={videoRef}
                  className="h-56 w-full rounded-lg bg-black object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="border-gray-200 dark:border-slate-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={stopCamera}
                    disabled={isUploadingPhoto}
                    className="border-gray-200 dark:border-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    disabled={isUploadingPhoto}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Capture Photo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="w-full border-dashed border-gray-300 py-6 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Open Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="w-full border-dashed border-gray-300 py-6 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-gray-100 dark:border-slate-800 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isUploadingPhoto || isVerifyingPin}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={isUploadingPhoto || isVerifyingPin}
            className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-white shadow-sm dark:shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all"
          >
            {isVerifyingPin ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Apply Discount"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
