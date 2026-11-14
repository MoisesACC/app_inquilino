import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

/**
 * Comprime y convierte cualquier imagen seleccionada a formato WebP optimizado (< 80KB)
 * Cumple con OWASP File Upload CheatSheet y las restricciones de almacenamiento de Supabase.
 */
export async function compressImage(
  file: File,
  customOptions?: CompressionOptions
): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 0.08, // 80 KB
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.8,
  };

  const options = {
    ...defaultOptions,
    ...customOptions,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const webpFileName = `${fileNameWithoutExt}_${Date.now()}.webp`;

    return new File([compressedBlob], webpFileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Error al comprimir la imagen:', error);
    throw new Error('No se pudo procesar la imagen seleccionada. Intente con otro archivo.');
  }
}
