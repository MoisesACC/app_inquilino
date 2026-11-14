-- ============================================================================
-- SISTEMA DE GESTION DE ALQUILER DE CUARTOS (PERU)
-- ARQUITECTURA POSTGRESQL + RLS + OWASP STORAGE
-- ============================================================================

-- 1. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA DE PERFILES (Vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre_completo TEXT,
    telefono TEXT,
    dni TEXT,
    rol TEXT NOT NULL DEFAULT 'INQUILINO' CHECK (rol IN ('ADMIN', 'INQUILINO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- 3. FUNCION HELPER DE SEGURIDAD (Evita recursion en politicas RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE id = (SELECT auth.uid())
      AND rol = 'ADMIN'
  );
$$;

-- 4. TABLA DE CUARTOS
CREATE TABLE IF NOT EXISTS public.cuartos (
    id SERIAL PRIMARY KEY,
    numero TEXT NOT NULL UNIQUE,
    piso INTEGER NOT NULL DEFAULT 1,
    precio_base NUMERIC(10,2) NOT NULL,
    estado TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO')),
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.cuartos ENABLE ROW LEVEL SECURITY;

-- Carga inicial de las 5 habitaciones
INSERT INTO public.cuartos (numero, piso, precio_base, estado, descripcion) VALUES
('Cuarto 1', 1, 400.00, 'DISPONIBLE', 'Habitacion individual piso 1, ventana a pasillo interno.'),
('Cuarto 2', 1, 400.00, 'DISPONIBLE', 'Habitacion individual piso 1, ventilacion directa.'),
('Cuarto 3', 2, 450.00, 'DISPONIBLE', 'Habitacion amplia piso 2, excelente iluminacion natural.'),
('Cuarto 4', 2, 450.00, 'DISPONIBLE', 'Habitacion piso 2, piso de ceramico y closet basico.'),
('Cuarto 5', 2, 500.00, 'DISPONIBLE', 'Habitacion principal piso 2, mayor metraje y bano privado.')
ON CONFLICT (numero) DO NOTHING;

-- 5. TABLA DE CONTRATOS (Terminos legales, reglas y tarifas)
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuarto_id INTEGER NOT NULL REFERENCES public.cuartos(id) ON DELETE RESTRICT,
    inquilino_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    dia_corte INTEGER NOT NULL DEFAULT 1 CHECK (dia_corte BETWEEN 1 AND 31),
    monto_alquiler NUMERIC(10,2) NOT NULL,
    monto_garantia NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    incluye_cable BOOLEAN NOT NULL DEFAULT FALSE,
    monto_cable NUMERIC(10,2) NOT NULL DEFAULT 15.00,
    mes_adelantado_inicial BOOLEAN NOT NULL DEFAULT TRUE,
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'FINALIZADO', 'CANCELADO')),
    reglas_aceptadas BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_aceptacion_reglas TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- 6. TABLA DE PAGOS (Mensualidades, Yape y Efectivo)
CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    inquilino_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    periodo TEXT NOT NULL, -- Formato estandar 'YYYY-MM'
    monto_base NUMERIC(10,2) NOT NULL,
    monto_cable NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    monto_total NUMERIC(10,2) NOT NULL,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'YAPE')),
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADO', 'RECHAZADO')),
    comprobante_url TEXT,
    fecha_pago DATE,
    fecha_revision TIMESTAMPTZ,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- 7. TABLA DE INCIDENCIAS (Averias y mantenimiento)
CREATE TABLE IF NOT EXISTS public.incidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuarto_id INTEGER NOT NULL REFERENCES public.cuartos(id) ON DELETE RESTRICT,
    inquilino_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    foto_url TEXT,
    estado TEXT NOT NULL DEFAULT 'REPORTADO' CHECK (estado IN ('REPORTADO', 'EN_PROCESO', 'SOLUCIONADO')),
    fecha_reporte TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    fecha_solucion TIMESTAMPTZ,
    notas_admin TEXT
);

ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

-- 8. TABLA DE HEALTH CHECK (Monitoreo para Cron-job.org)
CREATE TABLE IF NOT EXISTS public.health_check (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    status TEXT NOT NULL DEFAULT 'ok',
    checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.health_check ENABLE ROW LEVEL SECURITY;

INSERT INTO public.health_check (id, status)
VALUES (1, 'ok')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DISPARADORES (TRIGGERS)
-- ============================================================================

-- Disparador para crear el perfil tras el registro de usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre_completo, rol)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'INQUILINO'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Actualizacion automatica del estado del cuarto al crear contrato activo
CREATE OR REPLACE FUNCTION public.actualizar_estado_cuarto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.estado = 'ACTIVO' THEN
            UPDATE public.cuartos SET estado = 'OCUPADO' WHERE id = NEW.cuarto_id;
        ELSIF NEW.estado IN ('FINALIZADO', 'CANCELADO') THEN
            UPDATE public.cuartos SET estado = 'DISPONIBLE' WHERE id = NEW.cuarto_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_actualizar_estado_cuarto ON public.contratos;
CREATE TRIGGER tr_actualizar_estado_cuarto
    AFTER INSERT OR UPDATE ON public.contratos
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_estado_cuarto();

-- ============================================================================
-- POLITICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- Todos los evaluadores auth.uid() envueltos en (SELECT auth.uid()) para rendimiento
-- ============================================================================

