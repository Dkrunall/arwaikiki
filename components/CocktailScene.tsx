'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  liquidColor?: string;
  modelUrl?: string;
}

export default function CocktailScene({ liquidColor = '#c29a53', modelUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ──────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Scene / Camera ────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.4, 4.2);

    // ── Lights ────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xfff5e0, 0.8));

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xc29a53, 0.5);
    rim.position.set(-3, -1, -3);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffd6b0, 0.3);
    fill.position.set(0, -3, 2);
    scene.add(fill);

    // ── Materials ─────────────────────────────────────────────────
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd0f0ff,
      transparent: true,
      opacity: 0.22,
      roughness: 0.04,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.5,
      side: THREE.DoubleSide,
    });

    const liqColor = new THREE.Color(liquidColor);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: liqColor,
      transparent: true,
      opacity: 0.78,
      roughness: 0.08,
      metalness: 0.05,
    });

    const stemMat = new THREE.MeshPhysicalMaterial({
      color: 0xe8f8ff,
      transparent: true,
      opacity: 0.28,
      roughness: 0.04,
      side: THREE.DoubleSide,
    });

    const garnishMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(liquidColor).offsetHSL(0.05, 0.1, 0.15),
      roughness: 0.3,
      metalness: 0.1,
    });

    // ── Group ─────────────────────────────────────────────────────
    const group = new THREE.Group();
    group.position.y = -0.35;
    scene.add(group);

    // Bowl (martini glass shape via LatheGeometry)
    const bowlPts = [
      new THREE.Vector2(0.02, -0.52),
      new THREE.Vector2(0.14, -0.40),
      new THREE.Vector2(0.38, -0.18),
      new THREE.Vector2(0.62,  0.08),
      new THREE.Vector2(0.88,  0.32),
      new THREE.Vector2(1.05,  0.50),
      new THREE.Vector2(1.08,  0.56),
    ];
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 64), glassMat);
    bowl.position.y = 0.85;
    bowl.castShadow = true;
    group.add(bowl);

    // Liquid surface — sits inside bowl ~70% full
    const liqPts = [
      new THREE.Vector2(0.01, -0.50),
      new THREE.Vector2(0.13, -0.38),
      new THREE.Vector2(0.36, -0.16),
      new THREE.Vector2(0.60,  0.10),
      new THREE.Vector2(0.82,  0.30),
    ];
    const liquid = new THREE.Mesh(new THREE.LatheGeometry(liqPts, 64), liquidMat);
    liquid.position.y = 0.85;
    group.add(liquid);

    // Liquid top cap (flat disc so liquid looks filled)
    const capGeo = new THREE.CircleGeometry(0.82, 48);
    const cap = new THREE.Mesh(capGeo, liquidMat);
    cap.rotation.x = -Math.PI / 2;
    cap.position.set(0, 1.15, 0);
    group.add(cap);

    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 1.05, 20),
      stemMat,
    );
    stem.position.y = 0.27;
    group.add(stem);

    // Base foot
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.5, 0.065, 40),
      stemMat,
    );
    base.position.y = -0.26;
    group.add(base);

    // Garnish (olive / cherry on rim)
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), garnishMat);
    cherry.position.set(0.88, 1.44, 0.0);
    group.add(cherry);

    // Tiny stick
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8),
      new THREE.MeshPhysicalMaterial({ color: 0xc29a53, roughness: 0.4 }),
    );
    stick.position.set(0.88, 1.26, 0);
    group.add(stick);

    // ── Drag to rotate ────────────────────────────────────────────
    let autoRotate = true;
    let rotY = 0;
    let prevX = 0;

    const onDown = (x: number) => { autoRotate = false; prevX = x; };
    const onMove = (x: number) => { rotY += (x - prevX) * 0.012; prevX = x; };
    const onUp   = () => { /* keep manual angle */ };

    const md = (e: MouseEvent) => onDown(e.clientX);
    const mm = (e: MouseEvent) => onMove(e.clientX);
    const mu = () => onUp();
    const td = (e: TouchEvent) => onDown(e.touches[0].clientX);
    const tm = (e: TouchEvent) => onMove(e.touches[0].clientX);

    canvas.addEventListener('mousedown', md);
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    canvas.addEventListener('touchstart', td, { passive: true });
    canvas.addEventListener('touchmove', tm, { passive: true });

    // ── Resize ────────────────────────────────────────────────────
    const resize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Animate ───────────────────────────────────────────────────
    let raf: number;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (autoRotate) rotY += 0.007;
      group.rotation.y = rotY;
      // gentle float
      group.position.y = -0.35 + Math.sin(Date.now() * 0.0012) * 0.04;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousedown', md);
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
      canvas.removeEventListener('touchstart', td);
      canvas.removeEventListener('touchmove', tm);
      renderer.dispose();
    };
  }, [liquidColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
    />
  );
}
