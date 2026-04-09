import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, Check, PenTool } from "lucide-react";

export default function SignaturePad({ onSignatureCapture, signatureUrl }) {
  const canvasRef = useRef(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load signature_pad library
  useEffect(() => {
    if (window.SignaturePad) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/signature_pad/1.3.4/signature_pad.min.js";
    script.integrity = "sha512-Mtr2f9aMp/TVEdDWcRlcREy9NfgsvXvApdxrm3/gK8lAMWnXrFsYaoW01B5eJhrUpBT7hmIjLeaQe0hnL7Oh1w==";
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.async = true;

    script.onload = () => setScriptLoaded(true);
    script.onerror = () => console.error("Failed to load signature_pad library");

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize signature pad
  useEffect(() => {
    if (!scriptLoaded || !canvasRef.current || !window.SignaturePad) return;

    const canvas = canvasRef.current;
    const pad = new window.SignaturePad(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    });

    // Resize canvas to match display size
    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      pad.clear();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Track changes
    pad.onEnd = () => {
      setIsEmpty(pad.isEmpty());
    };

    setSignaturePad(pad);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [scriptLoaded]);

  const handleClear = () => {
    if (signaturePad) {
      signaturePad.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (!signaturePad || signaturePad.isEmpty()) {
      alert("Please provide a signature first");
      return;
    }

    // Convert canvas to blob
    canvasRef.current.toBlob((blob) => {
      const file = new File([blob], `signature_${Date.now()}.png`, {
        type: "image/png",
      });
      onSignatureCapture(file);
    }, "image/png");
  };

  if (!scriptLoaded) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
        Loading signature pad...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full touch-none"
              style={{ height: "200px" }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleClear}
          variant="outline"
          className="flex-1"
          disabled={isEmpty}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          className="flex-1 bg-purple-600 hover:bg-purple-700"
          disabled={isEmpty}
        >
          <Check className="w-4 h-4 mr-2" />
          Save Signature
        </Button>
      </div>

      {signatureUrl && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 text-sm mb-2">
            <Check className="w-4 h-4" />
            <span className="font-medium">Signature captured successfully</span>
          </div>
          <img
            src={signatureUrl}
            alt="Customer Signature"
            className="max-h-24 border rounded bg-white"
          />
        </div>
      )}
    </div>
  );
}