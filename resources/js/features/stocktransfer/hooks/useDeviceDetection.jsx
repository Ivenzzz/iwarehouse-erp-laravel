import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768; // px

/**
 * Hook to detect if the current device is mobile/tablet
 * Returns isMobileDevice: true for mobile/tablet, false for desktop
 */
export function useDeviceDetection() {
  const [isMobileDevice, setIsMobileDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileDevice(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on mount
    checkDevice();

    // Listen for resize events
    window.addEventListener("resize", checkDevice);
    
    return () => {
      window.removeEventListener("resize", checkDevice);
    };
  }, []);

  return { isMobileDevice };
}