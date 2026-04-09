import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";

export default function ImageLightbox({ imageUrl, open, onClose }) {
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    if (open) {
      setZoom(1);
    }
  }, [open]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = imageUrl.split("/").pop() || "image.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-screen p-0 bg-black/95">
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
          >
            <X className="w-6 h-6" />
          </Button>

          <div className="absolute top-4 left-4 flex gap-2 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="w-5 h-5" />
            </Button>
            <span className="text-white text-sm bg-black/50 px-3 py-2 rounded">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="overflow-auto max-w-full max-h-full">
            <img
              src={imageUrl}
              alt="Preview"
              style={{
                transform: `scale(${zoom})`,
                transition: "transform 0.2s ease",
                maxWidth: "100%",
                maxHeight: "calc(100vh - 100px)",
              }}
              className="rounded-lg"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}