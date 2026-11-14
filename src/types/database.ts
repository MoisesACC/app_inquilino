export type RolUsuario = 'ADMIN' | 'INQUILINO';
export type EstadoCuarto = 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO';
export type EstadoContrato = 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';
export type EstadoPago = 'PENDIENTE' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';
export type MetodoPago = 'EFECTIVO' | 'YAPE';
export type EstadoIncidencia = 'REPORTADO' | 'EN_PROCESO' | 'SOLUCIONADO';

export interface Perfil {
  id: string;
  email: string;
  nombre_completo: string | null;
  telefono: string | null;
  dni: string | null;
  rol: RolUsuario;
  created_at: string;
  updated_at: string;
}

export interface Cuarto {
  id: number;
  numero: string;
  piso: number;
  precio_base: number;
  estado: EstadoCuarto;
  descripcion: string | null;
  created_at: string;
}

export interface Contrato {
  id: string;
  cuarto_id: number;
  inquilino_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  dia_corte: number;
  monto_alquiler: number;
  monto_garantia: number;
  incluye_cable: boolean;
  monto_cable: number;
  mes_adelantado_inicial: boolean;
  estado: EstadoContrato;
  reglas_aceptadas: boolean;
  fecha_aceptacion_reglas: string | null;
  created_at: string;
  updated_at: string;
  cuartos?: Cuarto;
  perfiles?: Perfil;
}

export interface Pago {
  id: string;
  contrato_id: string;
  inquilino_id: string;
  periodo: string;
  monto_base: number;
  monto_cable: number;
  monto_total: number;
  metodo_pago: MetodoPago;
  estado: EstadoPago;
  comprobante_url: string | null;
  fecha_pago: string | null;
  fecha_revision: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  perfiles?: Perfil;
  contratos?: Contrato & { cuartos?: Cuarto };
}

export interface Incidencia {
  id: string;
  cuarto_id: number;
  inquilino_id: string;
  titulo: string;
  descripcion: string;
  foto_url: string | null;
  estado: EstadoIncidencia;
  fecha_reporte: string;
  fecha_solucion: string | null;
  notas_admin: string | null;
  cuartos?: Cuarto;
  perfiles?: Perfil;
}

export interface HealthCheck {
  id: number;
  status: string;
  checked_at: string;
}
