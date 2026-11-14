import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Pago, Contrato, Cuarto, Perfil } from '../../types/database';
import { formatCurrency, formatDate, generateWhatsAppReminderUrl } from '../../utils/formatters';
import { Badge } from '../Badge';
import { Check, X, Eye, MessageSquare, Plus } from 'lucide-react';

export const PagosAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const [comprobanteModalUrl, setComprobanteModalUrl] = useState<string | null>(null);
  const [showManualPagoModal, setShowManualPagoModal] = useState(false);

  // Estados para nuevo pago manual en efectivo
  const [contratoIdManual, setContratoIdManual] = useState('');
  const [periodoManual, setPeriodoManual] = useState(new Date().toISOString().substring(0, 7));
  const [observacionesManual, setObservacionesManual] = useState('Abono en efectivo presencial');

  // 1. Cargar Pagos con relaciones
  const { data: pagos = [], isLoading } = useQuery<Pago[]>({
    queryKey: ['pagos-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos')
        .select('*, perfiles(*), contratos(*, cuartos(*))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any) || [];
    },
  });

  // 2. Cargar Contratos activos para el registro de pago manual
  const { data: contratosActivos = [] } = useQuery<(Contrato & { perfiles: Perfil; cuartos: Cuarto })[]>({
    queryKey: ['contratos-activos-para-pagos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, perfiles(*), cuartos(*)')
        .eq('estado', 'ACTIVO');
      if (error) throw error;
      return (data as any) || [];
    },
  });

  // Mutacion: Aprobar pago
  const aprobarPagoMutation = useMutation({
    mutationFn: async (pagoId: string) => {
      const { error } = await supabase
        .from('pagos')
        .update({
          estado: 'APROBADO',
          fecha_revision: new Date().toISOString(),
          fecha_pago: new Date().toISOString().split('T')[0],
        })
        .eq('id', pagoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['resumen-pagos'] });
    },
  });

  // Mutacion: Rechazar comprobante
  const rechazarPagoMutation = useMutation({
    mutationFn: async (pagoId: string) => {
      const motivo = prompt('Ingrese el motivo del rechazo del comprobante:');
      if (motivo === null) return;

      const { error } = await supabase
        .from('pagos')
        .update({
          estado: 'RECHAZADO',
          fecha_revision: new Date().toISOString(),
          observaciones: motivo || 'Comprobante no legible o monto discordante',
        })
        .eq('id', pagoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos-admin'] });
    },
  });

  // Mutacion: Registrar pago manual en efectivo
  const registrarPagoManualMutation = useMutation({
    mutationFn: async () => {
      const contrato = contratosActivos.find((c) => c.id === contratoIdManual);
      if (!contrato) throw new Error('Contrato no seleccionado');

      const montoBase = Number(contrato.monto_alquiler);
      const montoCable = contrato.incluye_cable ? Number(contrato.monto_cable) : 0;
      const montoTotal = montoBase + montoCable;

      const { error } = await supabase.from('pagos').insert({
        contrato_id: contrato.id,
        inquilino_id: contrato.inquilino_id,
        periodo: periodoManual,
        monto_base: montoBase,
        monto_cable: montoCable,
        monto_total: montoTotal,
        metodo_pago: 'EFECTIVO',
        estado: 'APROBADO',
        fecha_pago: new Date().toISOString().split('T')[0],
        fecha_revision: new Date().toISOString(),
        observaciones: observacionesManual,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos-admin'] });
      setShowManualPagoModal(false);
      setContratoIdManual('');
    },
  });

  // Filtrado de pagos
  const pagosPendientes = pagos.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_REVISION');
  const pagosHistorial = pagos.filter((p) => p.estado === 'APROBADO' || p.estado === 'RECHAZADO');

  const getBadgeVariant = (estado: Pago['estado']) => {
    switch (estado) {
      case 'APROBADO':
        return 'emerald';
      case 'EN_REVISION':
        return 'amber';
      case 'PENDIENTE':
      case 'RECHAZADO':
        return 'rose';
      default:
        return 'zinc';
    }
  };

  const getEstadoLabel = (estado: Pago['estado']) => {
    switch (estado) {
      case 'APROBADO':
        return 'Aprobado';
      case 'EN_REVISION':
        return 'En revision (Yape)';
      case 'PENDIENTE':
        return 'Pendiente';
      case 'RECHAZADO':
        return 'Rechazado';
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-zinc-500">
        Cargando registro contable de pagos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
            Control de Recaudacion
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Validacion de transferencias Yape y cobros en efectivo
          </p>
        </div>
        <button
          onClick={() => setShowManualPagoModal(true)}
          className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
          Registrar pago en efectivo
        </button>
      </div>

      {/* Seccion 1: Por revisar o cobrar */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
          Cuotas por regularizar ({pagosPendientes.length})
        </h3>

        {pagosPendientes.length === 0 ? (
          <div className="bg-white border border-zinc-200/80 rounded-xl p-6 text-center text-xs text-zinc-500">
            No existen pagos pendientes ni comprobantes por verificar en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pagosPendientes.map((pago) => {
              const cuarto = pago.contratos?.cuartos;
              const inquilino = pago.perfiles;
              const telefono = inquilino?.telefono;

              return (
                <div
                  key={pago.id}
                  className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 text-sm">
                        {cuarto?.numero || 'Habitacion'}
                      </span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-xs text-zinc-600">
                        {inquilino?.nombre_completo || inquilino?.email}
                      </span>
                      <Badge variant={getBadgeVariant(pago.estado)}>
                        {getEstadoLabel(pago.estado)}
                      </Badge>
                    </div>

                    <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Periodo: <strong className="text-zinc-800 tabular-nums">{pago.periodo}</strong></span>
                      <span>Metodo: <strong className="text-zinc-800">{pago.metodo_pago}</strong></span>
                      <span>
                        Monto total: <strong className="text-zinc-900 tabular-nums">{formatCurrency(pago.monto_total)}</strong>
                        {Number(pago.monto_cable) > 0 && (
                          <span className="text-zinc-500 text-[11px] ml-1">(incluye S/ 15 cable)</span>
                        )}
                      </span>
                    </div>

                    {pago.observaciones && (
                      <p className="text-[11px] text-zinc-500 italic">
                        Nota: {pago.observaciones}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Ver comprobante si existe */}
                    {pago.comprobante_url && (
                      <button
                        onClick={() => setComprobanteModalUrl(pago.comprobante_url)}
                        title="Ver captura de Yape"
                        className="inline-flex items-center gap-1 text-xs border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        <Eye className="w-3.5 h-3.5 stroke-[1.75]" />
                        Ver captura
                      </button>
                    )}

                    {/* Boton WhatsApp si tiene telefono */}
                    {telefono && (
                      <a
                        href={generateWhatsAppReminderUrl({
                          phone: telefono,
                          tenantName: inquilino?.nombre_completo || 'Inquilino',
                          roomNumber: cuarto?.numero || 'Habitacion',
                          period: pago.periodo,
                          amount: pago.monto_total,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar recordatorio formal por WhatsApp"
                        className="inline-flex items-center gap-1 text-xs border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        <MessageSquare className="w-3.5 h-3.5 stroke-[1.75]" />
                        WhatsApp
                      </a>
                    )}

                    {/* Botones de aprobacion / rechazo */}
                    <button
                      onClick={() => rechazarPagoMutation.mutate(pago.id)}
                      disabled={rechazarPagoMutation.isPending}
                      title="Rechazar pago o comprobante"
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4 stroke-[1.75]" />
                    </button>

                    <button
                      onClick={() => aprobarPagoMutation.mutate(pago.id)}
                      disabled={aprobarPagoMutation.isPending}
                      className="inline-flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[1.75]" />
                      Aprobar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seccion 2: Historial de Pagos Procesados */}
      <div className="space-y-3 pt-4 border-t border-zinc-200">
        <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
          Historial de operaciones resueltas ({pagosHistorial.length})
        </h3>

        <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Cuarto / Inquilino</th>
                  <th className="py-2.5 px-3">Periodo</th>
                  <th className="py-2.5 px-3">Metodo</th>
                  <th className="py-2.5 px-3">Monto</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pagosHistorial.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-zinc-400">
                      Sin registros historicos archivados.
                    </td>
                  </tr>
                ) : (
                  pagosHistorial.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 px-3 font-medium text-zinc-900">
                        {p.contratos?.cuartos?.numero || '-'} · {p.perfiles?.nombre_completo || p.perfiles?.email}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums">{p.periodo}</td>
                      <td className="py-2.5 px-3">{p.metodo_pago}</td>
                      <td className="py-2.5 px-3 font-semibold text-zinc-900 tabular-nums">
                        {formatCurrency(p.monto_total)}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={getBadgeVariant(p.estado)}>
                          {getEstadoLabel(p.estado)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-500 tabular-nums">
                        {formatDate(p.fecha_pago || p.updated_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Visualizador de Captura Yape */}
      {comprobanteModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <span className="text-xs font-semibold text-zinc-900">
                Constancia de Transferencia Yape
              </span>
              <button
                onClick={() => setComprobanteModalUrl(null)}
                className="text-zinc-500 hover:text-zinc-800"
              >
                <X className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-zinc-100 rounded-lg p-2">
              <img
                src={comprobanteModalUrl}
                alt="Comprobante Yape"
                className="rounded max-w-full h-auto object-contain"
              />
            </div>
            <p className="text-[11px] text-zinc-500 text-center">
              Verifique titular, hora, codigo de operacion y abono efectivo en su app bancaria antes de confirmar.
            </p>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago en Efectivo */}
      {showManualPagoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-lg max-w-md w-full p-5 space-y-4">
            <div className="border-b border-zinc-200 pb-3">
              <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
                Registrar Pago en Efectivo
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Ingreso manual directo de mensualidad cobrada en fisico
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Seleccionar Habitacion / Inquilino Activo
                </label>
                <select
                  value={contratoIdManual}
                  onChange={(e) => setContratoIdManual(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-900 focus:outline-none focus:border-zinc-900"
                >
                  <option value="">Seleccione contrato...</option>
                  {contratosActivos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.cuartos?.numero} · {c.perfiles?.nombre_completo || c.perfiles?.email} ({formatCurrency(Number(c.monto_alquiler) + (c.incluye_cable ? 15 : 0))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Periodo de Cobro (YYYY-MM)
                </label>
                <input
                  type="month"
                  value={periodoManual}
                  onChange={(e) => setPeriodoManual(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Observaciones / Detalle
                </label>
                <input
                  type="text"
                  value={observacionesManual}
                  onChange={(e) => setObservacionesManual(e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowManualPagoModal(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => registrarPagoManualMutation.mutate()}
                disabled={!contratoIdManual || registrarPagoManualMutation.isPending}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {registrarPagoManualMutation.isPending ? 'Guardando...' : 'Confirmar cobro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