-- Politicas para PERFILES
DROP POLICY IF EXISTS "perfiles_select_propio_o_admin" ON public.perfiles;
CREATE POLICY "perfiles_select_propio_o_admin"
    ON public.perfiles FOR SELECT
    USING (
        id = (SELECT auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "perfiles_update_propio_o_admin" ON public.perfiles;
CREATE POLICY "perfiles_update_propio_o_admin"
    ON public.perfiles FOR UPDATE
    USING (
        id = (SELECT auth.uid()) 
        OR public.is_admin()
    );

-- Politicas para CUARTOS
DROP POLICY IF EXISTS "cuartos_select_publico_autenticado" ON public.cuartos;
CREATE POLICY "cuartos_select_publico_autenticado"
    ON public.cuartos FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "cuartos_all_admin" ON public.cuartos;
CREATE POLICY "cuartos_all_admin"
    ON public.cuartos FOR ALL
    USING (public.is_admin());

-- Politicas para CONTRATOS
DROP POLICY IF EXISTS "contratos_select_inquilino_o_admin" ON public.contratos;
CREATE POLICY "contratos_select_inquilino_o_admin"
    ON public.contratos FOR SELECT
    USING (
        inquilino_id = (SELECT auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "contratos_insert_update_admin" ON public.contratos;
CREATE POLICY "contratos_insert_update_admin"
    ON public.contratos FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "contratos_update_aceptar_reglas" ON public.contratos;
CREATE POLICY "contratos_update_aceptar_reglas"
    ON public.contratos FOR UPDATE
    USING (inquilino_id = (SELECT auth.uid()))
    WITH CHECK (inquilino_id = (SELECT auth.uid()));

-- Politicas para PAGOS
DROP POLICY IF EXISTS "pagos_select_inquilino_o_admin" ON public.pagos;
CREATE POLICY "pagos_select_inquilino_o_admin"
    ON public.pagos FOR SELECT
    USING (
        inquilino_id = (SELECT auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "pagos_insert_inquilino_o_admin" ON public.pagos;
CREATE POLICY "pagos_insert_inquilino_o_admin"
    ON public.pagos FOR INSERT
    WITH CHECK (
        inquilino_id = (SELECT auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "pagos_update_inquilino_o_admin" ON public.pagos;
CREATE POLICY "pagos_update_inquilino_o_admin"
    ON public.pagos FOR UPDATE
    USING (
        inquilino_id = (SELECT auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "pagos_delete_admin" ON public.pagos;
CREATE POLICY "pagos_delete_admin"
    ON public.pagos FOR DELETE
    USING (public.is_admin());

-- Politicas para INCIDENCIAS
DROP POLICY IF EXISTS "incidencias_select_inquilino_o_admin" ON public.incidencias;
CREATE POLICY "incidencias_select_inquilino_o_admin"
    ON public.incidencias FOR SELECT
    USING (
        inquilino_id = (SELECT auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "incidencias_insert_inquilino_o_admin" ON public.incidencias;
CREATE POLICY "incidencias_insert_inquilino_o_admin"
    ON public.incidencias FOR INSERT
    WITH CHECK (
        inquilino_id = (SELECT auth.uid()) 
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "incidencias_update_admin" ON public.incidencias;
CREATE POLICY "incidencias_update_admin"
    ON public.incidencias FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "incidencias_delete_admin" ON public.incidencias;
CREATE POLICY "incidencias_delete_admin"
    ON public.incidencias FOR DELETE
    USING (public.is_admin());

-- Politicas para HEALTH_CHECK (Lectura publica para monitoreo)
DROP POLICY IF EXISTS "health_check_select_public" ON public.health_check;
CREATE POLICY "health_check_select_public"
    ON public.health_check FOR SELECT
    USING (true);

-- ============================================================================
-- STORAGE: CREACION Y RESTRICCION DE BUCKETS (OWASP)
-- Limite de 524288 bytes (500KB) y extensiones estrictas de imagen
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'comprobantes-yape', 
        'comprobantes-yape', 
        true, 
        524288, 
        ARRAY['image/webp', 'image/jpeg', 'image/png']
    ),
    (
        'fotos-incidencias', 
        'fotos-incidencias', 
        true, 
        524288, 
        ARRAY['image/webp', 'image/jpeg', 'image/png']
    )
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    public = true;

-- Politicas de Storage para COMPROBANTES-YAPE
DROP POLICY IF EXISTS "comprobantes_insert_propia_carpeta" ON storage.objects;
CREATE POLICY "comprobantes_insert_propia_carpeta"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'comprobantes-yape' 
        AND (
            (storage.foldername(name))[1] = (SELECT auth.uid())::text
            OR public.is_admin()
        )
    );

DROP POLICY IF EXISTS "comprobantes_select_propia_carpeta_o_admin" ON storage.objects;
CREATE POLICY "comprobantes_select_propia_carpeta_o_admin"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'comprobantes-yape' 
        AND (
            (storage.foldername(name))[1] = (SELECT auth.uid())::text
            OR public.is_admin()
        )
    );

-- Politicas de Storage para FOTOS-INCIDENCIAS
DROP POLICY IF EXISTS "incidencias_insert_propia_carpeta" ON storage.objects;
CREATE POLICY "incidencias_insert_propia_carpeta"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'fotos-incidencias' 
        AND (
            (storage.foldername(name))[1] = (SELECT auth.uid())::text
            OR public.is_admin()
        )
    );

DROP POLICY IF EXISTS "incidencias_select_propia_carpeta_o_admin" ON storage.objects;
CREATE POLICY "incidencias_select_propia_carpeta_o_admin"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'fotos-incidencias' 
        AND (
            (storage.foldername(name))[1] = (SELECT auth.uid())::text
            OR public.is_admin()
        )
    );
