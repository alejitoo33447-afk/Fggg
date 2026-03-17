import React from 'react';
import { Search, Bell, Settings, Menu } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onToggleSidebar, onLogout }) => {
  return (
    <nav className="sticky top-0 z-50 flex h-[50px] w-full items-center justify-between bg-[#232527] border-b border-[#393b3d] px-4">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-1 hover:bg-white/10 rounded-md transition-colors"
        >
          <Menu size={24} className="text-white" />
        </button>
        <div className="flex items-center gap-1 cursor-pointer">
           {/* Simple CSS Logo Simulation */}
           <div className="w-8 h-8 bg-white rounded-md transform rotate-12 border-4 border-[#232527] outline outline-2 outline-white flex items-center justify-center">
             <div className="w-2 h-2 bg-[#232527]"></div>
           </div>
           <span className="text-2xl font-bold tracking-tight text-white hidden md:block font-['Gotham_SSm','Inter']">
             Roblox
           </span>
        </div>
        <div className="hidden md:flex gap-6 ml-6 text-white font-medium text-sm">
            <a href="#" className="hover:opacity-80 transition-opacity border-b-2 border-white pb-3 pt-3">Descubrir</a>
            <a href="#" className="hover:opacity-80 transition-opacity text-gray-400">Tienda de avatares</a>
            <a href="#" className="hover:opacity-80 transition-opacity text-gray-400">Crear</a>
            <a href="#" className="hover:opacity-80 transition-opacity text-gray-400">Robux</a>
        </div>
      </div>

      {/* Center Search */}
      <div className="hidden md:flex flex-1 max-w-2xl px-4">
        <div className="relative w-full">
            <input 
              type="text" 
              placeholder="Buscar" 
              className="w-full bg-[#111213] text-white border border-[#393b3d] rounded-full py-1.5 pl-4 pr-10 focus:outline-none focus:border-white transition-colors text-sm"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 md:gap-4">
        <button className="text-white hover:bg-white/10 p-2 rounded-full hidden sm:block">
           <div className="flex items-center gap-1 bg-[#393b3d] px-3 py-1 rounded-full">
              <span className="w-4 h-4 border-2 border-white rounded-sm rotate-45 flex items-center justify-center text-[8px] font-bold">$</span>
              <span className="text-xs font-bold">{user.robux}</span>
           </div>
        </button>
        
        <button className="text-white hover:bg-white/10 p-2 rounded-full relative">
          <Bell size={22} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#232527]"></span>
        </button>
        
        <button 
            onClick={onLogout}
            className="text-white hover:bg-white/10 p-2 rounded-full" 
            title="Cerrar Sesión"
        >
          <Settings size={22} />
        </button>
        
        <div className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden border border-gray-600">
           {/* Placeholder for user avatar in nav */}
           <div className="w-full h-full bg-gradient-to-tr from-yellow-400 to-yellow-200"></div>
        </div>
      </div>
    </nav>
  );
};