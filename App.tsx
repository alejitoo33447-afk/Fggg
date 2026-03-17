import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { User, Page, AvatarConfig, Game, MapObject, Server } from './types';
import { AvatarScene } from './components/AvatarScene';
import { AvatarEditor } from './pages/AvatarEditor';
import { StudioPage } from './pages/Studio';
import { GameCard } from './components/GameCard';
import { Play, ThumbsUp, User as UserIcon, Server as ServerIcon, Plus } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [user, setUser] = useState<User | null>(null);
  
  // Game Play State
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Initial Games
  const [publishedGames, setPublishedGames] = useState<Game[]>([
      { id: '1', title: 'Brookhaven RP [Clone]', creator: 'Roblox', thumbnail: 'https://tr.rbxcdn.com/c7895e63415714755106192131238497/768/432/Image/Png', likes: '94%', playing: 450000, mapData: undefined },
      { id: '2', title: 'Tower of Hell', creator: 'User123', thumbnail: 'https://tr.rbxcdn.com/a4db2969989a30283f36a53603d7c24f/768/432/Image/Png', likes: '88%', playing: 12000, mapData: undefined }
  ]);

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    bodyColors: {
      head: '#F5CD30', torso: '#0047AB', leftArm: '#F5CD30', rightArm: '#F5CD30', leftLeg: '#A2C429', rightLeg: '#A2C429'
    },
    faceTextureUrl: null,
    accessories: { hatModelUrl: null, shirtTextureUrl: null },
    hideFace: false
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('robloxCloneUser');
    if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (username: string) => {
    const newUser = { username: username, displayName: username, robux: 1540 };
    setUser(newUser);
    localStorage.setItem('robloxCloneUser', JSON.stringify(newUser));
    setIsAuthenticated(true);
  };

  const handlePublishGame = (gameData: { title: string, map: MapObject[] }) => {
      const newGame: Game = {
          id: Date.now().toString(),
          title: gameData.title,
          creator: user?.displayName || 'Anon',
          thumbnail: 'https://tr.rbxcdn.com/530e542ef9983424075f9227653606db/768/432/Image/Png', // Generic thumb
          likes: '0%',
          playing: 0,
          mapData: gameData.map
      };
      setPublishedGames([newGame, ...publishedGames]);
  };

  const openGameDetails = (game: Game) => {
      setSelectedGame(game);
      setCurrentPage(Page.PLAY);
  };

  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} />;

  // --- STUDIO MODE ---
  if (currentPage === Page.STUDIO) {
      return (
        <div className="h-screen w-screen bg-[#232527]">
           <button onClick={() => setCurrentPage(Page.HOME)} className="fixed top-3 right-3 z-50 bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs rounded shadow-md">Salir</button>
           <StudioPage onPublish={handlePublishGame} avatarConfig={avatarConfig} />
        </div>
      );
  }

  // --- GAME PLAY MODE (LAUNCHER) ---
  if (currentPage === Page.PLAY && selectedGame && user) {
      return <GamePlayerView game={selectedGame} avatarConfig={avatarConfig} onBack={() => setCurrentPage(Page.HOME)} user={user} />;
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-[#232527] flex flex-col font-sans">
        {user && <Navbar user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onLogout={() => { setUser(null); setIsAuthenticated(false); }} />}
        
        <div className="flex flex-1 pt-[0px] relative">
          <Sidebar isOpen={sidebarOpen} currentPage={currentPage} onNavigate={setCurrentPage} userName={user?.displayName || 'Guest'} />
          
          <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'} ml-0`}>
            {currentPage === Page.HOME && user && (
              <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
                 <div className="flex flex-col md:flex-row gap-8 mb-10">
                    <div className="flex-1">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Inicio</h1>
                        <p className="text-gray-400 text-lg">Hola, <span className="text-white font-bold">{user.displayName}</span></p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
                     <div className="lg:col-span-1 bg-[#2b2d31] p-4 rounded-xl border border-[#393b3d] flex flex-col items-center">
                          <div className="w-full aspect-[3/4] rounded-lg overflow-hidden relative">
                              <AvatarScene config={avatarConfig} interactive={false} />
                          </div>
                          <button onClick={() => setCurrentPage(Page.AVATAR)} className="mt-4 w-full bg-white/10 hover:bg-white/20 py-2 rounded-lg font-medium text-sm transition-colors text-white">Personalizar</button>
                     </div>
                     <div className="lg:col-span-3">
                         <h3 className="text-xl font-bold text-white mb-4">Experiencias</h3>
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                             {publishedGames.map(game => (
                                 <div key={game.id} onClick={() => openGameDetails(game)}>
                                     <GameCard game={game} />
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
              </div>
            )}
            
            {currentPage === Page.PROFILE && (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-gray-400">
                    <h2 className="text-2xl font-bold text-white mb-4">Perfil</h2>
                    <div className="w-64 h-64"><AvatarScene config={avatarConfig} /></div>
                </div>
            )}

            {currentPage === Page.AVATAR && (
                <div className="p-4 md:p-8 max-w-6xl mx-auto h-[calc(100vh-60px)] flex flex-col">
                     <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
                        <div className="flex-1 bg-[#111213] rounded-xl border border-[#393b3d] relative overflow-hidden shadow-2xl"><AvatarScene config={avatarConfig} /></div>
                        <div className="w-full md:w-[400px] bg-[#232527] rounded-xl border border-[#393b3d] overflow-hidden flex flex-col shadow-xl"><AvatarEditor currentConfig={avatarConfig} onUpdateConfig={setAvatarConfig} /></div>
                     </div>
                </div>
            )}
            
            {currentPage === Page.GAMES && (
                 <div className="p-8">
                     <h2 className="text-2xl font-bold text-white mb-6">Todas las Experiencias</h2>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                         {publishedGames.map(game => <div key={game.id} onClick={() => openGameDetails(game)}><GameCard game={game} /></div>)}
                     </div>
                 </div>
            )}

            {currentPage === Page.SETTINGS && (
                <div className="p-8 max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-8">Configuración</h2>
                    
                    <div className="bg-[#2b2d31] rounded-xl border border-[#393b3d] overflow-hidden">
                        <div className="p-6 border-b border-[#393b3d]">
                            <h3 className="text-xl font-bold text-white mb-2">Descargar Juego</h3>
                            <p className="text-gray-400 text-sm mb-4">Descarga el archivo index.html para ver el código fuente o ejecutarlo localmente.</p>
                            <button 
                                onClick={async () => {
                                    try {
                                        const response = await fetch('/index.html');
                                        const text = await response.text();
                                        const blob = new Blob([text], { type: 'text/html' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'index.html';
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                    } catch (err) {
                                        console.error("Error downloading index.html:", err);
                                        alert("Error al descargar el archivo.");
                                    }
                                }}
                                className="bg-[#00b06f] hover:bg-[#009e63] text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus size={18} /> Descargar index.html
                            </button>
                        </div>

                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2">Información de la Cuenta</h3>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">Nombre de Usuario</label>
                                    <div className="text-white font-medium">{user.username}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">Robux</label>
                                    <div className="text-white font-medium flex items-center gap-1">
                                        <div className="w-3 h-3 border border-white rotate-45 flex items-center justify-center text-[6px]">$</div>
                                        {user.robux}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </main>
        </div>
      </div>
    </HashRouter>
  );
}

// --- SUB-COMPONENT: GAME DETAILS & PLAYER ---
const GamePlayerView = ({ game, avatarConfig, onBack, user }: { game: Game, avatarConfig: AvatarConfig, onBack: () => void, user: User }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeServer, setActiveServer] = useState<Server | null>(null);
    const [servers, setServers] = useState<Server[]>([
        { id: '1', name: 'Servidor Público 1', players: 12, maxPlayers: 20, ping: 45 },
        { id: '2', name: 'Servidor Público 2', players: 18, maxPlayers: 20, ping: 52 },
        { id: '3', name: 'Solo Amigos', players: 3, maxPlayers: 10, ping: 38 },
    ]);

    const handleJoinServer = (server: Server) => {
        setActiveServer(server);
        setIsPlaying(true);
    };

    const handleCreateServer = () => {
        const newServer: Server = {
            id: Date.now().toString(),
            name: `Servidor de ${user.username}`,
            players: 1,
            maxPlayers: 10,
            ping: 20
        };
        setServers([...servers, newServer]);
        handleJoinServer(newServer);
    };

    const handleQuickPlay = () => {
        // Auto join first server or create random
        handleJoinServer(servers[0]);
    }

    if (isPlaying) {
        return (
            <div className="h-screen w-screen bg-black">
                <StudioPage 
                    onPublish={() => {}} 
                    avatarConfig={avatarConfig} 
                    initialMapData={game.mapData} 
                    isPlayMode={true} 
                    activeServer={activeServer}
                    playerName={user.displayName}
                    onExit={() => setIsPlaying(false)}
                />
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-[#232527] text-white overflow-y-auto">
            {/* Banner Blur Background */}
            <div className="absolute top-0 left-0 w-full h-[60vh] overflow-hidden opacity-30 pointer-events-none">
                 <img src={game.thumbnail} className="w-full h-full object-cover blur-xl" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#232527] via-transparent to-transparent"></div>
            </div>

            <div className="relative max-w-6xl mx-auto pt-20 px-6 z-10 flex flex-col md:flex-row gap-8">
                 {/* Game Thumbnail */}
                 <div className="w-full md:w-[640px] aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                     <img src={game.thumbnail} className="w-full h-full object-cover" />
                 </div>

                 {/* Info & Play */}
                 <div className="flex-1 flex flex-col gap-4">
                     <div>
                         <h1 className="text-4xl font-extrabold mb-2">{game.title}</h1>
                         <div className="flex items-center gap-2 text-gray-400">
                             <span>Por <span className="text-white font-bold hover:underline cursor-pointer">{game.creator}</span></span>
                         </div>
                     </div>

                     <div className="flex items-center gap-6 py-4 border-y border-gray-700">
                         <div className="flex flex-col">
                             <span className="text-lg font-bold text-white">{game.playing.toLocaleString()}</span>
                             <span className="text-xs text-gray-400">Activos</span>
                         </div>
                         <div className="flex flex-col">
                             <span className="text-lg font-bold text-white">{game.likes}</span>
                             <span className="text-xs text-gray-400">Me gusta</span>
                         </div>
                     </div>

                     {/* BIG PLAY BUTTON */}
                     <button 
                        onClick={handleQuickPlay}
                        className="bg-[#00b06f] hover:bg-[#009e63] w-full md:w-48 py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg transform transition-transform active:scale-95"
                     >
                         <div className="bg-white/20 p-1 rounded">
                             <Play fill="white" size={32} />
                         </div>
                         <span className="text-2xl font-bold">Jugar</span>
                     </button>
                     
                     <p className="text-gray-400 text-sm mt-4">
                         Bienvenido a {game.title}. Explora este mundo creado por la comunidad. 
                         {game.mapData ? ' ¡Este es un juego personalizado creado en el Studio!' : ' Este es un juego de ejemplo.'}
                     </p>
                 </div>
            </div>

            {/* SERVER LIST SECTION */}
            <div className="relative max-w-6xl mx-auto mt-12 px-6 pb-20 z-10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ServerIcon className="text-gray-400" /> Servidores
                    </h2>
                    <button 
                        onClick={handleCreateServer}
                        className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Plus size={16} /> Crear Servidor Privado
                    </button>
                </div>
                
                <div className="bg-[#2b2d31] rounded-lg border border-gray-700 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 bg-[#111213] text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <div className="col-span-5">Nombre del Servidor</div>
                        <div className="col-span-2 text-center">Jugadores</div>
                        <div className="col-span-2 text-center">Ping</div>
                        <div className="col-span-3 text-right">Acción</div>
                    </div>
                    {servers.map((server) => (
                        <div key={server.id} className="grid grid-cols-12 gap-4 p-4 border-t border-gray-700 items-center hover:bg-white/5 transition-colors">
                            <div className="col-span-5 font-bold text-white flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                {server.name}
                            </div>
                            <div className="col-span-2 text-center text-gray-300">
                                {server.players} / {server.maxPlayers}
                            </div>
                            <div className="col-span-2 text-center text-gray-400 text-xs">
                                {server.ping} ms
                            </div>
                            <div className="col-span-3 text-right">
                                <button 
                                    onClick={() => handleJoinServer(server)}
                                    className="bg-white text-black hover:bg-gray-200 px-6 py-1.5 rounded-lg text-sm font-bold shadow-sm"
                                >
                                    Unirse
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button onClick={onBack} className="fixed top-4 left-4 bg-black/50 px-4 py-2 rounded-full text-sm hover:bg-black/70 z-50 backdrop-blur-md border border-white/10">
                ← Volver al Inicio
            </button>
        </div>
    );
};

export default App;
