/**
 * Formateador de moneda en Soles Peruanos (PEN) con dos decimales exactos.
 */
export function formatCurrency(amount: number): string {
  return `S/ ${Number(amount).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formateador de fechas a formato estandar local (DD/MM/AAAA).
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('T')[0].split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}

/**
 * Genera el enlace oficial a WhatsApp con un mensaje administrativo formal,
 * sin emojis ni signos de exclamacion, para el cobro de mensualidades.
 */
export function generateWhatsAppReminderUrl(params: {
  phone: string;
  tenantName: string;
  roomNumber: string;
  period: string;
  amount: number;
}): string {
  const cleanPhone = params.phone.replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;

  const message = `Estimado(a) ${params.tenantName}, le saluda la administracion del inmueble. Le recordamos que el alquiler correspondiente al ${params.roomNumber} por el periodo ${params.period}, ascendente al monto de ${formatCurrency(params.amount)}, se encuentra pendiente. Agradeceremos adjuntar la constancia de pago en el sistema. Saludos cordiales.`;

  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
}
