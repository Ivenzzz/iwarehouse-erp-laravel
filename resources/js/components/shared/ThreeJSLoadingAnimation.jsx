import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function ThreeJSLoadingAnimation({ message = "Creating...", progress = 0 }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cubesRef = useRef([]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(400, 300);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 1, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Create rotating cubes
    const cubeCount = 5;
    const cubes = [];
    
    for (let i = 0; i < cubeCount; i++) {
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(i / cubeCount, 0.7, 0.6),
        transparent: true,
        opacity: 0.8
      });
      const cube = new THREE.Mesh(geometry, material);
      
      const angle = (i / cubeCount) * Math.PI * 2;
      cube.position.x = Math.cos(angle) * 2;
      cube.position.y = Math.sin(angle) * 2;
      
      scene.add(cube);
      cubes.push(cube);
    }
    cubesRef.current = cubes;

    // Animation loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Rotate each cube
      cubes.forEach((cube, index) => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        // Orbital rotation
        const angle = (index / cubeCount) * Math.PI * 2 + Date.now() * 0.001;
        cube.position.x = Math.cos(angle) * 2;
        cube.position.y = Math.sin(angle) * 2;
        
        // Pulse effect based on progress
        const scale = 1 + Math.sin(Date.now() * 0.003 + index) * 0.2;
        cube.scale.set(scale, scale, scale);
      });

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      cubes.forEach(cube => {
        cube.geometry.dispose();
        cube.material.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div ref={mountRef} className="mb-4" />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{message}</p>
      <div className="w-full max-w-md">
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">{progress}%</p>
      </div>
    </div>
  );
}