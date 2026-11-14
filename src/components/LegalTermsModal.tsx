import React, { useState } from 'react';
import { ShieldCheck, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface LegalTermsModalProps {
  contratoId: string;
  onAccepted: () => void;
}

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({ contratoId, onAccepted }) => {
  const [hasAgreed, setHasAgreed] = useState(false);
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('contratos')
        .update({
          reglas_aceptadas: true,
          fecha_aceptacion_reglas: new Date().toISOString(),
        })
        .eq('id', contratoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato-activo'] });
      onAccepted();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 stroke-[1.75] text-zinc-900 dark:text-zinc-100" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Terminos, Condiciones de Alquiler y Normas de Convivencia
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Conforme al Codigo Civil Peruano y la Ley N° 29733 de Proteccion de Datos Personales.
          </p>
        </div>

        {/* Clauses Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              1. Condiciones Economicas y Servicios
            </h3>
            <p>
              El alquiler de la habitacion se pacta bajo modalidad de mes adelantado. La tarifa mensual
              cubre el derecho de uso habitacional, suministro de agua potable y energia electrica para
              artefactos de consumo domestico estandar. El servicio de television por cable es opcional
              y genera un costo complementario fijo de S/ 15.00 mensuales incorporado al recibo del periodo.
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              2. Procedimiento de Pago y Clausula Antifraude (Yape / Efectivo)
            </h3>
            <p>
              El abono puede efectuarse en efectivo o mediante transferencia digital Yape. El envio de una
              captura de pantalla por este sistema cataloga la transaccion en estado "En revision" y no
              constituye constancia de cancelacion hasta la verificacion efectiva del deposito en la cuenta
              bancaria del propietario. La presentacion de comprobantes alterados, falsos o ajenos facultara
              la cancelacion inmediata del contrato por causa atribuible al inquilino.
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              3. Convivencia, Orden y Seguridad Nocturna Obligatoria
            </h3>
            <p>
              Queda estrictamente prohibido generar ruidos molestos, reproducir musica en alto volumen o
              realizar reuniones que alteren el descanso del resto de ocupantes. Es obligacion de cada
              inquilino mantener la limpieza de su habitacion y los espacios de transito comun. Para la
              prevencion de incidentes de seguridad, todo inquilino tiene la obligacion inexcusable de
              cerrar con llave y seguro la puerta de acceso principal de la calle en cada ingreso o salida.
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              4. Obligacion de Reporte Inmediato de Desperfectos
            </h3>
            <p>
              Cualquier averia en las instalaciones sanitarias (goteos, atoros, fugas) o electricas debe
              ser reportada sin dilacion mediante el modulo de Incidencias de este sistema, adjuntando la
              evidencia fotografica correspondiente para permitir su intervencion oportuna.
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              5. Consentimiento de Tratamiento de Datos (Ley N° 29733)
            </h3>
            <p>
              El inquilino declara que la informacion personal provista (identidad, telefono, correo y
              comprobantes de pago) sera tratada con reserva y custodia con la unica finalidad del control
              administrativo interno de la relacion contractual, no siendo transmitida a terceras partes.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col gap-3">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-800 dark:text-zinc-200 select-none">
            <input
              type="checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0 focus:ring-offset-0"
            />
            <span>
              He leido atentamente las condiciones economicas, el reglamento interno de convivencia y
              la normativa de seguridad, aceptando su cumplimiento estricto.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => acceptMutation.mutate()}
              disabled={!hasAgreed || acceptMutation.isPending}
              className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-medium rounded-lg px-4 py-2.5 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4 stroke-[1.75]" />
              {acceptMutation.isPending ? 'Registrando aceptacion...' : 'Confirmar y acceder al sistema'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
