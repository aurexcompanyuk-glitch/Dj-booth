import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SCENES = [
  { cam:{x:7,y:2.2,z:5}, look:{x:0,y:0.7,z:0}, label:null, heading:'THE ART\nOF THE\nPERFECT\nFINISH.', sub:'Scroll to explore' },
  { cam:{x:0.5,y:1.8,z:8}, look:{x:0,y:0.7,z:0}, label:'01 — PAINT CORRECTION', heading:'SWIRL\nFREE.', sub:'Machine polishing under 4000K studio lighting' },
  { cam:{x:-8,y:2.0,z:3}, look:{x:0,y:0.7,z:0}, label:'02 — CERAMIC COATING', heading:'9H\nHARD\nNESS.', sub:'5-year hydrophobic protection' },
  { cam:{x:-6,y:1.4,z:-4}, look:{x:0,y:0.7,z:0}, label:'03 — PPF', heading:'INVIS\nIBLE\nSHIELD.', sub:'Self-healing TPU film' },
  { cam:{x:2,y:1.0,z:-7}, look:{x:0,y:0.5,z:0}, label:'04 — INTERIOR', heading:'PURE\nINSIDE.', sub:'Leather · deep clean · odour treatment' },
  { cam:{x:7,y:2.2,z:5}, look:{x:0,y:0.7,z:0}, label:null, heading:'BOOK\nNOW.', sub:null },
];

function buildCar() {
  const carGroup = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xcc2200,
    metalness: 0.7,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  // Lower body
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 1.9), bodyMat);
  lowerBody.position.set(0, 0.6, 0);
  lowerBody.castShadow = true;
  carGroup.add(lowerBody);

  // Upper cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.75), bodyMat);
  cabin.position.set(0, 1.15, -0.1);
  cabin.castShadow = true;
  carGroup.add(cabin);

  // Front hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.85), bodyMat);
  hood.position.set(1.5, 0.95, 0);
  hood.rotation.x = 0.08;
  hood.castShadow = true;
  carGroup.add(hood);

  // Rear deck
  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.85), bodyMat);
  rearDeck.position.set(-1.6, 0.95, 0);
  rearDeck.castShadow = true;
  carGroup.add(rearDeck);

  // Windows
  const windowMat = new THREE.MeshPhysicalMaterial({
    color: 0x88aacc,
    transmission: 0.9,
    transparent: true,
    opacity: 0.35,
    roughness: 0,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  // Windscreen
  const windscreen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), windowMat);
  windscreen.position.set(0.7, 1.52, -0.05);
  windscreen.rotation.x = -Math.PI / 6;
  carGroup.add(windscreen);

  // Rear window
  const rearWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), windowMat);
  rearWindow.position.set(-0.65, 1.52, -0.05);
  rearWindow.rotation.x = Math.PI / 6;
  carGroup.add(rearWindow);

  // Side windows
  const sideWinGeo = new THREE.PlaneGeometry(1.0, 0.45);
  const leftWindow = new THREE.Mesh(sideWinGeo, windowMat);
  leftWindow.position.set(0, 1.2, 0.88);
  leftWindow.rotation.y = Math.PI / 2;
  carGroup.add(leftWindow);

  const rightWindow = new THREE.Mesh(sideWinGeo, windowMat);
  rightWindow.position.set(0, 1.2, -0.88);
  rightWindow.rotation.y = -Math.PI / 2;
  carGroup.add(rightWindow);

  // Wheels
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.1 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 1 });

  const wheelPositions = [
    { x: -1.5, y: 0.38, z: 0.95 },
    { x: -1.5, y: 0.38, z: -0.95 },
    { x: 1.4, y: 0.38, z: 0.95 },
    { x: 1.4, y: 0.38, z: -0.95 },
  ];

  wheelPositions.forEach(pos => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(pos.x, pos.y, pos.z);

    // Tyre
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 32), tyreMat);
    tyre.rotation.x = Math.PI / 2;
    tyre.castShadow = true;
    wheelGroup.add(tyre);

    // Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 16), rimMat);
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);

    // 5 spokes
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.05), spokeMat);
      spoke.rotation.z = i * Math.PI * 2 / 5;
      wheelGroup.add(spoke);
    }

    carGroup.add(wheelGroup);
  });

  // Headlights
  const headlightMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffee,
    emissive: 0xffffcc,
    emissiveIntensity: 2.0,
  });
  const headlightGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16);

  [-0.65, 0.65].forEach(zPos => {
    const hl = new THREE.Mesh(headlightGeo, headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(2.12, 0.7, zPos);
    carGroup.add(hl);
  });

  // Taillights
  const taillightMat = new THREE.MeshPhysicalMaterial({
    color: 0xff1100,
    emissive: 0xff2200,
    emissiveIntensity: 1.5,
  });
  const taillightGeo = new THREE.BoxGeometry(0.35, 0.12, 0.08);

  [-0.65, 0.65].forEach(zPos => {
    const tl = new THREE.Mesh(taillightGeo, taillightMat);
    tl.position.set(-2.12, 0.7, zPos);
    carGroup.add(tl);
  });

  // Chrome trim
  const chromeMat = new THREE.MeshPhysicalMaterial({
    color: 0xdddddd,
    metalness: 1,
    roughness: 0.05,
  });

  // Front bumper
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 1.9), chromeMat);
  frontBumper.position.set(2.15, 0.45, 0);
  carGroup.add(frontBumper);

  // Rear bumper
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 1.9), chromeMat);
  rearBumper.position.set(-2.15, 0.45, 0);
  carGroup.add(rearBumper);

  // Side skirts
  const skirtGeo = new THREE.BoxGeometry(3.0, 0.12, 0.06);
  const leftSkirt = new THREE.Mesh(skirtGeo, chromeMat);
  leftSkirt.position.set(0, 0.36, 0.98);
  carGroup.add(leftSkirt);

  const rightSkirt = new THREE.Mesh(skirtGeo, chromeMat);
  rightSkirt.position.set(0, 0.36, -0.98);
  carGroup.add(rightSkirt);

  return carGroup;
}

