import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// Builds a detailed car body from Three.js geometry — side profile silhouette
function buildCar(scene) {
  const carGroup = new THREE.Group()

  // ── ENV MAP ──────────────────────────────────────────────────────────────────
  const pmrem = new THREE.PMREMGenerator(scene.userData.renderer)
  const envScene = new THREE.Scene()
  const envGeo = new THREE.SphereGeometry(50, 32, 16)
  const envMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a1428) },
      botColor: { value: new THREE.Color(0x000205) }
    },
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vP; uniform vec3 topColor,botColor; void main(){ float t=clamp((vP.y+50.)/100.,0.,1.); gl_FragColor=vec4(mix(botColor,topColor,t),1.);}`
  })
  envScene.add(new THREE.Mesh(envGeo, envMat))
  const envMap = pmrem.fromScene(envScene).texture

  // ── MATERIALS ────────────────────────────────────────────────────────────────
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x0a0a0a),
    metalness: 0.9, roughness: 0.08,
    clearcoat: 1.0, clearcoatRoughness: 0.04,
    envMap, envMapIntensity: 2.5,
    reflectivity: 1.0
  })
  const chromeMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xc0c8d0),
    metalness: 1.0, roughness: 0.05,
    clearcoat: 1.0, envMap, envMapIntensity: 3.0
  })
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x1a2a3a),
    metalness: 0, roughness: 0.0,
    transmission: 0.7, transparent: true, opacity: 0.55,
    envMap, envMapIntensity: 1.5
  })
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d0d, roughness: 0.9, metalness: 0
  })
  const rimMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x888fa0),
    metalness: 1.0, roughness: 0.12,
    envMap, envMapIntensity: 2.0
  })
  const lightMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xfff0d0),
    emissive: new THREE.Color(0xffa040),
    emissiveIntensity: 2.0,
    metalness: 0, roughness: 0.1,
    transmission: 0.3
  })
  const tailMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xff0810),
    emissive: new THREE.Color(0xff0000),
    emissiveIntensity: 1.5,
    metalness: 0, roughness: 0.2
  })

  // ── BODY ─────────────────────────────────────────────────────────────────────
  // Main cabin + hood using LatheGeometry profile then BoxGeometry composites
  // Lower body — long wide box
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.55, 2.1), bodyMat)
  lowerBody.position.y = 0.38
  lowerBody.castShadow = true; carGroup.add(lowerBody)

  // Upper cabin — tapered shape
  const cabinShape = new THREE.Shape()
  cabinShape.moveTo(-1.6, 0)
  cabinShape.lineTo(-2.2, 0.9)
  cabinShape.lineTo(-1.0, 1.55)
  cabinShape.lineTo(0.8, 1.55)
  cabinShape.lineTo(1.6, 0.85)
  cabinShape.lineTo(2.0, 0)
  cabinShape.lineTo(-1.6, 0)
  const cabinExtrude = { depth: 1.9, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 }
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, cabinExtrude)
  const cabin = new THREE.Mesh(cabinGeo, bodyMat)
  cabin.position.set(-0.15, 0.65, -0.95)
  cabin.castShadow = true; carGroup.add(cabin)

  // Hood slope (front)
  const hoodShape = new THREE.Shape()
  hoodShape.moveTo(0, 0); hoodShape.lineTo(0.8, 0.28); hoodShape.lineTo(0.8, 0.04); hoodShape.lineTo(0, -0.04)
  const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, { depth: 2.0, bevelEnabled: false })
  const hood = new THREE.Mesh(hoodGeo, bodyMat)
  hood.position.set(2.0, 0.65, -1.0)
  hood.castShadow = true; carGroup.add(hood)

  // Trunk rear
  const trunkShape = new THREE.Shape()
  trunkShape.moveTo(0, 0); trunkShape.lineTo(-0.55, 0.28); trunkShape.lineTo(-0.55, 0.04); trunkShape.lineTo(0, -0.04)
  const trunkGeo = new THREE.ExtrudeGeometry(trunkShape, { depth: 2.0, bevelEnabled: false })
  const trunk = new THREE.Mesh(trunkGeo, bodyMat)
  trunk.position.set(-2.55, 0.65, -1.0)
  trunk.castShadow = true; carGroup.add(trunk)

  // Side sills
  ;[-1.05, 1.05].forEach(z => {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 0.18), chromeMat)
    sill.position.set(0, 0.14, z)
    carGroup.add(sill)
  })

  // ── WINDOWS ──────────────────────────────────────────────────────────────────
  const windshieldGeo = new THREE.PlaneGeometry(1.6, 1.2)
  const windshield = new THREE.Mesh(windshieldGeo, glassMat)
  windshield.position.set(1.62, 1.32, 0)
  windshield.rotation.y = Math.PI / 2
  windshield.rotation.z = -0.42
  carGroup.add(windshield)

  const rearWindowGeo = new THREE.PlaneGeometry(1.4, 1.0)
  const rearWindow = new THREE.Mesh(rearWindowGeo, glassMat)
  rearWindow.position.set(-1.82, 1.28, 0)
  rearWindow.rotation.y = Math.PI / 2
  rearWindow.rotation.z = 0.38
  carGroup.add(rearWindow)

  // Side windows
  ;[0, 1].forEach(i => {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), glassMat)
    sw.position.set(0.2 + i * 0.9, 1.38, i % 2 === 0 ? 0.96 : -0.96)
    sw.rotation.y = i % 2 === 0 ? 0 : Math.PI
    carGroup.add(sw)
  })

  // ── WHEELS ───────────────────────────────────────────────────────────────────
  const wheelPositions = [
    [1.65, -0.06, 1.08], [1.65, -0.06, -1.08],
    [-1.55, -0.06, 1.08], [-1.55, -0.06, -1.08],
  ]
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Group()
    // Tyre
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 16, 40), tireMat)
    tyre.rotation.y = Math.PI / 2; wheel.add(tyre)
    // Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 20), rimMat)
    rim.rotation.z = Math.PI / 2; wheel.add(rim)
    // Spokes
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.04), rimMat)
      spoke.rotation.z = (s / 5) * Math.PI * 2
      spoke.rotation.x = Math.PI / 2
      wheel.add(spoke)
    }
    // Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), chromeMat)
    hub.rotation.z = Math.PI / 2; wheel.add(hub)
    wheel.position.set(x, y, z)
    wheel.castShadow = true
    carGroup.add(wheel)
  })

  // ── LIGHTS ───────────────────────────────────────────────────────────────────
  // Headlights
  ;[-0.5, 0.5].forEach(z => {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), lightMat)
    hl.position.set(2.5, 0.65, z); carGroup.add(hl)
    const hlInner = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 12), lightMat)
    hlInner.rotation.z = Math.PI / 2; hlInner.position.set(2.52, 0.65, z); carGroup.add(hlInner)
  })
  // Tail lights
  ;[-0.45, 0.45].forEach(z => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.32), tailMat)
    tl.position.set(-2.51, 0.75, z); carGroup.add(tl)
  })
  // LED strip accent
  const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.0), new THREE.MeshStandardMaterial({ color: 0xff1010, emissive: 0xff0000, emissiveIntensity: 3 }))
  ledStrip.position.set(-2.52, 0.72, 0); carGroup.add(ledStrip)

  // Front grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.9), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }))
  grille.position.set(2.51, 0.48, 0); carGroup.add(grille)
  // Chrome grille trim
  const grilleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 1.0), chromeMat)
  grilleTrim.position.set(2.50, 0.48, 0); carGroup.add(grilleTrim)

  // Side mirror
  ;[1.08, -1.08].forEach(z => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), bodyMat)
    mirror.position.set(1.5, 1.05, z > 0 ? 1.12 : -1.12); carGroup.add(mirror)
  })

  // ── UNDERCARRIAGE ────────────────────────────────────────────────────────────
  const undercarriage = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 1.8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }))
  undercarriage.position.y = -0.01; carGroup.add(undercarriage)

  carGroup.position.y = 0.42
  return carGroup
}

export default function CarModel({ scrollRef }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth, H = el.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.userData.renderer = renderer
    scene.fog = new THREE.FogExp2(0x000000, 0.04)

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.set(7, 2.5, 4)
    camera.lookAt(0, 0.8, 0)

    // ── POST PROCESSING ──────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.8, 0.5, 0.75)
    composer.addPass(bloom)

    // ── LIGHTING ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0a1428, 0.6))

    const key = new THREE.DirectionalLight(0xfff0e0, 3.5)
    key.position.set(6, 10, 5); key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 50
    key.shadow.camera.left = -10; key.shadow.camera.right = 10
    key.shadow.camera.top = 8; key.shadow.camera.bottom = -4
    key.shadow.bias = -0.002; scene.add(key)

    const fill = new THREE.DirectionalLight(0x2244aa, 1.2)
    fill.position.set(-8, 4, -3); scene.add(fill)

    const rim = new THREE.DirectionalLight(0x88aaff, 2.0)
    rim.position.set(0, 6, -10); scene.add(rim)

    // Floor spotlights
    const spot1 = new THREE.SpotLight(0xc9a84c, 8, 12, 0.4, 0.5)
    spot1.position.set(3, 5, 0); scene.add(spot1)
    const spot2 = new THREE.SpotLight(0x4488ff, 5, 10, 0.5, 0.8)
    spot2.position.set(-4, 4, 3); scene.add(spot2)

    // Undercar glow
    const underGlow = new THREE.PointLight(0xff2020, 2, 3)
    underGlow.position.set(0, 0.1, 0); scene.add(underGlow)

    // ── FLOOR ────────────────────────────────────────────────────────────────
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050505, roughness: 0.15, metalness: 0.8,
    })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 1, 1), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true; scene.add(floor)

    // Floor reflection grid
    const gridHelper = new THREE.GridHelper(20, 40, 0x111111, 0x0a0a0a)
    gridHelper.position.y = 0.001; scene.add(gridHelper)

    // ── CAR ──────────────────────────────────────────────────────────────────
    const car = buildCar(scene)
    scene.add(car)

    // ── PARTICLES ────────────────────────────────────────────────────────────
    const particleCount = 300
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = Math.random() * 6
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.025, transparent: true, opacity: 0.5 })
    scene.add(new THREE.Points(particleGeo, particleMat))

    // ── ANIMATE ──────────────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let scrollProgress = 0

    // Read scroll from parent container
    const getScroll = () => {
      if (scrollRef?.current) {
        const rect = scrollRef.current.getBoundingClientRect()
        const total = scrollRef.current.offsetHeight - window.innerHeight
        return Math.max(0, Math.min(1, -rect.top / total))
      }
      return 0
    }

    let raf
    function animate() {
      raf = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      scrollProgress = getScroll()

      // Camera orbits around car based on scroll + gentle auto-rotate
      const baseAngle = elapsed * 0.12 // slow auto-rotate
      const scrollAngle = scrollProgress * Math.PI * 2 // full orbit on scroll
      const angle = baseAngle + scrollAngle
      const radius = 7 - scrollProgress * 1.5
      const camY = 2.5 - scrollProgress * 0.8

      camera.position.set(
        Math.cos(angle) * radius,
        camY,
        Math.sin(angle) * radius
      )
      camera.lookAt(0, 0.8, 0)

      // Wheels spin
      car.children.forEach((child, i) => {
        if (i >= 6 && i <= 9) {
          child.rotation.x = elapsed * 2
        }
      })

      // Undercar glow pulse
      underGlow.intensity = 2 + Math.sin(elapsed * 3) * 0.8

      // Bloom breathes
      bloom.strength = 0.8 + Math.sin(elapsed * 0.8) * 0.15

      composer.render()
    }
    animate()

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h)
      composer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={mountRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  )
}
