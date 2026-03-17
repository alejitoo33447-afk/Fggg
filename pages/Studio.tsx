import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Sky, Stars, useGLTF } from '@react-three/drei';
import { MousePointer2, Move, Maximize, RotateCw, Box as BoxIcon, Circle as CircleIcon, Triangle as TriangleIcon, Cylinder as CylinderIcon, Save, Play, Square, Home, ArrowLeft, Upload, FileBox, Gamepad, Volume2, Video as VideoIcon, Mic, MicOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { PositionalAudio, VideoTexture } from '@react-three/drei';
import { AnimationMixer, LoopRepeat } from 'three';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { MapObject, AvatarConfig, RemotePlayer, Server } from '../types';
import { RobloxCharacter } from '../components/AvatarScene';

// --- HELPERS ---

const ImportedModel = ({ url, isFbx, isPlaying }: { url: string; isFbx?: boolean; isPlaying?: boolean }) => {
  const { scene, animations } = useGLTF(url.includes('.glb') || url.includes('.gltf') ? url : '');
  const fbx = useLoader(FBXLoader, !url.includes('.glb') && !url.includes('.gltf') ? url : '');
  
  const model = url.includes('.glb') || url.includes('.gltf') ? scene : fbx;
  const mixer = useRef<AnimationMixer | null>(null);
  const clone = React.useMemo(() => model?.clone(), [model]);

  useEffect(() => {
    if (clone) {
      const box = new THREE.Box3().setFromObject(clone);
      const size = box.getSize(new THREE.Vector3());
      const targetHeight = 40;
      if (size.y > 0) {
        const scale = targetHeight / size.y;
        clone.scale.set(scale, scale, scale);
      }

      if (isPlaying && (animations?.length || (fbx as any)?.animations?.length)) {
        mixer.current = new AnimationMixer(clone);
        const anims = animations?.length ? animations : (fbx as any).animations;
        const action = mixer.current.clipAction(anims[0]);
        action.play();
      }
    }
  }, [clone, isPlaying, animations, fbx]);

  useFrame((state, delta) => {
    mixer.current?.update(delta);
  });

  return clone ? <primitive object={clone} /> : null;
};

const SoundObject = ({ url, volume = 1, loop = true, playing = true }: { url: string; volume?: number; loop?: boolean; playing?: boolean }) => {
    return (
        <group>
            <mesh>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial color="cyan" wireframe transparent opacity={0.3} />
            </mesh>
            <PositionalAudio url={url} distance={20} loop={loop} autoplay={playing} />
        </group>
    );
};

const VideoObject = ({ url, scale }: { url: string; scale: [number, number, number] }) => {
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
        <mesh scale={scale}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial side={THREE.DoubleSide}>
                <videoTexture attach="map" args={[video]} />
            </meshStandardMaterial>
        </mesh>
    );
};

const PartGeometry = ({ type }: { type: MapObject['type'] }) => {
  switch (type) {
    case 'Sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
    case 'Cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
    case 'Wedge': return <coneGeometry args={[0.5, 1, 4]} />;
    case 'Part': default: return <boxGeometry args={[1, 1, 1]} />;
  }
};

const getMaterial = (type: string, color: string) => {
    return <meshStandardMaterial 
        color={color}
        roughness={type === 'Plastic' ? 0.5 : type === 'Neon' ? 0 : 0.9}
        metalness={type === 'Plastic' ? 0 : 0.1}
        emissive={type === 'Neon' ? color : 'black'}
        emissiveIntensity={type === 'Neon' ? 1 : 0}
    />;
}

// --- CONTROLS UI ---

