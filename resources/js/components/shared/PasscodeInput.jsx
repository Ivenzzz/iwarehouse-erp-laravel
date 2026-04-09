import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";

export default function PasscodeInput({ value, onChange }) {
  const [passcodeType, setPasscodeType] = useState("PIN");
  const [passcodeValue, setPasscodeValue] = useState("");
  const [patternDots, setPatternDots] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);

  // Parse existing value if any
  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        setPasscodeType(parsed.type || "PIN");
        setPasscodeValue(parsed.value || "");
        if (parsed.type === "PATTERN" && parsed.pattern) {
          setPatternDots(parsed.pattern);
        }
      } catch {
        setPasscodeValue(value);
      }
    }
  }, [value]);

  // Update parent when values change
  useEffect(() => {
    if (passcodeType === "PATTERN" && patternDots.length > 0) {
      onChange(JSON.stringify({
        type: passcodeType,
        pattern: patternDots,
        value: patternDots.join("-")
      }));
    } else if (passcodeValue) {
      onChange(JSON.stringify({
        type: passcodeType,
        value: passcodeValue
      }));
    }
  }, [passcodeType, passcodeValue, patternDots, onChange]);

  // Draw pattern grid
  useEffect(() => {
    if (passcodeType !== "PATTERN" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const dotSize = 15;
    const spacing = size / 4;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw grid dots
    ctx.fillStyle = "#9ca3af";
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = spacing + col * spacing;
        const y = spacing + row * spacing;
        const dotIndex = row * 3 + col + 1;

        if (patternDots.includes(dotIndex)) {
          ctx.fillStyle = "#3b82f6";
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();

          // Draw number
          ctx.fillStyle = "#ffffff";
          ctx.font = "12px bold sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(patternDots.indexOf(dotIndex) + 1, x, y);
        } else {
          ctx.fillStyle = "#9ca3af";
          ctx.beginPath();
          ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw connecting lines
    if (patternDots.length > 1) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.beginPath();

      patternDots.forEach((dotIndex, i) => {
        const row = Math.floor((dotIndex - 1) / 3);
        const col = (dotIndex - 1) % 3;
        const x = spacing + col * spacing;
        const y = spacing + row * spacing;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }
  }, [patternDots, passcodeType]);

  const handleCanvasClick = (e) => {
    if (passcodeType !== "PATTERN") return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = canvas.width;
    const spacing = size / 4;
    const dotSize = 20;

    // Find clicked dot
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const dotX = spacing + col * spacing;
        const dotY = spacing + row * spacing;
        const distance = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2));

        if (distance <= dotSize) {
          const dotIndex = row * 3 + col + 1;
          if (!patternDots.includes(dotIndex)) {
            setPatternDots([...patternDots, dotIndex]);
          }
          return;
        }
      }
    }
  };

  const handleClearPattern = () => {
    setPatternDots([]);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Passcode Type</Label>
        <Select value={passcodeType} onValueChange={setPasscodeType}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PIN">PIN</SelectItem>
            <SelectItem value="PATTERN">Pattern</SelectItem>
            <SelectItem value="PASSWORD">Password</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {passcodeType === "PATTERN" ? (
        <div>
          <Label>Draw Pattern (Tap dots in order)</Label>
          <div className="mt-2 space-y-2">
            <canvas
              ref={canvasRef}
              width={250}
              height={250}
              onClick={handleCanvasClick}
              className="border-2 border-gray-300 rounded-lg cursor-pointer bg-white mx-auto"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearPattern}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear Pattern
            </Button>
            {patternDots.length > 0 && (
              <p className="text-xs text-gray-600">
                Pattern: {patternDots.join(" → ")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <Label>Enter {passcodeType}</Label>
          <Input
            type={passcodeType === "PASSWORD" ? "text" : "tel"}
            value={passcodeValue}
            onChange={(e) => setPasscodeValue(e.target.value)}
            placeholder={`Enter device ${passcodeType.toLowerCase()}`}
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
}