import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Cuarto, Contrato, Perfil } from '../../types/database';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../Badge';
import { Plus, Tv, UserCheck } from 'lucide-react';

export const CuartosAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCuarto, setSelectedCuarto] = useState<Cuarto | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Formulario nuevo contrato
  const [inquilinoId, setInquilinoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [diaCorte, setDiaCorte] = useState(1);
  const [montoAlquiler, setMontoAlquiler] = useState(400);
  const [montoGarantia, setMontoGarantia] = useState(0);
  const [incluyeCable, setIncluyeCable] = useState(false);
  const [mesAdelantado, setMesAdelantado] = useState(true);

  // 1. Cargar Cuartos
  const { data: cuartos = [], isLoading: loadingCuartos } = useQuery<Cuarto[]>({
    queryKey: ['cuartos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cuartos')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Cargar Contratos Activos con datos de inquilino
  const { data: contratos = [], isLoading: loadingContratos } = useQuery<(Contrato & { perfiles: Perfil })[]>({
    queryKey: ['contratos-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, perfiles(*)')
        .eq('estado', 'ACTIVO');
      if (error) throw error;
      return (data as any) || [];
    },
  });

  // 3. Cargar lista de Inquilinos registrados
  const { data: perfiles = [] } = useQuery<Perfil[]>({
    queryKey: ['perfiles-inquilinos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('rol', 'INQUILINO')
        .order('nombre_completo', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Metricas
  const totalCuartos = cuartos.length;
  const ocupadosCount = cuartos.filter(
    (c) => c.estado === 'OCUPADO' || contratos.some((con) => con.cuarto_id === c.id)
  ).length;
  const disponiblesCount = totalCuartos - ocupadosCount;
  const facturacionMensualProyectada = contratos.reduce((acc, curr) => {
    return acc + Number(curr.monto_alquiler) + (curr.incluye_cable ? Number(curr.monto_cable) : 0);
  }, 0);

  // Mutacion: Crear Contrato
  const createContratoMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCuarto || !inquilinoId) throw new Error('Datos incompletos');

      const { data: nuevoContrato, error: contratoError } = await supabase
        .from('contratos')
        .insert({
          cuarto_id: selectedCuarto.id,
          inquilino_id: inquilinoId,
          fecha_inicio: fechaInicio,
          dia_corte: diaCorte,
          monto_alquiler: montoAlquiler,
          monto_garantia: montoGarantia,
          incluye_cable: incluyeCable,
          monto_cable: 15.00,
          mes_adelantado_inicial: mesAdelantado,
          estado: 'ACTIVO',
          reglas_aceptadas: false,
        })
        .select()
        .single();

      if (contratoError) throw contratoError;

      // Generar el primer cobro del mes adelantado
      const periodoActual = fechaInicio.substring(0, 7);
      const montoTotalPrimerMes = Number(montoAlquiler) + (incluyeCable ? 15.00 : 0);

      const { error: pagoError } = await supabase.from('pagos').insert({
        contrato_id: nuevoContrato.id,
        inquilino_id: inquilinoId,
        periodo: periodoActual,
        monto_base: montoAlquiler,
        monto_cable: incluyeCable ? 15.00 : 0.00,
        monto_total: montoTotalPrimerMes,
        metodo_pago: 'EFECTIVO',
        estado: 'PENDIENTE',
        observaciones: 'Cuota de ingreso por mes adelantado',
      });

      if (pagoError) throw pagoError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuartos'] });
      queryClient.invalidateQueries({ queryKey: ['contratos-activos'] });
      queryClient.invalidateQueries({ queryKey: ['pagos-admin'] });
      setShowModal(false);
      setSelectedCuarto(null);
    },
  });

  // Mutacion: Finalizar contrato
  const finalizarContratoMutation = useMutation({
    mutationFn: async (contratoId: string) => {
      const { error } = await supabase
        .from('contratos')
        .update({ estado: 'FINALIZADO', fecha_fin: new Date().toISOString().split('T')[0] })
        .eq('id', contratoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuartos'] });
      queryClient.invalidateQueries({ queryKey: ['contratos-activos'] });
    },
  });

  const abrirModalContrato = (cuarto: Cuarto) => {
    setSelectedCuarto(cuarto);
    setMontoAlquiler(cuarto.precio_base);
    setShowModal(true);
  };

  if (loadingCuartos || loadingContratos) {
    return (
      <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Cargando estado de las habitaciones...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Control de Habitaciones
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            5 unidades habitacionales bajo arrendamiento mensual
          </p>
        </div>
      </div>

      {/* Banner de Metricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">Total Unidades</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{totalCuartos}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">Ocupadas</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{ocupadosCount}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">Disponibles</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{disponiblesCount}</span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">Renta Mensual Estimada</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatCurrency(facturacionMensualProyectada)}
          </span>
        </div>
      </div>

      {/* Grid de 5 Cuartos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cuartos.map((cuarto) => {
          const contratoActivo = contratos.find((c) => c.cuarto_id === cuarto.id);
          const estaOcupado = cuarto.estado === 'OCUPADO' || !!contratoActivo;

          return (
            <div
              key={cuarto.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {cuarto.numero}
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Piso {cuarto.piso}</p>
                  </div>
                  <Badge variant={estaOcupado ? 'rose' : 'emerald'}>
                    {estaOcupado ? 'Ocupado' : 'Disponible'}
                  </Badge>
                </div>

                <div className="mt-3 py-2 border-y border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Tarifa base</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(cuarto.precio_base)}
                  </span>
                </div>

                {/* Info Inquilino */}
                {contratoActivo ? (
                  <div className="mt-3 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200 font-medium">
                      <UserCheck className="w-3.5 h-3.5 stroke-[1.75] text-zinc-700 dark:text-zinc-400" />
                      <span className="truncate">{contratoActivo.perfiles?.nombre_completo || contratoActivo.perfiles?.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>Corte: dia {contratoActivo.dia_corte}</span>
                      {contratoActivo.incluye_cable && (
                        <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                          <Tv className="w-3 h-3 stroke-[1.75]" /> Cable (+S/ 15)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Inicio: {formatDate(contratoActivo.fecha_inicio)}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600 italic">
                    Sin contrato vigente asignado.
                  </p>
                )}
              </div>

              {/* Accion */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                {estaOcupado && contratoActivo ? (
                  <button
                    onClick={() => {
                      if (confirm(`Confirma la finalizacion del contrato para ${cuarto.numero}?`)) {
                        finalizarContratoMutation.mutate(contratoActivo.id);
                      }
                    }}
                    disabled={finalizarContratoMutation.isPending}
                    className="w-full text-center text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 py-1.5 px-3 rounded-md transition-colors border border-rose-200 dark:border-rose-900 font-medium disabled:opacity-50"
                  >
                    Finalizar contrato
                  </button>
                ) : (
                  <button
                    onClick={() => abrirModalContrato(cuarto)}
                    className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
                    Asignar contrato
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Crear Contrato */}
      {showModal && selectedCuarto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Asignar Contrato · {selectedCuarto.numero}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Piso {selectedCuarto.piso} · Tarifa referencial: {formatCurrency(selectedCuarto.precio_base)}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Seleccionar Inquilino
                </label>
                <select
                  value={inquilinoId}
                  onChange={(e) => setInquilinoId(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                >
                  <option value="">Seleccione un inquilino registrado...</option>
                  {perfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_completo || p.email} ({p.telefono || 'Sin tel.'})
                    </option>
                  ))}
                </select>
                {perfiles.length === 0 && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    No hay inquilinos registrados. Pida al inquilino registrarse con su correo en el sistema.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Dia de Corte Mensual
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={diaCorte}
                    onChange={(e) => setDiaCorte(Number(e.target.value))}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Alquiler Mensual (S/)
                  </label>
                  <input
                    type="number"
                    step="10"
                    value={montoAlquiler}
                    onChange={(e) => setMontoAlquiler(Number(e.target.value))}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Garantia (S/)
                  </label>
                  <input
                    type="number"
                    step="10"
                    value={montoGarantia}
                    onChange={(e) => setMontoGarantia(Number(e.target.value))}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={incluyeCable}
                    onChange={(e) => setIncluyeCable(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900"
                  />
                  <span>
                    Servicio opcional de TV por Cable (adiciona <span className="font-medium tabular-nums">S/ 15.00</span> al mes)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={mesAdelantado}
                    onChange={(e) => setMesAdelantado(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900"
                  />
                  <span>
                    Modalidad obligatoria de mes adelantado al ingresar
                  </span>
                </label>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                Al activar el contrato se emitira el primer recibo en estado PENDIENTE por un total de{' '}
                <strong className="text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {formatCurrency(Number(montoAlquiler) + (incluyeCable ? 15.00 : 0))}
                </strong>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => createContratoMutation.mutate()}
                disabled={!inquilinoId || createContratoMutation.isPending}
                className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {createContratoMutation.isPending ? 'Activando...' : 'Crear contrato activo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
