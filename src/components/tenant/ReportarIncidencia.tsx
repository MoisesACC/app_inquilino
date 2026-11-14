import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Contrato, Cuarto, Incidencia } from '../../types/database';
import { compressImage } from '../../utils/compressImage';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../Badge';
import { Upload, Loader2 } from 'lucide-react';

interface ReportarIncidenciaProps {
  contrato: Contrato & { cuartos?: Cuarto };
  userId: string;
}

export const ReportarIncidencia: React.FC<ReportarIncidenciaProps> = ({ contrato, userId }) => {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: misIncidencias = [] } = useQuery<Incidencia[]>({
    queryKey: ['mis-incidencias', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidencias')
        .select('*')
        .eq('inquilino_id', userId)
        .order('fecha_reporte', { ascending: false });
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
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la imagen');
    } finally {
      setIsCompressing(false);
    }
  };

  const incidenciaMutation = useMutation({
    mutationFn: async () => {
      if (!titulo.trim() || !descripcion.trim()) {
        throw new Error('Debe completar el titulo y la descripcion');
      }

      let fotoUrl = null;

      if (selectedFile) {
        const filePath = `${userId}/${Date.now()}_incidencia.webp`;
        const { error: storageError } = await supabase.storage
          .from('fotos-incidencias')
          .upload(filePath, selectedFile, {
            contentType: 'image/webp',
            upsert: false,
          });

        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase.storage
          .from('fotos-incidencias')
          .getPublicUrl(filePath);

        fotoUrl = publicUrl;
      }

      const { error: dbError } = await supabase.from('incidencias').insert({
        cuarto_id: contrato.cuarto_id,
        inquilino_id: userId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        foto_url: fotoUrl,
        estado: 'REPORTADO',
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-incidencias'] });
      setTitulo('');
      setDescripcion('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccessMsg('Incidencia registrada. El propietario revisara el caso.');
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Error al enviar el reporte');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Reportar Averia o Desperfecto
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Notifique filtraciones, fallas electricas o de cerrajeria con fotografia adjunta
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Asunto / Tipo de desperfecto
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Goteo constante en llave de lavatorio"
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Descripcion detallada
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describa cuando comenzo y la magnitud de la falla..."
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Fotografia de evidencia
            </label>
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                id="file-incidencia"
                className="hidden"
              />
              <label htmlFor="file-incidencia" className="cursor-pointer flex flex-col items-center gap-1.5">
                <Upload className="w-5 h-5 stroke-[1.75] text-zinc-500 dark:text-zinc-400" />
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200">
                  {selectedFile ? 'Cambiar imagen' : 'Adjuntar fotografia del desperfecto'}
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Optimizacion automatica WebP
                </span>
              </label>
            </div>
          </div>

          {isCompressing && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 justify-center py-1">
              <Loader2 className="w-4 h-4 stroke-[1.75] animate-spin" />
              Procesando fotografia...
            </div>
          )}

          {previewUrl && (
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded border border-zinc-200 dark:border-zinc-700" />
              <div className="text-xs">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Fotografia lista para adjuntar</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Optimizada a resolucion segura</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-400">
              {successMsg}
            </div>
          )}

          <button
            onClick={() => incidenciaMutation.mutate()}
            disabled={!titulo.trim() || !descripcion.trim() || incidenciaMutation.isPending}
            className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 py-2.5 px-4 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {incidenciaMutation.isPending ? 'Enviando reporte...' : 'Registrar incidencia'}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Mis incidencias reportadas ({misIncidencias.length})
        </h3>
        <div className="space-y-2">
          {misIncidencias.length === 0 ? (
            <p className="p-4 text-xs text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-center">
              No tiene averias registradas actualmente.
            </p>
          ) : (
            misIncidencias.map((inc) => (
              <div
                key={inc.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 shadow-xs text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{inc.titulo}</span>
                  <Badge
                    variant={
                      inc.estado === 'SOLUCIONADO'
                        ? 'emerald'
                        : inc.estado === 'EN_PROCESO'
                        ? 'amber'
                        : 'rose'
                    }
                  >
                    {inc.estado === 'SOLUCIONADO'
                      ? 'Solucionado'
                      : inc.estado === 'EN_PROCESO'
                      ? 'En atencion'
                      : 'Reportado'}
                  </Badge>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300">{inc.descripcion}</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 pt-1">
                  Fecha de registro: {formatDate(inc.fecha_reporte)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
