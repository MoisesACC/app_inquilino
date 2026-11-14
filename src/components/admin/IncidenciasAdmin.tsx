import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Incidencia } from '../../types/database';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../Badge';
import { CheckCircle2, Clock, Eye, X } from 'lucide-react';

export const IncidenciasAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  const { data: incidencias = [], isLoading } = useQuery<Incidencia[]>({
    queryKey: ['incidencias-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidencias')
        .select('*, cuartos(*), perfiles(*)')
        .order('fecha_reporte', { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
  });

  const updateEstadoMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: Incidencia['estado'] }) => {
      const updateData: any = { estado };
      if (estado === 'SOLUCIONADO') {
        updateData.fecha_solucion = new Date().toISOString();
      }
      const { error } = await supabase
        .from('incidencias')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidencias-admin'] });
    },
  });

  const getBadgeVariant = (estado: Incidencia['estado']) => {
    switch (estado) {
      case 'REPORTADO':
        return 'rose';
      case 'EN_PROCESO':
        return 'amber';
      case 'SOLUCIONADO':
        return 'emerald';
      default:
        return 'zinc';
    }
  };

  const getEstadoLabel = (estado: Incidencia['estado']) => {
    switch (estado) {
      case 'REPORTADO':
        return 'Reportado';
      case 'EN_PROCESO':
        return 'En atencion';
      case 'SOLUCIONADO':
        return 'Solucionado';
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Cargando registro de incidencias y mantenimiento...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Gestion de Averias e Incidencias
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Reportes de mantenimiento generados por los inquilinos
        </p>
      </div>

      {incidencias.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
          No se registran averias pendientes ni reclamos en las habitaciones.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {incidencias.map((inc) => (
            <div
              key={inc.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                    {inc.cuartos?.numero || 'Habitacion'}
                  </span>
                  <span className="text-zinc-400">·</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">{inc.titulo}</span>
                  <Badge variant={getBadgeVariant(inc.estado)}>
                    {getEstadoLabel(inc.estado)}
                  </Badge>
                </div>

                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {inc.descripcion}
                </p>

                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-3 pt-1">
                  <span>Reportado por: {inc.perfiles?.nombre_completo || inc.perfiles?.email}</span>
                  <span>·</span>
                  <span>Fecha: {formatDate(inc.fecha_reporte)}</span>
                  {inc.fecha_solucion && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-700 dark:text-emerald-400">Resuelto: {formatDate(inc.fecha_solucion)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Acciones y Foto */}
              <div className="flex items-center gap-2 self-end md:self-start">
                {inc.foto_url && (
                  <button
                    onClick={() => setFotoModalUrl(inc.foto_url)}
                    className="inline-flex items-center gap-1 text-xs border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <Eye className="w-3.5 h-3.5 stroke-[1.75]" />
                    Ver foto
                  </button>
                )}

                {inc.estado === 'REPORTADO' && (
                  <button
                    onClick={() => updateEstadoMutation.mutate({ id: inc.id, estado: 'EN_PROCESO' })}
                    disabled={updateEstadoMutation.isPending}
                    className="inline-flex items-center gap-1 text-xs border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5 stroke-[1.75]" />
                    En atencion
                  </button>
                )}

                {inc.estado !== 'SOLUCIONADO' && (
                  <button
                    onClick={() => updateEstadoMutation.mutate({ id: inc.id, estado: 'SOLUCIONADO' })}
                    disabled={updateEstadoMutation.isPending}
                    className="inline-flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[1.75]" />
                    Solucionado
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Foto de Averia */}
      {fotoModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Fotografia de Averia Adjunta
              </span>
              <button
                onClick={() => setFotoModalUrl(null)}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 rounded-lg p-2">
              <img
                src={fotoModalUrl}
                alt="Foto incidencia"
                className="rounded max-w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
