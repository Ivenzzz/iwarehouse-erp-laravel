import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function PortalTooltip({ children, parentRef, isVisible }) {
  const tooltipRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [arrowData, setArrowData] = useState({ position: "bottom", offset: 0 }); // "bottom" means arrow is at bottom of tooltip (tooltip is above)

  useLayoutEffect(() => {
    if (!isVisible || !parentRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      const triggerRect = parentRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const GAP = 10; // Space between card and tooltip

      // 1. Determine Vertical Position
      let top = 0;
      let placement = "top"; // "top" = tooltip is above card

      // Calculate potential positions
      const topSpace = triggerRect.top;
      const bottomSpace = windowHeight - triggerRect.bottom;

      // Logic:
      // 1. Try Above (User preference for Top Row)
      // 2. If it clips top, check if Below is better.
      // 3. If Below also clips, pick whichever side has MORE space and clamp it.

      const fitsAbove = topSpace >= tooltipRect.height + GAP;
      const fitsBelow = bottomSpace >= tooltipRect.height + GAP;

      if (fitsAbove) {
        // Perfect fit above
        top = triggerRect.top - tooltipRect.height - GAP;
        placement = "top";
      } else if (fitsBelow) {
        // Perfect fit below
        top = triggerRect.bottom + GAP;
        placement = "bottom";
      } else {
        // Neither fits perfectly. Pick side with more space and Clamp.
        if (topSpace > bottomSpace) {
            // Force Top, but clamp to 10px from window top
            top = Math.max(10, triggerRect.top - tooltipRect.height - GAP);
            placement = "top";
        } else {
            // Force Bottom, but clamp to 10px from window bottom
            top = Math.min(windowHeight - tooltipRect.height - 10, triggerRect.bottom + GAP);
            placement = "bottom";
        }
      }

      // 2. Determine Horizontal Position (Left align matches card)
      let left = triggerRect.left;
      
      // Update State
      setCoords({ top, left, width: triggerRect.width });
      setArrowData({ 
        position: placement === "top" ? "bottom" : "top", // If tooltip is TOP, arrow is at its BOTTOM
        offset: 20 // Approx center of arrow 
      });
    };

    updatePosition();
    // Re-calculate on scroll or resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible, parentRef]);

  if (!isVisible) return null;

  return createPortal(
    <div 
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none transition-opacity duration-200"
      style={{ 
        top: `${coords.top}px`, 
        left: `${coords.left}px`, 
        width: `${coords.width}px` 
      }}
    >
      <div className={`relative animate-in fade-in zoom-in-95 duration-200`}>
        {children}
        
        {/* Dynamic Arrow */}
        <div 
          className={`absolute left-8 w-3 h-3 bg-slate-800 rotate-45 transform
            ${arrowData.position === "bottom" ? "-bottom-1.5" : "-top-1.5"}
          `}
        />
      </div>
    </div>,
    document.body
  );
}