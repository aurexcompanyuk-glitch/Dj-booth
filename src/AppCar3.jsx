import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

// ─── SCENES ──────────────────────────────────────────────────────────────────
const SCENES = [
  {
    cam: { x: 7,    y: 2.6, z: 5   },
    look: { x: 0, y: 0.5, z: 0 },
    label: null,
    heading: 'THE ART\nOF THE\nPERFECT\nFINISH.',
    sub: 'Scroll to explore',
  },
  {
    cam: { x: 0.5,  y: 2.0, z: 8.5 },
    look: { x: 0, y: 0.5, z: 0 },
    label: '01 — PAINT CORRECTION',
    heading: 'SWIRL\nFREE.',
    sub: 'Machine polishing under 4000K studio lighting',
  },
  {
    cam: { x: -8,   y: 2.2, z: 3   },
    look: { x: 0, y: 0.5, z: 0 },
    label: '02 — CERAMIC COATING',
    heading: '9H\nHARD\nNESS.',
    sub: '5-year hydrophobic protection',
  },
  {
    cam: { x: -7,   y: 1.5, z: -4  },
    look: { x: 0, y: 0.4, z: 0 },
    label: '03 — PAINT PROTECTION FILM',
    heading: 'INVIS\nIBLE\nSHIELD.',
    sub: 'Self-healing TPU film',
  },
  {
    cam: { x: 3,    y: 1.2, z: -8  },
    look: { x: 0, y: 0.5, z: 0 },
    label: '04 — INTERIOR DETAIL',
    heading: 'PURE\nINSIDE.',
    sub: 'Leather · deep clean · odour treatment',
  },
  {
    cam: { x: 7,    y: 2.6, z: 5   },
    look: { x: 0, y: 0.5, z: 0 },
    label: null,
    heading: 'BOOK\nNOW.',
    sub: null,
  },
]

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function AppCar3() {
  const mountRef = useRef(null)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sent, setSent] = useState(false)
  const totalScenes = SCENES.length

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    let W = el.clientWidth, H = el.clientHeight
    let raf
    let disposed = false

    // ── RENDERER ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    // ── SCENE ─────────────────────────────────────────────────────────────────
    const threeScene = new THREE.Scene()
    threeScene.background = new THREE.Color(0xf0ede8)
    threeScene.fog = new THREE.Fog(0xe8e4df, 30, 80)

    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 120)
    camera.position.set(SCENES[0].cam.x, SCENES[0].cam.y, SCENES[0].cam.z)

    // ── FLOOR ─────────────────────────────────────────────────────────────────
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xe8e4df, roughness: 0.8, metalness: 0 })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    threeScene.add(floor)

    // ── LIGHTS ────────────────────────────────────────────────────────────────
    threeScene.add(new THREE.AmbientLight(0xffffff, 1.5))

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 3)
    keyLight.position.set(6, 10, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    keyLight.shadow.bias = -0.002
    keyLight.shadow.camera.left = -10; keyLight.shadow.camera.right = 10
    keyLight.shadow.camera.top = 7; keyLight.shadow.camera.bottom = -4
    threeScene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xe8f0ff, 1.5)
    fillLight.position.set(-8, 4, -3)
    threeScene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 2)
    rimLight.position.set(0, 5, -12)
    threeScene.add(rimLight)

    // ── PMREM GENERATOR ───────────────────────────────────────────────────────
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()

    // ── CAMERA LERP STATE ─────────────────────────────────────────────────────
    const camPos = new THREE.Vector3(SCENES[0].cam.x, SCENES[0].cam.y, SCENES[0].cam.z)
    const camTgt = new THREE.Vector3(SCENES[0].look.x, SCENES[0].look.y, SCENES[0].look.z)
    const tPos = new THREE.Vector3()
    const tTgt = new THREE.Vector3()
    const clock = new THREE.Clock()
    let curScene = 0

    // ── RENDER LOOP (starts immediately, no model needed for camera) ───────────
    function animate() {
      if (disposed) return
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      const max = (totalScenes - 1) * window.innerHeight
      const scroll = Math.max(0, Math.min(1, window.scrollY / Math.max(1, max)))
      const raw = scroll * (SCENES.length - 1)
      const iA = Math.floor(raw)
      const iB = Math.min(iA + 1, SCENES.length - 1)
      const frac = raw - iA
      const ease = frac < 0.5 ? 2 * frac * frac : -1 + (4 - 2 * frac) * frac

      if (iA !== curScene) { curScene = iA; setSceneIdx(iA) }

      const sA = SCENES[iA], sB = SCENES[iB]
      tPos.set(
        sA.cam.x + (sB.cam.x - sA.cam.x) * ease,
        sA.cam.y + (sB.cam.y - sA.cam.y) * ease,
        sA.cam.z + (sB.cam.z - sA.cam.z) * ease,
      )
      tTgt.set(
        sA.look.x + (sB.look.x - sA.look.x) * ease,
        sA.look.y + (sB.look.y - sA.look.y) * ease,
        sA.look.z + (sB.look.z - sA.look.z) * ease,
      )

      // Gentle breathing
      tPos.x += Math.sin(t * 0.35) * 0.06
      tPos.y += Math.sin(t * 0.28) * 0.04

      camPos.lerp(tPos, 0.05)
      camTgt.lerp(tTgt, 0.05)
      camera.position.copy(camPos)
      camera.lookAt(camTgt)

      renderer.render(threeScene, camera)
    }
    animate()

    // ── SCROLL LISTENER ───────────────────────────────────────────────────────
    const onScroll = () => {
      const max = (totalScenes - 1) * window.innerHeight
      const s = Math.max(0, Math.min(1, window.scrollY / Math.max(1, max)))
      const idx = Math.min(Math.floor(s * (SCENES.length - 0.001)), SCENES.length - 1)
      setSceneIdx(idx)
    }
    window.addEventListener('scroll', onScroll)

    // ── RESIZE ────────────────────────────────────────────────────────────────
    const onResize = () => {
      W = el.clientWidth; H = el.clientHeight
      renderer.setSize(W, H)
      camera.aspect = W / H
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    // ── LOAD HDRI ─────────────────────────────────────────────────────────────
    let envMap = null
    let carGroup = null

    const rgbeLoader = new RGBELoader()
    rgbeLoader.load(
      './textures/venice_sunset_1k.hdr',
      (hdrTexture) => {
        if (disposed) { hdrTexture.dispose(); return }
        hdrTexture.mapping = THREE.EquirectangularReflectionMapping
        envMap = pmrem.fromEquirectangular(hdrTexture).texture
        hdrTexture.dispose()

        // Use env map for scene environment but keep our solid bg
        threeScene.environment = envMap

        // If car already loaded, apply materials now
        if (carGroup) applyEnvMap(carGroup, envMap)
      },
      undefined,
      () => {
        if (disposed) return
        const fallback = new THREE.Scene()
        fallback.add(Object.assign(new THREE.Mesh(
          new THREE.SphereGeometry(50, 16, 8),
          new THREE.MeshBasicMaterial({ color: 0xf0ede8, side: THREE.BackSide })
        )))
        envMap = pmrem.fromScene(fallback).texture
        threeScene.environment = envMap
        if (carGroup) applyEnvMap(carGroup, envMap)
      }
    )

    // ── LOAD GLTF ─────────────────────────────────────────────────────────────
    const gltfLoader = new GLTFLoader()
    gltfLoader.load(
      './models/ferrari.glb',
      (gltf) => {
        if (disposed) return
        const model = gltf.scene

        // Centre horizontally, sit on floor (y=0)
        const box = new THREE.Box3().setFromObject(model)
        const centre = box.getCenter(new THREE.Vector3())
        const min = box.min
        model.position.x -= centre.x
        model.position.z -= centre.z
        model.position.y -= min.y  // sit wheels on y=0 floor

        // Wrap in a group so we can manipulate easily
        carGroup = new THREE.Group()
        carGroup.add(model)
        threeScene.add(carGroup)

        // Enable shadows on all meshes
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true
            node.receiveShadow = true
          }
        })

        // Apply env map to existing materials (don't replace them)
        if (envMap) applyEnvMap(carGroup, envMap)

        setLoading(false)
      },
      undefined,
      (err) => {
        console.error('Ferrari GLTF load error:', err)
        if (!disposed) setLoading(false)
      }
    )

    function applyEnvMap(group, env) {
      group.traverse((node) => {
        if (!node.isMesh) return
        if (node.material) {
          node.material.envMap = env
          node.material.envMapIntensity = 1.5
          node.material.needsUpdate = true
        }
      })
    }

    // ── CLEANUP ───────────────────────────────────────────────────────────────
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      pmrem.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  const s = SCENES[sceneIdx]
  const isBook = sceneIdx === SCENES.length - 1

  return (
    <>
      {/* Scroll container — one screen per scene */}
      <div style={{ height: `${SCENES.length * 100}vh` }}>

        {/* Sticky full-screen canvas */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#f0ede8' }}>

          {/* 3D canvas */}
          <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

          {/* Loading overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  position: 'absolute', inset: 0, zIndex: 50,
                  background: '#f0ede8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500,
                  color: '#888888', letterSpacing: '0.25em', textTransform: 'uppercase'
                }}>
                  Loading…
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* NAV */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
            padding: '1.4rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: 15,
              color: '#0d0d0d', letterSpacing: '-0.02em'
            }}>
              VELVET<span style={{ color: '#888' }}>.</span>
            </div>
            <a href="tel:08001234567" style={{
              fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              color: '#444', textDecoration: 'none',
              border: '1px solid rgba(0,0,0,0.2)', padding: '0.55rem 1.2rem'
            }}>
              Call Now
            </a>
          </div>

          {/* Scene counter — top right */}
          <div style={{
            position: 'absolute', top: '7.5vh', right: '2.5vw', zIndex: 12,
            fontFamily: 'monospace', fontSize: 10, color: '#888888', letterSpacing: '0.18em'
          }}>
            {String(sceneIdx + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')}
          </div>

          {/* Scene text — bottom left */}
          <AnimatePresence mode="wait">
            <motion.div
              key={sceneIdx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                bottom: '9vh', left: '4vw',
                zIndex: 12,
                maxWidth: '55vw',
                pointerEvents: isBook ? 'all' : 'none'
              }}
            >
              {!isBook ? (
                <>
                  {s.label && (
                    <div style={{
                      fontFamily: 'monospace', fontSize: 10, color: '#888888',
                      letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: '1.2rem'
                    }}>
                      {s.label}
                    </div>
                  )}

                  {s.heading.split('\n').map((line, i) => (
                    <div key={i} style={{ overflow: 'hidden' }}>
                      <motion.div
                        initial={{ y: '105%' }}
                        animate={{ y: '0%' }}
                        transition={{ duration: 0.85, delay: 0.05 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 'clamp(48px, 8.5vw, 120px)',
                          fontWeight: 900,
                          lineHeight: 0.88,
                          letterSpacing: '-0.04em',
                          color: i % 2 === 0 ? '#0d0d0d' : 'transparent',
                          WebkitTextStroke: i % 2 !== 0 ? '1.5px rgba(0,0,0,0.25)' : 'none',
                        }}
                      >{line}</motion.div>
                    </div>
                  ))}

                  {s.sub && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                      style={{ marginTop: '1.5rem' }}
                    >
                      <div style={{ width: 36, height: 1, background: 'rgba(0,0,0,0.2)', marginBottom: '0.8rem' }} />
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 'clamp(11px, 1vw, 13px)',
                        color: '#555555',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        fontWeight: 400,
                      }}>
                        {s.sub}
                      </p>
                    </motion.div>
                  )}
                </>
              ) : (
                <BookPanel sent={sent} onSend={() => setSent(true)} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* HUD bottom right */}
          <div style={{
            position: 'absolute', bottom: '7vh', right: '2.5vw', zIndex: 12,
            fontFamily: 'monospace', fontSize: 9, color: '#aaaaaa', letterSpacing: '0.15em'
          }}>
            LIVE 3D · SCROLL
          </div>

          {/* Progress dots — right edge */}
          <div style={{
            position: 'absolute', right: '1.8vw', top: '50%', transform: 'translateY(-50%)',
            zIndex: 12, display: 'flex', flexDirection: 'column', gap: '0.6rem'
          }}>
            {SCENES.map((_, i) => (
              <div key={i} style={{
                width: i === sceneIdx ? 6 : 4,
                height: i === sceneIdx ? 6 : 4,
                borderRadius: '50%',
                background: i === sceneIdx ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.18)',
                transition: 'all 0.3s'
              }} />
            ))}
          </div>

        </div>
      </div>
    </>
  )
}