export default function AppCar3() {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const frameRef = useRef(null);
  const camTargetRef = useRef({ x: 7, y: 2.2, z: 5 });
  const camCurrentRef = useRef({ x: 7, y: 2.2, z: 5 });
  const lookTargetRef = useRef({ x: 0, y: 0.7, z: 0 });
  const lookCurrentRef = useRef({ x: 0, y: 0.7, z: 0 });
  const clockRef = useRef(new THREE.Clock());

  const [sceneIdx, setSceneIdx] = useState(0);
  const [formData, setFormData] = useState({ name: '', phone: '', service: 'Paint Correction' });

  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H);
    renderer.setClearColor(0xf5f2ee);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f2ee);

    // Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv).texture;
    scene.environment = envTexture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Camera
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(7, 2.2, 5);
    camera.lookAt(0, 0.7, 0);
    cameraRef.current = camera;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xfff5e8, 4);
    dirLight1.position.set(8, 12, 6);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xe8f0ff, 2);
    dirLight2.position.set(-10, 6, -4);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff, 3);
    dirLight3.position.set(0, 8, -14);
    scene.add(dirLight3);

    const pointLight = new THREE.PointLight(0xffffee, 2, 8);
    pointLight.position.set(0, 3, 5);
    scene.add(pointLight);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0xe8e3dc, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Shadow circle
    const shadowCircle = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 64),
      new THREE.MeshBasicMaterial({ color: 0xc8c0b8, transparent: true, opacity: 0.3 })
    );
    shadowCircle.rotation.x = -Math.PI / 2;
    shadowCircle.position.y = 0.001;
    scene.add(shadowCircle);

    // Car
    const car = buildCar();
    scene.add(car);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const elapsed = clockRef.current.getElapsedTime();

      // Lerp camera position
      const lerp = 0.05;
      camCurrentRef.current.x += (camTargetRef.current.x - camCurrentRef.current.x) * lerp;
      camCurrentRef.current.y += (camTargetRef.current.y - camCurrentRef.current.y) * lerp;
      camCurrentRef.current.z += (camTargetRef.current.z - camCurrentRef.current.z) * lerp;

      lookCurrentRef.current.x += (lookTargetRef.current.x - lookCurrentRef.current.x) * lerp;
      lookCurrentRef.current.y += (lookTargetRef.current.y - lookCurrentRef.current.y) * lerp;
      lookCurrentRef.current.z += (lookTargetRef.current.z - lookCurrentRef.current.z) * lerp;

      // Idle breathing
      const breathY = Math.sin(elapsed * 0.6) * 0.04;

      camera.position.set(
        camCurrentRef.current.x,
        camCurrentRef.current.y + breathY,
        camCurrentRef.current.z
      );
      camera.lookAt(lookCurrentRef.current.x, lookCurrentRef.current.y, lookCurrentRef.current.z);

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const W2 = mount.clientWidth;
      const H2 = mount.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      envTexture.dispose();
      if (mount && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      const idx = Math.min(
        Math.floor(window.scrollY / window.innerHeight),
        SCENES.length - 1
      );
      setSceneIdx(idx);
      const s = SCENES[idx];
      camTargetRef.current = { ...s.cam };
      lookTargetRef.current = { ...s.look };
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scene = SCENES[sceneIdx];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Tall scroll container */}
      <div style={{ height: `${SCENES.length * 100}vh`, position: 'relative' }}>
        {/* Sticky canvas mount */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
          }}
        >
          <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

          {/* Nav */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 40px',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                color: '#111111',
                fontWeight: 900,
                fontSize: '18px',
                letterSpacing: '-0.02em',
              }}
            >
              DETAILPRO
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {SCENES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: i === sceneIdx ? '#111111' : 'rgba(0,0,0,0.2)',
                    transition: 'background 0.3s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Text overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '80px',
              left: '40px',
              maxWidth: '500px',
              pointerEvents: 'none',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={sceneIdx}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {scene.label && (
                  <div
                    style={{
                      color: '#888888',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      letterSpacing: '0.12em',
                      marginBottom: '12px',
                    }}
                  >
                    {scene.label}
                  </div>
                )}
                <h1
                  style={{
                    color: '#111111',
                    fontWeight: 900,
                    fontSize: 'clamp(52px, 8vw, 110px)',
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    margin: 0,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {scene.heading}
                </h1>
                {scene.sub && (
                  <p
                    style={{
                      color: '#555555',
                      fontSize: 'clamp(13px, 1.2vw, 16px)',
                      marginTop: '16px',
                      marginBottom: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {scene.sub}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Booking panel — scene 5 */}
          <AnimatePresence>
            {sceneIdx === 5 && (
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 32 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute',
                  bottom: '80px',
                  right: '40px',
                  background: '#ffffff',
                  padding: '32px',
                  width: '280px',
                  pointerEvents: 'all',
                }}
              >
                <h3
                  style={{
                    color: '#111111',
                    fontWeight: 900,
                    fontSize: '18px',
                    margin: '0 0 24px 0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Book a detail
                </h3>
                <input
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  style={{
                    display: 'block',
                    width: '100%',
                    border: 'none',
                    borderBottom: '1px solid #cccccc',
                    padding: '8px 0',
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: '#111111',
                    outline: 'none',
                    background: 'transparent',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  style={{
                    display: 'block',
                    width: '100%',
                    border: 'none',
                    borderBottom: '1px solid #cccccc',
                    padding: '8px 0',
                    marginBottom: '16px',
                    fontSize: '14px',
                    color: '#111111',
                    outline: 'none',
                    background: 'transparent',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <select
                  value={formData.service}
                  onChange={e => setFormData(f => ({ ...f, service: e.target.value }))}
                  style={{
                    display: 'block',
                    width: '100%',
                    border: 'none',
                    borderBottom: '1px solid #cccccc',
                    padding: '8px 0',
                    marginBottom: '24px',
                    fontSize: '14px',
                    color: '#111111',
                    outline: 'none',
                    background: 'transparent',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                >
                  <option>Paint Correction</option>
                  <option>Ceramic Coating</option>
                  <option>PPF</option>
                  <option>Interior Detail</option>
                  <option>Full Package</option>
                </select>
                <button
                  onClick={() => alert(`Booking received for ${formData.name}`)}
                  style={{
                    display: 'block',
                    width: '100%',
                    background: '#111111',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  SUBMIT REQUEST
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
