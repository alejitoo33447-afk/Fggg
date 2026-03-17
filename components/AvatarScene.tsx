import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Environment, useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { AvatarConfig } from '../types';

// --- ACCESSORY LOADERS ---

const AccessoryFBX = ({ url, position, scale }: { url: string; position: any; scale: any }) => {
  const fbx = useLoader(FBXLoader, url);
  const clone = React.useMemo(() => fbx.clone(), [fbx]);
  return <primitive object={clone} position={position} scale={scale} />;
};

const AccessoryGLTF = ({ url, position, scale }: { url: string; position: any; scale: any }) => {
  const { scene } = useGLTF(url);
  const clone = React.useMemo(() => scene.clone(), [scene]);
  return <primitive object={clone} position={position} scale={scale} />;
};

const AccessoryModel = ({ url, position, scale }: { url: string; position: any; scale: any }) => {
  const isFbx = url.includes('#fbx');
  const cleanUrl = url.replace('#fbx', '');

  if (isFbx) {
    return <AccessoryFBX url={cleanUrl} position={position} scale={scale} />;
  }
  return <AccessoryGLTF url={cleanUrl} position={position} scale={scale} />;
};

// --- HEAD COMPONENTS ---

const TexturedHead = ({ url, materialProps }: { url: string; materialProps: any }) => {
  const texture = useLoader(THREE.TextureLoader, url);
  return (
    <mesh name="Head">
      <cylinderGeometry args={[0.35, 0.35, 0.7, 32]} />
      <meshStandardMaterial map={texture} color="white" {...materialProps} transparent />
    </mesh>
  );
};

const ColoredHead = ({ color, materialProps }: { color: string; materialProps: any }) => {
  return (
    <mesh name="Head">
      <cylinderGeometry args={[0.35, 0.35, 0.7, 32]} />
      <meshStandardMaterial color={color} {...materialProps} />
    </mesh>
  );
};

const VideoHead = ({ url, materialProps }: { url: string; materialProps: any }) => {
    const [video] = useState(() => {
        const v = document.createElement('video');
        v.src = url;
        v.crossOrigin = "Anonymous";
        v.loop = true;
        v.muted = true;
        v.play();
        return v;
    });

    return (
        <mesh name="Head">
            <cylinderGeometry args={[0.35, 0.35, 0.7, 32]} />
            <meshStandardMaterial {...materialProps} transparent>
                <videoTexture attach="map" args={[video]} />
            </meshStandardMaterial>
        </mesh>
    );
};

interface CharacterProps {
  config: AvatarConfig;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isMoving?: boolean;
  isJumping?: boolean;
  username?: string; // New prop for Name Tag
}

