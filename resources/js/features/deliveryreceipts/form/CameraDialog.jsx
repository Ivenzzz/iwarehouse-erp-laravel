import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

export default function CameraDialog({
  open,
  videoRef,
  onCapture,
  onClose,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="
          max-w-2xl
          bg-slate-900 border border-slate-800 text-slate-100
          shadow-[0_0_40px_rgba(0,0,0,0.6)]
        "
      >
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            Capture Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden border border-slate-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full"
            />
          </div>

          <div className="flex justify-center gap-3">
            <Button
              onClick={onCapture}
              className="
                bg-emerald-400/15 text-emerald-300
                border border-emerald-400/25
                hover:bg-emerald-400/25 hover:border-emerald-400/40
                shadow-[0_0_20px_rgba(52,211,153,0.15)]
                focus-visible:ring-2 focus-visible:ring-cyan-400/60
              "
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture Photo
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              className="
                bg-slate-950 border-slate-800 text-slate-100
                hover:bg-slate-800
                focus-visible:ring-2 focus-visible:ring-cyan-400/60
              "
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}