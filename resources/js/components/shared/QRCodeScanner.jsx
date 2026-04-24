import { useEffect, useId, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

export default function QRCodeScanner({
  onScan,
  onClose,
  paused = false,
  className = "",
}) {
  const elementId = useId().replace(/:/g, "");
  const scannerRef = useRef(null);
  const lastValueRef = useRef("");
  const pausedRef = useRef(paused);
  const [error, setError] = useState("");

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let active = true;

    const startScanner = async () => {
      try {
        const [{ Html5Qrcode, Html5QrcodeSupportedFormats }] = await Promise.all([
          import("html5-qrcode"),
        ]);

        if (!active) {
          return;
        }

        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ],
          },
          (decodedText) => {
            if (pausedRef.current) {
              return;
            }

            if (decodedText && decodedText !== lastValueRef.current) {
              lastValueRef.current = decodedText;
              onScan?.(decodedText);
              window.setTimeout(() => {
                if (lastValueRef.current === decodedText) {
                  lastValueRef.current = "";
                }
              }, 1200);
            }
          },
          () => {}
        );
      } catch (nextError) {
        if (active) {
          setError("Camera scanner is unavailable on this device or browser.");
        }
      }
    };

    startScanner();

    return () => {
      active = false;

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        try {
          Promise.resolve(scanner.stop())
            .catch(() => {})
            .finally(() => {
              Promise.resolve(scanner.clear()).catch(() => {});
            });
        } catch {
          Promise.resolve(scanner.clear()).catch(() => {});
        }
      }
    };
  }, [elementId, onScan]);

  if (error) {
    return (
      <div className={`flex h-full min-h-48 flex-col items-center justify-center gap-3 bg-slate-950 text-slate-100 ${className}`}>
        <CameraOff className="h-8 w-8 opacity-70" />
        <p className="text-sm text-slate-300">{error}</p>
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded bg-white/10 px-3 py-1 text-xs">
            Close camera
          </button>
        ) : null}
      </div>
    );
  }

  return <div id={elementId} className={className} />;
}