export const RobloxCharacter = ({ config, position = [0, 0, 0], rotation = [0, 0, 0], isMoving = false, isJumping = false, username }: CharacterProps) => {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (group.current) {
      const t = state.clock.getElapsedTime();
      
      // Get Object References
      const leftArm = group.current.getObjectByName("LeftArm");
      const rightArm = group.current.getObjectByName("RightArm");
      const leftLeg = group.current.getObjectByName("LeftLeg");
      const rightLeg = group.current.getObjectByName("RightLeg");
      const headGroup = group.current.getObjectByName("HeadGroup");
      const torso = group.current.getObjectByName("Torso");

      // Reset base positions
      if (torso) torso.rotation.y = 0;
      if (torso) torso.rotation.z = 0;
      if (headGroup) headGroup.rotation.y = 0;

      if (isJumping) {
         // JUMP ANIMATION
         if (leftArm) { leftArm.rotation.x = 2.5; leftArm.rotation.z = 0.5; }
         if (rightArm) { rightArm.rotation.x = 2.5; rightArm.rotation.z = -0.5; }
         if (leftLeg) { leftLeg.rotation.x = 0.5; leftLeg.rotation.z = 0.2; }
         if (rightLeg) { rightLeg.rotation.x = 0.5; rightLeg.rotation.z = -0.2; }
      } 
      else if (isMoving) {
        // WALK ANIMATION
        const speed = 10;
        const swingRange = 0.8;
        if (leftArm) leftArm.rotation.x = Math.sin(t * speed) * swingRange;
        if (rightArm) rightArm.rotation.x = Math.sin(t * speed + Math.PI) * swingRange;
        if (leftLeg) leftLeg.rotation.x = Math.sin(t * speed + Math.PI) * swingRange;
        if (rightLeg) rightLeg.rotation.x = Math.sin(t * speed) * swingRange;
        
        if (leftArm) leftArm.rotation.z = 0;
        if (rightArm) rightArm.rotation.z = 0;
        if (leftLeg) leftLeg.rotation.z = 0;
        if (rightLeg) rightLeg.rotation.z = 0;
        if (torso) torso.rotation.z = Math.cos(t * speed) * 0.05;
      } 
      else {
        // IDLE ANIMATION
        const breathe = Math.sin(t * 1.5);
        if (headGroup) headGroup.position.y = 1.6 + breathe * 0.005;
        if (torso) torso.position.y = 0.8 + breathe * 0.005;
        if (leftArm) { leftArm.rotation.x = breathe * 0.02; leftArm.rotation.z = 0.15; }
        if (rightArm) { rightArm.rotation.x = breathe * 0.02; rightArm.rotation.z = -0.15; }
        if (leftLeg) { leftLeg.rotation.x = 0; leftLeg.rotation.z = 0; }
        if (rightLeg) { rightLeg.rotation.x = 0; rightLeg.rotation.z = 0; }
      }
    }
  });

  const materialProps = { roughness: 0.5, metalness: 0 };

  return (
    <group ref={group} position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)} dispose={null}>
      {/* Name Tag */}
      {username && (
         <group position={[0, 3.2, 0]}>
            <Text
              fontSize={0.4}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="black"
            >
              {username}
            </Text>
         </group>
      )}

      {/* Head Group */}
      <group position={[0, 1.6, 0]} name="HeadGroup">
        
        {config.faceVideoUrl ? (
            <VideoHead url={config.faceVideoUrl} materialProps={materialProps} />
        ) : config.faceTextureUrl ? (
          <React.Suspense fallback={<ColoredHead color={config.bodyColors.head} materialProps={materialProps} />}>
             <TexturedHead url={config.faceTextureUrl} materialProps={materialProps} />
          </React.Suspense>
        ) : (
             <ColoredHead color={config.bodyColors.head} materialProps={materialProps} />
        )}

        {!config.faceTextureUrl && !config.hideFace && (
          <group>
             <mesh position={[0.12, 0.05, 0.3]} rotation={[0, 0, 0]}>
                 <sphereGeometry args={[0.04]} />
                 <meshBasicMaterial color="black" />
            </mesh>
            <mesh position={[-0.12, 0.05, 0.3]}>
                 <sphereGeometry args={[0.04]} />
                 <meshBasicMaterial color="black" />
            </mesh>
            <mesh position={[0, -0.15, 0.3]} scale={[1, 0.5, 1]}>
                 <torusGeometry args={[0.06, 0.02, 16, 100, Math.PI]} rotation={[0,0,Math.PI]} />
                 <meshBasicMaterial color="black" />
            </mesh>
          </group>
        )}

        {config.accessories.hatModelUrl && (
          <React.Suspense fallback={null}>
            <AccessoryModel 
              url={config.accessories.hatModelUrl} 
              position={[0, 0.4, 0]} 
              scale={[0.8, 0.8, 0.8]} 
            />
          </React.Suspense>
        )}
      </group>

      {/* Torso */}
      <mesh position={[0, 0.8, 0]} name="Torso">
        <boxGeometry args={[1, 1, 0.5]} />
        <meshStandardMaterial color={config.bodyColors.torso} {...materialProps} />
        {config.accessories.shirtTextureUrl && (
           <mesh position={[0, 0, 0.26]}>
              <planeGeometry args={[0.8, 0.8]} />
              <meshBasicMaterial color="white" map={useLoader(THREE.TextureLoader, config.accessories.shirtTextureUrl)} transparent />
           </mesh>
        )}
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.75, 0.8, 0]} name="LeftArm">
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color={config.bodyColors.leftArm} {...materialProps} />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.75, 0.8, 0]} name="RightArm">
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color={config.bodyColors.rightArm} {...materialProps} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.26, -0.2, 0]} name="LeftLeg">
        <boxGeometry args={[0.48, 1, 0.5]} />
        <meshStandardMaterial color={config.bodyColors.leftLeg} {...materialProps} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.26, -0.2, 0]} name="RightLeg">
        <boxGeometry args={[0.48, 1, 0.5]} />
        <meshStandardMaterial color={config.bodyColors.rightLeg} {...materialProps} />
      </mesh>
    </group>
  );
};

interface AvatarSceneProps {
  config?: AvatarConfig;
  interactive?: boolean;
}

export const AvatarScene: React.FC<AvatarSceneProps> = ({ config, interactive = true }) => {
  const defaultConfig: AvatarConfig = {
    bodyColors: {
      head: '#F5CD30', torso: '#0047AB', leftArm: '#F5CD30',
      rightArm: '#F5CD30', leftLeg: '#A2C429', rightLeg: '#A2C429'
    },
    faceTextureUrl: null,
    accessories: { hatModelUrl: null, shirtTextureUrl: null },
    hideFace: false
  };

  const activeConfig = config || defaultConfig;

  return (
    <div className="w-full h-full min-h-[300px] relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg overflow-hidden border border-gray-700">
      <div className="absolute top-2 left-2 z-10 bg-black/50 px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-wider">
        Vista 3D
      </div>
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 1, 4]} fov={50} />
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <group position={[0, -0.5, 0]}>
            <React.Suspense fallback={null}>
               <RobloxCharacter config={activeConfig} />
            </React.Suspense>
            <ContactShadows resolution={1024} scale={10} blur={2} opacity={0.5} far={10} color="#000000" />
        </group>
        <OrbitControls enablePan={false} enableZoom={interactive} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};
