import React from 'react';
import { LogOut, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Perfil } from '../types/database';
import { Badge } from './Badge';

interface HeaderProps {
  perfil: Perfil;
}

export const Header: React.FC<HeaderProps> = ({ perfil }) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-zinc-200/80 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
            <Home className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 tracking-tight leading-none">
              Control de Alquileres
            </h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              5 Habitaciones · San Martin de Porres
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-medium text-zinc-900">
              {perfil.nombre_completo || perfil.email}
            </span>
            <Badge variant={perfil.rol === 'ADMIN' ? 'zinc' : 'emerald'} className="mt-0.5">
              {perfil.rol === 'ADMIN' ? 'Propietario / Admin' : 'Inquilino'}
            </Badge>
          </div>

          <button
            onClick={handleSignOut}
            title="Cerrar sesion"
            className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>
      </div>
    </header>
  );
};