// ─── BOOKING PANEL ────────────────────────────────────────────────────────────
function BookPanel({ sent, onSend }) {
  const inputStyle = {
    background: 'rgba(255,255,255,0.75)',
    border: '1px solid rgba(0,0,0,0.15)',
    padding: '0.8rem 1rem',
    color: '#0d0d0d',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    backdropFilter: 'blur(12px)',
    transition: 'border-color 0.3s',
  }
  const focus = e => e.target.style.borderColor = 'rgba(0,0,0,0.5)'
  const blur  = e => e.target.style.borderColor = 'rgba(0,0,0,0.15)'

  if (sent) return (
    <div style={{
      padding: '2rem',
      background: 'rgba(255,255,255,0.8)',
      border: '1px solid rgba(0,0,0,0.12)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 32, fontWeight: 900, color: '#0d0d0d' }}>Received.</div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#555555', fontWeight: 400, marginTop: 8 }}>
        We will contact you within 2 hours.
      </p>
    </div>
  )

  return (
    <div>
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 'clamp(42px, 7vw, 90px)',
        fontWeight: 900,
        lineHeight: 0.88,
        letterSpacing: '-0.04em',
        color: '#0d0d0d',
        marginBottom: '2rem',
      }}>
        BOOK<br />
        <span style={{ WebkitTextStroke: '1.5px rgba(0,0,0,0.28)', color: 'transparent' }}>NOW.</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxWidth: 420 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
          <input placeholder="Your name" style={inputStyle} onFocus={focus} onBlur={blur} />
          <input placeholder="Phone" style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <input placeholder="Vehicle — make · model · year" style={inputStyle} onFocus={focus} onBlur={blur} />
        <select defaultValue="" style={{ ...inputStyle, color: 'rgba(0,0,0,0.4)' }}>
          <option value="" disabled>Service</option>
          <option>Paint Correction</option>
          <option>Ceramic Coating</option>
          <option>PPF Wrap</option>
          <option>Interior Detail</option>
          <option>Full Package</option>
        </select>
        <motion.button
          whileHover={{ background: 'rgba(0,0,0,0.08)', borderColor: 'rgba(0,0,0,0.7)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onSend}
          style={{
            padding: '0.95rem',
            border: '1px solid rgba(0,0,0,0.35)',
            background: 'rgba(255,255,255,0.6)',
            color: '#0d0d0d',
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s',
            backdropFilter: 'blur(12px)',
          }}>
          Submit Enquiry
        </motion.button>
      </div>
    </div>
  )
}
