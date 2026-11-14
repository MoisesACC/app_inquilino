import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Contrato, Cuarto, Perfil } from '../../types/database';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../Badge';
import { FileCheck, FileX, Edit2 } from 'lucide-react';

export const ContratosAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null);
  const [telefonoInput, setTelefonoInput] = useState('');
  const [dniInput, setDniInput] = useState('');

  // 1. Cargar todos los contratos con relaciones
  const { data: contratos = [], isLoading } = useQuery<(Contrato & { perfiles: Perfil; cuartos: Cuarto })[]>({
    queryKey: ['contratos-admin-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, perfiles(*), cuartos(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
  });

  // Mutacion: Finalizar Contrato
  const finalizarContratoMutation = useMutation({
    mutationFn: async (contratoId: string) => {
      const { error } = await supabase
        .from('contratos')
        .update({
          estado: 'FINALIZADO',
          fecha_fin: new Date().toISOString().split('T')[0],
        })
        .eq('id', contratoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos-admin-list'] });
      queryClient.invalidateQueries({ queryKey: ['cuartos'] });
    },
  });

  // Mutacion: Actualizar datos de contacto del inquilino (Telefono / DNI)
  const updatePerfilMutation = useMutation({
    mutationFn: async () => {
      if (!editingPerfil) return;
      const { error } = await supabase
        .from('perfiles')
        .update({
          telefono: telefonoInput.trim() || null,
          dni: dniInput.trim() || null,
        })
        .eq('id', editingPerfil.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos-admin-list'] });
      setEditingPerfil(null);
    },
  });

  const iniciarEdicionPerfil = (perfil: Perfil) => {
    setEditingPerfil(perfil);
    setTelefonoInput(perfil.telefono || '');
    setDniInput(perfil.dni || '');
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-zinc-500">
        Cargando listado general de contratos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
          Directorio de Contratos e Inquilinos
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Auditoria de terminos legales, aceptacion de normas y datos de contacto
        </p>
      </div>

      <div className="space-y-3">
        {contratos.length === 0 ? (
          <div className="bg-white border border-zinc-200/80 rounded-xl p-8 text-center text-xs text-zinc-400">
            No existen contratos emitidos en el sistema.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {contratos.map((c) => {
              const inquilino = c.perfiles;
              const cuarto = c.cuartos;
              const esActivo = c.estado === 'ACTIVO';

              return (
                <div
                  key={c.id}
                  className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 text-sm">
                        {cuarto?.numero || 'Habitacion'}
                      </span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-xs text-zinc-800 font-medium">
                        {inquilino?.nombre_completo || inquilino?.email}
                      </span>
                      <Badge variant={esActivo ? 'emerald' : 'zinc'}>
                        {esActivo ? 'Activo' : 'Finalizado'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.reglas_aceptadas ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <FileCheck className="w-3.5 h-3.5 stroke-[1.75]" />
                          Normas aceptadas ({formatDate(c.fecha_aceptacion_reglas)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <FileX className="w-3.5 h-3.5 stroke-[1.75]" />
                          Normas pendientes de firma digital
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-600">
                    <div>
                      <span className="text-zinc-400 block text-[11px]">Condiciones economicas</span>
                      <span className="font-semibold text-zinc-900 tabular-nums">
                        {formatCurrency(c.monto_alquiler)} mensual
                      </span>
                      {c.incluye_cable && (
                        <span className="text-[11px] text-zinc-500 block">
                          + S/ 15.00 TV Cable
                        </span>
                      )}
                      {Number(c.monto_garantia) > 0 && (
                        <span className="text-[11px] text-zinc-500 block">
                          Garantia: {formatCurrency(c.monto_garantia)}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-zinc-400 block text-[11px]">Plazos de corte</span>
                      <span>Dia {c.dia_corte} de cada mes</span>
                      <span className="text-[11px] text-zinc-500 block">
                        Inicio: {formatDate(c.fecha_inicio)}
                      </span>
                      {c.fecha_fin && (
                        <span className="text-[11px] text-zinc-500 block">
                          Termino: {formatDate(c.fecha_fin)}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 block text-[11px]">Contacto del inquilino</span>
                        {inquilino && (
                          <button
                            onClick={() => iniciarEdicionPerfil(inquilino)}
                            title="Editar datos de contacto"
                            className="text-zinc-400 hover:text-zinc-900 p-0.5"
                          >
                            <Edit2 className="w-3 h-3 stroke-[1.75]" />
                          </button>
                        )}
                      </div>
                      <span className="block truncate text-zinc-800">{inquilino?.email}</span>
                      <span className="text-[11px] text-zinc-500 block">
                        Tel: {inquilino?.telefono || 'No registrado'} · DNI: {inquilino?.dni || 'No reg.'}
                      </span>
                    </div>
                  </div>

                  {esActivo && (
                    <div className="pt-2 border-t border-zinc-100 flex justify-end">
                      <button
                        onClick={() => {
                          if (confirm(`Confirma dar por finalizado el contrato de ${cuarto?.numero}?`)) {
                            finalizarContratoMutation.mutate(c.id);
                          }
                        }}
                        disabled={finalizarContratoMutation.isPending}
                        className="text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded border border-rose-200 transition-colors font-medium disabled:opacity-50"
                      >
                        Finalizar contrato
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Editar Contacto Inquilino */}
      {editingPerfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-lg max-w-sm w-full p-4 space-y-3 text-xs">
            <div className="border-b border-zinc-200 pb-2">
              <h3 className="font-semibold text-zinc-900">
                Datos de Contacto · {editingPerfil.nombre_completo || editingPerfil.email}
              </h3>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">
                Numero de Telefono / Celular (para recordatorios WhatsApp)
              </label>
              <input
                type="tel"
                value={telefonoInput}
                onChange={(e) => setTelefonoInput(e.target.value)}
                placeholder="Ej. 987654321"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">
                DNI / Documento de Identidad
              </label>
              <input
                type="text"
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value)}
                placeholder="Ej. 72345678"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setEditingPerfil(null)}
                className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => updatePerfilMutation.mutate()}
                disabled={updatePerfilMutation.isPending}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
