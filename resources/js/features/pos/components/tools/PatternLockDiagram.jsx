import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

/**
 * PatternLockDiagram Component
 * Displays a 3x3 pattern grid for drawing unlock patterns via drag
 */
export default function PatternLockDiagram({ onPatternChange, pattern = [] }) {
  const [currentPattern, setCurrentPattern] = useState(pattern);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef(null);

  // Handle mouse/touch start
  const handleStart = (dotIndex) => {
    if (currentPattern.includes(dotIndex)) return;
    setIsDrawing(true);
    const newPattern = [dotIndex];
    setCurrentPattern(newPattern);
    onPatternChange(newPattern);
  };

  // Handle mouse/touch move over dot
  const handleMove = (dotIndex) => {
    if (!isDrawing || currentPattern.includes(dotIndex)) return;
    
    const newPattern = [...currentPattern, dotIndex];
    setCurrentPattern(newPattern);
    onPatternChange(newPattern);
  };

  // Handle mouse/touch end
  const handleEnd = () => {
    setIsDrawing(false);
  };

  // Clear pattern
  const handleClear = () => {
    setCurrentPattern([]);
    onPatternChange([]);
  };

  // Setup global mouse/touch listeners
  useEffect(() => {
    const handleGlobalEnd = () => setIsDrawing(false);
    
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, []);

  // Render dots in 3x3 grid with connecting lines
  const renderPattern = () => {
    const dots = [];
    const gridSize = 3;
    
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const isSelected = currentPattern.includes(i);
      const selectionOrder = currentPattern.indexOf(i);

      dots.push(
        <button
          key={i}
          type="button"
          onMouseDown={() => handleStart(i)}
          onMouseEnter={() => handleMove(i)}
          onTouchStart={() => handleStart(i)}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            const dotIndex = element?.getAttribute('data-dot-index');
            if (dotIndex !== null) handleMove(parseInt(dotIndex));
          }}
          data-dot-index={i}
          className={`w-16 h-16 rounded-full border-4 transition-all ${
            isSelected
              ? "bg-blue-600 border-blue-800 scale-110"
              : "bg-gray-300 border-gray-400 hover:bg-gray-400"
          }`}
          style={{
            gridRow: row + 1,
            gridColumn: col + 1,
          }}
        >
          {isSelected && (
            <span className="text-white font-bold text-lg">
              {selectionOrder + 1}
            </span>
          )}
        </button>
      );
    }
    return dots;
  };

  // Calculate line coordinates
  const getLineCoords = () => {
    if (currentPattern.length < 2) return [];
    
    const lines = [];
    for (let i = 1; i < currentPattern.length; i++) {
      const prevDot = currentPattern[i - 1];
      const currDot = currentPattern[i];
      
      const prevRow = Math.floor(prevDot / 3);
      const prevCol = prevDot % 3;
      const currRow = Math.floor(currDot / 3);
      const currCol = currDot % 3;
      
      lines.push({
        x1: prevCol * 80 + 40,
        y1: prevRow * 80 + 40,
        x2: currCol * 80 + 40,
        y2: currRow * 80 + 40,
      });
    }
    return lines;
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center" ref={containerRef}>
            <div className="relative" style={{ width: '240px', height: '240px' }}>
              {/* SVG for lines */}
              <svg
                className="absolute pointer-events-none"
                style={{
                  width: '240px',
                  height: '240px',
                  top: 0,
                  left: 0,
                }}
              >
                {getLineCoords().map((line, idx) => (
                  <line
                    key={idx}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="#2563eb"
                    strokeWidth="4"
                  />
                ))}
              </svg>

              {/* Grid of dots */}
              <div
                className="grid grid-cols-3 gap-4"
                style={{ 
                  gridTemplateRows: "repeat(3, minmax(0, 1fr))",
                  width: '240px',
                  height: '240px'
                }}
              >
                {renderPattern()}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear Pattern
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentPattern.length > 0 && (
        <p className="text-sm text-green-600 text-center">
          Pattern saved: {currentPattern.length} dots connected
        </p>
      )}
    </div>
  );
}