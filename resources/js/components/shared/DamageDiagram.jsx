import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DamageDiagram({ categoryName, subcategoryName, value, onChange }) {
  const [side, setSide] = useState("front");
  const [marks, setMarks] = useState({ front: [], back: [] });
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef(null);

  // Load existing marks
  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.marks) {
          setMarks(parsed.marks);
        }
      } catch {}
    }
  }, [value]);

  const handleClick = (e) => {
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarks = {
      ...marks,
      [side]: [...marks[side], { x, y, id: Date.now() }],
    };
    setMarks(newMarks);
    onChange(JSON.stringify({ marks: newMarks }));
  };

  const handleClear = () => {
    const newMarks = { ...marks, [side]: [] };
    setMarks(newMarks);
    onChange(JSON.stringify({ marks: newMarks }));
  };

  const handleClearAll = () => {
    const newMarks = { front: [], back: [] };
    setMarks(newMarks);
    onChange("");
  };

  const handleExport = async () => {
    setUploading(true);
    try {
      const container = containerRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 4;
      ctx.fillStyle = '#f9fafb';
      
      // Draw simplified device outline
      ctx.roundRect(150, 100, 500, 1000, 50);
      ctx.fill();
      ctx.stroke();
      
      // Draw marks
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      marks[side].forEach((mark) => {
        const x = (mark.x / 100) * canvas.width;
        const y = (mark.y / 100) * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `damage_diagram_${side}_${Date.now()}.png`, { type: 'image/png' });
      await base44.integrations.Core.UploadFile({ file });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `damage_diagram_${side}.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert("Diagram exported successfully!");
    } catch (error) {
      alert("Failed to export: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Render device based on category and subcategory
  const renderDevice = () => {
    const category = (categoryName || "").trim();
    const subcategory = (subcategoryName || "").trim();
    
    // Check subcategory first for more specific matches, then category
    const identifier = subcategory || category;
    
    // Smartphones
    if (category === "Smartphones" || subcategory.includes("Phone") || subcategory.includes("Mobile")) {
      return (
        <div className={`device-smartphone ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="screen">
                <div className="notch"></div>
                <div className="display-content"></div>
                <div className="home-button"></div>
              </div>
            </>
          ) : (
            <>
              <div className="camera-module">
                <div className="camera-lens"></div>
                <div className="camera-lens"></div>
                <div className="flash"></div>
              </div>
              <div className="logo">LOGO</div>
            </>
          )}
        </div>
      );
    }
    
    // Laptops / Notebooks
    else if (category === "Laptops" || subcategory.includes("Laptop") || subcategory.includes("Notebook")) {
      return (
        <div className={`device-laptop ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="laptop-screen">
                <div className="bezel">
                  <div className="webcam"></div>
                </div>
              </div>
              <div className="laptop-keyboard">
                <div className="trackpad"></div>
              </div>
            </>
          ) : (
            <>
              <div className="laptop-lid">
                <div className="logo">LOGO</div>
                <div className="vents"></div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Tablets
    else if (category === "Tablets" || subcategory.includes("Tablet") || subcategory.includes("iPad")) {
      return (
        <div className={`device-tablet ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="tablet-screen">
                <div className="camera-front"></div>
                <div className="home-button"></div>
              </div>
            </>
          ) : (
            <>
              <div className="camera-back"></div>
              <div className="logo">LOGO</div>
            </>
          )}
        </div>
      );
    }
    
    // Monitors / Displays
    else if (category === "Monitors" || subcategory.includes("Monitor") || subcategory.includes("Display") || subcategory.includes("Screen")) {
      return (
        <div className={`device-monitor ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="monitor-display">
                <div className="bezel-thin"></div>
              </div>
              <div className="monitor-stand"></div>
            </>
          ) : (
            <>
              <div className="monitor-back">
                <div className="vents"></div>
                <div className="ports"></div>
                <div className="logo">LOGO</div>
              </div>
              <div className="monitor-stand"></div>
            </>
          )}
        </div>
      );
    }
    
    // Desktop PC / Tower
    else if (category === "Desktops" || subcategory.includes("Desktop") || subcategory.includes("Tower") || subcategory.includes("PC")) {
      return (
        <div className={`device-desktop ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="pc-front">
                <div className="power-button"></div>
                <div className="optical-drive"></div>
                <div className="front-ports"></div>
                <div className="mesh-grill"></div>
              </div>
            </>
          ) : (
            <>
              <div className="pc-back">
                <div className="psu"></div>
                <div className="expansion-slots"></div>
                <div className="io-panel"></div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Printers, Scanners and Peripherals
    else if (category === "Printers, Scanners and Peripherals" || subcategory.includes("Printer") || subcategory.includes("Scanner")) {
      return (
        <div className={`device-printer ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="printer-body">
                <div className="paper-tray"></div>
                <div className="control-panel">
                  <div className="led-indicator"></div>
                  <div className="led-indicator"></div>
                </div>
                <div className="output-tray"></div>
              </div>
            </>
          ) : (
            <>
              <div className="printer-back">
                <div className="ports-panel"></div>
                <div className="power-port"></div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Smartwatches / Wearables
    else if (category === "Wearables" || subcategory.includes("Watch") || subcategory.includes("Wearable") || subcategory.includes("Band")) {
      return (
        <div className={`device-smartwatch ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="watch-face">
                <div className="display-round"></div>
              </div>
              <div className="watch-strap"></div>
            </>
          ) : (
            <>
              <div className="watch-back">
                <div className="sensors"></div>
              </div>
              <div className="watch-strap"></div>
            </>
          )}
        </div>
      );
    }
    
    // Headphones / Earbuds / Audio
    else if (category === "Audio" || subcategory.includes("Headphone") || subcategory.includes("Earphone") || subcategory.includes("Earbud") || subcategory.includes("Speaker")) {
      // Headphones
      if (subcategory.includes("Headphone") || subcategory.includes("Earphone")) {
        return (
          <div className={`device-headphones ${side === "back" ? "back" : ""}`}>
            {side === "front" ? (
              <>
                <div className="headband"></div>
                <div className="ear-cup left">
                  <div className="speaker-grill"></div>
                </div>
                <div className="ear-cup right">
                  <div className="speaker-grill"></div>
                </div>
              </>
            ) : (
              <>
                <div className="headband"></div>
                <div className="ear-cup left back">
                  <div className="logo">L</div>
                </div>
                <div className="ear-cup right back">
                  <div className="logo">R</div>
                </div>
              </>
            )}
          </div>
        );
      }
      // Speakers
      else {
        return (
          <div className={`device-speaker ${side === "back" ? "back" : ""}`}>
            {side === "front" ? (
              <>
                <div className="speaker-body">
                  <div className="speaker-grill-large"></div>
                  <div className="control-buttons"></div>
                </div>
              </>
            ) : (
              <>
                <div className="speaker-body back">
                  <div className="ports-panel"></div>
                  <div className="bass-port"></div>
                </div>
              </>
            )}
          </div>
        );
      }
    }
    
    // Cameras
    else if (category === "Cameras" || subcategory.includes("Camera")) {
      return (
        <div className={`device-camera ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="camera-body">
                <div className="lens-mount">
                  <div className="lens"></div>
                </div>
                <div className="viewfinder"></div>
                <div className="flash-unit"></div>
              </div>
            </>
          ) : (
            <>
              <div className="camera-body back">
                <div className="lcd-screen"></div>
                <div className="control-buttons"></div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Gaming Consoles
    else if (category === "Gaming" || subcategory.includes("Console") || subcategory.includes("PlayStation") || subcategory.includes("Xbox")) {
      return (
        <div className={`device-console ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="console-body">
                <div className="disc-slot"></div>
                <div className="power-led"></div>
                <div className="usb-ports"></div>
              </div>
            </>
          ) : (
            <>
              <div className="console-body back">
                <div className="vents-grid"></div>
                <div className="ports-array"></div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Accessories - Keyboards
    else if (subcategory.includes("Keyboard")) {
      return (
        <div className={`device-keyboard ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="keyboard-body">
                <div className="keys-grid"></div>
                <div className="space-bar"></div>
              </div>
            </>
          ) : (
            <>
              <div className="keyboard-body back">
                <div className="rubber-feet"></div>
                <div className="cable-channel"></div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Accessories - Mouse
    else if (subcategory.includes("Mouse") || subcategory.includes("Mice")) {
      return (
        <div className={`device-mouse ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="mouse-body">
                <div className="left-button"></div>
                <div className="scroll-wheel"></div>
                <div className="right-button"></div>
              </div>
            </>
          ) : (
            <>
              <div className="mouse-body back">
                <div className="sensor"></div>
                <div className="logo">LOGO</div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Networking
    else if (category === "Networking" || subcategory.includes("Router") || subcategory.includes("Modem") || subcategory.includes("Network")) {
      return (
        <div className={`device-router ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="router-body">
                <div className="led-indicators"></div>
                <div className="antennas">
                  <div className="antenna"></div>
                  <div className="antenna"></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="router-body back">
                <div className="ethernet-ports"></div>
                <div className="power-port"></div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Drones
    else if (category === "Drones" || subcategory.includes("Drone")) {
      return (
        <div className={`device-drone ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="drone-body">
                <div className="camera-gimbal"></div>
                <div className="propeller prop1"></div>
                <div className="propeller prop2"></div>
                <div className="propeller prop3"></div>
                <div className="propeller prop4"></div>
              </div>
            </>
          ) : (
            <>
              <div className="drone-body back">
                <div className="battery-bay"></div>
                <div className="sensors"></div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Power Banks / Chargers / Accessories
    else if (category === "Accessories" || subcategory.includes("Power Bank") || subcategory.includes("Charger") || subcategory.includes("Battery")) {
      return (
        <div className={`device-powerbank ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="powerbank-body">
                <div className="led-indicators"></div>
                <div className="usb-ports"></div>
                <div className="power-button"></div>
              </div>
            </>
          ) : (
            <>
              <div className="powerbank-body back">
                <div className="specs-label">10000mAh</div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Storage Devices
    else if (category === "Storage" || subcategory.includes("Hard Drive") || subcategory.includes("SSD") || subcategory.includes("Storage")) {
      return (
        <div className={`device-hdd ${side === "back" ? "back" : ""}`}>
          {side === "front" ? (
            <>
              <div className="hdd-body">
                <div className="led-indicator"></div>
                <div className="logo">STORAGE</div>
              </div>
            </>
          ) : (
            <>
              <div className="hdd-body back">
                <div className="connector-port"></div>
                <div className="specs-label">1TB</div>
              </div>
            </>
          )}
        </div>
      );
    }
    
    // Default for any other category
    else {
      return (
        <div className="device-default">
          <div className="default-outline">
            <div className="center-icon">?</div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      <style>{`
        .device-container {
          position: relative;
          width: 100%;
          height: 500px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: crosshair;
          overflow: hidden;
          perspective: 1000px;
        }

        .damage-mark {
          position: absolute;
          width: 40px;
          height: 40px;
          background: radial-gradient(circle, rgba(239, 68, 68, 0.7) 0%, rgba(239, 68, 68, 0.3) 70%);
          border: 3px solid #dc2626;
          border-radius: 50%;
          pointer-events: none;
          transform: translate(-50%, -50%);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateY(0deg); }
          50% { transform: translateY(-10px) rotateY(2deg); }
        }

        /* === SMARTPHONE === */
        .device-smartphone {
          width: 280px;
          height: 420px;
          background: linear-gradient(145deg, #2d3748, #1a202c);
          border-radius: 35px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1);
          position: relative;
          transform-style: preserve-3d;
          animation: float 3s ease-in-out infinite;
          transition: transform 0.5s ease;
        }
        .device-smartphone.back { background: linear-gradient(145deg, #4a5568, #2d3748); }
        .device-smartphone:hover { transform: rotateY(5deg) rotateX(2deg); }
        .screen {
          position: absolute;
          inset: 12px;
          background: linear-gradient(145deg, #111827, #000000);
          border-radius: 28px;
          overflow: hidden;
        }
        .notch {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 140px;
          height: 25px;
          background: #000;
          border-radius: 0 0 15px 15px;
        }
        .display-content {
          margin-top: 40px;
          height: calc(100% - 80px);
          background: linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%);
        }
        .home-button {
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          width: 50px;
          height: 50px;
          border: 2px solid #4b5563;
          border-radius: 50%;
        }
        .camera-module {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 80px;
          height: 80px;
          background: linear-gradient(145deg, #1f2937, #111827);
          border-radius: 20px;
          display: flex;
          gap: 10px;
          padding: 10px;
          flex-wrap: wrap;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
        }
        .camera-lens {
          width: 28px;
          height: 28px;
          background: radial-gradient(circle, #1e3a8a 30%, #1e40af 70%, #3b82f6 100%);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .flash {
          width: 18px;
          height: 18px;
          background: #fef3c7;
          border-radius: 50%;
        }

        /* ... keep existing code (all other device styles) ... */

        .logo {
          color: rgba(255,255,255,0.15);
          font-weight: bold;
          font-size: 16px;
          letter-spacing: 2px;
          text-align: center;
        }
      `}</style>

      <div className="flex items-center justify-between">
        <Label>
          Mark Damaged Areas on {categoryName || "Device"} {subcategoryName && `(${subcategoryName})`} ({side === "front" ? "Front" : "Back"})
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={side === "front" ? "default" : "outline"}
            size="sm"
            onClick={() => setSide("front")}
          >
            Front
          </Button>
          <Button
            type="button"
            variant={side === "back" ? "default" : "outline"}
            size="sm"
            onClick={() => setSide("back")}
          >
            Back
          </Button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="device-container"
        onClick={handleClick}
      >
        {renderDevice()}
        
        {marks[side].map((mark) => (
          <div
            key={mark.id}
            className="damage-mark"
            style={{
              left: `${mark.x}%`,
              top: `${mark.y}%`,
            }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="flex-1"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear {side === "front" ? "Front" : "Back"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          className="flex-1"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={uploading}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          {uploading ? "Exporting..." : "Export"}
        </Button>
      </div>

      <p className="text-xs text-gray-600">
        Click on the 3D device to mark damaged areas. Switch between front and back views.
        {marks.front.length + marks.back.length > 0 && (
          <span className="block mt-1 text-blue-600 font-semibold">
            {marks.front.length} mark(s) on front, {marks.back.length} mark(s) on back
          </span>
        )}
      </p>
    </div>
  );
}