import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

// GLB import 

const PARTICLE_COUNT = 2000
// cleanest imo, changeable param from blender
const SPHERE_RADIUS = 2

export function ParticleSphere() {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera, pointer } = useThree()
  
  const mouseWorld = useRef(new THREE.Vector3())
  const raycaster = useRef(new THREE.Raycaster())
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  
  const { positions, originalPositions } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const originalPositions = new Float32Array(PARTICLE_COUNT * 3)
    
    const phi = Math.PI * (3 - Math.sqrt(5))
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2
      const radius = Math.sqrt(1 - y * y)
      const theta = phi * i
      
      const x = Math.cos(theta) * radius * SPHERE_RADIUS
      const z = Math.sin(theta) * radius * SPHERE_RADIUS
      const yPos = y * SPHERE_RADIUS
      
      positions[i * 3] = x
      positions[i * 3 + 1] = yPos
      positions[i * 3 + 2] = z
      
      originalPositions[i * 3] = x
      originalPositions[i * 3 + 1] = yPos
      originalPositions[i * 3 + 2] = z
    }
    
    return { positions, originalPositions }
  }, [])
  
  const sizes = useMemo(() => {
    const sizes = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      sizes[i] = Math.random() * 0.5 + 0.5
    }
    return sizes
  }, [])
  
  useFrame((state) => {
    if (!pointsRef.current) return
    
    const time = state.clock.getElapsedTime()
    const positionAttribute = pointsRef.current.geometry.attributes.position
    const posArray = positionAttribute.array as Float32Array
    
    raycaster.current.setFromCamera(pointer, camera)
    raycaster.current.ray.intersectPlane(plane.current, mouseWorld.current)
    
    const inverseMatrix = new THREE.Matrix4()
    inverseMatrix.copy(pointsRef.current.matrixWorld).invert()
    
    const localMouse = mouseWorld.current.clone().applyMatrix4(inverseMatrix)
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      
      const origX = originalPositions[i3]
      const origY = originalPositions[i3 + 1]
      const origZ = originalPositions[i3 + 2]
      
      const dx = origX - localMouse.x
      const dy = origY - localMouse.y
      
      const dist2D = Math.sqrt(dx * dx + dy * dy)
      
      const influenceRadius = 2.5
      const influence = Math.max(0, 1 - dist2D / influenceRadius)
      
      const smoothInfluence = influence * influence * influence
      const repelStrength = smoothInfluence * 1.2
      
      let repelX = 0, repelY = 0, repelZ = 0
      if (dist2D > 0.001) {
        repelX = (dx / dist2D) * repelStrength
        
        repelY = (dy / dist2D) * repelStrength
        repelZ = (origZ > 0 ? 1 : -1) * smoothInfluence * 0.5
      }


      
      const targetX = origX + repelX
      const targetY = origY + repelY
      const targetZ = origZ + repelZ

      
      const lerpFactor = 0.12
      posArray[i3] += (targetX - posArray[i3]) * lerpFactor
      posArray[i3 + 1] += (targetY - posArray[i3 + 1]) * lerpFactor
      posArray[i3 + 2] += (targetZ - posArray[i3 + 2]) * lerpFactor
    }
    
    positionAttribute.needsUpdate = true
    
    pointsRef.current.rotation.y = time * 0.15
    pointsRef.current.rotation.x = Math.sin(time * 0.1) * 0.1
  })
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#6366f1"
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
