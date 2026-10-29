"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function TableScene({ occupied, activeSlot, reducedMotion, enabled }: {
 occupied: boolean[][]; activeSlot: number; reducedMotion: boolean; enabled: boolean;
}) {
 const host = useRef<HTMLDivElement>(null);
 const state = useRef({ occupied, activeSlot, reducedMotion });
 const [supported, setSupported] = useState(true);
 useEffect(() => { state.current = { occupied, activeSlot, reducedMotion }; }, [occupied, activeSlot, reducedMotion]);
 useEffect(() => {
  if (!host.current || !enabled) return;
  const element = host.current;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
  catch { setSupported(false); return; }
  setSupported(true);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 2, -2, 0.1, 40);
  camera.position.set(0, 0, 14);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  element.appendChild(renderer.domElement);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const group = new THREE.Group(); scene.add(group);
  scene.add(new THREE.HemisphereLight(0xe9e4d5, 0x12181e, 2.3));
  const light = new THREE.DirectionalLight(0xffdfac, 2.5); light.position.set(-3, 4, 8); scene.add(light);
  const rim = new THREE.DirectionalLight(0x91bbc5, 1.1); rim.position.set(5, -3, 5); scene.add(rim);
  const material = (color: number, metalness = 0) => {
   const result = new THREE.MeshStandardMaterial({ color, roughness: .78, metalness }); materials.push(result); return result;
  };
  const slate = material(0x263637), edge = material(0x4a4940, .35), inset = material(0x142326);
  const sides = [material(0x38685d, .1), material(0x78503a, .1)];
  const rings = [material(0x779a84, .45), material(0xbb9770, .45)];
  function slab(width: number, height: number, depth: number, mat: THREE.Material, radius = .1) {
   const w = width / 2, h = height / 2;
   const shape = new THREE.Shape();
   shape.moveTo(-w + radius, -h); shape.lineTo(w - radius, -h);
   shape.quadraticCurveTo(w, -h, w, -h + radius); shape.lineTo(w, h - radius);
   shape.quadraticCurveTo(w, h, w - radius, h); shape.lineTo(-w + radius, h);
   shape.quadraticCurveTo(-w, h, -w, h - radius); shape.lineTo(-w, -h + radius);
   shape.quadraticCurveTo(-w, -h, -w + radius, -h);
   const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025, curveSegments: 4 });
   geometries.push(geometry); return new THREE.Mesh(geometry, mat);
  }
  const table = slab(9.7, 3.85, .15, edge, .3); table.position.z = -.4; group.add(table);
  const felt = slab(9.5, 3.66, .07, slate, .27); felt.position.z = -.17; group.add(felt);
  const wells: THREE.Mesh[] = [], tokens: THREE.Mesh[] = [];
  for (let row = 0; row < 2; row++) for (let slot = 0; slot < 5; slot++) {
   const x = (slot - 2) * 1.73, y = row === 0 ? .89 : -.89;
   const well = slab(1.20, 1.62, .02, inset); well.position.set(x, y, -.015); group.add(well); wells.push(well);
   const token = slab(1.10, 1.50, .06, sides[row]); token.position.set(x, y, .03); group.add(token); tokens.push(token);
  }
  const center = slab(8.75, .014, .008, edge, .006); center.position.set(0, 0, .005); group.add(center);
  const gemGeometry = new THREE.OctahedronGeometry(.09); geometries.push(gemGeometry);
  const gem = new THREE.Mesh(gemGeometry, rings[1]); gem.position.set(0, 0, .12); group.add(gem);
  const sparks: THREE.Mesh[] = [];
  const sparkGeometry = new THREE.SphereGeometry(.027, 6, 6); geometries.push(sparkGeometry);
  for (let i = 0; i < 14; i++) { const spark = new THREE.Mesh(sparkGeometry, rings[i % 2]); spark.visible = false; sparks.push(spark); group.add(spark); }
  const resize = () => {
   const width = element.clientWidth, height = element.clientHeight;
   if (!width || !height) return;
   renderer.setSize(width, height);
   // Match the five DOM columns without applying perspective to readable text.
   camera.left = -5; camera.right = 5; camera.top = 2.1; camera.bottom = -2.1; camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(element); resize();
  let lastSlot = -1, started = 0;
  function render(now: number) {
   const current = state.current;
   const calm = current.reducedMotion || motion.matches;
   if (document.hidden) return;
   for (let i = 0; i < 10; i++) {
    tokens[i].visible = current.occupied[Math.floor(i / 5)]?.[i % 5] ?? false;
    const target = i % 5 === current.activeSlot ? .13 : .03;
    tokens[i].position.z = calm ? target : THREE.MathUtils.lerp(tokens[i].position.z, target, .14);
   }
   if (current.activeSlot !== lastSlot) { lastSlot = current.activeSlot; started = now; }
   const progress = (now - started) / 650;
   sparks.forEach((spark, i) => {
    spark.visible = !calm && lastSlot >= 0 && lastSlot < 5 && progress < 1;
    if (!spark.visible) return;
    const t = Math.min(1, progress + i * .015);
    spark.position.set((lastSlot - 2) * 1.73 + Math.sin(i * 2.4) * .13 * Math.sin(t * Math.PI), (i % 2 ? 1 : -1) * (.7 - t * 1.4), .24 + Math.sin(t * Math.PI) * .3);
   });
   gem.rotation.z = calm ? Math.PI / 4 : now * .00015;
   renderer.render(scene, camera);
  }
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const updateLoop = () => {
   renderer.setAnimationLoop(null);
   if (document.hidden) return;
   if (motion.matches || state.current.reducedMotion) render(performance.now());
   else renderer.setAnimationLoop(render);
  };
  // Render low-cost static frames when system animation preferences demand it.
  // Prop changes are observed by the render loop; reduced motion still updates the occupied wells.
  const staticTimer = window.setInterval(() => { if (motion.matches || state.current.reducedMotion) render(performance.now()); }, 150);
  document.addEventListener("visibilitychange", updateLoop); motion.addEventListener("change", updateLoop); updateLoop();
  return () => {
   window.clearInterval(staticTimer); observer.disconnect();
   document.removeEventListener("visibilitychange", updateLoop); motion.removeEventListener("change", updateLoop);
   renderer.setAnimationLoop(null); geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
   renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  };
 }, [enabled, reducedMotion]);
 return <div className={"mock-table-canvas" + (!supported || !enabled ? " canvas-fallback" : "")} ref={host} aria-hidden="true" />;
}
