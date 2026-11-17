-- ============================================================================
-- MIGRACIÓN INCREMENTAL: VENTAS, PAGOS Y STOCK POR LOTE
-- Compatible con la base existente (esquema previo a 001_schema.sql).
-- No elimina tablas ni datos existentes.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MÉTODOS DE PAGO
-- ============================================================================
CREATE TABLE IF NOT EXISTS metodo_pago (
    id_metodo_pago SERIAL PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO metodo_pago (id_metodo_pago, nombre)
VALUES
    (1, 'efectivo'),
    (2, 'transferencia_bancaria'),
    (3, 'qr_simple'),
    (4, 'tarjeta_debito'),
    (5, 'tarjeta_credito')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. VENTA + DETALLE_VENTA + PAGO
-- ============================================================================
CREATE TABLE IF NOT EXISTS venta (
    id_venta SERIAL PRIMARY KEY,
    id_empleado INTEGER
        REFERENCES empleado(id_empleado)
        ON DELETE SET NULL,
    id_cliente INTEGER
        REFERENCES cliente(id_cliente)
        ON DELETE SET NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_venta DECIMAL(12,2) NOT NULL CHECK (total_venta >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'completada'
        CHECK (estado IN ('pendiente','completada','anulada','devuelta_parcial','devuelta_total')),
    observaciones TEXT
);

ALTER TABLE venta ALTER COLUMN total_venta DROP DEFAULT;
ALTER TABLE venta ALTER COLUMN estado SET DEFAULT 'completada';

CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle_venta SERIAL PRIMARY KEY,
    id_venta INTEGER NOT NULL
        REFERENCES venta(id_venta)
        ON DELETE CASCADE,
    id_medicamento INTEGER NOT NULL
        REFERENCES medicamento(id_medicamento)
        ON DELETE RESTRICT,
    id_lote INTEGER NOT NULL
        REFERENCES lote_medicamento(id_lote)
        ON DELETE RESTRICT,
    id_receta INTEGER
        REFERENCES receta_medica(id_receta)
        ON DELETE SET NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    descuento DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    receta_presentada BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (subtotal = (cantidad * precio_unitario) - descuento),
    CHECK (receta_presentada = FALSE OR id_receta IS NOT NULL),
    CHECK (id_receta IS NULL OR receta_presentada = TRUE)
);

CREATE TABLE IF NOT EXISTS pago (
    id_pago SERIAL PRIMARY KEY,
    id_venta INTEGER NOT NULL
        REFERENCES venta(id_venta)
        ON DELETE CASCADE,
    id_metodo_pago INTEGER NOT NULL
        REFERENCES metodo_pago(id_metodo_pago)
        ON DELETE RESTRICT,
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    referencia VARCHAR(100),
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'confirmado'
        CHECK (estado_pago IN ('pendiente','confirmado','anulado'))
);

CREATE INDEX IF NOT EXISTS idx_venta_empleado ON venta(id_empleado);
CREATE INDEX IF NOT EXISTS idx_venta_cliente ON venta(id_cliente);
CREATE INDEX IF NOT EXISTS idx_venta_fecha ON venta(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON detalle_venta(id_venta);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_medicamento ON detalle_venta(id_medicamento);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_lote ON detalle_venta(id_lote);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_receta ON detalle_venta(id_receta);
CREATE INDEX IF NOT EXISTS idx_pago_venta ON pago(id_venta);
CREATE INDEX IF NOT EXISTS idx_pago_metodo ON pago(id_metodo_pago);

-- ============================================================================
-- 3. FUNCIONES DE STOCK Y VENTAS
-- ============================================================================

-- Asigna automáticamente el lote activo con vencimiento más próximo (FEFO).
CREATE OR REPLACE FUNCTION fn_venta_asignar_lote_fefo()
RETURNS TRIGGER AS $$
DECLARE
    v_id_lote INTEGER;
BEGIN
    SELECT l.id_lote
    INTO v_id_lote
    FROM lote_medicamento l
    JOIN medicamento m
        ON m.id_medicamento = l.id_medicamento
       AND m.activo = 1
    JOIN (
        SELECT i.id_lote, SUM(i.cantidad_actual) AS stock_total
        FROM inventario i
        JOIN ubicacion_inventario u
            ON u.id_ubicacion = i.id_ubicacion
           AND u.activa = TRUE
        GROUP BY i.id_lote
    ) s ON s.id_lote = l.id_lote
    WHERE l.id_medicamento = NEW.id_medicamento
      AND l.estado = 'activo'
      AND l.fecha_vencimiento >= CURRENT_DATE
      AND s.stock_total >= NEW.cantidad
    ORDER BY l.fecha_vencimiento ASC, l.fecha_ingreso ASC, l.id_lote
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe un lote activo, vigente y con stock suficiente para el medicamento %.',
            NEW.id_medicamento;
    END IF;

    NEW.id_lote := v_id_lote;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_asignar_lote_fefo ON detalle_venta;
CREATE TRIGGER trg_venta_asignar_lote_fefo
BEFORE INSERT ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_venta_asignar_lote_fefo();

-- Descuenta el stock del lote asignado, recorriendo ubicaciones si es necesario.
CREATE OR REPLACE FUNCTION fn_venta_descontar_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_restante INTEGER := NEW.cantidad;
    v_tomado INTEGER;
    v_fila RECORD;
BEGIN
    FOR v_fila IN
        SELECT i.id_inventario, i.cantidad_actual
        FROM inventario i
        JOIN lote_medicamento l
            ON l.id_lote = i.id_lote
           AND l.estado = 'activo'
        JOIN ubicacion_inventario u
            ON u.id_ubicacion = i.id_ubicacion
           AND u.activa = TRUE
        WHERE i.id_lote = NEW.id_lote
          AND i.cantidad_actual > 0
        ORDER BY i.fecha_actualizacion ASC, i.id_inventario
        FOR UPDATE
    LOOP
        v_tomado := LEAST(v_fila.cantidad_actual, v_restante);

        UPDATE inventario
        SET cantidad_actual = cantidad_actual - v_tomado,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_inventario = v_fila.id_inventario;

        v_restante := v_restante - v_tomado;
        EXIT WHEN v_restante = 0;
    END LOOP;

    IF v_restante > 0 THEN
        RAISE EXCEPTION
            'No hay stock suficiente en ubicaciones activas para el lote %.',
            NEW.id_lote;
    END IF;

    UPDATE medicamento
    SET stock = COALESCE((
            SELECT SUM(i.cantidad_actual)
            FROM inventario i
            JOIN lote_medicamento l ON l.id_lote = i.id_lote
            WHERE l.id_medicamento = NEW.id_medicamento
        ), 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id_medicamento = NEW.id_medicamento;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_descontar_stock ON detalle_venta;
CREATE TRIGGER trg_venta_descontar_stock
AFTER INSERT ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_venta_descontar_stock();

-- Recalcula el total de la venta a partir de sus detalles.
CREATE OR REPLACE FUNCTION fn_venta_recalcular_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE venta
    SET total_venta = COALESCE((
        SELECT SUM(dv.subtotal)
        FROM detalle_venta dv
        WHERE dv.id_venta = NEW.id_venta
    ), 0)
    WHERE id_venta = NEW.id_venta;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_recalcular_total ON detalle_venta;
CREATE TRIGGER trg_venta_recalcular_total
AFTER INSERT ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_venta_recalcular_total();

-- Los detalles de venta no deben modificarse; una corrección se hace anulando.
CREATE OR REPLACE FUNCTION fn_venta_bloquear_detalle_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los detalles de venta no deben modificarse. Anule la venta y registre una nueva.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_bloquear_detalle_update ON detalle_venta;
CREATE TRIGGER trg_venta_bloquear_detalle_update
BEFORE UPDATE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_venta_bloquear_detalle_update();

-- Valida el método de pago activo al registrar un pago.
CREATE OR REPLACE FUNCTION fn_venta_validar_pago_operacion()
RETURNS TRIGGER AS $$
DECLARE
    v_metodo_activo BOOLEAN;
    v_estado_venta VARCHAR(20);
BEGIN
    IF NEW.estado_pago = 'anulado' THEN
        RETURN NEW;
    END IF;

    SELECT activo INTO v_metodo_activo
    FROM metodo_pago
    WHERE id_metodo_pago = NEW.id_metodo_pago;

    IF NOT FOUND OR v_metodo_activo IS NOT TRUE THEN
        RAISE EXCEPTION 'El método de pago % no está activo.', NEW.id_metodo_pago;
    END IF;

    SELECT estado INTO v_estado_venta
    FROM venta
    WHERE id_venta = NEW.id_venta;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta % no existe.', NEW.id_venta;
    END IF;

    IF v_estado_venta IN ('anulada', 'devuelta_total') THEN
        RAISE EXCEPTION 'No se puede registrar un pago para una venta en estado %.', v_estado_venta;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_validar_pago_operacion ON pago;
CREATE TRIGGER trg_venta_validar_pago_operacion
BEFORE INSERT OR UPDATE ON pago
FOR EACH ROW
EXECUTE FUNCTION fn_venta_validar_pago_operacion();

-- Valida que los pagos no anulados no superen el total de la venta.
CREATE OR REPLACE FUNCTION fn_venta_validar_pago_no_exceder()
RETURNS TRIGGER AS $$
DECLARE
    v_total DECIMAL(12,2);
    v_suma DECIMAL(12,2);
BEGIN
    IF NEW.estado_pago = 'anulado' THEN
        RETURN NEW;
    END IF;

    SELECT total_venta INTO v_total
    FROM venta
    WHERE id_venta = NEW.id_venta;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta % no existe.', NEW.id_venta;
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT COALESCE(SUM(monto), 0) INTO v_suma
        FROM pago
        WHERE id_venta = NEW.id_venta
          AND estado_pago <> 'anulado';
    ELSE
        SELECT COALESCE(SUM(monto), 0) INTO v_suma
        FROM pago
        WHERE id_venta = NEW.id_venta
          AND estado_pago <> 'anulado'
          AND id_pago <> NEW.id_pago;
    END IF;

    IF v_suma + NEW.monto > v_total THEN
        RAISE EXCEPTION
            'Los pagos registrados (%) superan el total de la venta (%).',
            v_suma + NEW.monto,
            v_total;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_validar_pago_no_exceder ON pago;
CREATE TRIGGER trg_venta_validar_pago_no_exceder
BEFORE INSERT OR UPDATE ON pago
FOR EACH ROW
EXECUTE FUNCTION fn_venta_validar_pago_no_exceder();

-- Los pagos no deben eliminarse; se anulan.
CREATE OR REPLACE FUNCTION fn_venta_bloquear_pago_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los pagos no deben eliminarse. Use estado anulado.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_bloquear_pago_delete ON pago;
CREATE TRIGGER trg_venta_bloquear_pago_delete
BEFORE DELETE ON pago
FOR EACH ROW
EXECUTE FUNCTION fn_venta_bloquear_pago_delete();

-- Una venta solo se completa con detalles, pago confirmado suficiente y
-- empleado/cliente activos (cuando se hayan indicado).
CREATE OR REPLACE FUNCTION fn_venta_validar_cierre()
RETURNS TRIGGER AS $$
DECLARE
    v_detalles INTEGER;
    v_total DECIMAL(12,2);
    v_pagado DECIMAL(12,2);
    v_empleado_activo BOOLEAN;
    v_cliente_activo BOOLEAN;
BEGIN
    IF NEW.estado <> 'completada' OR (TG_OP = 'UPDATE' AND OLD.estado = 'completada') THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*), COALESCE(SUM(subtotal), 0)
    INTO v_detalles, v_total
    FROM detalle_venta
    WHERE id_venta = NEW.id_venta;

    IF v_detalles = 0 THEN
        RAISE EXCEPTION 'La venta % no puede completarse sin detalles.', NEW.id_venta;
    END IF;

    SELECT COALESCE(SUM(monto), 0)
    INTO v_pagado
    FROM pago
    WHERE id_venta = NEW.id_venta
      AND estado_pago = 'confirmado';

    IF v_pagado < v_total THEN
        RAISE EXCEPTION
            'La venta % no puede completarse. Total: %, pagado: %.',
            NEW.id_venta,
            v_total,
            v_pagado;
    END IF;

    IF NEW.id_empleado IS NOT NULL THEN
        SELECT activo INTO v_empleado_activo
        FROM empleado
        WHERE id_empleado = NEW.id_empleado;

        IF v_empleado_activo IS DISTINCT FROM TRUE THEN
            RAISE EXCEPTION 'El empleado % está inactivo.', NEW.id_empleado;
        END IF;
    END IF;

    IF NEW.id_cliente IS NOT NULL THEN
        SELECT activo INTO v_cliente_activo
        FROM cliente
        WHERE id_cliente = NEW.id_cliente;

        IF v_cliente_activo IS DISTINCT FROM TRUE THEN
            RAISE EXCEPTION 'El cliente % está inactivo.', NEW.id_cliente;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_validar_cierre ON venta;
CREATE TRIGGER trg_venta_validar_cierre
BEFORE INSERT OR UPDATE OF estado ON venta
FOR EACH ROW
EXECUTE FUNCTION fn_venta_validar_cierre();

-- Valida que el lote exista, corresponda al medicamento y esté vigente.
CREATE OR REPLACE FUNCTION fn_venta_validar_lote()
RETURNS TRIGGER AS $$
DECLARE
    v_lote RECORD;
BEGIN
    SELECT l.id_medicamento, l.estado, l.fecha_vencimiento
    INTO v_lote
    FROM lote_medicamento l
    WHERE l.id_lote = NEW.id_lote;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El lote % no existe.', NEW.id_lote;
    END IF;

    IF v_lote.id_medicamento <> NEW.id_medicamento THEN
        RAISE EXCEPTION
            'El lote % no corresponde al medicamento %.',
            NEW.id_lote,
            NEW.id_medicamento;
    END IF;

    IF v_lote.estado <> 'activo' THEN
        RAISE EXCEPTION 'El lote % no está activo.', NEW.id_lote;
    END IF;

    IF v_lote.fecha_vencimiento < CURRENT_DATE THEN
        RAISE EXCEPTION 'El lote % está vencido.', NEW.id_lote;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_validar_lote ON detalle_venta;
CREATE TRIGGER trg_venta_validar_lote
BEFORE INSERT OR UPDATE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_venta_validar_lote();

-- Valida receta del cliente, vigencia y cantidad prescrita.
CREATE OR REPLACE FUNCTION fn_venta_validar_receta()
RETURNS TRIGGER AS $$
DECLARE
    v_requiere INTEGER;
    v_receta RECORD;
    v_prescrita INTEGER;
    v_dispensada INTEGER;
BEGIN
    SELECT requiere_receta
    INTO v_requiere
    FROM medicamento
    WHERE id_medicamento = NEW.id_medicamento;

    IF COALESCE(v_requiere, 0) = 0 THEN
        RETURN NEW;
    END IF;

    IF NEW.receta_presentada IS NOT TRUE OR NEW.id_receta IS NULL THEN
        RAISE EXCEPTION
            'El medicamento % requiere receta médica presentada y registrada.',
            NEW.id_medicamento;
    END IF;

    SELECT
        r.id_cliente AS cliente_receta,
        r.estado,
        r.fecha_vencimiento,
        v.id_cliente AS cliente_venta
    INTO v_receta
    FROM venta v
    JOIN receta_medica r
        ON r.id_receta = NEW.id_receta
    WHERE v.id_venta = NEW.id_venta;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró la venta % o la receta %.', NEW.id_venta, NEW.id_receta;
    END IF;

    IF v_receta.cliente_venta IS NULL THEN
        RAISE EXCEPTION 'La venta % debe tener cliente para validar la receta.', NEW.id_venta;
    END IF;

    IF v_receta.estado <> 'vigente' THEN
        RAISE EXCEPTION 'La receta % no está vigente.', NEW.id_receta;
    END IF;

    IF v_receta.fecha_vencimiento < CURRENT_DATE THEN
        RAISE EXCEPTION 'La receta % está vencida.', NEW.id_receta;
    END IF;

    IF v_receta.cliente_receta <> v_receta.cliente_venta THEN
        RAISE EXCEPTION
            'La receta % pertenece a un cliente distinto al de la venta.',
            NEW.id_receta;
    END IF;

    SELECT cantidad_prescrita
    INTO v_prescrita
    FROM detalle_receta
    WHERE id_receta = NEW.id_receta
      AND id_medicamento = NEW.id_medicamento;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El medicamento % no está incluido en la receta %.',
            NEW.id_medicamento,
            NEW.id_receta;
    END IF;

    SELECT COALESCE(SUM(dv.cantidad), 0)
    INTO v_dispensada
    FROM detalle_venta dv
    WHERE dv.id_receta = NEW.id_receta
      AND dv.id_medicamento = NEW.id_medicamento
      AND dv.id_detalle_venta <> COALESCE(NEW.id_detalle_venta, 0);

    IF v_dispensada + NEW.cantidad > v_prescrita THEN
        RAISE EXCEPTION
            'La cantidad solicitada (%) supera la cantidad prescrita (%). Ya dispensado: %.',
            NEW.cantidad, v_prescrita, v_dispensada;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_validar_receta ON detalle_venta;
CREATE TRIGGER trg_venta_validar_receta
BEFORE INSERT OR UPDATE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_venta_validar_receta();

-- Bloquea la venta si el cliente tiene alergia a un principio activo del medicamento.
CREATE OR REPLACE FUNCTION fn_venta_validar_alergias()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente INTEGER;
    v_conflicto RECORD;
BEGIN
    SELECT id_cliente
    INTO v_cliente
    FROM venta
    WHERE id_venta = NEW.id_venta;

    IF v_cliente IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT
        a.nombre AS nombre_alergia,
        pa.nombre AS nombre_principio
    INTO v_conflicto
    FROM cliente_alergia ca
    JOIN alergia a
        ON a.id_alergia = ca.id_alergia
       AND a.activo = TRUE
    JOIN alergia_principio_activo apa
        ON apa.id_alergia = ca.id_alergia
    JOIN principio_activo pa
        ON pa.id_principio_activo = apa.id_principio_activo
       AND pa.activo = TRUE
    JOIN medicamento_principio_activo mpa
        ON mpa.id_principio_activo = apa.id_principio_activo
    WHERE ca.id_cliente = v_cliente
      AND mpa.id_medicamento = NEW.id_medicamento
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION
            'Venta bloqueada por seguridad: el cliente tiene alergia % relacionada con %.',
            v_conflicto.nombre_alergia,
            v_conflicto.nombre_principio;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_validar_alergias ON detalle_venta;
CREATE TRIGGER trg_venta_validar_alergias
BEFORE INSERT OR UPDATE ON detalle_venta
FOR EACH ROW
EXECUTE FUNCTION fn_venta_validar_alergias();

-- Mantiene sincronizado medicamento.stock (columna legada) con inventario.
CREATE OR REPLACE FUNCTION fn_inventario_sync_stock_medicamento()
RETURNS TRIGGER AS $$
DECLARE
    v_id_medicamento INTEGER;
BEGIN
    SELECT l.id_medicamento
    INTO v_id_medicamento
    FROM lote_medicamento l
    WHERE l.id_lote = COALESCE(NEW.id_lote, OLD.id_lote);

    IF v_id_medicamento IS NOT NULL THEN
        UPDATE medicamento
        SET stock = COALESCE((
                SELECT SUM(i.cantidad_actual)
                FROM inventario i
                JOIN lote_medicamento l ON l.id_lote = i.id_lote
                WHERE l.id_medicamento = v_id_medicamento
            ), 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id_medicamento = v_id_medicamento;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventario_sync_stock ON inventario;
CREATE TRIGGER trg_inventario_sync_stock
AFTER INSERT OR UPDATE OR DELETE ON inventario
FOR EACH ROW
EXECUTE FUNCTION fn_inventario_sync_stock_medicamento();

-- ============================================================================
-- 4. BACKFILL: STOCK LEGADO -> INVENTARIO POR LOTE
-- ============================================================================
DO $$
DECLARE
    v_id_ubicacion INTEGER;
    v_id_lote INTEGER;
    v_fila RECORD;
BEGIN
    SELECT id_ubicacion
    INTO v_id_ubicacion
    FROM ubicacion_inventario
    WHERE activa = TRUE
    ORDER BY id_ubicacion
    LIMIT 1;

    FOR v_fila IN
        SELECT m.id_medicamento,
               m.stock,
               COALESCE(SUM(i.cantidad_actual), 0) AS stock_inventario
        FROM medicamento m
        LEFT JOIN lote_medicamento l ON l.id_medicamento = m.id_medicamento
        LEFT JOIN inventario i ON i.id_lote = l.id_lote
        GROUP BY m.id_medicamento, m.stock
    LOOP
        IF v_fila.stock_inventario = 0 AND v_fila.stock > 0 AND v_id_ubicacion IS NOT NULL THEN
            INSERT INTO lote_medicamento (
                id_medicamento, numero_lote, fecha_fabricacion, fecha_vencimiento,
                cantidad_inicial, estado, fecha_ingreso, observaciones
            ) VALUES (
                v_fila.id_medicamento,
                'LEGACY-' || v_fila.id_medicamento || '-' ||
                    TO_CHAR(CLOCK_TIMESTAMP(), 'YYYYMMDDHH24MISS'),
                CURRENT_DATE,
                CURRENT_DATE + INTERVAL '2 years',
                v_fila.stock,
                'activo',
                CURRENT_TIMESTAMP,
                'Lote creado por migración 002 para respaldar stock legado.'
            )
            RETURNING id_lote INTO v_id_lote;

            INSERT INTO inventario (
                id_lote, id_ubicacion, cantidad_actual, stock_minimo
            ) VALUES (
                v_id_lote, v_id_ubicacion, v_fila.stock, 0
            );
        END IF;
    END LOOP;

    UPDATE medicamento m
    SET stock = COALESCE((
            SELECT SUM(i.cantidad_actual)
            FROM inventario i
            JOIN lote_medicamento l ON l.id_lote = i.id_lote
            WHERE l.id_medicamento = m.id_medicamento
        ), 0),
        updated_at = CURRENT_TIMESTAMP;
END;
$$;

COMMIT;