const GameControls = () => {
  const touchStart = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    
    // Normalize roughly to -1 to 1 range
    const x = Math.max(-1, Math.min(1, dx / 50));
    const y = Math.max(-1, Math.min(1, dy / -50)); // Invert Y for forward

    const event = new CustomEvent('joystickMove', { detail: { x, y } });
    window.dispatchEvent(event);
  };

  const handleTouchEnd = () => {
    const event = new CustomEvent('joystickMove', { detail: { x: 0, y: 0 } });
    window.dispatchEvent(event);
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-end pb-10 px-6">
       <div className="flex justify-between items-end pointer-events-auto">
          {/* Virtual Joystick Zone */}
          <div 
            className="w-32 h-32 bg-white/10 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-sm"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
             <div className="w-12 h-12 bg-white/30 rounded-full" />
          </div>

          {/* Jump Button */}
          <button 
            className="w-24 h-24 bg-white/10 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-sm active:bg-white/30"
            onTouchStart={() => window.dispatchEvent(new Event('jumpPress'))}
            onTouchEnd={() => window.dispatchEvent(new Event('jumpRelease'))}
            onMouseDown={() => window.dispatchEvent(new Event('jumpPress'))}
            onMouseUp={() => window.dispatchEvent(new Event('jumpRelease'))}
          >
             <div className="text-white font-bold">SALTAR</div>
          </button>
       </div>
    </div>
  )
};

const LoadingScreen = ({ loadingStep }: { loadingStep: number }) => {
    const messages = ["", "Iniciando motor Roblox...", "Conectando al servidor...", "Cargando mapa...", "¡Listo!"];
    return (
        <div className="absolute inset-0 z-50 bg-[#232527] flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white/10 rounded-lg animate-spin mb-8 border-4 border-t-[#00b06f] border-r-transparent border-b-[#00b06f] border-l-transparent"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Roblox</h2>
            <p className="text-gray-400">{messages[loadingStep] || "Cargando..."}</p>
        </div>
    );
};

// --- PLAYER CONTROLLER ---

const PlayerController = ({ avatarConfig, mapObjects, username }: { avatarConfig: AvatarConfig, mapObjects: MapObject[], username?: string }) => {
    const [pos, setPos] = useState(new THREE.Vector3(0, 2, 0));
    const [rot, setRot] = useState(new THREE.Euler(0, 0, 0));
    const [isMoving, setIsMoving] = useState(false);
    const [isJumping, setIsJumping] = useState(false);
    
    // Physics State
    const velocity = useRef(new THREE.Vector3(0, 0, 0));
    const canJump = useRef(true);
    const keys = useRef<{ [key: string]: boolean }>({});

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => keys.current[e.code] = true;
        const onKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;
        
        const onJoystickMove = (e: CustomEvent) => {
             const { x, y } = e.detail;
             keys.current['KeyW'] = y > 0.3;
             keys.current['KeyS'] = y < -0.3;
             keys.current['ArrowLeft'] = x < -0.3;
             keys.current['ArrowRight'] = x > 0.3;
        };
        const onJumpPress = () => keys.current['Space'] = true;
        const onJumpRelease = () => keys.current['Space'] = false;

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('joystickMove', onJoystickMove as EventListener);
        window.addEventListener('jumpPress', onJumpPress);
        window.addEventListener('jumpRelease', onJumpRelease);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('joystickMove', onJoystickMove as EventListener);
            window.removeEventListener('jumpPress', onJumpPress);
            window.removeEventListener('jumpRelease', onJumpRelease);
        };
    }, []);

    useFrame((state) => {
        const speed = 0.25; 
        const jumpForce = 0.5; 
        const gravity = 0.025;
        
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot.y);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot.y);
        
        let moveVec = new THREE.Vector3(0, 0, 0);
        let moving = false;

        if (keys.current['KeyW']) { moveVec.add(forward); moving = true; }
        if (keys.current['KeyS']) { moveVec.sub(forward); moving = true; }
        
        if (moving) moveVec.normalize().multiplyScalar(speed);
        
        const rotationSpeed = 0.08;
        if (keys.current['ArrowLeft'] || keys.current['KeyA']) setRot(r => new THREE.Euler(r.x, r.y + rotationSpeed, r.z));
        if (keys.current['ArrowRight'] || keys.current['KeyD']) setRot(r => new THREE.Euler(r.x, r.y - rotationSpeed, r.z));

        velocity.current.x = moveVec.x;
        velocity.current.z = moveVec.z;

        if (keys.current['Space'] && canJump.current) {
            velocity.current.y = jumpForce;
            canJump.current = false;
            setIsJumping(true);
        }

        velocity.current.y -= gravity;

        let nextY = pos.y + velocity.current.y;
        if (nextY <= 0) {
            nextY = 0;
            velocity.current.y = 0;
            canJump.current = true;
            setIsJumping(false);
        }

        const nextPos = pos.clone().add(velocity.current);
        if(nextPos.y < 0) nextPos.y = 0;

        setPos(nextPos);
        setIsMoving(moving || Math.abs(velocity.current.x) > 0.01 || Math.abs(velocity.current.z) > 0.01);

        const camDist = 12;
        const camHeight = 6;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, nextPos.x - Math.sin(rot.y) * camDist, 0.1);
        state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, nextPos.z - Math.cos(rot.y) * camDist, 0.1);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, nextPos.y + camHeight, 0.1);
        state.camera.lookAt(nextPos.x, nextPos.y + 3, nextPos.z);
    });

    return (
        <RobloxCharacter 
            config={avatarConfig} 
            position={[pos.x, pos.y, pos.z]} 
            rotation={[rot.x, rot.y, rot.z]} 
            isMoving={isMoving}
            isJumping={isJumping}
            username={username}
        />
    );
};

