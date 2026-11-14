import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './lib/supabase';
import { Perfil, Contrato, Cuarto, Pago } from './types/database';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthScreen } from './components/AuthScreen';
import { LegalTermsModal } from './components/LegalTermsModal';

// Vistas Admin
import { CuartosAdmin } from './components/admin/CuartosAdmin';
import { PagosAdmin } from './components/admin/PagosAdmin';
import { IncidenciasAdmin } from './components/admin/IncidenciasAdmin';
import { ContratosAdmin } from './components/admin/ContratosAdmin';

// Vistas Inquilino
import { ResumenInquilino } from './components/tenant/ResumenInquilino';
import { SubirPagoYape } from './components/tenant/SubirPagoYape';
import { ReportarIncidencia } from './components/tenant/ReportarIncidencia';

export const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('cuartos');

  // 1. Escuchar sesion de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Consulta de Perfil del Usuario
  const { data: perfil, isLoading: loadingPerfil } = useQuery<Perfil | null>({
    queryKey: ['perfil', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (error) {
        // En caso de que el trigger todavia no termine de crear el perfil
        return {
          id: session.user.id,
          email: session.user.email || '',
          nombre_completo: session.user.user_metadata?.full_name || 'Usuario',
          telefono: null,
          dni: null,
          rol: 'INQUILINO',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // 3. Consulta de Contrato Activo si es inquilino
  const { data: contratoActivo, refetch: refetchContrato } = useQuery<(Contrato & { cuartos: Cuarto }) | null>({
    queryKey: ['contrato-activo', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id || perfil?.rol !== 'INQUILINO') return null;
      const { data, error } = await supabase
        .from('contratos')
        .select('*, cuartos(*)')
        .eq('inquilino_id', session.user.id)
        .eq('estado', 'ACTIVO')
        .maybeSingle();

      if (error) return null;
      return (data as any) || null;
    },
    enabled: !!session?.user?.id && perfil?.rol === 'INQUILINO',
  });

  // 4. Consulta de Ultimo Pago para el Inquilino
  const { data: ultimoPago } = useQuery<Pago | null>({
    queryKey: ['ultimo-pago-inquilino', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id || perfil?.rol !== 'INQUILINO') return null;
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('inquilino_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data;
    },
    enabled: !!session?.user?.id && perfil?.rol === 'INQUILINO',
  });

  // 5. Contadores para badges del Admin
  const { data: countPagosPendientes = 0 } = useQuery<number>({
    queryKey: ['count-pagos-pendientes'],
    queryFn: async () => {
      if (perfil?.rol !== 'ADMIN') return 0;
      const { count, error } = await supabase
        .from('pagos')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['PENDIENTE', 'EN_REVISION']);
      if (error) return 0;
      return count || 0;
    },
    enabled: perfil?.rol === 'ADMIN',
  });

  const { data: countIncidencias = 0 } = useQuery<number>({
    queryKey: ['count-incidencias-pendientes'],
    queryFn: async () => {
      if (perfil?.rol !== 'ADMIN') return 0;
      const { count, error } = await supabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'REPORTADO');
      if (error) return 0;
      return count || 0;
    },
    enabled: perfil?.rol === 'ADMIN',
  });

  // Inicializar pestana por defecto segun rol
  useEffect(() => {
    if (perfil) {
      if (perfil.rol === 'ADMIN') {
        setActiveTab('cuartos');
      } else {
        setActiveTab('resumen');
      }
    }
  }, [perfil?.rol]);

  if (authLoading || (session && loadingPerfil)) {
    return (
      <div className="min-h-full flex items-center justify-center bg-zinc-50 text-xs text-zinc-500">
        Iniciando sistema de gestion...
      </div>
    );
  }

  if (!session || !perfil) {
    return <AuthScreen />;
  }

  const esAdmin = perfil.rol === 'ADMIN';

  return (
    <div className="min-h-full flex flex-col bg-zinc-50 pb-20 md:pb-6">
      <Header perfil={perfil} />

      {/* Modal Obligatorio de Aceptacion de Reglas para Inquilinos */}
      {!esAdmin && contratoActivo && !contratoActivo.reglas_aceptadas && (
        <LegalTermsModal
          contratoId={contratoActivo.id}
          onAccepted={() => refetchContrato()}
        />
      )}

      {/* Navegacion en pantallas medianas y grandes */}
      <div className="hidden md:block bg-white border-b border-zinc-200/80 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-1 py-2">
          {esAdmin ? (
            <>
              <button
                onClick={() => setActiveTab('cuartos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'cuartos'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                Habitaciones (5)
              </button>
              <button
                onClick={() => setActiveTab('pagos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                  activeTab === 'pagos'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                Pagos y Recaudacion
                {countPagosPendientes > 0 && (
                  <span className="ml-1.5 bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full tabular-nums">
                    {countPagosPendientes}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('incidencias')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                  activeTab === 'incidencias'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                Averias e Incidencias
                {countIncidencias > 0 && (
                  <span className="ml-1.5 bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full tabular-nums">
                    {countIncidencias}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('contratos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'contratos'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                Contratos e Inquilinos
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('resumen')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'resumen'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                Resumen de mi habitacion
              </button>
              <button
                onClick={() => setActiveTab('pagos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'pagos'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                Reportar pago Yape
              </button>
              <button
                onClick={() => setActiveTab('incidencias')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'incidencias'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                Reportar averia
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {esAdmin ? (
          <>
            {activeTab === 'cuartos' && <CuartosAdmin />}
            {activeTab === 'pagos' && <PagosAdmin />}
            {activeTab === 'incidencias' && <IncidenciasAdmin />}
            {activeTab === 'contratos' && <ContratosAdmin />}
          </>
        ) : contratoActivo ? (
          <>
            {activeTab === 'resumen' && (
              <ResumenInquilino
                contrato={contratoActivo}
                ultimoPago={ultimoPago}
                onGoToPago={() => setActiveTab('pagos')}
              />
            )}
            {activeTab === 'pagos' && (
              <SubirPagoYape contrato={contratoActivo} userId={session.user.id} />
            )}
            {activeTab === 'incidencias' && (
              <ReportarIncidencia contrato={contratoActivo} userId={session.user.id} />
            )}
          </>
        ) : (
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 text-center max-w-md mx-auto space-y-3 shadow-xs">
            <h2 className="text-sm font-semibold text-zinc-900">
              Sin contrato activo asignado
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Su cuenta de correo ({perfil.email}) esta registrada en la base de datos, pero el propietario todavia no ha vinculado su habitacion. Por favor, comuniquese con la administracion para que active su contrato de alquiler.
            </p>
          </div>
        )}
      </main>

      {/* Barra de Navegacion Inferior para Moviles */}
      <BottomNav
        rol={perfil.rol}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        pendingPaymentsCount={countPagosPendientes}
        reportedIncidentsCount={countIncidencias}
      />
    </div>
  );
};
