import React, { useEffect, useRef } from "react";
import anime from "animejs";
import { Package, Upload, Database, CheckCircle } from "lucide-react";

export function ImportLoadingAnimation({ message = "Processing...", progress = 0, isComplete = false }) {
  const containerRef = useRef(null);
  const circleRefs = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Floating animation for icons
    const floatingAnimation = anime({
      targets: '.floating-icon',
      translateY: [
        { value: -10, duration: 1000, easing: 'easeInOutSine' },
        { value: 0, duration: 1000, easing: 'easeInOutSine' }
      ],
      loop: true
    });

    // Rotating dots animation
    const dotsAnimation = anime({
      targets: '.loading-dot',
      scale: [
        { value: 1.2, duration: 600, easing: 'easeInOutQuad' },
        { value: 1, duration: 600, easing: 'easeInOutQuad' }
      ],
      opacity: [
        { value: 1, duration: 600 },
        { value: 0.3, duration: 600 }
      ],
      delay: anime.stagger(200),
      loop: true
    });

    // Progress bar animation
    const progressBarAnimation = anime({
      targets: '.progress-bar',
      width: `${progress}%`,
      duration: 500,
      easing: 'easeOutCubic'
    });

    return () => {
      floatingAnimation.pause();
      dotsAnimation.pause();
      progressBarAnimation.pause();
    };
  }, [progress]);

  useEffect(() => {
    if (isComplete) {
      // Success animation
      anime({
        targets: '.success-icon',
        scale: [0, 1.2, 1],
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutElastic(1, .8)'
      });

      anime({
        targets: '.success-checkmark',
        strokeDashoffset: [anime.setDashoffset, 0],
        duration: 800,
        delay: 300,
        easing: 'easeOutCubic'
      });
    }
  }, [isComplete]);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center py-12 space-y-6">
      {!isComplete ? (
        <>
          {/* Floating Icons */}
          <div className="relative w-48 h-24">
            <div className="absolute left-0 top-0 floating-icon">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-0 floating-icon" style={{ animationDelay: '0.3s' }}>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="absolute right-0 top-0 floating-icon" style={{ animationDelay: '0.6s' }}>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Loading Dots */}
          <div className="flex items-center gap-2">
            <div className="loading-dot w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
            <div className="loading-dot w-3 h-3 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
            <div className="loading-dot w-3 h-3 bg-green-600 dark:bg-green-400 rounded-full"></div>
          </div>

          {/* Message */}
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{message}</p>

          {/* Progress Bar */}
          <div className="w-full max-w-md">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="progress-bar h-full bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 rounded-full" style={{ width: '0%' }}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">{progress}%</p>
          </div>
        </>
      ) : (
        <>
          {/* Success State */}
          <div className="success-icon">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">Import Complete!</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </>
      )}
    </div>
  );
}