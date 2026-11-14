import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Contrato, Cuarto, Pago } from '../../types/database';
import { compressImage } from '../../utils/compressImage';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../Badge';
import { Upload, Loader2 } from 'lucide-react';

interface SubirPagoYapeProps {
  contrato: Contrato & { cuartos?: Cuarto };
  userId: string;
}

export const SubirPagoYape: React.FC<SubirPagoYapeProps> = ({ contrato, userId }) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState(new Date().toISOString().substring(0, 7));
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const montoBase = Number(contrato.monto_alquiler);
  const montoCable = contrato.incluye_cable ? Number(contrato.monto_cable) : 0;
  const montoTotal = montoBase + montoCable;

  const { data: historial = [] } = useQuery<Pago[]>({
    queryKey: ['pagos-inquilino', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('inquilino_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsCompressing(true);

    try {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      setCompressedSizeKb(Math.round(compressed.size / 1024));
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la imagen');
    } finally {
      setIsCompressing(false);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Debe adjuntar una captura');

      const filePath = `${userId}/${Date.now()}_yape.webp`;
      const { error: storageError } = await supabase.storage
        .from('comprobantes-yape')
        .upload(filePath, selectedFile, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('comprobantes-yape')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('pagos').insert({
        contrato_id: contrato.id,
        inquilino_id: userId,
        periodo: periodo,
        monto_base: montoBase,
        monto_cable: montoCable,
        monto_total: montoTotal,
        metodo_pago: 'YAPE',
        estado: 'EN_REVISION',
        comprobante_url: publicUrl,
        observaciones: 'Constancia de Yape adjuntada desde el portal',
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos-inquilino'] });
      queryClient.invalidateQueries({ queryKey: ['ultimo-pago-inquilino'] });
      setSelectedFile(null);
      setPreviewUrl(null);
      setCompressedSizeKb(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Error al registrar el pago');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Reportar Pago de Mensualidad
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Adjunte su constancia de transferencia emitida por la aplicacion Yape
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Periodo a cancelar
            </label>
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Monto a transferir
            </label>
            <div className="border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 rounded-lg px-3 py-2 font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {formatCurrency(montoTotal)}
              {contrato.incluye_cable && (
                <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 ml-1">
                  (habitacion + S/ 15 cable)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Captura de pantalla de Yape
          </label>
          <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              id="file-yape"
              className="hidden"
            />
            <label htmlFor="file-yape" className="cursor-pointer flex flex-col items-center gap-1.5">
              <Upload className="w-5 h-5 stroke-[1.75] text-zinc-500 dark:text-zinc-400" />
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200">
                {selectedFile ? 'Cambiar captura seleccionada' : 'Seleccionar captura de pantalla'}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Se optimizara automaticamente en WebP ligero
              </span>
            </label>
          </div>
        </div>

        {isCompressing && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 justify-center py-2">
            <Loader2 className="w-4 h-4 stroke-[1.75] animate-spin" />
            Optimizando y convirtiendo imagen a formato ligero...
          </div>
        )}

        {previewUrl && (
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded border border-zinc-200 dark:border-zinc-700" />
            <div className="text-xs space-y-0.5">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">Imagen procesada correctamente</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                Peso optimizado: {compressedSizeKb} KB (limite seguro)
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-lg text-[11px] text-amber-900 dark:text-amber-300 leading-relaxed">
          <strong>Aviso administrativo:</strong> El envio de la constancia cataloga la transaccion en estado <em>En revision</em>. La cancelacion formal del recibo se hace efectiva una vez que el propietario valide el abono en su cuenta de ahorros.
        </div>

        <button
          onClick={() => uploadMutation.mutate()}
          disabled={!selectedFile || uploadMutation.isPending || isCompressing}
          className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 py-2.5 px-4 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {uploadMutation.isPending ? 'Enviando constancia...' : 'Adjuntar constancia de Yape'}
        </button>
      </div>

      {/* Historial */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Mis registros de pago ({historial.length})
        </h3>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 shadow-xs overflow-hidden">
          {historial.length === 0 ? (
            <p className="p-4 text-xs text-zinc-400 dark:text-zinc-500 text-center">
              Sin operaciones registradas a la fecha.
            </p>
          ) : (
            historial.map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Periodo {p.periodo}</span>
                    <Badge
                      variant={
                        p.estado === 'APROBADO'
                          ? 'emerald'
                          : p.estado === 'EN_REVISION'
                          ? 'amber'
                          : 'rose'
                      }
                    >
                      {p.estado === 'APROBADO'
                        ? 'Aprobado'
                        : p.estado === 'EN_REVISION'
                        ? 'En revision'
                        : 'Pendiente'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Metodo: {p.metodo_pago} · Registrado: {formatDate(p.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(p.monto_total)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