// --- STUDIO COMPONENT ---

interface StudioProps {
  onPublish: (gameData: { title: string, map: MapObject[] }) => void;
  avatarConfig: AvatarConfig;
  initialMapData?: MapObject[];
  isPlayMode?: boolean;
  activeServer?: Server | null;
  onExit?: () => void;
  playerName?: string;
}

const INITIAL_MAP: MapObject[] = [
    { id: 'baseplate', name: 'Baseplate', type: 'Part', position: [0, -0.5, 0], rotation: [0, 0, 0], scale: [100, 1, 100], color: '#2b2b2b', material: 'Plastic', transparency: 0, anchored: true, canCollide: true },
    { id: 'spawn', name: 'SpawnLocation', type: 'Part', position: [0, 0.1, 0], rotation: [0, 0, 0], scale: [6, 0.2, 6], color: '#a3a2a5', material: 'Plastic', transparency: 0, anchored: true, canCollide: true }
];

export const StudioPage: React.FC<StudioProps> = ({ onPublish, avatarConfig, initialMapData, isPlayMode = false, activeServer, onExit, playerName }) => {
  const [objects, setObjects] = useState<MapObject[]>(initialMapData || INITIAL_MAP);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isPlaying, setIsPlaying] = useState(false); 
  const [loadingStep, setLoadingStep] = useState(0);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [gameTitle, setGameTitle] = useState("Mi Juego de Roblox");
  
  // Multiplayer State
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isPlayMode) {
          handlePlaySequence();
          // Simulate Joining Server if activeServer is present
          if (activeServer) {
              console.log(`Joined server: ${activeServer.name} with ${activeServer.players} players.`);
              simulateMultiplayer(activeServer.players);
          }
      }
  }, [isPlayMode, activeServer]);

  // --- MULTIPLAYER SIMULATION ---
  const simulateMultiplayer = (count: number) => {
      const bots: RemotePlayer[] = [];
      const names = ["xX_Gamer_Xx", "NoobMaster69", "BuilderMan", "RobloxQueen", "CoolKid2025", "Guest_999", "ProGamer_YT"];
      
      const getRandomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16);

      for (let i = 0; i < Math.min(count, 10); i++) {
          bots.push({
              id: `bot-${i}`,
              username: names[i % names.length],
              position: [(Math.random() - 0.5) * 30, 2, (Math.random() - 0.5) * 30],
              rotation: [0, Math.random() * Math.PI * 2, 0],
              isMoving: false,
              isJumping: false,
              targetPosition: [(Math.random() - 0.5) * 30, 2, (Math.random() - 0.5) * 30],
              config: {
                  bodyColors: {
                      head: '#F5CD30', torso: getRandomColor(), leftArm: '#F5CD30', rightArm: '#F5CD30', leftLeg: '#A2C429', rightLeg: '#A2C429'
                  },
                  faceTextureUrl: null, accessories: { hatModelUrl: null, shirtTextureUrl: null }, hideFace: false
              }
          });
      }
      setRemotePlayers(bots);
  };

  // Move remote players loop
  useEffect(() => {
      if (!isPlaying || remotePlayers.length === 0) return;
      
      const interval = setInterval(() => {
           setRemotePlayers(current => current.map(p => {
               // Simple random walk logic
               if (Math.random() > 0.95) {
                   // Pick new target
                   return {
                       ...p,
                       targetPosition: [(Math.random() - 0.5) * 40, 2, (Math.random() - 0.5) * 40],
                       isMoving: true
                   };
               }
               return p;
           }));
      }, 1000);
      
      return () => clearInterval(interval);
  }, [isPlaying, remotePlayers.length]);

  const handlePlaySequence = () => {
      setLoadingStep(1);
      const sequence = [
          () => setLoadingStep(1),
          () => setLoadingStep(2),
          () => setLoadingStep(3),
          () => { setLoadingStep(4); setTimeout(() => setIsPlaying(true), 800); }
      ];
      let i = 0;
      const interval = setInterval(() => {
          if (i < sequence.length) { sequence[i](); i++; } 
          else { clearInterval(interval); }
      }, 800);
  };

  const handleImportModel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isFbx = file.name.toLowerCase().endsWith('.fbx');
    const url = URL.createObjectURL(file);
    const newObj: MapObject = {
        id: Date.now().toString(),
        name: file.name,
        type: 'Model',
        position: [0, 2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: '#ffffff',
        material: 'Plastic',
        transparency: 0,
        anchored: false,
        canCollide: true,
        assetUrl: isFbx ? url + '#fbx' : url,
    };
    setObjects([...objects, newObj]);
    setSelectedId(newObj.id);
  };

  const handleUpdateObject = (id: string, newProps: Partial<MapObject>) => {
    setObjects(objects.map(obj => obj.id === id ? { ...obj, ...newProps } : obj));
  };

  const RenderMap = () => (
      <>
        {objects.map((obj) => (
            <React.Fragment key={obj.id}>
                {(selectedId === obj.id && !isPlaying) ? (
                <TransformControls 
                    mode={transformMode} 
                    onObjectChange={(e: any) => {
                        if(e?.target?.object) {
                            const o = e.target.object;
                            handleUpdateObject(obj.id, {
                                position: [o.position.x, o.position.y, o.position.z],
                                rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
                                scale: [o.scale.x, o.scale.y, o.scale.z]
                            });
                        }
                    }}
                >
                    <mesh 
                        position={new THREE.Vector3(...obj.position)} 
                        rotation={new THREE.Euler(...obj.rotation)} 
                        scale={new THREE.Vector3(...obj.scale)}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(obj.id); }}
                    >
                        {obj.type === 'Model' && obj.assetUrl ? (
                            <Suspense fallback={<mesh><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="gray" wireframe /></mesh>}>
                                <ImportedModel url={obj.assetUrl.replace('#fbx','')} isFbx={obj.assetUrl.includes('#fbx')} />
                            </Suspense>
                        ) : (
                            <>
                                <PartGeometry type={obj.type} />
                                {getMaterial(obj.material, obj.color)}
                            </>
                        )}
                    </mesh>
                </TransformControls>
                ) : (
                <mesh 
                    position={new THREE.Vector3(...obj.position)} 
                    rotation={new THREE.Euler(...obj.rotation)} 
                    scale={new THREE.Vector3(...obj.scale)}
                    onClick={(e) => { 
                        if(!isPlaying) {
                            e.stopPropagation(); 
                            setSelectedId(obj.id); 
                        }
                    }}
                >
                    {obj.type === 'Model' && obj.assetUrl ? (
                            <Suspense fallback={<mesh><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="gray" wireframe /></mesh>}>
                                <ImportedModel url={obj.assetUrl.replace('#fbx','')} isFbx={obj.assetUrl.includes('#fbx')} />
                            </Suspense>
                        ) : (
                            <>
                                <PartGeometry type={obj.type} />
                                {getMaterial(obj.material, obj.color)}
                            </>
                        )}
                </mesh>
                )}
            </React.Fragment>
        ))}
      </>
  );

  // Component to interpolate remote players
  const RemotePlayerRenderer = ({ player }: { player: RemotePlayer }) => {
      const groupRef = useRef<THREE.Group>(null);
      const [currentPos, setCurrentPos] = useState(new THREE.Vector3(...player.position));
      const [currentRot, setCurrentRot] = useState(new THREE.Euler(...player.rotation));
      
      useFrame((state, delta) => {
          if (player.targetPosition && player.isMoving) {
               const target = new THREE.Vector3(...player.targetPosition);
               currentPos.lerp(target, delta * 0.5); // Smooth walk
               
               // Look at target
               if (currentPos.distanceTo(target) > 0.5) {
                   const angle = Math.atan2(target.x - currentPos.x, target.z - currentPos.z);
                   currentRot.y = angle + Math.PI; // Face the right way
               }
          }
      });

      return (
          <RobloxCharacter 
             config={player.config} 
             position={[currentPos.x, currentPos.y, currentPos.z]} 
             rotation={[0, currentRot.y, 0]}
             isMoving={player.isMoving}
             username={player.username}
          />
      );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#232527] overflow-hidden text-white font-sans relative">
      
      {loadingStep > 0 && !isPlaying && <LoadingScreen loadingStep={loadingStep} />}
      
      {isPlaying && <GameControls />}

      {showPublishModal && (
          <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center">
              <div className="bg-[#2b2d31] p-6 rounded-lg w-96 border border-gray-600 shadow-xl">
                  <h2 className="text-xl font-bold mb-4">Publicar en Roblox</h2>
                  <input className="w-full bg-black/20 border border-gray-600 rounded p-2 mb-4" value={gameTitle} onChange={e => setGameTitle(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 hover:bg-white/10 rounded">Cancelar</button>
                      <button onClick={() => { onPublish({ title: gameTitle, map: objects }); setShowPublishModal(false); alert("¡Juego Publicado!"); }} className="px-4 py-2 bg-[#00b06f] rounded font-bold">Publicar</button>
                  </div>
              </div>
          </div>
      )}
      
      {!isPlaying && !isPlayMode && (
        <div className="h-14 bg-[#2b2d31] border-b border-[#111213] flex items-center px-4 justify-between">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><span className="font-bold text-[#00b06f]">ARCHIVO</span><span className="font-bold text-gray-300">INICIO</span></div>
                <div className="flex gap-1 bg-[#1e1f21] p-1 rounded-lg">
                    <button onClick={() => setTransformMode('translate')} className={`p-1.5 rounded ${transformMode === 'translate' ? 'bg-[#00a2ff]' : 'hover:bg-gray-700'}`}><Move size={18} /></button>
                    <button onClick={() => setTransformMode('scale')} className={`p-1.5 rounded ${transformMode === 'scale' ? 'bg-[#00a2ff]' : 'hover:bg-gray-700'}`}><Maximize size={18} /></button>
                    <button onClick={() => setTransformMode('rotate')} className={`p-1.5 rounded ${transformMode === 'rotate' ? 'bg-[#00a2ff]' : 'hover:bg-gray-700'}`}><RotateCw size={18} /></button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { 
                         const newObj: MapObject = { id: Date.now().toString(), name: 'Part', type: 'Part', position: [0, 5, 0], rotation: [0,0,0], scale: [1,1,1], color: '#A2A2A2', material: 'Plastic', transparency: 0, anchored: false, canCollide: true };
                         setObjects([...objects, newObj]); setSelectedId(newObj.id);
                    }} className="p-1 hover:bg-white/10 rounded"><BoxIcon size={20} className="text-blue-400" /></button>
                    <button onClick={() => { 
                         const newObj: MapObject = { id: Date.now().toString(), name: 'Sphere', type: 'Sphere', position: [0, 5, 0], rotation: [0,0,0], scale: [1,1,1], color: '#A2A2A2', material: 'Plastic', transparency: 0, anchored: false, canCollide: true };
                         setObjects([...objects, newObj]); setSelectedId(newObj.id);
                    }} className="p-1 hover:bg-white/10 rounded"><CircleIcon size={20} className="text-red-400" /></button>
                    <button onClick={() => { 
                         const newObj: MapObject = { id: Date.now().toString(), name: 'Wedge', type: 'Wedge', position: [0, 5, 0], rotation: [0,0,0], scale: [1,1,1], color: '#A2A2A2', material: 'Plastic', transparency: 0, anchored: false, canCollide: true };
                         setObjects([...objects, newObj]); setSelectedId(newObj.id);
                    }} className="p-1 hover:bg-white/10 rounded"><TriangleIcon size={20} className="text-green-400" /></button>
                    <button onClick={() => { 
                         const newObj: MapObject = { id: Date.now().toString(), name: 'Cylinder', type: 'Cylinder', position: [0, 5, 0], rotation: [0,0,0], scale: [1,1,1], color: '#A2A2A2', material: 'Plastic', transparency: 0, anchored: false, canCollide: true };
                         setObjects([...objects, newObj]); setSelectedId(newObj.id);
                    }} className="p-1 hover:bg-white/10 rounded"><CylinderIcon size={20} className="text-yellow-400 transform rotate-45" /></button>
                    
                    <input type="file" ref={fileInputRef} hidden accept=".glb,.gltf,.fbx" onChange={handleImportModel} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-1 hover:bg-white/10 rounded">
                        <Upload size={20} className="text-purple-400" />
                        <span className="text-[10px]">Importar 3D</span>
                    </button>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowPublishModal(true)} className="flex items-center gap-2 bg-[#232527] border border-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded text-sm font-bold"><Save size={16} /> Publicar</button>
                <button onClick={handlePlaySequence} className="flex items-center gap-2 bg-[#00b06f] hover:bg-[#009e63] px-4 py-1.5 rounded text-sm font-bold shadow-sm"><Play size={16} fill="white" /> Jugar</button>
            </div>
        </div>
      )}

      {/* STOP BUTTON / SERVER INFO */}
      {isPlaying && (
          <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
              <button onClick={() => { 
                  if (isPlayMode && onExit) onExit();
                  else { setIsPlaying(false); setLoadingStep(0); }
              }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-lg flex items-center gap-2 border-2 border-white/20">
                  <ArrowLeft size={20} /> {isPlayMode ? 'Salir del Juego' : 'Detener'}
              </button>
              {activeServer && (
                  <div className="bg-black/50 p-2 rounded text-xs text-white border border-white/10 backdrop-blur-md">
                      <div className="font-bold text-green-400">● Conectado</div>
                      <div>{activeServer.name}</div>
                      <div>Ping: {activeServer.ping}ms</div>
                  </div>
              )}
          </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-[#111213] relative">
           <Canvas shadows dpr={[1, 2]}>
              {!isPlaying && <OrbitControls makeDefault />}
              <ambientLight intensity={0.5} />
              <directionalLight position={[50, 50, 25]} intensity={0.8} castShadow />
              <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
              <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
              {!isPlaying && <Grid infiniteGrid sectionSize={4} sectionColor="#6f6f6f" cellColor="#4a4a4a" position={[0, -0.01, 0]} />}

              {isPlaying && <PlayerController avatarConfig={avatarConfig} mapObjects={objects} username={playerName} />}
              
              {/* RENDER REMOTE PLAYERS */}
              {isPlaying && remotePlayers.map(rp => (
                  <RemotePlayerRenderer key={rp.id} player={rp} />
              ))}

              <RenderMap />
              
              {!isPlaying && (
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} onClick={() => setSelectedId(null)}>
                    <planeGeometry args={[1000, 1000]} />
                    <meshBasicMaterial visible={false} />
                  </mesh>
              )}
           </Canvas>
        </div>
        
        {!isPlaying && !isPlayMode && (
            <div className="w-64 bg-[#2b2d31] border-l border-[#111213] flex flex-col">
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="text-xs font-bold text-gray-300 mb-2">EXPLORADOR</div>
                    {objects.map(obj => (
                        <div key={obj.id} onClick={() => setSelectedId(obj.id)} className={`pl-2 cursor-pointer text-sm flex items-center gap-2 py-0.5 ${selectedId === obj.id ? 'bg-[#00a2ff] text-white' : 'text-gray-400'}`}>
                            {obj.type === 'Model' ? <FileBox size={12}/> : <BoxIcon size={12} />} {obj.name}
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
