import React from 'react';
import { Contrato, Cuarto, Pago } from '../../types/database';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../Badge';
import { Calendar, Tv, KeyRound, VolumeX } from 'lucide-react';

interface ResumenInquilinoProps {
  contrato: Contrato & { cuartos?: Cuarto };
  ultimoPago?: Pago | null;
  onGoToPago: () => void;
}

export const ResumenInquilino: React.FC<ResumenInquilinoProps> = ({
  contrato,
  ultimoPago,
  onGoToPago,
}) => {
  const cuarto = contrato.cuartos;
  const montoBase = Number(contrato.monto_alquiler);
  const montoCable = contrato.incluye_cable ? Number(contrato.monto_cable) : 0;
  const totalMensual = montoBase + montoCable;

  const estaAlDia = ultimoPago?.estado === 'APROBADO';
  const enRevision = ultimoPago?.estado === 'EN_REVISION';

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Resumen de Alquiler · {cuarto?.numero || 'Habitacion'}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Piso {cuarto?.piso} · Contrato vigente desde el {formatDate(contrato.fecha_inicio)}
        </p>
      </div>

      {/* Tarjeta de Estado de Cuenta */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Estado de cuota actual
          </span>
          {estaAlDia ? (
            <Badge variant="emerald">Al dia</Badge>
          ) : enRevision ? (
            <Badge variant="amber">En validacion de transferencia</Badge>
          ) : (
            <Badge variant="rose">Pago pendiente</Badge>
          )}
        </div>

        {/* Desglose economico */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Alquiler mensual (incluye agua y luz basica)</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
              {formatCurrency(montoBase)}
            </span>
          </div>

          {contrato.incluye_cable && (
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 stroke-[1.75] text-zinc-500" />
                Servicio opcional de TV por Cable
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                {formatCurrency(montoCable)}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <span>Total cuota mensual</span>
            <span className="tabular-nums">{formatCurrency(totalMensual)}</span>
          </div>
        </div>

        {/* Informacion de corte */}
        <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 stroke-[1.75] text-zinc-700 dark:text-zinc-300" />
            Dia de corte mensual:
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Dia {contrato.dia_corte} de cada mes
          </span>
        </div>

        {/* Boton de accion si esta pendiente */}
        {!estaAlDia && !enRevision && (
          <button
            onClick={onGoToPago}
            className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 py-2.5 px-4 rounded-lg text-xs font-medium transition-colors"
          >
            Adjuntar constancia de Yape
          </button>
        )}
      </div>

      {/* Recordatorios de Normas y Convivencia */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Normas y Seguridad del Predio
        </h3>
        <div className="grid grid-cols-1 gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-start gap-2.5 p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-800">
            <KeyRound className="w-4 h-4 stroke-[1.75] text-zinc-800 dark:text-zinc-200 shrink-0 mt-0.5" />
            <div>
              <strong className="text-zinc-900 dark:text-zinc-100 block font-medium">Seguridad nocturna obligatoria</strong>
              Cierre siempre con llave y pestillo la puerta exterior de acceso a la calle tanto al salir como al retornar.
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-800">
            <VolumeX className="w-4 h-4 stroke-[1.75] text-zinc-800 dark:text-zinc-200 shrink-0 mt-0.5" />
            <div>
              <strong className="text-zinc-900 dark:text-zinc-100 block font-medium">Convivencia y descanso</strong>
              Prohibido realizar reuniones ruidosas, fiestas o poner musica en volumen elevado que perturbe a otros ocupantes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
