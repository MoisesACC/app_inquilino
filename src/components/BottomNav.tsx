import React from 'react';
import { BedDouble, Receipt, AlertCircle, Users, LucideIcon } from 'lucide-react';
import { RolUsuario } from '../types/database';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface BottomNavProps {
  rol: RolUsuario;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingPaymentsCount?: number;
  reportedIncidentsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  rol,
  activeTab,
  onTabChange,
  pendingPaymentsCount = 0,
  reportedIncidentsCount = 0,
}) => {
  const adminTabs: TabItem[] = [
    { id: 'cuartos', label: 'Cuartos', icon: BedDouble },
    { id: 'pagos', label: 'Pagos', icon: Receipt, badge: pendingPaymentsCount },
    { id: 'incidencias', label: 'Incidencias', icon: AlertCircle, badge: reportedIncidentsCount },
    { id: 'contratos', label: 'Contratos', icon: Users },
  ];

  const tenantTabs: TabItem[] = [
    { id: 'resumen', label: 'Mi Cuarto', icon: BedDouble },
    { id: 'pagos', label: 'Pagos', icon: Receipt },
    { id: 'incidencias', label: 'Incidencias', icon: AlertCircle },
  ];

  const tabs: TabItem[] = rol === 'ADMIN' ? adminTabs : tenantTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 safe-area-bottom transition-colors">
      <div className="grid grid-cols-4 sm:grid-cols-4 h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 transition-colors relative ${
                isActive
                  ? 'text-zinc-950 dark:text-zinc-100 font-medium'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-4 h-4 stroke-[1.75] ${
                    isActive ? 'stroke-zinc-950 dark:stroke-zinc-100' : 'stroke-zinc-500 dark:stroke-zinc-400'
                  }`}
                />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-rose-600 text-white text-[9px] font-semibold flex items-center justify-center rounded-full tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-zinc-950 dark:bg-zinc-100 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
