import React from 'react';
import { LogOut, Home, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Perfil } from '../types/database';
import { Badge } from './Badge';
import { Theme } from '../utils/theme';

interface HeaderProps {
  perfil: Perfil;
  theme: Theme;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ perfil, theme, onToggleTheme }) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 py-3 transition-colors">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
            <Home className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
              Control de Alquileres
            </h1>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              5 Habitaciones · San Martin de Porres
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200">
              {perfil.nombre_completo || perfil.email}
            </span>
            <Badge variant={perfil.rol === 'ADMIN' ? 'zinc' : 'emerald'} className="mt-0.5">
              {perfil.rol === 'ADMIN' ? 'Propietario / Admin' : 'Inquilino'}
            </Badge>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          {/* Switch Modo Claro / Oscuro */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Cambiar tema visual"
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 stroke-[1.75] text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 stroke-[1.75] text-zinc-700" />
            )}
          </button>

          {/* Cerrar Sesion */}
          <button
            onClick={handleSignOut}
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>
      </div>
    </header>
  );
};
