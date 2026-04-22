import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw, Smartphone, Trash2 } from "lucide-react";

export default function DeviceDamageHighlighter({ 
  onDamageAreasChange,
  damageAreas = { front: [], back: [] },
  onDeviceCategoryChange
}) {
  const [deviceCategory, setDeviceCategory] = useState("Smartphones");
  const [marks, setMarks] = useState(damageAreas);
  const [currentDamageDescription, setCurrentDamageDescription] = useState("");
  const imageRefFront = useRef(null);
  const imageRefBack = useRef(null);

  // Notify parent component when device category changes
  React.useEffect(() => {
    if (onDeviceCategoryChange) {
      onDeviceCategoryChange(deviceCategory);
    }
  }, [deviceCategory, onDeviceCategoryChange]);

  // Fetch product diagrams from database
  const { data: diagrams = [] } = useQuery({
    queryKey: ["productDiagrams"],
    queryFn: () => base44.entities.ProductDiagram.list(),
    initialData: [],
  });

  // Get diagram for current device category
  const currentDiagram = diagrams.find(
    d => d.device_type === deviceCategory && d.is_active
  );

  const frontImageUrl = currentDiagram?.front_image_url || null;
  const backImageUrl = currentDiagram?.back_image_url || null;

  // Handle click on image to add damage marker
  const handleImageClick = (e, view) => {
    if (!currentDamageDescription.trim()) {
      alert("Please enter a damage description first before marking the location.");
      return;
    }

    const image = view === "front" ? imageRefFront.current : imageRefBack.current;
    if (!image) return;

    const rect = image.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Convert to percentage
    const y = ((e.clientY - rect.top) / rect.height) * 100; // Convert to percentage

    const totalMarks = (marks.front?.length || 0) + (marks.back?.length || 0);
    const nextNumber = totalMarks + 1;

    const newMarks = {
      ...marks,
      [view]: [...(marks[view] || []), { 
        x, 
        y, 
        description: currentDamageDescription,
        number: nextNumber
      }],
    };

    setMarks(newMarks);
    onDamageAreasChange(newMarks);
    setCurrentDamageDescription("");
  };

  // LEGACY: Draw modern smartphone front view with blue gradient style
  const drawSmartphoneFront = (ctx, width, height) => {
    const deviceX = width * 0.28;
    const deviceY = height * 0.05;
    const deviceWidth = width * 0.44;
    const deviceHeight = height * 0.88;
    const radius = 35;

    // Soft glow shadow
    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    // Modern blue gradient frame
    const frameGradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    frameGradient.addColorStop(0, "#0ea5e9"); // Cyan
    frameGradient.addColorStop(0.5, "#0284c7"); // Sky blue
    frameGradient.addColorStop(1, "#1e3a8a"); // Deep blue
    
    ctx.fillStyle = frameGradient;
    ctx.strokeStyle = "#0c4a6e";
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(deviceX + radius, deviceY);
    ctx.lineTo(deviceX + deviceWidth - radius, deviceY);
    ctx.quadraticCurveTo(deviceX + deviceWidth, deviceY, deviceX + deviceWidth, deviceY + radius);
    ctx.lineTo(deviceX + deviceWidth, deviceY + deviceHeight - radius);
    ctx.quadraticCurveTo(deviceX + deviceWidth, deviceY + deviceHeight, deviceX + deviceWidth - radius, deviceY + deviceHeight);
    ctx.lineTo(deviceX + radius, deviceY + deviceHeight);
    ctx.quadraticCurveTo(deviceX, deviceY + deviceHeight, deviceX, deviceY + deviceHeight - radius);
    ctx.lineTo(deviceX, deviceY + radius);
    ctx.quadraticCurveTo(deviceX, deviceY, deviceX + radius, deviceY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Glossy overlay effect
    const glossGradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight / 2);
    glossGradient.addColorStop(0, "rgba(255, 255, 255, 0.25)");
    glossGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glossGradient;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight / 2);

    // Screen bezel
    const bezelPadding = 8;
    const bezelY = deviceY + 50;
    const bezelHeight = deviceHeight - 90;
    
    ctx.fillStyle = "#000000";
    ctx.fillRect(
      deviceX + bezelPadding,
      bezelY,
      deviceWidth - bezelPadding * 2,
      bezelHeight
    );

    // Screen with subtle blue tint
    const screenPadding = 12;
    const screenGradient = ctx.createLinearGradient(
      deviceX + screenPadding, 
      bezelY + 3, 
      deviceX + screenPadding, 
      bezelY + bezelHeight - 6
    );
    screenGradient.addColorStop(0, "#e0f2fe");
    screenGradient.addColorStop(0.5, "#f0f9ff");
    screenGradient.addColorStop(1, "#dbeafe");
    
    ctx.fillStyle = screenGradient;
    ctx.fillRect(
      deviceX + screenPadding,
      bezelY + 3,
      deviceWidth - screenPadding * 2,
      bezelHeight - 6
    );

    // Dynamic Island / Notch with depth
    const notchWidth = 80;
    const notchHeight = 25;
    
    // Notch shadow for depth
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(
      deviceX + deviceWidth / 2 - notchWidth / 2,
      deviceY + 12,
      notchWidth,
      notchHeight,
      [0, 0, 12, 12]
    );
    ctx.fill();
    
    // Notch main body
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.roundRect(
      deviceX + deviceWidth / 2 - notchWidth / 2,
      deviceY + 10,
      notchWidth,
      notchHeight,
      [0, 0, 12, 12]
    );
    ctx.fill();

    // Camera lens with gradient
    const cameraGradient = ctx.createRadialGradient(
      deviceX + deviceWidth / 2 - 15, deviceY + 22, 2,
      deviceX + deviceWidth / 2 - 15, deviceY + 22, 6
    );
    cameraGradient.addColorStop(0, "#1a202c");
    cameraGradient.addColorStop(1, "#000000");
    
    ctx.fillStyle = cameraGradient;
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2 - 15, deviceY + 22, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Camera lens reflection
    ctx.fillStyle = "rgba(100, 116, 139, 0.6)";
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2 - 16, deviceY + 20, 2.5, 0, 2 * Math.PI);
    ctx.fill();

    // Face ID sensors
    ctx.fillStyle = "#1a202c";
    ctx.fillRect(deviceX + deviceWidth / 2 + 8, deviceY + 20, 8, 4);
    ctx.fillRect(deviceX + deviceWidth / 2 + 20, deviceY + 20, 8, 4);

    // Speaker grill with holes
    ctx.fillStyle = "#2d3748";
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(deviceX + deviceWidth / 2 - 18 + i * 3, deviceY + 15, 1.5, 4);
    }

    // Proximity sensor
    ctx.fillStyle = "#1a202c";
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2 + 35, deviceY + 22, 2, 0, 2 * Math.PI);
    ctx.fill();

    // Volume buttons with depth
    const buttonShadow = "rgba(0, 0, 0, 0.4)";
    const buttonColor = "#1f2937";
    
    // Volume Up
    ctx.fillStyle = buttonShadow;
    ctx.fillRect(deviceX - 4, deviceY + 90, 3, 35);
    ctx.fillStyle = buttonColor;
    ctx.fillRect(deviceX - 3, deviceY + 88, 3, 35);
    
    // Volume Down
    ctx.fillStyle = buttonShadow;
    ctx.fillRect(deviceX - 4, deviceY + 135, 3, 35);
    ctx.fillStyle = buttonColor;
    ctx.fillRect(deviceX - 3, deviceY + 133, 3, 35);

    // Power button with depth
    ctx.fillStyle = buttonShadow;
    ctx.fillRect(deviceX + deviceWidth + 1, deviceY + 110, 3, 45);
    ctx.fillStyle = buttonColor;
    ctx.fillRect(deviceX + deviceWidth, deviceY + 108, 3, 45);

    // Bottom speaker grills
    const grillY = deviceY + deviceHeight - 15;
    ctx.fillStyle = "#1f2937";
    
    // Left speaker
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(deviceX + 20 + i * 6, grillY, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Right speaker  
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(deviceX + deviceWidth - 60 + i * 6, grillY, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Charging port
    ctx.fillStyle = "#1a202c";
    ctx.fillRect(deviceX + deviceWidth / 2 - 12, grillY - 2, 24, 6);
  };

  // Draw modern smartphone back view with blue gradient style
  const drawSmartphoneBack = (ctx, width, height) => {
    const deviceX = width * 0.28;
    const deviceY = height * 0.05;
    const deviceWidth = width * 0.44;
    const deviceHeight = height * 0.88;
    const radius = 35;

    // Soft glow shadow
    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    // Sleek blue gradient back
    const backGradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    backGradient.addColorStop(0, "#38bdf8"); // Light cyan
    backGradient.addColorStop(0.4, "#0ea5e9"); // Sky
    backGradient.addColorStop(0.7, "#0284c7"); // Blue
    backGradient.addColorStop(1, "#1e40af"); // Deep blue
    
    ctx.fillStyle = backGradient;
    ctx.strokeStyle = "#0c4a6e";
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(deviceX + radius, deviceY);
    ctx.lineTo(deviceX + deviceWidth - radius, deviceY);
    ctx.quadraticCurveTo(deviceX + deviceWidth, deviceY, deviceX + deviceWidth, deviceY + radius);
    ctx.lineTo(deviceX + deviceWidth, deviceY + deviceHeight - radius);
    ctx.quadraticCurveTo(deviceX + deviceWidth, deviceY + deviceHeight, deviceX + deviceWidth - radius, deviceY + deviceHeight);
    ctx.lineTo(deviceX + radius, deviceY + deviceHeight);
    ctx.quadraticCurveTo(deviceX, deviceY + deviceHeight, deviceX, deviceY + deviceHeight - radius);
    ctx.lineTo(deviceX, deviceY + radius);
    ctx.quadraticCurveTo(deviceX, deviceY, deviceX + radius, deviceY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Glossy reflection overlay
    const reflectionGradient = ctx.createLinearGradient(
      deviceX, deviceY, 
      deviceX + deviceWidth / 2, deviceY + deviceHeight / 2
    );
    reflectionGradient.addColorStop(0, "rgba(255, 255, 255, 0.4)");
    reflectionGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
    reflectionGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = reflectionGradient;
    ctx.fillRect(deviceX, deviceY, deviceWidth / 2, deviceHeight / 2);

    // Camera module (square with rounded corners) - enhanced
    const moduleSize = 70;
    const moduleX = deviceX + deviceWidth - moduleSize - 15;
    const moduleY = deviceY + 20;
    
    // Module shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.roundRect(moduleX + 2, moduleY + 2, moduleSize, moduleSize, 12);
    ctx.fill();
    
    // Module main body
    ctx.fillStyle = "#0f1419";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(moduleX, moduleY, moduleSize, moduleSize, 12);
    ctx.fill();
    ctx.stroke();

    // Triple camera setup with enhanced detail
    const cameras = [
      { x: moduleX + 18, y: moduleY + 18, size: 16 },
      { x: moduleX + 52, y: moduleY + 18, size: 16 },
      { x: moduleX + 35, y: moduleY + 48, size: 12 }
    ];
    
    cameras.forEach(cam => {
      // Outer chrome ring
      const ringGradient = ctx.createRadialGradient(cam.x, cam.y, cam.size - 2, cam.x, cam.y, cam.size);
      ringGradient.addColorStop(0, "#4b5563");
      ringGradient.addColorStop(1, "#1f2937");
      ctx.fillStyle = ringGradient;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, cam.size, 0, 2 * Math.PI);
      ctx.fill();
      
      // Lens glass
      const lensGradient = ctx.createRadialGradient(cam.x, cam.y, 0, cam.x, cam.y, cam.size - 3);
      lensGradient.addColorStop(0, "#1a202c");
      lensGradient.addColorStop(1, "#000000");
      ctx.fillStyle = lensGradient;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, cam.size - 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Glass reflection
      ctx.fillStyle = "rgba(100, 116, 139, 0.4)";
      ctx.beginPath();
      ctx.arc(cam.x - 3, cam.y - 3, cam.size / 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Flash LED with glow
    ctx.shadowColor = "rgba(251, 191, 36, 0.5)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(moduleX + 15, moduleY + 48, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Flash LED highlight
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(moduleX + 14, moduleY + 47, 2, 0, 2 * Math.PI);
    ctx.fill();

    // LiDAR sensor
    ctx.fillStyle = "#1a202c";
    ctx.beginPath();
    ctx.arc(moduleX + 55, moduleY + 48, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Brand logo with embossed effect
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText("", deviceX + deviceWidth / 2, deviceY + deviceHeight / 2);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  };

  // Draw realistic laptop front
  const drawLaptopFront = (ctx, width, height) => {
    const screenWidth = width * 0.8;
    const screenHeight = height * 0.5;
    const screenX = width * 0.1;
    const screenY = height * 0.05;

    // Screen bezel
    ctx.fillStyle = "#1f2937";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
    ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

    // Webcam notch
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(screenX + screenWidth / 2 - 25, screenY + 2, 35, 5);
    ctx.fillStyle = "#1a202c";
    ctx.beginPath();
    ctx.arc(screenX + screenWidth / 2, screenY + 4.5, 2, 0, 2 * Math.PI);
    ctx.fill();

    // Display
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(screenX + 10, screenY + 12, screenWidth - 20, screenHeight - 22);

    // Keyboard base
    const baseY = screenY + screenHeight + 2;
    const baseHeight = height - baseY - height * 0.08;
    const baseGradient = ctx.createLinearGradient(screenX, baseY, screenX, baseY + baseHeight);
    baseGradient.addColorStop(0, "#9ca3af");
    baseGradient.addColorStop(1, "#6b7280");
    
    ctx.fillStyle = baseGradient;
    ctx.fillRect(screenX, baseY, screenWidth, baseHeight);
    ctx.strokeRect(screenX, baseY, screenWidth, baseHeight);

    // Trackpad
    const trackpadWidth = screenWidth * 0.25;
    const trackpadHeight = baseHeight * 0.4;
    ctx.fillStyle = "#374151";
    ctx.fillRect(
      screenX + (screenWidth - trackpadWidth) / 2,
      baseY + baseHeight * 0.3,
      trackpadWidth,
      trackpadHeight
    );
  };

  // Draw realistic laptop back
  const drawLaptopBack = (ctx, width, height) => {
    const deviceWidth = width * 0.8;
    const deviceHeight = height * 0.7;
    const deviceX = width * 0.1;
    const deviceY = height * 0.1;

    // Back cover gradient
    const backGradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    backGradient.addColorStop(0, "#4a5568");
    backGradient.addColorStop(0.5, "#374151");
    backGradient.addColorStop(1, "#2d3748");
    
    ctx.fillStyle = backGradient;
    ctx.strokeStyle = "#1a202c";
    ctx.lineWidth = 2;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);
    ctx.strokeRect(deviceX, deviceY, deviceWidth, deviceHeight);

    // Logo area
    ctx.font = "20px Arial";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText("", deviceX + deviceWidth / 2, deviceY + deviceHeight / 2);

    // Ventilation grills
    ctx.fillStyle = "#1f2937";
    for (let i = 0; i < 15; i++) {
      ctx.fillRect(deviceX + 20 + i * 15, deviceY + deviceHeight - 30, 2, 20);
    }
  };

  // Draw realistic monitor front
  const drawMonitorFront = (ctx, width, height) => {
    const screenWidth = width * 0.7;
    const screenHeight = height * 0.6;
    const screenX = width * 0.15;
    const screenY = height * 0.05;

    // Bezel
    ctx.fillStyle = "#1f2937";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
    ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

    // Display
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(screenX + 8, screenY + 8, screenWidth - 16, screenHeight - 16);

    // Stand
    const standWidth = 50;
    const standHeight = height * 0.12;
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(screenX + screenWidth / 2 - standWidth / 2, screenY + screenHeight + 5, standWidth, standHeight);

    // Base
    const baseGradient = ctx.createRadialGradient(
      screenX + screenWidth / 2, screenY + screenHeight + standHeight + 15,
      0,
      screenX + screenWidth / 2, screenY + screenHeight + standHeight + 15,
      80
    );
    baseGradient.addColorStop(0, "#6b7280");
    baseGradient.addColorStop(1, "#4b5563");
    ctx.fillStyle = baseGradient;
    ctx.beginPath();
    ctx.ellipse(screenX + screenWidth / 2, screenY + screenHeight + standHeight + 15, 80, 15, 0, 0, 2 * Math.PI);
    ctx.fill();
  };

  // Draw realistic monitor back
  const drawMonitorBack = (ctx, width, height) => {
    const screenWidth = width * 0.7;
    const screenHeight = height * 0.6;
    const screenX = width * 0.15;
    const screenY = height * 0.05;

    // Back panel
    const backGradient = ctx.createLinearGradient(screenX, screenY, screenX + screenWidth, screenY + screenHeight);
    backGradient.addColorStop(0, "#4a5568");
    backGradient.addColorStop(1, "#2d3748");
    
    ctx.fillStyle = backGradient;
    ctx.strokeStyle = "#1a202c";
    ctx.lineWidth = 2;
    ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
    ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);

    // Ports section
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(screenX + 20, screenY + screenHeight - 50, screenWidth - 40, 30);

    // Individual ports
    const ports = [
      { x: 30, w: 25, h: 12 }, // HDMI
      { x: 60, w: 15, h: 10 }, // USB
      { x: 80, w: 15, h: 10 }, // USB
      { x: 100, w: 20, h: 15 }, // Power
    ];
    
    ctx.fillStyle = "#000000";
    ports.forEach(port => {
      ctx.fillRect(screenX + port.x, screenY + screenHeight - 42, port.w, port.h);
    });

    // Ventilation
    ctx.fillStyle = "#1a202c";
    for (let i = 0; i < 20; i++) {
      ctx.fillRect(screenX + 30 + i * 10, screenY + 30, 2, screenHeight - 90);
    }
  };

  // Draw realistic tablet front
  const drawTabletFront = (ctx, width, height) => {
    const deviceX = width * 0.15;
    const deviceY = height * 0.08;
    const deviceWidth = width * 0.7;
    const deviceHeight = height * 0.84;
    const radius = 18;

    // Frame
    const frameGradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY);
    frameGradient.addColorStop(0, "#3d4852");
    frameGradient.addColorStop(0.5, "#4a5568");
    frameGradient.addColorStop(1, "#3d4852");
    
    ctx.fillStyle = frameGradient;
    ctx.strokeStyle = "#1a202c";
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(deviceX + radius, deviceY);
    ctx.lineTo(deviceX + deviceWidth - radius, deviceY);
    ctx.quadraticCurveTo(deviceX + deviceWidth, deviceY, deviceX + deviceWidth, deviceY + radius);
    ctx.lineTo(deviceX + deviceWidth, deviceY + deviceHeight - radius);
    ctx.quadraticCurveTo(deviceX + deviceWidth, deviceY + deviceHeight, deviceX + deviceWidth - radius, deviceY + deviceHeight);
    ctx.lineTo(deviceX + radius, deviceY + deviceHeight);
    ctx.quadraticCurveTo(deviceX, deviceY + deviceHeight, deviceX, deviceY + deviceHeight - radius);
    ctx.lineTo(deviceX, deviceY + radius);
    ctx.quadraticCurveTo(deviceX, deviceY, deviceX + radius, deviceY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Screen
    ctx.fillStyle = "#000000";
    ctx.fillRect(deviceX + 8, deviceY + 8, deviceWidth - 16, deviceHeight - 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(deviceX + 10, deviceY + 10, deviceWidth - 20, deviceHeight - 20);

    // Camera
    ctx.fillStyle = "#1a202c";
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2, deviceY + 5, 3, 0, 2 * Math.PI);
    ctx.fill();
  };

  // Draw realistic tablet back
  const drawTabletBack = (ctx, width, height) => {
    const deviceX = width * 0.15;
    const deviceY = height * 0.08;
    const deviceWidth = width * 0.7;
    const deviceHeight = height * 0.84;
    const radius = 18;

    // Back casing
    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#4f5b6d");
    gradient.addColorStop(0.5, "#3d4852");
    gradient.addColorStop(1, "#2d3748");
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#1a202c";
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(deviceX + radius, deviceY);
    ctx.lineTo(deviceX + deviceWidth - radius, deviceY);
    ctx.quadraticCurveTo(deviceX + deviceWidth, deviceY, deviceX + deviceWidth, deviceY + radius);
    ctx.lineTo(deviceX + deviceWidth, deviceY + deviceHeight - radius);
    ctx.quadraticCurveTo(deviceX + deviceWidth, deviceY + deviceHeight, deviceX + deviceWidth - radius, deviceY + deviceHeight);
    ctx.lineTo(deviceX + radius, deviceY + deviceHeight);
    ctx.quadraticCurveTo(deviceX, deviceY + deviceHeight, deviceX, deviceY + deviceHeight - radius);
    ctx.lineTo(deviceX, deviceY + radius);
    ctx.quadraticCurveTo(deviceX, deviceY, deviceX + radius, deviceY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Camera
    const cameraSize = 35;
    ctx.fillStyle = "#1a202c";
    ctx.beginPath();
    ctx.roundRect(deviceX + deviceWidth - cameraSize - 15, deviceY + 15, cameraSize, cameraSize, 8);
    ctx.fill();

    // Lens
    ctx.fillStyle = "#2d3748";
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth - cameraSize / 2 - 15, deviceY + cameraSize / 2 + 15, 12, 0, 2 * Math.PI);
    ctx.fill();
  };

  // Draw realistic printer front
  const drawPrinterFront = (ctx, width, height) => {
    const deviceX = width * 0.08;
    const deviceY = height * 0.15;
    const deviceWidth = width * 0.84;
    const deviceHeight = height * 0.65;

    // Main body gradient
    const bodyGradient = ctx.createLinearGradient(deviceX, deviceY, deviceX, deviceY + deviceHeight);
    bodyGradient.addColorStop(0, "#4b5563");
    bodyGradient.addColorStop(1, "#374151");
    
    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);
    ctx.strokeRect(deviceX, deviceY, deviceWidth, deviceHeight);

    // Paper tray
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#d1d5db";
    ctx.fillRect(deviceX + 15, deviceY - 18, deviceWidth - 30, 20);
    ctx.strokeRect(deviceX + 15, deviceY - 18, deviceWidth - 30, 20);

    // Control panel
    const panelWidth = deviceWidth * 0.35;
    const panelHeight = 35;
    ctx.fillStyle = "#1f2937";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.fillRect(deviceX + deviceWidth - panelWidth - 15, deviceY + 15, panelWidth, panelHeight);
    ctx.strokeRect(deviceX + deviceWidth - panelWidth - 15, deviceY + 15, panelWidth, panelHeight);

    // Display screen on panel
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(deviceX + deviceWidth - panelWidth - 10, deviceY + 20, panelWidth - 10, 25);

    // Buttons
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#9ca3af";
      ctx.strokeStyle = "#6b7280";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(deviceX + 25 + i * 25, deviceY + deviceHeight - 30, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Output tray
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(deviceX + 20, deviceY + deviceHeight - 12, deviceWidth - 40, 6);
  };

  // Draw SSD front view
  const drawSSDFront = (ctx, width, height) => {
    const deviceX = width * 0.25;
    const deviceY = height * 0.25;
    const deviceWidth = width * 0.5;
    const deviceHeight = height * 0.3;

    // Shadow
    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // Main body with blue gradient
    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#0ea5e9");
    gradient.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = gradient;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Label area
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(deviceX + 15, deviceY + 15, deviceWidth - 30, deviceHeight - 30);

    // Text
    ctx.fillStyle = "#0ea5e9";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SSD", deviceX + deviceWidth / 2, deviceY + deviceHeight / 2);

    // Connector
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(deviceX + deviceWidth - 40, deviceY + deviceHeight / 2 - 8, 35, 16);
  };

  // Draw SSD back view
  const drawSSDBack = (ctx, width, height) => {
    const deviceX = width * 0.25;
    const deviceY = height * 0.25;
    const deviceWidth = width * 0.5;
    const deviceHeight = height * 0.3;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(1, "#0ea5e9");
    ctx.fillStyle = gradient;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Barcode sticker
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(deviceX + 20, deviceY + 20, 80, 40);
    ctx.fillStyle = "#1f2937";
    ctx.font = "8px monospace";
    ctx.fillText("SN: 123456789", deviceX + 30, deviceY + 45);
  };

  // Draw PartyBox Speaker front
  const drawPartyBoxFront = (ctx, width, height) => {
    const deviceX = width * 0.2;
    const deviceY = height * 0.15;
    const deviceWidth = width * 0.6;
    const deviceHeight = height * 0.7;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 10;

    // Main body
    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX, deviceY + deviceHeight);
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(0.5, "#0ea5e9");
    gradient.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = gradient;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);

    ctx.shadowColor = "transparent";

    // Speaker grills
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(deviceX + 20, deviceY + 50, deviceWidth - 40, deviceHeight - 150);

    // LED light bar
    const ledGradient = ctx.createLinearGradient(deviceX, deviceY + 20, deviceX + deviceWidth, deviceY + 20);
    ledGradient.addColorStop(0, "#ef4444");
    ledGradient.addColorStop(0.33, "#22c55e");
    ledGradient.addColorStop(0.66, "#3b82f6");
    ledGradient.addColorStop(1, "#ef4444");
    ctx.fillStyle = ledGradient;
    ctx.fillRect(deviceX + 30, deviceY + 20, deviceWidth - 60, 15);

    // Control buttons
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#4b5563";
      ctx.beginPath();
      ctx.arc(deviceX + 40 + i * 35, deviceY + deviceHeight - 40, 12, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Handle
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2, deviceY - 15, 50, 0, Math.PI);
    ctx.stroke();
  };

  // Draw PartyBox Speaker back
  const drawPartyBoxBack = (ctx, width, height) => {
    const deviceX = width * 0.2;
    const deviceY = height * 0.15;
    const deviceWidth = width * 0.6;
    const deviceHeight = height * 0.7;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 10;

    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = gradient;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);

    ctx.shadowColor = "transparent";

    // Ports section
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(deviceX + 30, deviceY + deviceHeight / 2 - 40, deviceWidth - 60, 80);

    // Individual ports
    const ports = [
      { x: 50, label: "AUX" },
      { x: 100, label: "USB" },
      { x: 150, label: "PWR" }
    ];
    
    ports.forEach(port => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(deviceX + port.x, deviceY + deviceHeight / 2 - 10, 30, 20);
      ctx.fillStyle = "#0ea5e9";
      ctx.font = "10px Arial";
      ctx.fillText(port.label, deviceX + port.x + 5, deviceY + deviceHeight / 2 + 30);
    });
  };

  // Draw Keyboard front
  const drawKeyboardFront = (ctx, width, height) => {
    const deviceX = width * 0.1;
    const deviceY = height * 0.3;
    const deviceWidth = width * 0.8;
    const deviceHeight = height * 0.35;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // Main body
    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX, deviceY + deviceHeight);
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(1, "#0ea5e9");
    ctx.fillStyle = gradient;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);

    ctx.shadowColor = "transparent";

    // Keys
    ctx.fillStyle = "#1f2937";
    const keySize = 18;
    const keyGap = 4;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 15; col++) {
        ctx.fillRect(
          deviceX + 20 + col * (keySize + keyGap),
          deviceY + 20 + row * (keySize + keyGap),
          keySize,
          keySize
        );
      }
    }

    // RGB backlight effect
    const rgbGradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY);
    rgbGradient.addColorStop(0, "rgba(239, 68, 68, 0.3)");
    rgbGradient.addColorStop(0.5, "rgba(34, 197, 94, 0.3)");
    rgbGradient.addColorStop(1, "rgba(59, 130, 246, 0.3)");
    ctx.fillStyle = rgbGradient;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);
  };

  // Draw Keyboard back
  const drawKeyboardBack = (ctx, width, height) => {
    const deviceX = width * 0.1;
    const deviceY = height * 0.3;
    const deviceWidth = width * 0.8;
    const deviceHeight = height * 0.35;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = gradient;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);

    ctx.shadowColor = "transparent";

    // Rubber feet
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(deviceX + 30, deviceY + deviceHeight - 15, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth - 30, deviceY + deviceHeight - 15, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Cable port
    ctx.fillStyle = "#000000";
    ctx.fillRect(deviceX + deviceWidth / 2 - 15, deviceY + deviceHeight - 5, 30, 10);
  };

  // Draw Mouse front
  const drawMouseFront = (ctx, width, height) => {
    const deviceX = width * 0.35;
    const deviceY = height * 0.25;
    const deviceWidth = width * 0.3;
    const deviceHeight = height * 0.4;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // Main body ellipse
    const gradient = ctx.createRadialGradient(
      deviceX + deviceWidth / 2, deviceY + deviceHeight / 2, 0,
      deviceX + deviceWidth / 2, deviceY + deviceHeight / 2, deviceWidth
    );
    gradient.addColorStop(0, "#38bdf8");
    gradient.addColorStop(1, "#1e3a8a");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(deviceX + deviceWidth / 2, deviceY + deviceHeight / 2, deviceWidth / 2, deviceHeight / 2, 0, 0, 2 * Math.PI);
    ctx.fill();

    ctx.shadowColor = "transparent";

    // Mouse buttons
    ctx.strokeStyle = "#0c4a6e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(deviceX + deviceWidth / 2, deviceY + 20);
    ctx.lineTo(deviceX + deviceWidth / 2, deviceY + deviceHeight / 2);
    ctx.stroke();

    // Scroll wheel
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(deviceX + deviceWidth / 2 - 8, deviceY + 30, 16, 25);
    
    // RGB light
    ctx.shadowColor = "rgba(14, 165, 233, 0.6)";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2, deviceY + deviceHeight - 30, 12, 0, 2 * Math.PI);
    ctx.fill();
  };

  // Draw Mouse back
  const drawMouseBack = (ctx, width, height) => {
    const deviceX = width * 0.35;
    const deviceY = height * 0.25;
    const deviceWidth = width * 0.3;
    const deviceHeight = height * 0.4;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const gradient = ctx.createRadialGradient(
      deviceX + deviceWidth / 2, deviceY + deviceHeight / 2, 0,
      deviceX + deviceWidth / 2, deviceY + deviceHeight / 2, deviceWidth
    );
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(1, "#0c4a6e");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(deviceX + deviceWidth / 2, deviceY + deviceHeight / 2, deviceWidth / 2, deviceHeight / 2, 0, 0, 2 * Math.PI);
    ctx.fill();

    ctx.shadowColor = "transparent";

    // Sensor
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2, deviceY + deviceHeight - 25, 8, 0, 2 * Math.PI);
    ctx.fill();
  };

  // Draw Webcam front
  const drawWebcamFront = (ctx, width, height) => {
    const deviceX = width * 0.35;
    const deviceY = height * 0.25;
    const deviceWidth = width * 0.3;
    const deviceHeight = height * 0.15;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // Main body
    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY);
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(1, "#0ea5e9");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(deviceX, deviceY, deviceWidth, deviceHeight, 15);
    ctx.fill();

    ctx.shadowColor = "transparent";

    // Lens
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2, deviceY + deviceHeight / 2, 30, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2, deviceY + deviceHeight / 2, 22, 0, 2 * Math.PI);
    ctx.fill();

    // Status LED
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(deviceX + 20, deviceY + deviceHeight / 2, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Microphone holes
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      ctx.arc(deviceX + deviceWidth - 30 + i * 8, deviceY + deviceHeight / 2, 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Stand
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(deviceX + deviceWidth / 2 - 15, deviceY + deviceHeight - 5, 30, 40);
  };

  // Draw Webcam back
  const drawWebcamBack = (ctx, width, height) => {
    const deviceX = width * 0.35;
    const deviceY = height * 0.25;
    const deviceWidth = width * 0.3;
    const deviceHeight = height * 0.15;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#0c4a6e");
    gradient.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(deviceX, deviceY, deviceWidth, deviceHeight, 15);
    ctx.fill();

    ctx.shadowColor = "transparent";

    // Vent holes
    ctx.fillStyle = "#0f172a";
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillRect(deviceX + 20 + i * 12, deviceY + 30 + j * 10, 2, 6);
      }
    }
  };

  // Draw Power Bank front
  const drawPowerBankFront = (ctx, width, height) => {
    const deviceX = width * 0.3;
    const deviceY = height * 0.2;
    const deviceWidth = width * 0.4;
    const deviceHeight = height * 0.5;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // Main body
    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#38bdf8");
    gradient.addColorStop(0.5, "#0ea5e9");
    gradient.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(deviceX, deviceY, deviceWidth, deviceHeight, 20);
    ctx.fill();

    ctx.shadowColor = "transparent";

    // Display screen
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(deviceX + 20, deviceY + 30, deviceWidth - 40, 50);
    ctx.fillStyle = "#0ea5e9";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("85%", deviceX + deviceWidth / 2, deviceY + 65);

    // Battery indicator bars
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < 3 ? "#22c55e" : "#374151";
      ctx.fillRect(deviceX + 30 + i * 35, deviceY + 100, 25, 15);
    }

    // Output ports
    ctx.fillStyle = "#000000";
    ctx.fillRect(deviceX + 30, deviceY + deviceHeight - 50, 35, 20);
    ctx.fillRect(deviceX + 75, deviceY + deviceHeight - 50, 35, 20);

    ctx.fillStyle = "#f3f4f6";
    ctx.font = "10px Arial";
    ctx.fillText("USB-A", deviceX + 48, deviceY + deviceHeight - 55);
    ctx.fillText("USB-C", deviceX + 93, deviceY + deviceHeight - 55);
  };

  // Draw Power Bank back
  const drawPowerBankBack = (ctx, width, height) => {
    const deviceX = width * 0.3;
    const deviceY = height * 0.2;
    const deviceWidth = width * 0.4;
    const deviceHeight = height * 0.5;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(1, "#0c4a6e");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(deviceX, deviceY, deviceWidth, deviceHeight, 20);
    ctx.fill();

    ctx.shadowColor = "transparent";

    // Specifications label
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(deviceX + 20, deviceY + 30, deviceWidth - 40, deviceHeight - 60);
    
    ctx.fillStyle = "#1f2937";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Capacity: 20000mAh", deviceX + 30, deviceY + 50);
    ctx.fillText("Input: 5V/2A", deviceX + 30, deviceY + 70);
    ctx.fillText("Output: 5V/3A", deviceX + 30, deviceY + 90);
    ctx.fillText("Model: PB-2024", deviceX + 30, deviceY + 110);
  };

  // Draw Charger front
  const drawChargerFront = (ctx, width, height) => {
    const deviceX = width * 0.35;
    const deviceY = height * 0.25;
    const deviceWidth = width * 0.3;
    const deviceHeight = height * 0.35;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // Main body
    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX, deviceY + deviceHeight);
    gradient.addColorStop(0, "#f8f9fa");
    gradient.addColorStop(1, "#e5e7eb");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(deviceX, deviceY, deviceWidth, deviceHeight, 15);
    ctx.fill();

    ctx.shadowColor = "transparent";

    // Blue accent
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(deviceX, deviceY, deviceWidth, 10);

    // USB ports
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(deviceX + 30, deviceY + 80, 40, 25);
    ctx.fillRect(deviceX + 80, deviceY + 80, 40, 25);

    // Port labels
    ctx.fillStyle = "#0ea5e9";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("USB-C", deviceX + 50, deviceY + 70);
    ctx.fillText("USB-A", deviceX + 100, deviceY + 70);

    // LED indicator
    ctx.shadowColor = "rgba(34, 197, 94, 0.6)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(deviceX + deviceWidth / 2, deviceY + 30, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Specifications
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#6b7280";
    ctx.font = "8px Arial";
    ctx.fillText("65W Fast Charge", deviceX + deviceWidth / 2, deviceY + 50);

    // Prongs
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(deviceX + 40, deviceY + deviceHeight - 5, 15, 20);
    ctx.fillRect(deviceX + deviceWidth - 55, deviceY + deviceHeight - 5, 15, 20);
  };

  // Draw Charger back
  const drawChargerBack = (ctx, width, height) => {
    const deviceX = width * 0.35;
    const deviceY = height * 0.25;
    const deviceWidth = width * 0.3;
    const deviceHeight = height * 0.35;

    ctx.shadowColor = "rgba(14, 165, 233, 0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#d1d5db");
    gradient.addColorStop(1, "#9ca3af");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(deviceX, deviceY, deviceWidth, deviceHeight, 15);
    ctx.fill();

    ctx.shadowColor = "transparent";

    // Specifications label
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(deviceX + 15, deviceY + 20, deviceWidth - 30, deviceHeight - 40);

    ctx.fillStyle = "#1f2937";
    ctx.font = "9px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Input: 100-240V", deviceX + deviceWidth / 2, deviceY + 40);
    ctx.fillText("Output: 20V/3.25A", deviceX + deviceWidth / 2, deviceY + 55);
    ctx.fillText("Total: 65W", deviceX + deviceWidth / 2, deviceY + 70);
    
    // Barcode
    ctx.fillStyle = "#000000";
    for (let i = 0; i < 15; i++) {
      const barWidth = Math.random() > 0.5 ? 2 : 1;
      ctx.fillRect(deviceX + 25 + i * 6, deviceY + 85, barWidth, 20);
    }
  };

  // Draw realistic printer back
  const drawPrinterBack = (ctx, width, height) => {
    const deviceX = width * 0.08;
    const deviceY = height * 0.15;
    const deviceWidth = width * 0.84;
    const deviceHeight = height * 0.65;

    // Back panel
    const gradient = ctx.createLinearGradient(deviceX, deviceY, deviceX + deviceWidth, deviceY + deviceHeight);
    gradient.addColorStop(0, "#4a5568");
    gradient.addColorStop(1, "#2d3748");
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#1a202c";
    ctx.lineWidth = 2;
    ctx.fillRect(deviceX, deviceY, deviceWidth, deviceHeight);
    ctx.strokeRect(deviceX, deviceY, deviceWidth, deviceHeight);

    // Ports and connectors
    const portsY = deviceY + deviceHeight / 2;
    const ports = [
      { x: 20, w: 25, h: 12, label: "USB" },
      { x: 50, w: 20, h: 15, label: "PWR" },
      { x: 75, w: 30, h: 10, label: "ETH" },
    ];
    
    ctx.fillStyle = "#1f2937";
    ports.forEach(port => {
      ctx.fillRect(deviceX + port.x, portsY, port.w, port.h);
      ctx.strokeStyle = "#000000";
      ctx.strokeRect(deviceX + port.x, portsY, port.w, port.h);
    });

    // Ventilation
    ctx.fillStyle = "#1a202c";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 25; col++) {
        ctx.fillRect(deviceX + 30 + col * 8, deviceY + 30 + row * 8, 2, 2);
      }
    }
  };

  // Draw device based on category and view
  const drawDevice = (canvas, view) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Blue gradient background for modern look
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#f0f9ff");
    bgGradient.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative circles (like in the reference image)
    ctx.fillStyle = "rgba(14, 165, 233, 0.08)";
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.arc(50 + i * 70, 50 + j * 130, 15 + i * 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    if (deviceCategory === "Smartphones") {
      if (view === "front") drawSmartphoneFront(ctx, width, height);
      else drawSmartphoneBack(ctx, width, height);
    } else if (deviceCategory === "Laptops") {
      if (view === "front") drawLaptopFront(ctx, width, height);
      else drawLaptopBack(ctx, width, height);
    } else if (deviceCategory === "Tablets") {
      if (view === "front") drawTabletFront(ctx, width, height);
      else drawTabletBack(ctx, width, height);
    } else if (deviceCategory === "Monitors") {
      if (view === "front") drawMonitorFront(ctx, width, height);
      else drawMonitorBack(ctx, width, height);
    } else if (deviceCategory === "Printers") {
      if (view === "front") drawPrinterFront(ctx, width, height);
      else drawPrinterBack(ctx, width, height);
    } else if (deviceCategory === "SSD") {
      if (view === "front") drawSSDFront(ctx, width, height);
      else drawSSDBack(ctx, width, height);
    } else if (deviceCategory === "PartyBox Speaker") {
      if (view === "front") drawPartyBoxFront(ctx, width, height);
      else drawPartyBoxBack(ctx, width, height);
    } else if (deviceCategory === "Keyboards") {
      if (view === "front") drawKeyboardFront(ctx, width, height);
      else drawKeyboardBack(ctx, width, height);
    } else if (deviceCategory === "Mouse") {
      if (view === "front") drawMouseFront(ctx, width, height);
      else drawMouseBack(ctx, width, height);
    } else if (deviceCategory === "Webcams") {
      if (view === "front") drawWebcamFront(ctx, width, height);
      else drawWebcamBack(ctx, width, height);
    } else if (deviceCategory === "Power Banks") {
      if (view === "front") drawPowerBankFront(ctx, width, height);
      else drawPowerBankBack(ctx, width, height);
    } else if (deviceCategory === "Chargers") {
      if (view === "front") drawChargerFront(ctx, width, height);
      else drawChargerBack(ctx, width, height);
    }

    // Draw damage marks with numbers
    const currentMarks = marks[view] || [];
    currentMarks.forEach((mark) => {
      // Red damage indicator
      ctx.fillStyle = "rgba(239, 68, 68, 0.7)";
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, 15, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Number label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(mark.number.toString(), mark.x, mark.y);
    });
  };

  // LEGACY: Draw devices on canvas (fallback when no static image available)
  useEffect(() => {
    // Only draw on canvas if no static image is available
    if (!frontImageUrl && canvasRefFront?.current) {
      drawDevice(canvasRefFront.current, "front");
    }
    if (!backImageUrl && canvasRefBack?.current) {
      drawDevice(canvasRefBack.current, "back");
    }
  }, [marks, deviceCategory, frontImageUrl, backImageUrl]);

  const canvasRefFront = useRef(null);
  const canvasRefBack = useRef(null);

  const handleCanvasClick = (e, view) => {
    if (!currentDamageDescription.trim()) {
      alert("Please enter a damage description first before marking the location.");
      return;
    }

    const canvas = view === "front" ? canvasRefFront.current : canvasRefBack.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const totalMarks = (marks.front?.length || 0) + (marks.back?.length || 0);
    const nextNumber = totalMarks + 1;

    const newMarks = {
      ...marks,
      [view]: [...(marks[view] || []), { 
        x, 
        y, 
        description: currentDamageDescription,
        number: nextNumber
      }],
    };

    setMarks(newMarks);
    onDamageAreasChange(newMarks);
    setCurrentDamageDescription("");
  };

  const handleClear = () => {
    const cleared = { front: [], back: [] };
    setMarks(cleared);
    onDamageAreasChange(cleared);
  };

  // Delete a single damage mark
  const handleDeleteMark = (markNumber, view) => {
    const viewKey = view.toLowerCase();
    const updatedMarks = {
      ...marks,
      [viewKey]: marks[viewKey].filter(m => m.number !== markNumber)
    };
    
    // Renumber all marks sequentially
    let counter = 1;
    ['front', 'back'].forEach(v => {
      updatedMarks[v] = updatedMarks[v].map(m => ({
        ...m,
        number: counter++
      }));
    });
    
    setMarks(updatedMarks);
    onDamageAreasChange(updatedMarks);
  };

  const allMarks = [
    ...(marks.front || []).map(m => ({ ...m, view: "Front" })),
    ...(marks.back || []).map(m => ({ ...m, view: "Back" }))
  ].sort((a, b) => a.number - b.number);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Device Damage Diagram
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-black text-white">
              Front ({marks.front?.length || 0})
            </Badge>
            <Badge variant="outline">
              Back ({marks.back?.length || 0})
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Device Category</Label>
          <Select value={deviceCategory} onValueChange={setDeviceCategory}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Smartphones">Smartphones</SelectItem>
              <SelectItem value="Laptops">Laptops</SelectItem>
              <SelectItem value="Monitors">Monitors</SelectItem>
              <SelectItem value="Tablets">Tablets</SelectItem>
              <SelectItem value="Printers">Printers</SelectItem>
              <SelectItem value="SSD">SSD</SelectItem>
              <SelectItem value="PartyBox Speaker">PartyBox Speaker</SelectItem>
              <SelectItem value="Keyboards">Keyboards</SelectItem>
              <SelectItem value="Mouse">Mouse</SelectItem>
              <SelectItem value="Webcams">Webcams</SelectItem>
              <SelectItem value="Power Banks">Power Banks</SelectItem>
              <SelectItem value="Chargers">Chargers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Damage Description</Label>
          <Input
            placeholder="Enter damage description (e.g., cracked, dent, scratch)"
            value={currentDamageDescription}
            onChange={(e) => setCurrentDamageDescription(e.target.value)}
            className="mt-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Front View */}
          <div className="space-y-2">
            <div className="bg-black text-white text-center py-2 rounded-t-lg font-semibold text-sm">
              Front View
            </div>
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 shadow-inner">
              <div className="relative mx-auto" style={{ maxWidth: "350px" }}>
                {frontImageUrl ? (
                  // Static image with damage markers overlay
                  <div className="relative">
                    <img
                      ref={imageRefFront}
                      src={frontImageUrl}
                      alt="Device Front View"
                      onClick={(e) => handleImageClick(e, "front")}
                      className="w-full h-auto border-2 border-gray-300 rounded-lg shadow-lg cursor-crosshair"
                      style={{ minHeight: "400px", maxHeight: "600px", objectFit: "contain" }}
                    />
                    {/* Damage markers overlay */}
                    {(marks.front || []).map((mark) => (
                      <div
                        key={mark.number}
                        className="absolute"
                        style={{
                          left: `${mark.x}%`,
                          top: `${mark.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <div className="w-8 h-8 bg-red-500 border-2 border-red-700 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-sm">{mark.number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Fallback to canvas drawing
                  <canvas
                    ref={canvasRefFront}
                    width={350}
                    height={600}
                    onClick={(e) => handleCanvasClick(e, "front")}
                    className="border-2 border-gray-300 rounded-lg mx-auto bg-white shadow-lg cursor-crosshair"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Back View */}
          <div className="space-y-2">
            <div className="bg-white border-2 border-gray-300 text-gray-800 text-center py-2 rounded-t-lg font-semibold text-sm">
              Back View
            </div>
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 shadow-inner">
              <div className="relative mx-auto" style={{ maxWidth: "350px" }}>
                {backImageUrl ? (
                  // Static image with damage markers overlay
                  <div className="relative">
                    <img
                      ref={imageRefBack}
                      src={backImageUrl}
                      alt="Device Back View"
                      onClick={(e) => handleImageClick(e, "back")}
                      className="w-full h-auto border-2 border-gray-300 rounded-lg shadow-lg cursor-crosshair"
                      style={{ minHeight: "400px", maxHeight: "600px", objectFit: "contain" }}
                    />
                    {/* Damage markers overlay */}
                    {(marks.back || []).map((mark) => (
                      <div
                        key={mark.number}
                        className="absolute"
                        style={{
                          left: `${mark.x}%`,
                          top: `${mark.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <div className="w-8 h-8 bg-red-500 border-2 border-red-700 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-sm">{mark.number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Fallback to canvas drawing
                  <canvas
                    ref={canvasRefBack}
                    width={350}
                    height={600}
                    onClick={(e) => handleCanvasClick(e, "back")}
                    className="border-2 border-gray-300 rounded-lg mx-auto bg-white shadow-lg cursor-crosshair"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {allMarks.length > 0 && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Damage Locations</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleClear}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </div>
            <div className="space-y-1">
              {allMarks.map((mark) => (
                <div key={mark.number} className="flex items-center gap-2 text-sm hover:bg-gray-100 p-2 rounded">
                  <Badge variant="destructive" className="w-6 h-6 flex items-center justify-center p-0 flex-shrink-0">
                    {mark.number}
                  </Badge>
                  <span className="text-gray-700 flex-1">{mark.description}</span>
                  <span className="text-gray-500 text-xs">({mark.view})</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMark(mark.number, mark.view)}
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center">
          Enter damage description above, then click on the diagram to mark the location.
        </p>
      </CardContent>
    </Card>
  );
}