"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function FullscreenLoader() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Loading Text Animation (React-based)
    const text = "Đang xử lý ảnh...";
    const loadingEl = containerRef.current?.querySelector(".loading");

    if (loadingEl) {
      const textContainer = document.createElement("div");
      loadingEl.innerHTML = "";
      loadingEl.appendChild(textContainer);

      for (let i = 0; i < text.length; i++) {
        const span = document.createElement("span");
        span.innerText = text[i];
        span.style.setProperty("--x", `${i * 10}px`);
        span.style.setProperty("--move-y", `${Math.random() * 20}px`);
        span.style.setProperty("--move-y-s", `${Math.random() * 40}px`);
        span.style.setProperty("--delay", `${i * 20}ms`);
        textContainer.appendChild(span);
      }

      loadingEl.classList.add("start");
    }

    // Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.z = 160;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current?.appendChild(renderer.domElement);

    const particleCount = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
      colors[i] = Math.random();
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const sprite = new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/sprites/circle.png"
    );
    const material = new THREE.PointsMaterial({
      size: 1.1,
      map: sprite,
      alphaTest: 0.5,
      transparent: true,
      vertexColors: true,
      opacity: 0.85,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const animate = () => {
      requestAnimationFrame(animate);
      particles.rotation.y += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      id="loader"
      ref={containerRef}
      className="fixed inset-0 z-[1000] bg-black text-white"
    >
      <div className="wrap w-full h-full flex items-center justify-center">
        <div className="loading text-xl font-bold">Đang xử lý ảnh...</div>
      </div>
    </div>
  );
}
