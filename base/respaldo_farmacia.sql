--
-- PostgreSQL database dump
--

\restrict H61Ifhyuufy76OnTRJxiDjrdzRe1LS5APSWx6gzyQusOivPef88kKZToecSqw25

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-11-16 17:11:44

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 278 (class 1255 OID 16388)
-- Name: fn_asignar_lote_fefo(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_asignar_lote_fefo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_lote INTEGER;
BEGIN
    -- Buscamos directamente en la tabla inventario el lote con stock
    -- para el medicamento que se estÃ¡ vendiendo.
    SELECT i.id_lote INTO v_id_lote
    FROM inventario i
    JOIN lote_medicamento l ON l.id_lote = i.id_lote
    WHERE l.id_medicamento = NEW.id_medicamento
      AND l.estado = 'activo'
      AND l.fecha_vencimiento >= CURRENT_DATE
      AND i.cantidad_actual >= NEW.cantidad
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay stock para el medicamento %', NEW.id_medicamento;
    END IF;

    NEW.id_lote := v_id_lote;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_asignar_lote_fefo() OWNER TO admin;

--
-- TOC entry 279 (class 1255 OID 16389)
-- Name: fn_inventario_sync_stock_medicamento(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_inventario_sync_stock_medicamento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.fn_inventario_sync_stock_medicamento() OWNER TO postgres;

--
-- TOC entry 280 (class 1255 OID 16390)
-- Name: fn_recalcular_total_venta(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_recalcular_total_venta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.fn_recalcular_total_venta() OWNER TO postgres;

--
-- TOC entry 281 (class 1255 OID 16391)
-- Name: fn_registrar_salida_automatica(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_registrar_salida_automatica() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_inventario INTEGER;
    v_id_empleado INTEGER;
    v_cantidad_restante INTEGER;
    v_lote RECORD;
BEGIN
    -- Obtener el empleado de la venta
    SELECT id_empleado INTO v_id_empleado FROM venta WHERE id_venta = NEW.id_venta;

    v_cantidad_restante := NEW.cantidad;

    -- âœ… CORRECCIÃ“N: Buscar inventario directamente por id_medicamento
    FOR v_lote IN 
        SELECT i.id_inventario, i.cantidad_actual
        FROM inventario i
        JOIN lote_medicamento l ON l.id_lote = i.id_lote
        JOIN ubicacion_inventario u ON u.id_ubicacion = i.id_ubicacion
        WHERE l.id_medicamento = NEW.id_medicamento  -- Buscamos por medicamento, no por lote
          AND l.estado = 'activo'
          AND u.activa = TRUE
          AND i.cantidad_actual > 0
        ORDER BY l.fecha_vencimiento ASC, i.id_inventario ASC
        FOR UPDATE
    LOOP
        EXIT WHEN v_cantidad_restante <= 0;

        IF v_lote.cantidad_actual >= v_cantidad_restante THEN
            INSERT INTO movimiento_inventario (id_inventario, tipo_movimiento, cantidad, motivo, id_empleado)
            VALUES (v_lote.id_inventario, 'salida', v_cantidad_restante, 
                    'Venta automÃ¡tica ID: ' || NEW.id_venta, v_id_empleado);
            
            -- Descontar del inventario
            UPDATE inventario SET cantidad_actual = cantidad_actual - v_cantidad_restante WHERE id_inventario = v_lote.id_inventario;
            
            v_cantidad_restante := 0;
        ELSE
            INSERT INTO movimiento_inventario (id_inventario, tipo_movimiento, cantidad, motivo, id_empleado)
            VALUES (v_lote.id_inventario, 'salida', v_lote.cantidad_actual, 
                    'Venta automÃ¡tica ID: ' || NEW.id_venta, v_id_empleado);
            
            -- Descontar del inventario
            UPDATE inventario SET cantidad_actual = cantidad_actual - v_lote.cantidad_actual WHERE id_inventario = v_lote.id_inventario;
            
            v_cantidad_restante := v_cantidad_restante - v_lote.cantidad_actual;
        END IF;
    END LOOP;

    IF v_cantidad_restante > 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para el medicamento %. Faltan % unidades.', 
                        NEW.id_medicamento, v_cantidad_restante;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_registrar_salida_automatica() OWNER TO postgres;

--
-- TOC entry 282 (class 1255 OID 16392)
-- Name: fn_validar_lote_venta(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_validar_lote_venta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_lote RECORD;
BEGIN
    -- Buscar la informaciÃ³n del lote
    SELECT id_medicamento, estado, fecha_vencimiento 
    INTO v_lote
    FROM lote_medicamento 
    WHERE id_lote = NEW.id_lote;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El lote % no existe.', NEW.id_lote;
    END IF;

    -- Validar que el lote corresponda al medicamento
    IF v_lote.id_medicamento <> NEW.id_medicamento THEN
        RAISE EXCEPTION 'El lote % no corresponde al medicamento %.', NEW.id_lote, NEW.id_medicamento;
    END IF;

    -- Validar que el lote estÃ© activo
    IF v_lote.estado <> 'activo' THEN
        RAISE EXCEPTION 'El lote % no estÃ¡ activo.', NEW.id_lote;
    END IF;

    -- Validar que no estÃ© vencido
    IF v_lote.fecha_vencimiento < CURRENT_DATE THEN
        RAISE EXCEPTION 'El lote % estÃ¡ vencido.', NEW.id_lote;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_validar_lote_venta() OWNER TO postgres;

--
-- TOC entry 287 (class 1255 OID 16393)
-- Name: fn_validar_pago_no_exceder(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_validar_pago_no_exceder() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total DECIMAL(12,2);
    v_suma DECIMAL(12,2);
BEGIN
    IF NEW.estado_pago = 'anulado' THEN
        RETURN NEW;
    END IF;

    SELECT total_venta INTO v_total FROM venta WHERE id_venta = NEW.id_venta;

    -- Si el total es 0, la venta se estÃ¡ creando; dejar pasar el pago
    IF v_total = 0 THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT COALESCE(SUM(monto), 0) INTO v_suma
        FROM pago WHERE id_venta = NEW.id_venta AND estado_pago <> 'anulado';
    ELSE
        SELECT COALESCE(SUM(monto), 0) INTO v_suma
        FROM pago WHERE id_venta = NEW.id_venta AND estado_pago <> 'anulado' AND id_pago <> NEW.id_pago;
    END IF;

    IF v_suma + NEW.monto > v_total THEN
        RAISE EXCEPTION 'Los pagos registrados (%) superan el total de la venta (%).', v_suma + NEW.monto, v_total;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_validar_pago_no_exceder() OWNER TO postgres;

--
-- TOC entry 295 (class 1255 OID 16394)
-- Name: fn_venta_asignar_lote_fefo(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_asignar_lote_fefo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.fn_venta_asignar_lote_fefo() OWNER TO postgres;

--
-- TOC entry 296 (class 1255 OID 16395)
-- Name: fn_venta_bloquear_detalle_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_bloquear_detalle_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Los detalles de venta no deben modificarse. Anule la venta y registre una nueva.';
END;
$$;


ALTER FUNCTION public.fn_venta_bloquear_detalle_update() OWNER TO postgres;

--
-- TOC entry 297 (class 1255 OID 16396)
-- Name: fn_venta_bloquear_pago_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_bloquear_pago_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Los pagos no deben eliminarse. Use estado anulado.';
END;
$$;


ALTER FUNCTION public.fn_venta_bloquear_pago_delete() OWNER TO postgres;

--
-- TOC entry 298 (class 1255 OID 16397)
-- Name: fn_venta_descontar_stock(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_descontar_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.fn_venta_descontar_stock() OWNER TO postgres;

--
-- TOC entry 299 (class 1255 OID 16398)
-- Name: fn_venta_recalcular_total(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_recalcular_total() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.fn_venta_recalcular_total() OWNER TO postgres;

--
-- TOC entry 300 (class 1255 OID 16399)
-- Name: fn_venta_validar_alergias(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_validar_alergias() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.fn_venta_validar_alergias() OWNER TO postgres;

--
-- TOC entry 301 (class 1255 OID 16400)
-- Name: fn_venta_validar_cierre(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_validar_cierre() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
            RAISE EXCEPTION 'El empleado % estÃ¡ inactivo.', NEW.id_empleado;
        END IF;
    END IF;

    IF NEW.id_cliente IS NOT NULL THEN
        SELECT activo INTO v_cliente_activo
        FROM cliente
        WHERE id_cliente = NEW.id_cliente;

        IF v_cliente_activo IS DISTINCT FROM TRUE THEN
            RAISE EXCEPTION 'El cliente % estÃ¡ inactivo.', NEW.id_cliente;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_venta_validar_cierre() OWNER TO postgres;

--
-- TOC entry 302 (class 1255 OID 16401)
-- Name: fn_venta_validar_lote(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_validar_lote() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
        RAISE EXCEPTION 'El lote % no estÃ¡ activo.', NEW.id_lote;
    END IF;

    IF v_lote.fecha_vencimiento < CURRENT_DATE THEN
        RAISE EXCEPTION 'El lote % estÃ¡ vencido.', NEW.id_lote;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_venta_validar_lote() OWNER TO postgres;

--
-- TOC entry 303 (class 1255 OID 16402)
-- Name: fn_venta_validar_pago_no_exceder(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_validar_pago_no_exceder() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.fn_venta_validar_pago_no_exceder() OWNER TO postgres;

--
-- TOC entry 304 (class 1255 OID 16403)
-- Name: fn_venta_validar_pago_operacion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_validar_pago_operacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
        RAISE EXCEPTION 'El mÃ©todo de pago % no estÃ¡ activo.', NEW.id_metodo_pago;
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
$$;


ALTER FUNCTION public.fn_venta_validar_pago_operacion() OWNER TO postgres;

--
-- TOC entry 305 (class 1255 OID 16404)
-- Name: fn_venta_validar_receta(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_venta_validar_receta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
            'El medicamento % requiere receta mÃ©dica presentada y registrada.',
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
        RAISE EXCEPTION 'No se encontrÃ³ la venta % o la receta %.', NEW.id_venta, NEW.id_receta;
    END IF;

    IF v_receta.cliente_venta IS NULL THEN
        RAISE EXCEPTION 'La venta % debe tener cliente para validar la receta.', NEW.id_venta;
    END IF;

    IF v_receta.estado <> 'vigente' THEN
        RAISE EXCEPTION 'La receta % no estÃ¡ vigente.', NEW.id_receta;
    END IF;

    IF v_receta.fecha_vencimiento < CURRENT_DATE THEN
        RAISE EXCEPTION 'La receta % estÃ¡ vencida.', NEW.id_receta;
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
            'El medicamento % no estÃ¡ incluido en la receta %.',
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
$$;


ALTER FUNCTION public.fn_venta_validar_receta() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 16405)
-- Name: alergia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alergia (
    id_alergia integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.alergia OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16414)
-- Name: alergia_id_alergia_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alergia_id_alergia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alergia_id_alergia_seq OWNER TO postgres;

--
-- TOC entry 5441 (class 0 OID 0)
-- Dependencies: 220
-- Name: alergia_id_alergia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alergia_id_alergia_seq OWNED BY public.alergia.id_alergia;


--
-- TOC entry 221 (class 1259 OID 16415)
-- Name: alergia_principio_activo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alergia_principio_activo (
    id_alergia integer NOT NULL,
    id_principio_activo integer NOT NULL
);


ALTER TABLE public.alergia_principio_activo OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16420)
-- Name: categoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categoria (
    id_categoria integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    tipo_categoria character varying(30) DEFAULT 'medicamento'::character varying NOT NULL,
    tipo_enfermedad character varying(30) DEFAULT 'general'::character varying NOT NULL,
    id_categoria_padre integer,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT categoria_check CHECK (((id_categoria_padre IS NULL) OR (id_categoria_padre <> id_categoria)))
);


ALTER TABLE public.categoria OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16434)
-- Name: categoria_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categoria_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categoria_id_categoria_seq OWNER TO postgres;

--
-- TOC entry 5442 (class 0 OID 0)
-- Dependencies: 223
-- Name: categoria_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categoria_id_categoria_seq OWNED BY public.categoria.id_categoria;


--
-- TOC entry 224 (class 1259 OID 16435)
-- Name: cliente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cliente (
    id_cliente integer NOT NULL,
    id_persona integer NOT NULL,
    fecha_nacimiento date,
    condiciones_cronicas text,
    es_local boolean DEFAULT true NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.cliente OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16446)
-- Name: cliente_alergia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cliente_alergia (
    id_cliente integer NOT NULL,
    id_alergia integer NOT NULL,
    gravedad character varying(20) DEFAULT 'moderada'::character varying NOT NULL,
    observacion text,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT cliente_alergia_gravedad_check CHECK (((gravedad)::text = ANY (ARRAY[('leve'::character varying)::text, ('moderada'::character varying)::text, ('grave'::character varying)::text])))
);


ALTER TABLE public.cliente_alergia OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16458)
-- Name: cliente_id_cliente_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cliente_id_cliente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cliente_id_cliente_seq OWNER TO postgres;

--
-- TOC entry 5443 (class 0 OID 0)
-- Dependencies: 226
-- Name: cliente_id_cliente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cliente_id_cliente_seq OWNED BY public.cliente.id_cliente;


--
-- TOC entry 227 (class 1259 OID 16459)
-- Name: compra; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compra (
    id_compra integer NOT NULL,
    id_proveedor integer NOT NULL,
    numero_factura character varying(50) NOT NULL,
    fecha_compra date NOT NULL,
    total_compra numeric(12,2) NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    observaciones text,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT compra_estado_check CHECK (((estado)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('completada'::character varying)::text, ('devuelta_parcial'::character varying)::text, ('devuelta_total'::character varying)::text]))),
    CONSTRAINT compra_total_compra_check CHECK ((total_compra >= (0)::numeric))
);


ALTER TABLE public.compra OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16475)
-- Name: compra_id_compra_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.compra_id_compra_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.compra_id_compra_seq OWNER TO postgres;

--
-- TOC entry 5444 (class 0 OID 0)
-- Dependencies: 228
-- Name: compra_id_compra_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.compra_id_compra_seq OWNED BY public.compra.id_compra;


--
-- TOC entry 229 (class 1259 OID 16476)
-- Name: detalle_compra; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_compra (
    id_detalle_compra integer NOT NULL,
    id_compra integer NOT NULL,
    id_medicamento integer NOT NULL,
    id_lote integer,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    CONSTRAINT detalle_compra_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT detalle_compra_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric)),
    CONSTRAINT detalle_compra_subtotal_check CHECK ((subtotal >= (0)::numeric))
);


ALTER TABLE public.detalle_compra OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16488)
-- Name: detalle_compra_id_detalle_compra_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_compra_id_detalle_compra_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_compra_id_detalle_compra_seq OWNER TO postgres;

--
-- TOC entry 5445 (class 0 OID 0)
-- Dependencies: 230
-- Name: detalle_compra_id_detalle_compra_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_compra_id_detalle_compra_seq OWNED BY public.detalle_compra.id_detalle_compra;


--
-- TOC entry 231 (class 1259 OID 16489)
-- Name: detalle_receta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_receta (
    id_detalle_receta integer NOT NULL,
    id_receta integer NOT NULL,
    id_medicamento integer,
    dosis character varying(100) NOT NULL,
    frecuencia character varying(100) NOT NULL,
    via_administracion character varying(100) NOT NULL,
    duracion_tratamiento character varying(100) NOT NULL,
    cantidad_prescrita integer DEFAULT 1 NOT NULL,
    indicaciones text,
    CONSTRAINT detalle_receta_cantidad_prescrita_check CHECK ((cantidad_prescrita > 0))
);


ALTER TABLE public.detalle_receta OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16503)
-- Name: detalle_receta_id_detalle_receta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_receta_id_detalle_receta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_receta_id_detalle_receta_seq OWNER TO postgres;

--
-- TOC entry 5446 (class 0 OID 0)
-- Dependencies: 232
-- Name: detalle_receta_id_detalle_receta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_receta_id_detalle_receta_seq OWNED BY public.detalle_receta.id_detalle_receta;


--
-- TOC entry 233 (class 1259 OID 16504)
-- Name: detalle_venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_venta (
    id_detalle_venta integer NOT NULL,
    id_venta integer NOT NULL,
    id_medicamento integer NOT NULL,
    id_lote integer,
    id_receta integer,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    receta_presentada boolean DEFAULT false NOT NULL,
    CONSTRAINT detalle_venta_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT detalle_venta_check CHECK ((subtotal = (((cantidad)::numeric * precio_unitario) - descuento))),
    CONSTRAINT detalle_venta_check1 CHECK (((receta_presentada = false) OR (id_receta IS NOT NULL))),
    CONSTRAINT detalle_venta_check2 CHECK (((id_receta IS NULL) OR (receta_presentada = true))),
    CONSTRAINT detalle_venta_descuento_check CHECK ((descuento >= (0)::numeric)),
    CONSTRAINT detalle_venta_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric)),
    CONSTRAINT detalle_venta_subtotal_check CHECK ((subtotal >= (0)::numeric))
);


ALTER TABLE public.detalle_venta OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16524)
-- Name: detalle_venta_id_detalle_venta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_venta_id_detalle_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_venta_id_detalle_venta_seq OWNER TO postgres;

--
-- TOC entry 5447 (class 0 OID 0)
-- Dependencies: 234
-- Name: detalle_venta_id_detalle_venta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_venta_id_detalle_venta_seq OWNED BY public.detalle_venta.id_detalle_venta;


--
-- TOC entry 235 (class 1259 OID 16525)
-- Name: empleado; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empleado (
    id_empleado integer NOT NULL,
    id_persona integer NOT NULL,
    cargo character varying(50) NOT NULL,
    fecha_ingreso date NOT NULL,
    esta_capacitado boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT empleado_cargo_check CHECK (((cargo)::text = ANY (ARRAY[('vendedor'::character varying)::text, ('regente'::character varying)::text, ('cajero'::character varying)::text, ('administrador'::character varying)::text, ('almacenero'::character varying)::text, ('repartidor'::character varying)::text])))
);


ALTER TABLE public.empleado OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16539)
-- Name: empleado_id_empleado_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empleado_id_empleado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empleado_id_empleado_seq OWNER TO postgres;

--
-- TOC entry 5448 (class 0 OID 0)
-- Dependencies: 236
-- Name: empleado_id_empleado_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empleado_id_empleado_seq OWNED BY public.empleado.id_empleado;


--
-- TOC entry 237 (class 1259 OID 16540)
-- Name: inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventario (
    id_inventario integer NOT NULL,
    id_lote integer NOT NULL,
    id_ubicacion integer NOT NULL,
    cantidad_actual integer DEFAULT 0 NOT NULL,
    stock_minimo integer DEFAULT 0 NOT NULL,
    stock_maximo integer,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT inventario_cantidad_actual_check CHECK ((cantidad_actual >= 0)),
    CONSTRAINT inventario_check CHECK (((stock_maximo IS NULL) OR (stock_maximo >= stock_minimo))),
    CONSTRAINT inventario_stock_minimo_check CHECK ((stock_minimo >= 0))
);


ALTER TABLE public.inventario OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16555)
-- Name: inventario_id_inventario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventario_id_inventario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventario_id_inventario_seq OWNER TO postgres;

--
-- TOC entry 5449 (class 0 OID 0)
-- Dependencies: 238
-- Name: inventario_id_inventario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventario_id_inventario_seq OWNED BY public.inventario.id_inventario;


--
-- TOC entry 239 (class 1259 OID 16556)
-- Name: lote_medicamento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lote_medicamento (
    id_lote integer NOT NULL,
    id_medicamento integer NOT NULL,
    id_proveedor integer,
    numero_lote character varying(50) NOT NULL,
    fecha_fabricacion date NOT NULL,
    fecha_vencimiento date NOT NULL,
    cantidad_inicial integer NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    fecha_ingreso timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observaciones text,
    CONSTRAINT lote_medicamento_cantidad_inicial_check CHECK ((cantidad_inicial > 0)),
    CONSTRAINT lote_medicamento_check CHECK ((fecha_vencimiento > fecha_fabricacion)),
    CONSTRAINT lote_medicamento_estado_check CHECK (((estado)::text = ANY (ARRAY[('activo'::character varying)::text, ('agotado'::character varying)::text, ('cuarentena'::character varying)::text, ('vencido'::character varying)::text, ('devuelto'::character varying)::text])))
);


ALTER TABLE public.lote_medicamento OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16574)
-- Name: lote_medicamento_id_lote_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lote_medicamento_id_lote_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lote_medicamento_id_lote_seq OWNER TO postgres;

--
-- TOC entry 5450 (class 0 OID 0)
-- Dependencies: 240
-- Name: lote_medicamento_id_lote_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lote_medicamento_id_lote_seq OWNED BY public.lote_medicamento.id_lote;


--
-- TOC entry 241 (class 1259 OID 16575)
-- Name: medicamento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medicamento (
    id_medicamento integer NOT NULL,
    codigo_barras character varying(100),
    nombre_comercial character varying(150) NOT NULL,
    nombre_generico character varying(150),
    id_categoria integer DEFAULT 1,
    tipo_producto character varying(100),
    presentacion character varying(100),
    precio_compra numeric(10,2) DEFAULT 0.00,
    precio_venta numeric(10,2) DEFAULT 0.00,
    requiere_receta integer DEFAULT 0,
    activo integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer,
    stock integer DEFAULT 0 NOT NULL,
    imagen character varying(500) DEFAULT '/uploads/default.svg'::character varying,
    descripcion text
);


ALTER TABLE public.medicamento OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16592)
-- Name: medicamento_id_medicamento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.medicamento_id_medicamento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medicamento_id_medicamento_seq OWNER TO postgres;

--
-- TOC entry 5451 (class 0 OID 0)
-- Dependencies: 242
-- Name: medicamento_id_medicamento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.medicamento_id_medicamento_seq OWNED BY public.medicamento.id_medicamento;


--
-- TOC entry 243 (class 1259 OID 16593)
-- Name: medicamento_principio_activo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medicamento_principio_activo (
    id_medicamento integer NOT NULL,
    id_principio_activo integer NOT NULL,
    cantidad numeric(10,3),
    unidad character varying(30)
);


ALTER TABLE public.medicamento_principio_activo OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16598)
-- Name: metodo_pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metodo_pago (
    id_metodo_pago integer NOT NULL,
    nombre character varying(40) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.metodo_pago OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16605)
-- Name: metodo_pago_id_metodo_pago_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metodo_pago_id_metodo_pago_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metodo_pago_id_metodo_pago_seq OWNER TO postgres;

--
-- TOC entry 5452 (class 0 OID 0)
-- Dependencies: 245
-- Name: metodo_pago_id_metodo_pago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metodo_pago_id_metodo_pago_seq OWNED BY public.metodo_pago.id_metodo_pago;


--
-- TOC entry 246 (class 1259 OID 16606)
-- Name: movimiento_inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimiento_inventario (
    id_movimiento integer NOT NULL,
    id_inventario integer NOT NULL,
    tipo_movimiento character varying(20) NOT NULL,
    cantidad integer NOT NULL,
    motivo text NOT NULL,
    id_empleado integer,
    fecha_movimiento timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT movimiento_inventario_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT movimiento_inventario_tipo_movimiento_check CHECK (((tipo_movimiento)::text = ANY (ARRAY[('entrada'::character varying)::text, ('salida'::character varying)::text, ('ajuste'::character varying)::text, ('devolucion'::character varying)::text, ('cuarentena'::character varying)::text, ('transferencia'::character varying)::text])))
);


ALTER TABLE public.movimiento_inventario OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 16620)
-- Name: movimiento_inventario_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.movimiento_inventario_id_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movimiento_inventario_id_movimiento_seq OWNER TO postgres;

--
-- TOC entry 5453 (class 0 OID 0)
-- Dependencies: 247
-- Name: movimiento_inventario_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.movimiento_inventario_id_movimiento_seq OWNED BY public.movimiento_inventario.id_movimiento;


--
-- TOC entry 248 (class 1259 OID 16621)
-- Name: oferta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.oferta (
    id_oferta integer NOT NULL,
    nombre_oferta character varying(100) NOT NULL,
    descripcion text,
    porcentaje_descuento numeric(5,2) NOT NULL,
    fecha_inicio date,
    fecha_fin date,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer
);


ALTER TABLE public.oferta OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 16632)
-- Name: oferta_id_oferta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.oferta_id_oferta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.oferta_id_oferta_seq OWNER TO postgres;

--
-- TOC entry 5454 (class 0 OID 0)
-- Dependencies: 249
-- Name: oferta_id_oferta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.oferta_id_oferta_seq OWNED BY public.oferta.id_oferta;


--
-- TOC entry 250 (class 1259 OID 16633)
-- Name: oferta_medicamento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.oferta_medicamento (
    id_oferta_medicamento integer NOT NULL,
    id_oferta integer,
    id_medicamento integer,
    fecha_asignacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.oferta_medicamento OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 16638)
-- Name: oferta_medicamento_id_oferta_medicamento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.oferta_medicamento_id_oferta_medicamento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.oferta_medicamento_id_oferta_medicamento_seq OWNER TO postgres;

--
-- TOC entry 5455 (class 0 OID 0)
-- Dependencies: 251
-- Name: oferta_medicamento_id_oferta_medicamento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.oferta_medicamento_id_oferta_medicamento_seq OWNED BY public.oferta_medicamento.id_oferta_medicamento;


--
-- TOC entry 252 (class 1259 OID 16639)
-- Name: pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pago (
    id_pago integer NOT NULL,
    id_venta integer NOT NULL,
    id_metodo_pago integer NOT NULL,
    monto numeric(12,2) NOT NULL,
    referencia character varying(100),
    fecha_pago timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado_pago character varying(20) DEFAULT 'confirmado'::character varying NOT NULL,
    CONSTRAINT pago_estado_pago_check CHECK (((estado_pago)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('confirmado'::character varying)::text, ('anulado'::character varying)::text]))),
    CONSTRAINT pago_monto_check CHECK ((monto > (0)::numeric))
);


ALTER TABLE public.pago OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 16652)
-- Name: pago_id_pago_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pago_id_pago_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pago_id_pago_seq OWNER TO postgres;

--
-- TOC entry 5456 (class 0 OID 0)
-- Dependencies: 253
-- Name: pago_id_pago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pago_id_pago_seq OWNED BY public.pago.id_pago;


--
-- TOC entry 254 (class 1259 OID 16653)
-- Name: permiso; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permiso (
    id_permiso integer NOT NULL,
    nombre character varying(80) NOT NULL,
    accion character varying(30) NOT NULL,
    descripcion text
);


ALTER TABLE public.permiso OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 16661)
-- Name: permiso_id_permiso_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permiso_id_permiso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permiso_id_permiso_seq OWNER TO postgres;

--
-- TOC entry 5457 (class 0 OID 0)
-- Dependencies: 255
-- Name: permiso_id_permiso_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permiso_id_permiso_seq OWNED BY public.permiso.id_permiso;


--
-- TOC entry 256 (class 1259 OID 16662)
-- Name: persona; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.persona (
    id_persona integer NOT NULL,
    ci character varying(20) NOT NULL,
    nombre_completo character varying(200) NOT NULL,
    telefono character varying(20) NOT NULL,
    email character varying(100),
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.persona OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 16671)
-- Name: persona_id_persona_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.persona_id_persona_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.persona_id_persona_seq OWNER TO postgres;

--
-- TOC entry 5458 (class 0 OID 0)
-- Dependencies: 257
-- Name: persona_id_persona_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.persona_id_persona_seq OWNED BY public.persona.id_persona;


--
-- TOC entry 258 (class 1259 OID 16672)
-- Name: principio_activo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.principio_activo (
    id_principio_activo integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    requiere_control_especial boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.principio_activo OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 16683)
-- Name: principio_activo_id_principio_activo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.principio_activo_id_principio_activo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.principio_activo_id_principio_activo_seq OWNER TO postgres;

--
-- TOC entry 5459 (class 0 OID 0)
-- Dependencies: 259
-- Name: principio_activo_id_principio_activo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.principio_activo_id_principio_activo_seq OWNED BY public.principio_activo.id_principio_activo;


--
-- TOC entry 260 (class 1259 OID 16684)
-- Name: proveedor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proveedor (
    id_proveedor integer NOT NULL,
    nombre_empresa character varying(200) NOT NULL,
    contacto_nombre character varying(100) NOT NULL,
    contacto_telefono character varying(20) NOT NULL,
    contacto_email character varying(100),
    acepta_devoluciones boolean DEFAULT true NOT NULL,
    frecuencia_visita character varying(50) DEFAULT 'semanal'::character varying NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.proveedor OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 16699)
-- Name: proveedor_id_proveedor_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proveedor_id_proveedor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.proveedor_id_proveedor_seq OWNER TO postgres;

--
-- TOC entry 5460 (class 0 OID 0)
-- Dependencies: 261
-- Name: proveedor_id_proveedor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proveedor_id_proveedor_seq OWNED BY public.proveedor.id_proveedor;


--
-- TOC entry 262 (class 1259 OID 16700)
-- Name: receta_medica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receta_medica (
    id_receta integer NOT NULL,
    id_cliente integer NOT NULL,
    numero_receta character varying(50) NOT NULL,
    medico_prescriptor character varying(200) NOT NULL,
    fecha_emision date NOT NULL,
    fecha_registro_farmacia timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vencimiento date NOT NULL,
    observaciones_receta text,
    estado character varying(20) DEFAULT 'vigente'::character varying NOT NULL,
    CONSTRAINT receta_medica_check CHECK ((fecha_vencimiento >= fecha_emision)),
    CONSTRAINT receta_medica_estado_check CHECK (((estado)::text = ANY (ARRAY[('vigente'::character varying)::text, ('usada'::character varying)::text, ('vencida'::character varying)::text, ('anulada'::character varying)::text])))
);


ALTER TABLE public.receta_medica OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 16717)
-- Name: receta_medica_id_receta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.receta_medica_id_receta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.receta_medica_id_receta_seq OWNER TO postgres;

--
-- TOC entry 5461 (class 0 OID 0)
-- Dependencies: 263
-- Name: receta_medica_id_receta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.receta_medica_id_receta_seq OWNED BY public.receta_medica.id_receta;


--
-- TOC entry 264 (class 1259 OID 16718)
-- Name: rol; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rol (
    id_rol integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.rol OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 16727)
-- Name: rol_id_rol_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rol_id_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rol_id_rol_seq OWNER TO postgres;

--
-- TOC entry 5462 (class 0 OID 0)
-- Dependencies: 265
-- Name: rol_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rol_id_rol_seq OWNED BY public.rol.id_rol;


--
-- TOC entry 266 (class 1259 OID 16728)
-- Name: rol_permiso; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rol_permiso (
    id_rol integer NOT NULL,
    id_permiso integer NOT NULL
);


ALTER TABLE public.rol_permiso OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 16733)
-- Name: sucursal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sucursal (
    id_sucursal integer NOT NULL,
    nombre character varying(120) NOT NULL,
    ciudad character varying(100) NOT NULL,
    direccion_texto character varying(250) NOT NULL,
    telefono character varying(20),
    activa boolean DEFAULT true NOT NULL,
    fecha_apertura date
);


ALTER TABLE public.sucursal OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 16742)
-- Name: sucursal_id_sucursal_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sucursal_id_sucursal_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sucursal_id_sucursal_seq OWNER TO postgres;

--
-- TOC entry 5463 (class 0 OID 0)
-- Dependencies: 268
-- Name: sucursal_id_sucursal_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sucursal_id_sucursal_seq OWNED BY public.sucursal.id_sucursal;


--
-- TOC entry 269 (class 1259 OID 16743)
-- Name: ubicacion_inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ubicacion_inventario (
    id_ubicacion integer NOT NULL,
    id_sucursal integer NOT NULL,
    nombre character varying(100) NOT NULL,
    pasillo character varying(50),
    estante character varying(50),
    temperatura_recomendada character varying(50),
    activa boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ubicacion_inventario OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 16753)
-- Name: ubicacion_inventario_id_ubicacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ubicacion_inventario_id_ubicacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ubicacion_inventario_id_ubicacion_seq OWNER TO postgres;

--
-- TOC entry 5464 (class 0 OID 0)
-- Dependencies: 270
-- Name: ubicacion_inventario_id_ubicacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ubicacion_inventario_id_ubicacion_seq OWNED BY public.ubicacion_inventario.id_ubicacion;


--
-- TOC entry 271 (class 1259 OID 16754)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5465 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Tabla de usuarios para autenticaciÃ³n y roles del sistema';


--
-- TOC entry 272 (class 1259 OID 16764)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5466 (class 0 OID 0)
-- Dependencies: 272
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 273 (class 1259 OID 16765)
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    id_empleado integer,
    nombre_usuario character varying(100) NOT NULL,
    nombre character varying(200),
    contrasena_hash text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ultimo_acceso timestamp without time zone,
    id_cliente integer
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 16777)
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_usuario_seq OWNER TO postgres;

--
-- TOC entry 5467 (class 0 OID 0)
-- Dependencies: 274
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;


--
-- TOC entry 275 (class 1259 OID 16778)
-- Name: usuario_rol; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_rol (
    id_usuario integer NOT NULL,
    id_rol integer NOT NULL
);


ALTER TABLE public.usuario_rol OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 16783)
-- Name: venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venta (
    id_venta integer NOT NULL,
    id_empleado integer,
    id_cliente integer,
    fecha_venta timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total_venta numeric(12,2) NOT NULL,
    estado character varying(20) DEFAULT 'completada'::character varying NOT NULL,
    observaciones text,
    CONSTRAINT venta_estado_check CHECK (((estado)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('completada'::character varying)::text, ('anulada'::character varying)::text, ('devuelta_parcial'::character varying)::text, ('devuelta_total'::character varying)::text]))),
    CONSTRAINT venta_total_venta_check CHECK ((total_venta >= (0)::numeric))
);


ALTER TABLE public.venta OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 16796)
-- Name: venta_id_venta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.venta_id_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.venta_id_venta_seq OWNER TO postgres;

--
-- TOC entry 5468 (class 0 OID 0)
-- Dependencies: 277
-- Name: venta_id_venta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.venta_id_venta_seq OWNED BY public.venta.id_venta;


--
-- TOC entry 4922 (class 2604 OID 16797)
-- Name: alergia id_alergia; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alergia ALTER COLUMN id_alergia SET DEFAULT nextval('public.alergia_id_alergia_seq'::regclass);


--
-- TOC entry 4924 (class 2604 OID 16798)
-- Name: categoria id_categoria; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria ALTER COLUMN id_categoria SET DEFAULT nextval('public.categoria_id_categoria_seq'::regclass);


--
-- TOC entry 4928 (class 2604 OID 16799)
-- Name: cliente id_cliente; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente ALTER COLUMN id_cliente SET DEFAULT nextval('public.cliente_id_cliente_seq'::regclass);


--
-- TOC entry 4933 (class 2604 OID 16800)
-- Name: compra id_compra; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compra ALTER COLUMN id_compra SET DEFAULT nextval('public.compra_id_compra_seq'::regclass);


--
-- TOC entry 4936 (class 2604 OID 16801)
-- Name: detalle_compra id_detalle_compra; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra ALTER COLUMN id_detalle_compra SET DEFAULT nextval('public.detalle_compra_id_detalle_compra_seq'::regclass);


--
-- TOC entry 4937 (class 2604 OID 16802)
-- Name: detalle_receta id_detalle_receta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_receta ALTER COLUMN id_detalle_receta SET DEFAULT nextval('public.detalle_receta_id_detalle_receta_seq'::regclass);


--
-- TOC entry 4939 (class 2604 OID 16803)
-- Name: detalle_venta id_detalle_venta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta ALTER COLUMN id_detalle_venta SET DEFAULT nextval('public.detalle_venta_id_detalle_venta_seq'::regclass);


--
-- TOC entry 4942 (class 2604 OID 16804)
-- Name: empleado id_empleado; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado ALTER COLUMN id_empleado SET DEFAULT nextval('public.empleado_id_empleado_seq'::regclass);


--
-- TOC entry 4946 (class 2604 OID 16805)
-- Name: inventario id_inventario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario ALTER COLUMN id_inventario SET DEFAULT nextval('public.inventario_id_inventario_seq'::regclass);


--
-- TOC entry 4950 (class 2604 OID 16806)
-- Name: lote_medicamento id_lote; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lote_medicamento ALTER COLUMN id_lote SET DEFAULT nextval('public.lote_medicamento_id_lote_seq'::regclass);


--
-- TOC entry 4953 (class 2604 OID 16807)
-- Name: medicamento id_medicamento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicamento ALTER COLUMN id_medicamento SET DEFAULT nextval('public.medicamento_id_medicamento_seq'::regclass);


--
-- TOC entry 4963 (class 2604 OID 16808)
-- Name: metodo_pago id_metodo_pago; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodo_pago ALTER COLUMN id_metodo_pago SET DEFAULT nextval('public.metodo_pago_id_metodo_pago_seq'::regclass);


--
-- TOC entry 4965 (class 2604 OID 16809)
-- Name: movimiento_inventario id_movimiento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimiento_inventario ALTER COLUMN id_movimiento SET DEFAULT nextval('public.movimiento_inventario_id_movimiento_seq'::regclass);


--
-- TOC entry 4967 (class 2604 OID 16810)
-- Name: oferta id_oferta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta ALTER COLUMN id_oferta SET DEFAULT nextval('public.oferta_id_oferta_seq'::regclass);


--
-- TOC entry 4971 (class 2604 OID 16811)
-- Name: oferta_medicamento id_oferta_medicamento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta_medicamento ALTER COLUMN id_oferta_medicamento SET DEFAULT nextval('public.oferta_medicamento_id_oferta_medicamento_seq'::regclass);


--
-- TOC entry 4973 (class 2604 OID 16812)
-- Name: pago id_pago; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago ALTER COLUMN id_pago SET DEFAULT nextval('public.pago_id_pago_seq'::regclass);


--
-- TOC entry 4976 (class 2604 OID 16813)
-- Name: permiso id_permiso; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permiso ALTER COLUMN id_permiso SET DEFAULT nextval('public.permiso_id_permiso_seq'::regclass);


--
-- TOC entry 4977 (class 2604 OID 16814)
-- Name: persona id_persona; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persona ALTER COLUMN id_persona SET DEFAULT nextval('public.persona_id_persona_seq'::regclass);


--
-- TOC entry 4979 (class 2604 OID 16815)
-- Name: principio_activo id_principio_activo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.principio_activo ALTER COLUMN id_principio_activo SET DEFAULT nextval('public.principio_activo_id_principio_activo_seq'::regclass);


--
-- TOC entry 4982 (class 2604 OID 16816)
-- Name: proveedor id_proveedor; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedor ALTER COLUMN id_proveedor SET DEFAULT nextval('public.proveedor_id_proveedor_seq'::regclass);


--
-- TOC entry 4987 (class 2604 OID 16817)
-- Name: receta_medica id_receta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receta_medica ALTER COLUMN id_receta SET DEFAULT nextval('public.receta_medica_id_receta_seq'::regclass);


--
-- TOC entry 4990 (class 2604 OID 16818)
-- Name: rol id_rol; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol ALTER COLUMN id_rol SET DEFAULT nextval('public.rol_id_rol_seq'::regclass);


--
-- TOC entry 4992 (class 2604 OID 16819)
-- Name: sucursal id_sucursal; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sucursal ALTER COLUMN id_sucursal SET DEFAULT nextval('public.sucursal_id_sucursal_seq'::regclass);


--
-- TOC entry 4994 (class 2604 OID 16820)
-- Name: ubicacion_inventario id_ubicacion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicacion_inventario ALTER COLUMN id_ubicacion SET DEFAULT nextval('public.ubicacion_inventario_id_ubicacion_seq'::regclass);


--
-- TOC entry 4997 (class 2604 OID 16821)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5001 (class 2604 OID 16822)
-- Name: usuario id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);


--
-- TOC entry 5004 (class 2604 OID 16823)
-- Name: venta id_venta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta ALTER COLUMN id_venta SET DEFAULT nextval('public.venta_id_venta_seq'::regclass);


--
-- TOC entry 5377 (class 0 OID 16405)
-- Dependencies: 219
-- Data for Name: alergia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alergia (id_alergia, nombre, descripcion, activo) FROM stdin;
1	Penicilina	Alergia reportada a medicamentos de la familia de las penicilinas.	t
2	AINEs	Alergia o intolerancia a antiinflamatorios no esteroideos.	t
3	Ibuprofeno	Alergia reportada a ibuprofeno.	t
\.


--
-- TOC entry 5379 (class 0 OID 16415)
-- Dependencies: 221
-- Data for Name: alergia_principio_activo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alergia_principio_activo (id_alergia, id_principio_activo) FROM stdin;
1	3
2	2
3	2
\.


--
-- TOC entry 5380 (class 0 OID 16420)
-- Dependencies: 222
-- Data for Name: categoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categoria (id_categoria, nombre, descripcion, tipo_categoria, tipo_enfermedad, id_categoria_padre, fecha_creacion) FROM stdin;
5	Antigripales	Medicamentos para gripe y vÃ­as respiratorias	medicamento	estacional	\N	2026-09-23 22:24:45.989507
6	Cardiovasculares	Medicamentos para corazÃ³n y presiÃ³n	medicamento	cronica	\N	2026-09-23 22:24:45.989507
7	Vitaminas y Suplementos	Vitaminas, minerales y suplementos	nutricion	bienestar	\N	2026-09-23 22:24:45.989507
8	DermocosmÃ©tica	Cuidado de la piel y belleza	dermocosmetica	cuidado_personal	\N	2026-09-23 22:24:45.989507
9	Higiene Personal	Productos de higiene corporal y bucal	higiene	cuidado_personal	\N	2026-09-23 22:24:45.989507
10	BebÃ©s y Puericultura	Productos para bebÃ©s	bebe	infantil	\N	2026-09-23 22:24:45.989507
2	Antiinflamatorios	Medicamentos antiinflamatorios no esteroideos	medicamento	aguda	3	2026-09-23 22:24:45.989507
1	AnalgÃ©sicos	Medicamentos para el dolor y la fiebre	medicamento	aguda	2	2026-09-23 22:24:45.989507
3	AntibiÃ³ticos	Medicamentos para infecciones bacterianas	medicamento	aguda	1	2026-09-23 22:24:45.989507
\.


--
-- TOC entry 5382 (class 0 OID 16435)
-- Dependencies: 224
-- Data for Name: cliente; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cliente (id_cliente, id_persona, fecha_nacimiento, condiciones_cronicas, es_local, activo) FROM stdin;
1	1	1985-03-15	Gastritis crÃ³nica	t	t
2	2	1990-07-22	HipertensiÃ³n	t	t
3	4	\N	\N	t	t
5	6	\N	\N	t	t
\.


--
-- TOC entry 5383 (class 0 OID 16446)
-- Dependencies: 225
-- Data for Name: cliente_alergia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cliente_alergia (id_cliente, id_alergia, gravedad, observacion, fecha_registro) FROM stdin;
1	2	grave	Evitar antiinflamatorios no esteroideos.	2026-10-08 16:45:29.132324
\.


--
-- TOC entry 5385 (class 0 OID 16459)
-- Dependencies: 227
-- Data for Name: compra; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compra (id_compra, id_proveedor, numero_factura, fecha_compra, total_compra, estado, observaciones, fecha_registro) FROM stdin;
2	2	22	2026-10-08	2.00	pendiente	ninguna	2026-10-08 18:13:45.885329
\.


--
-- TOC entry 5387 (class 0 OID 16476)
-- Dependencies: 229
-- Data for Name: detalle_compra; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_compra (id_detalle_compra, id_compra, id_medicamento, id_lote, cantidad, precio_unitario, subtotal) FROM stdin;
2	2	2	1	1	2.00	2.00
\.


--
-- TOC entry 5389 (class 0 OID 16489)
-- Dependencies: 231
-- Data for Name: detalle_receta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_receta (id_detalle_receta, id_receta, id_medicamento, dosis, frecuencia, via_administracion, duracion_tratamiento, cantidad_prescrita, indicaciones) FROM stdin;
1	1	3	400 mg	Cada 8 horas	Oral	7 dÃ­as	21	Tomar con abundante agua.
\.


--
-- TOC entry 5391 (class 0 OID 16504)
-- Dependencies: 233
-- Data for Name: detalle_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_venta (id_detalle_venta, id_venta, id_medicamento, id_lote, id_receta, cantidad, precio_unitario, descuento, subtotal, receta_presentada) FROM stdin;
15	15	5	8	\N	1	12.00	0.00	12.00	f
16	16	3	3	\N	2	8.50	0.00	17.00	f
17	17	3	3	\N	1	8.50	0.00	8.50	f
18	18	3	3	\N	1	8.50	0.00	8.50	f
19	19	5	8	\N	2	12.00	0.00	24.00	f
26	25	2	1	\N	6	10.00	0.00	60.00	f
27	26	3	3	\N	1	8.50	0.00	8.50	f
32	31	5	8	\N	10	12.00	0.00	120.00	f
111	111	5	8	\N	6	12.00	0.00	72.00	f
121	121	3	\N	\N	1	8.50	0.00	8.50	f
122	121	2	\N	\N	1	10.00	0.00	10.00	f
123	122	3	\N	\N	1	8.50	0.00	8.50	f
124	122	2	\N	\N	1	10.00	0.00	10.00	f
125	123	3	\N	\N	1	8.50	0.00	8.50	f
126	123	2	\N	\N	1	10.00	0.00	10.00	f
127	124	3	\N	\N	2	8.50	0.00	17.00	f
128	124	2	\N	\N	1	10.00	0.00	10.00	f
129	125	3	\N	\N	2	8.50	0.00	17.00	f
130	125	2	\N	\N	1	10.00	0.00	10.00	f
131	126	3	\N	\N	1	8.50	0.00	8.50	f
132	127	3	\N	\N	1	8.50	0.00	8.50	f
133	128	3	\N	\N	1	8.50	0.00	8.50	f
134	129	3	\N	\N	1	8.50	0.00	8.50	f
135	130	3	\N	\N	1	8.50	0.00	8.50	f
136	131	3	\N	\N	1	8.50	0.00	8.50	f
137	132	3	\N	\N	15	8.50	0.00	127.50	f
139	134	2	\N	\N	148	10.00	0.00	1480.00	f
142	137	5	\N	\N	20	12.00	0.00	240.00	f
143	138	5	\N	\N	20	12.00	0.00	240.00	f
144	139	5	\N	\N	20	12.00	0.00	240.00	f
145	140	5	\N	\N	20	12.00	0.00	240.00	f
146	141	5	\N	\N	20	12.00	0.00	240.00	f
147	142	5	\N	\N	20	12.00	0.00	240.00	f
148	143	5	\N	\N	20	12.00	0.00	240.00	f
149	144	5	\N	\N	20	12.00	0.00	240.00	f
150	145	5	\N	\N	20	12.00	0.00	240.00	f
151	146	5	\N	\N	20	12.00	0.00	240.00	f
152	147	5	\N	\N	1	12.00	0.00	12.00	f
153	148	5	\N	\N	20	12.00	0.00	240.00	f
154	149	5	\N	\N	30	12.00	0.00	360.00	f
155	150	5	\N	\N	31	12.00	0.00	372.00	f
156	151	5	\N	\N	31	12.00	0.00	372.00	f
157	152	5	\N	\N	31	12.00	0.00	372.00	f
158	153	5	\N	\N	31	12.00	0.00	372.00	f
159	154	3	\N	\N	4	8.50	0.00	34.00	f
160	155	3	\N	\N	4	8.50	0.00	34.00	f
161	155	5	\N	\N	2	12.00	0.00	24.00	f
162	156	3	\N	\N	4	8.50	0.00	34.00	f
163	156	5	\N	\N	2	12.00	0.00	24.00	f
164	157	3	\N	\N	300	8.50	0.00	2550.00	f
165	157	5	\N	\N	3	12.00	0.00	36.00	f
166	158	3	\N	\N	300	8.50	0.00	2550.00	f
167	158	5	\N	\N	3	12.00	0.00	36.00	f
168	159	3	\N	\N	300	8.50	0.00	2550.00	f
169	159	5	\N	\N	3	12.00	0.00	36.00	f
170	160	3	\N	\N	300	8.50	0.00	2550.00	f
171	160	5	\N	\N	3	12.00	0.00	36.00	f
172	161	3	\N	\N	300	8.50	0.00	2550.00	f
173	161	5	\N	\N	3	12.00	0.00	36.00	f
174	162	5	\N	\N	1	12.00	0.00	12.00	f
175	162	3	\N	\N	1	8.50	0.00	8.50	f
176	163	5	\N	\N	1	12.00	0.00	12.00	f
177	163	3	\N	\N	1	8.50	0.00	8.50	f
178	164	5	\N	\N	1	12.00	0.00	12.00	f
179	164	3	\N	\N	1	8.50	0.00	8.50	f
180	165	5	\N	\N	1	12.00	0.00	12.00	f
181	165	3	\N	\N	1	8.50	0.00	8.50	f
182	166	5	\N	\N	1	12.00	0.00	12.00	f
183	166	3	\N	\N	1	8.50	0.00	8.50	f
184	167	5	\N	\N	1	12.00	0.00	12.00	f
185	167	3	\N	\N	1	8.50	0.00	8.50	f
186	168	5	\N	\N	1	12.00	0.00	12.00	f
187	168	3	\N	\N	1	8.50	0.00	8.50	f
188	169	5	\N	\N	1	12.00	0.00	12.00	f
189	169	3	\N	\N	1	8.50	0.00	8.50	f
190	170	5	\N	\N	1	12.00	0.00	12.00	f
191	170	3	\N	\N	1	8.50	0.00	8.50	f
192	171	5	\N	\N	1	12.00	0.00	12.00	f
193	171	3	\N	\N	1	8.50	0.00	8.50	f
194	172	5	\N	\N	1	12.00	0.00	12.00	f
195	172	3	\N	\N	1	8.50	0.00	8.50	f
196	173	5	\N	\N	1	12.00	0.00	12.00	f
197	173	3	\N	\N	1	8.50	0.00	8.50	f
198	174	5	\N	\N	1	12.00	0.00	12.00	f
199	174	3	\N	\N	1	8.50	0.00	8.50	f
200	175	5	\N	\N	1	12.00	0.00	12.00	f
201	175	3	\N	\N	1	8.50	0.00	8.50	f
202	176	5	\N	\N	1	12.00	0.00	12.00	f
203	176	3	\N	\N	1	8.50	0.00	8.50	f
204	177	5	\N	\N	1	12.00	0.00	12.00	f
205	178	5	\N	\N	1	12.00	0.00	12.00	f
206	179	5	\N	\N	1	12.00	0.00	12.00	f
207	180	5	\N	\N	2	12.00	0.00	24.00	f
208	181	5	\N	\N	2	12.00	0.00	24.00	f
209	182	5	\N	\N	2	12.00	0.00	24.00	f
210	183	5	\N	\N	2	12.00	0.00	24.00	f
211	184	5	\N	\N	2	12.00	0.00	24.00	f
212	185	5	\N	\N	2	12.00	0.00	24.00	f
213	186	5	\N	\N	2	12.00	0.00	24.00	f
214	187	5	\N	\N	2	12.00	0.00	24.00	f
215	188	5	\N	\N	2	12.00	0.00	24.00	f
216	189	5	\N	\N	2	12.00	0.00	24.00	f
217	190	5	\N	\N	2	12.00	0.00	24.00	f
218	191	5	\N	\N	2	12.00	0.00	24.00	f
219	192	5	\N	\N	2	12.00	0.00	24.00	f
220	193	5	\N	\N	2	12.00	0.00	24.00	f
221	194	5	\N	\N	2	12.00	0.00	24.00	f
222	195	5	\N	\N	3	12.00	0.00	36.00	f
223	196	5	\N	\N	100	12.00	0.00	1200.00	f
224	197	5	\N	\N	1	12.00	0.00	12.00	f
225	198	3	\N	\N	4	8.50	0.00	34.00	f
226	199	5	\N	\N	100	12.00	0.00	1200.00	f
227	200	3	\N	\N	1	8.50	0.00	8.50	f
228	201	5	\N	\N	1	12.00	0.00	12.00	f
229	201	2	\N	\N	200	10.00	0.00	2000.00	f
230	202	5	\N	\N	9	12.00	0.00	108.00	f
231	203	5	\N	\N	90	12.00	0.00	1080.00	f
232	204	3	\N	\N	5	8.50	0.00	42.50	f
233	205	5	\N	\N	300	12.00	0.00	3600.00	f
234	206	3	\N	\N	90	8.50	0.00	765.00	f
235	207	5	\N	\N	1	12.00	0.00	12.00	f
236	208	5	\N	\N	199	12.00	0.00	2388.00	f
237	209	5	\N	\N	2	12.00	0.00	24.00	f
238	210	5	\N	\N	2	12.00	0.00	24.00	f
239	211	5	\N	\N	2	12.00	0.00	24.00	f
240	212	5	\N	\N	1	12.00	0.00	12.00	f
\.


--
-- TOC entry 5393 (class 0 OID 16525)
-- Dependencies: 235
-- Data for Name: empleado; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empleado (id_empleado, id_persona, cargo, fecha_ingreso, esta_capacitado, activo, fecha_creacion) FROM stdin;
\.


--
-- TOC entry 5395 (class 0 OID 16540)
-- Dependencies: 237
-- Data for Name: inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventario (id_inventario, id_lote, id_ubicacion, cantidad_actual, stock_minimo, stock_maximo, fecha_actualizacion) FROM stdin;
7	7	1	50	0	\N	2026-10-25 21:24:09.002606
1	1	1	100	20	200	2026-11-10 23:55:03.185202
3	3	1	200	10	100	2026-11-10 23:55:03.185202
8	8	1	193	0	\N	2026-11-15 16:29:45.950333
5	5	1	85	10	100	2026-10-25 21:29:22.441668
2	2	1	300	20	200	2026-11-10 23:55:03.185202
4	4	1	300	10	100	2026-11-10 23:55:03.185202
\.


--
-- TOC entry 5397 (class 0 OID 16556)
-- Dependencies: 239
-- Data for Name: lote_medicamento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lote_medicamento (id_lote, id_medicamento, id_proveedor, numero_lote, fecha_fabricacion, fecha_vencimiento, cantidad_inicial, estado, fecha_ingreso, observaciones) FROM stdin;
1	2	1	LOT-2026-001	2025-11-30	2026-11-30	60	activo	2026-10-08 16:45:29.132324	\N
2	2	2	LOT-2026-002	2026-06-30	2027-06-30	40	activo	2026-10-08 16:45:29.132324	\N
3	3	1	LOT-2026-003	2025-12-15	2026-12-15	30	activo	2026-10-08 16:45:29.132324	\N
5	4	1	LOT-2026-005	2026-01-10	2027-01-10	25	activo	2026-10-08 16:45:29.132324	\N
4	2	1	22	2026-10-08	2027-10-08	10	activo	2026-10-08 16:45:29.132324	string
7	10	\N	LEGACY-10-20261025212410	2026-10-25	2028-10-25	50	activo	2026-10-25 21:24:09.002606	Lote creado por migraciÃ³n 002 para respaldar stock legado.
8	5	\N	LEGACY-5-20261025212411	2026-10-25	2027-11-10	2	activo	2026-10-25 21:24:09.002606	Lote creado por migraciÃ³n 002 para respaldar stock legado.
\.


--
-- TOC entry 5399 (class 0 OID 16575)
-- Dependencies: 241
-- Data for Name: medicamento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.medicamento (id_medicamento, codigo_barras, nombre_comercial, nombre_generico, id_categoria, tipo_producto, presentacion, precio_compra, precio_venta, requiere_receta, activo, created_at, updated_at, created_by, updated_by, stock, imagen, descripcion) FROM stdin;
2	777-12345	Paracetamol 500mg	Paracetamol	1	Analgesico	Caja x 10	5.00	10.00	0	1	2026-09-11 09:44:03.988488	2026-11-15 16:22:46.674566	\N	1	700	/uploads/med-1790795529641-922796857.jpg	USO: Analgesico y antipiretico de uso comun.\n\nBENEFICIOS: Alivia dolores leves a moderados como dolor de cabeza, muscular, dental y menstrual. Reduce la fiebre.\n\nMODO DE USO: Tomar 1 a 2 comprimidos cada 6 a 8 horas. No exceder 4 gramos (8 comprimidos) en 24 horas.\n\nCONTRAINDICACIONES: No usar en caso de enfermedad hepatica grave o alergia al paracetamol.\n\nPRECAUCIONES: Evitar el consumo de alcohol durante el tratamiento. Seguro en embarazo bajo supervision medica.
3	888-99999	Ibuprofeno 400mg	Ibuprofeno	2	Antiinflamatorio	Caja x 20	4.00	8.50	0	1	2026-09-11 09:44:03.988488	2026-11-15 16:27:02.283948	\N	1	200	/uploads/med-1791057459616-240001454.jpg	USO: Antibiotico de amplio espectro del grupo de las penicilinas.\n\nBENEFICIOS: Trata infecciones bacterianas como otitis, sinusitis, faringitis, infecciones urinarias y respiratorias.\n\nMODO DE USO: Tomar 1 capsula cada 8 horas durante 7 a 10 dias. Completar el tratamiento aunque los sintomas desaparezcan.\n\nCONTRAINDICACIONES: No usar en caso de alergia a penicilinas o cefalosporinas.\n\nPRECAUCIONES: Puede causar diarrea. Tomar con o sin alimentos. REQUIERE RECETA MEDICA.
10	777-99999	Dipirona 500mg	Dipirona	1	AnalgÃ©sico	Caja x 20	3.50	9.00	1	1	2026-09-21 09:51:54.262147	2026-10-25 21:34:58.437969	1	1	50	/uploads/med-1791057696134-752469804.jpg	\N
4	111-22222	Amoxicilina 500mg	Amoxicilina	3	Antibiotico	Caja x 21	7.50	15.00	1	1	2026-09-11 09:44:03.988488	2026-10-28 00:04:37.457167	\N	1	85	/uploads/med-1791057637568-80357205.png	USO: Inhibidor de la bomba de protones (IBP). Reduce la produccion de acido gastrico.\n\nBENEFICIOS: Trata ulcera gastrica y duodenal, reflujo gastroesofagico (ERGE), gastritis y sindrome de Zollinger-Ellison.\n\nMODO DE USO: Tomar 1 capsula en ayunas, 30 minutos antes del desayuno. Tratamiento tipico de 4 a 8 semanas.\n\nCONTRAINDICACIONES: No usar en caso de alergia a omeprazol o benzimidazoles.\n\nPRECAUCIONES: Uso prolongado puede afectar absorcion de vitamina B12 y calcio. Consultar al medico si los sintomas persisten.
5	333-44444	Omeprazol 20mg	Omeprazol	4	Gastrointestinal	Caja x 14	6.00	12.00	0	1	2026-09-11 09:44:03.988488	2026-11-15 16:51:45.637508	\N	1	193	/uploads/med-1791057706321-537117681.webp	USO: Antiinflamatorio no esteroideo (AINE).\n\nBENEFICIOS: Alivia el dolor leve a moderado, reduce la fiebre y disminuye la inflamacion.\n\nMODO DE USO: Tomar 1 comprimido cada 8 horas con alimentos. No exceder 3 comprimidos en 24 horas.\n\nCONTRAINDICACIONES: No usar en caso de ulcera gastrica, problemas renales o alergias a AINEs.\n\nPRECAUCIONES: Consultar al medico si los sintomas persisten por mas de 5 dias.
\.


--
-- TOC entry 5401 (class 0 OID 16593)
-- Dependencies: 243
-- Data for Name: medicamento_principio_activo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.medicamento_principio_activo (id_medicamento, id_principio_activo, cantidad, unidad) FROM stdin;
2	1	500.000	mg
3	2	400.000	mg
4	3	500.000	mg
5	4	20.000	mg
10	5	500.000	mg
\.


--
-- TOC entry 5402 (class 0 OID 16598)
-- Dependencies: 244
-- Data for Name: metodo_pago; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metodo_pago (id_metodo_pago, nombre, activo) FROM stdin;
1	efectivo	t
2	transferencia_bancaria	t
3	qr_simple	t
4	tarjeta_debito	t
5	tarjeta_credito	t
\.


--
-- TOC entry 5404 (class 0 OID 16606)
-- Dependencies: 246
-- Data for Name: movimiento_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimiento_inventario (id_movimiento, id_inventario, tipo_movimiento, cantidad, motivo, id_empleado, fecha_movimiento) FROM stdin;
12	8	salida	1	Venta automÃ¡tica ID: 197	\N	2026-11-15 16:17:50.366609
13	3	salida	4	Venta automÃ¡tica ID: 198	\N	2026-11-15 16:21:07.691158
14	8	salida	100	Venta automÃ¡tica ID: 199	\N	2026-11-15 16:21:45.344414
15	3	salida	1	Venta automÃ¡tica ID: 200	\N	2026-11-15 16:22:08.58719
16	8	salida	1	Venta automÃ¡tica ID: 201	\N	2026-11-15 16:22:46.674566
17	1	salida	200	Venta automÃ¡tica ID: 201	\N	2026-11-15 16:22:46.674566
18	8	salida	9	Venta automÃ¡tica ID: 202	\N	2026-11-15 16:25:11.374224
19	8	salida	90	Venta automÃ¡tica ID: 203	\N	2026-11-15 16:25:37.829406
20	3	salida	5	Venta automÃ¡tica ID: 204	\N	2026-11-15 16:26:05.405462
21	8	salida	300	Venta automÃ¡tica ID: 205	\N	2026-11-15 16:26:35.99755
22	3	salida	90	Venta automÃ¡tica ID: 206	\N	2026-11-15 16:27:02.283948
23	8	salida	1	Venta automÃ¡tica ID: 207	\N	2026-11-15 16:28:59.530413
24	8	salida	199	Venta automÃ¡tica ID: 208	\N	2026-11-15 16:29:31.303275
25	8	salida	2	Venta automÃ¡tica ID: 209	\N	2026-11-15 16:45:29.857558
26	8	salida	2	Venta automÃ¡tica ID: 210	\N	2026-11-15 16:50:59.547467
27	8	salida	2	Venta automÃ¡tica ID: 211	\N	2026-11-15 16:51:21.85553
28	8	salida	1	Venta automÃ¡tica ID: 212	\N	2026-11-15 16:51:45.637508
\.


--
-- TOC entry 5406 (class 0 OID 16621)
-- Dependencies: 248
-- Data for Name: oferta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.oferta (id_oferta, nombre_oferta, descripcion, porcentaje_descuento, fecha_inicio, fecha_fin, activo, created_at, updated_at, created_by, updated_by) FROM stdin;
5	Descuento Invierno	20% de descuento en analgÃ©sicos	30.00	2026-09-21	2026-10-21	t	2026-09-21 10:53:21.096338	2026-09-30 17:36:40.833167	1	\N
7	Descuento Verano	oferta	50.00	2026-09-29	2026-10-30	t	2026-09-30 18:44:22.03118	2026-10-05 02:32:25.514259	1	\N
8	ofertirta	oferton	25.00	2026-10-05	2026-10-10	t	2026-09-30 18:47:08.028709	2026-10-05 02:38:48.271064	1	\N
9	ofertita	oferta de cosas	10.00	2026-10-08	2026-10-08	t	2026-10-08 17:59:39.756347	2026-10-08 17:59:39.756347	1	\N
6	descuento	oferta	20.00	2026-10-01	2026-11-01	t	2026-09-30 18:44:17.313144	2026-10-05 00:39:06.199924	1	\N
\.


--
-- TOC entry 5408 (class 0 OID 16633)
-- Dependencies: 250
-- Data for Name: oferta_medicamento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.oferta_medicamento (id_oferta_medicamento, id_oferta, id_medicamento, fecha_asignacion) FROM stdin;
5	8	10	2026-10-05 01:53:34.928588
6	8	5	2026-10-05 02:38:18.791622
7	8	4	2026-10-05 02:38:34.032786
\.


--
-- TOC entry 5410 (class 0 OID 16639)
-- Dependencies: 252
-- Data for Name: pago; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pago (id_pago, id_venta, id_metodo_pago, monto, referencia, fecha_pago, estado_pago) FROM stdin;
98	187	1	24.00	\N	2026-11-15 15:04:56.533369	confirmado
99	188	1	24.00	\N	2026-11-15 15:09:31.646656	confirmado
100	189	2	24.00	\N	2026-11-15 15:10:44.042088	confirmado
101	190	2	24.00	\N	2026-11-15 15:11:22.190982	confirmado
102	191	2	24.00	\N	2026-11-15 15:15:52.89037	confirmado
103	192	2	24.00	\N	2026-11-15 15:15:56.312464	confirmado
104	193	2	24.00	\N	2026-11-15 15:23:47.116557	confirmado
105	194	2	24.00	\N	2026-11-15 15:23:50.993793	confirmado
9	15	3	12.00	\N	2026-10-27 15:49:05.649659	confirmado
10	16	3	17.00	\N	2026-10-27 16:06:50.844522	confirmado
11	17	3	8.50	\N	2026-10-27 17:05:12.454857	confirmado
12	18	2	8.50	\N	2026-10-27 21:40:17.071471	confirmado
13	19	3	24.00	\N	2026-10-28 08:10:21.327814	confirmado
18	25	3	60.00	\N	2026-10-28 08:17:33.687036	confirmado
19	26	1	8.50	\N	2026-10-28 08:18:04.806465	confirmado
24	31	3	120.00	\N	2026-11-04 11:56:02.038514	confirmado
34	111	3	72.00	\N	2026-11-10 00:57:34.882919	confirmado
35	121	2	18.50	\N	2026-11-10 01:24:43.081584	confirmado
36	122	2	18.50	\N	2026-11-10 01:24:47.69722	confirmado
37	123	2	18.50	\N	2026-11-10 01:24:50.514014	confirmado
38	124	2	27.00	\N	2026-11-10 01:24:57.816749	confirmado
39	125	3	27.00	\N	2026-11-10 01:25:03.323677	confirmado
40	126	3	8.50	\N	2026-11-10 01:37:38.199967	confirmado
41	127	3	8.50	\N	2026-11-10 01:38:54.748874	confirmado
42	128	3	8.50	\N	2026-11-10 01:44:14.83	confirmado
43	129	3	8.50	\N	2026-11-10 01:44:17.829333	confirmado
44	130	3	8.50	\N	2026-11-10 01:44:21.013204	confirmado
45	131	3	8.50	\N	2026-11-10 01:44:23.75124	confirmado
46	132	4	127.50	\N	2026-11-10 23:39:08.810404	confirmado
47	134	4	1480.00	\N	2026-11-10 23:41:15.77136	confirmado
48	137	3	240.00	\N	2026-11-10 23:55:50.576365	confirmado
49	138	2	240.00	\N	2026-11-10 23:56:05.237137	confirmado
50	139	2	240.00	\N	2026-11-10 23:56:07.954677	confirmado
51	140	1	240.00	\N	2026-11-10 23:56:19.110438	confirmado
52	141	1	240.00	\N	2026-11-10 23:56:21.731852	confirmado
53	142	1	240.00	\N	2026-11-10 23:56:24.709128	confirmado
54	143	1	240.00	\N	2026-11-10 23:56:27.180503	confirmado
55	144	1	240.00	\N	2026-11-10 23:56:29.819995	confirmado
56	145	1	240.00	\N	2026-11-10 23:56:32.131784	confirmado
57	146	1	240.00	\N	2026-11-11 00:02:33.389272	confirmado
58	147	1	12.00	\N	2026-11-11 00:05:00.551903	confirmado
59	148	2	240.00	\N	2026-11-11 00:05:06.399568	confirmado
60	149	2	360.00	\N	2026-11-11 06:25:29.352583	confirmado
61	150	1	372.00	\N	2026-11-11 06:25:45.823445	confirmado
62	151	1	372.00	\N	2026-11-11 06:25:48.452219	confirmado
63	152	1	372.00	\N	2026-11-11 06:26:45.869547	confirmado
64	153	1	372.00	\N	2026-11-11 06:26:48.756264	confirmado
65	154	1	34.00	\N	2026-11-11 06:31:22.694175	confirmado
66	155	1	58.00	\N	2026-11-11 06:35:25.93232	confirmado
67	156	1	58.00	\N	2026-11-11 06:35:29.097557	confirmado
68	157	2	2586.00	\N	2026-11-11 06:38:32.531026	confirmado
69	158	2	2586.00	\N	2026-11-11 06:38:35.838624	confirmado
70	159	2	2586.00	\N	2026-11-11 06:38:38.23726	confirmado
71	160	2	2586.00	\N	2026-11-11 06:38:40.479221	confirmado
72	161	2	2586.00	\N	2026-11-11 06:38:43.44435	confirmado
73	162	3	20.50	\N	2026-11-15 12:32:07.399263	confirmado
74	163	1	20.50	\N	2026-11-15 12:37:35.825555	confirmado
75	164	3	20.50	\N	2026-11-15 12:38:23.259775	confirmado
76	165	3	20.50	\N	2026-11-15 12:38:25.931307	confirmado
77	166	3	20.50	\N	2026-11-15 12:38:28.792653	confirmado
78	167	3	20.50	\N	2026-11-15 13:19:13.446354	confirmado
79	168	3	20.50	\N	2026-11-15 13:19:32.333009	confirmado
80	169	5	20.50	\N	2026-11-15 13:19:59.49425	confirmado
81	170	5	20.50	\N	2026-11-15 13:20:08.683926	confirmado
82	171	5	20.50	\N	2026-11-15 13:20:11.654998	confirmado
83	172	5	20.50	\N	2026-11-15 13:20:14.684239	confirmado
84	173	5	20.50	\N	2026-11-15 13:20:20.995727	confirmado
85	174	5	20.50	\N	2026-11-15 13:20:23.940685	confirmado
86	175	1	20.50	\N	2026-11-15 13:21:26.124199	confirmado
87	176	1	20.50	\N	2026-11-15 13:21:56.985059	confirmado
88	177	1	12.00	\N	2026-11-15 13:24:20.022295	confirmado
89	178	3	12.00	\N	2026-11-15 13:24:25.813412	confirmado
90	179	3	12.00	\N	2026-11-15 13:26:26.056648	confirmado
91	180	4	24.00	\N	2026-11-15 14:17:10.30691	confirmado
92	181	4	24.00	\N	2026-11-15 14:17:16.393271	confirmado
93	182	4	24.00	\N	2026-11-15 14:17:19.825808	confirmado
94	183	4	24.00	\N	2026-11-15 14:18:37.726448	confirmado
95	184	1	24.00	\N	2026-11-15 14:29:35.553596	confirmado
96	185	1	24.00	\N	2026-11-15 14:59:43.128065	confirmado
97	186	1	24.00	\N	2026-11-15 15:04:52.537165	confirmado
106	195	4	36.00	\N	2026-11-15 16:13:41.329229	confirmado
107	196	2	1200.00	\N	2026-11-15 16:14:32.87053	confirmado
108	197	1	12.00	\N	2026-11-15 16:17:50.366609	confirmado
109	198	2	34.00	\N	2026-11-15 16:21:07.691158	confirmado
110	199	3	1200.00	\N	2026-11-15 16:21:45.344414	confirmado
111	200	2	8.50	\N	2026-11-15 16:22:08.58719	confirmado
112	201	1	2012.00	\N	2026-11-15 16:22:46.674566	confirmado
113	202	1	108.00	\N	2026-11-15 16:25:11.374224	confirmado
114	203	2	1080.00	\N	2026-11-15 16:25:37.829406	confirmado
115	204	2	42.50	\N	2026-11-15 16:26:05.405462	confirmado
116	205	2	3600.00	\N	2026-11-15 16:26:35.99755	confirmado
117	206	2	765.00	\N	2026-11-15 16:27:02.283948	confirmado
118	207	2	12.00	\N	2026-11-15 16:28:59.530413	confirmado
119	208	2	2388.00	\N	2026-11-15 16:29:31.303275	confirmado
120	209	1	24.00	\N	2026-11-15 16:45:29.857558	confirmado
121	210	1	24.00	\N	2026-11-15 16:50:59.547467	confirmado
122	211	1	24.00	\N	2026-11-15 16:51:21.85553	confirmado
123	212	2	12.00	\N	2026-11-15 16:51:45.637508	confirmado
\.


--
-- TOC entry 5412 (class 0 OID 16653)
-- Dependencies: 254
-- Data for Name: permiso; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permiso (id_permiso, nombre, accion, descripcion) FROM stdin;
1	gestionar_ventas	CRUD	Registrar y administrar ventas.
2	gestionar_inventario	CRUD	Registrar movimientos y consultar stock.
3	gestionar_recetas	CRUD	Registrar y consultar recetas.
4	gestionar_clientes	CRUD	Gestionar datos de clientes.
5	gestionar_usuarios	CRUD	Gestionar usuarios y roles.
\.


--
-- TOC entry 5414 (class 0 OID 16662)
-- Dependencies: 256
-- Data for Name: persona; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.persona (id_persona, ci, nombre_completo, telefono, email, fecha_registro) FROM stdin;
1	90000001	Roberto GÃ³mez	+591 74444444	roberto@email.com	2026-10-08 16:45:29.132324
2	90000002	Carmen Rivero	+591 75555555	carmen@email.com	2026-10-08 16:45:29.132324
4	DEMO-CLIENTE	Cliente Demo	+591 70000000	cliente@farmacia.com	2026-10-25 22:00:06.831859
6	99999999	Cliente App Movil	70000000	clienteapp@farmacia.com	2026-10-27 15:25:51.847746
\.


--
-- TOC entry 5416 (class 0 OID 16672)
-- Dependencies: 258
-- Data for Name: principio_activo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.principio_activo (id_principio_activo, nombre, descripcion, requiere_control_especial, activo) FROM stdin;
1	Paracetamol	AnalgÃ©sico y antipirÃ©tico.	f	t
2	Ibuprofeno	Antiinflamatorio no esteroideo.	f	t
3	Amoxicilina	AntibiÃ³tico betalactÃ¡mico.	t	t
4	Omeprazol	Inhibidor de la secreciÃ³n Ã¡cida gÃ¡strica.	f	t
5	Dipirona	AnalgÃ©sico y antipirÃ©tico.	f	t
\.


--
-- TOC entry 5418 (class 0 OID 16684)
-- Dependencies: 260
-- Data for Name: proveedor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proveedor (id_proveedor, nombre_empresa, contacto_nombre, contacto_telefono, contacto_email, acepta_devoluciones, frecuencia_visita, fecha_registro, activo) FROM stdin;
1	Distribuidora FarmacÃ©utica Yacuiba SRL	Carlos MÃ©ndez	+591 71234567	carlos@farmayacuiba.com	t	semanal	2026-10-08 16:45:29.132324	t
2	FarmaBolivia Distribuciones	MarÃ­a LÃ³pez	+591 72345678	maria@farmabolivia.com	t	quincenal	2026-10-08 16:45:29.132324	t
3	DroguerÃ­a Santa Cruz S.A.	Esteban Hurtado	+591 73456789	ventas@drogueriasc.com	t	mensual	2026-10-08 16:45:29.132324	t
\.


--
-- TOC entry 5420 (class 0 OID 16700)
-- Dependencies: 262
-- Data for Name: receta_medica; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receta_medica (id_receta, id_cliente, numero_receta, medico_prescriptor, fecha_emision, fecha_registro_farmacia, fecha_vencimiento, observaciones_receta, estado) FROM stdin;
1	1	REC-2026-001	Dr. Jaime Alvarez	2026-10-01	2026-10-08 16:45:29.132324	2027-01-01	\N	vigente
\.


--
-- TOC entry 5422 (class 0 OID 16718)
-- Dependencies: 264
-- Data for Name: rol; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rol (id_rol, nombre, descripcion, activo) FROM stdin;
1	Administrador	Acceso general.	t
2	Regente	GestiÃ³n de recetas y atenciÃ³n farmacÃ©utica.	t
3	Vendedor	GestiÃ³n de ventas.	t
4	Almacenero	GestiÃ³n de inventario.	t
\.


--
-- TOC entry 5424 (class 0 OID 16728)
-- Dependencies: 266
-- Data for Name: rol_permiso; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rol_permiso (id_rol, id_permiso) FROM stdin;
1	1
1	2
1	3
1	4
1	5
2	2
2	3
2	4
3	1
3	4
4	2
4	4
\.


--
-- TOC entry 5425 (class 0 OID 16733)
-- Dependencies: 267
-- Data for Name: sucursal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sucursal (id_sucursal, nombre, ciudad, direccion_texto, telefono, activa, fecha_apertura) FROM stdin;
1	Main Farma Central	Yacuiba	Zona Central, Yacuiba, Tarija	+591 4 0000000	t	2024-01-01
\.


--
-- TOC entry 5427 (class 0 OID 16743)
-- Dependencies: 269
-- Data for Name: ubicacion_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ubicacion_inventario (id_ubicacion, id_sucursal, nombre, pasillo, estante, temperatura_recomendada, activa, fecha_creacion) FROM stdin;
1	1	Estante principal	A	1	15-25 C	t	2026-10-08 16:45:29.132324
2	1	Zona cuarentena	Q	1	15-25 C	f	2026-10-08 16:45:29.132324
\.


--
-- TOC entry 5429 (class 0 OID 16754)
-- Dependencies: 271
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, name, role, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5431 (class 0 OID 16765)
-- Dependencies: 273
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario (id_usuario, id_empleado, nombre_usuario, nombre, contrasena_hash, activo, fecha_creacion, ultimo_acceso, id_cliente) FROM stdin;
4	\N	cliente@farmacia.com	Cliente Demo	$2a$12$pmXDGpukIAi9dAwxHsQSMuzkUEt8MaAdcfzZB13CpVdnHE8f3FsM2	t	2026-10-26 23:07:35.260821	2026-11-15 16:12:35.920216	5
3	\N	demo@agenda.com	Admin Demo	$2a$12$pmXDGpukIAi9dAwxHsQSMuzkUEt8MaAdcfzZB13CpVdnHE8f3FsM2	t	2026-10-26 23:07:34.496068	\N	\N
\.


--
-- TOC entry 5433 (class 0 OID 16778)
-- Dependencies: 275
-- Data for Name: usuario_rol; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario_rol (id_usuario, id_rol) FROM stdin;
3	1
\.


--
-- TOC entry 5434 (class 0 OID 16783)
-- Dependencies: 276
-- Data for Name: venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venta (id_venta, id_empleado, id_cliente, fecha_venta, total_venta, estado, observaciones) FROM stdin;
134	\N	5	2026-11-10 23:41:15.77136	0.00	completada	\N
137	\N	5	2026-11-10 23:55:50.576365	0.00	completada	\N
138	\N	5	2026-11-10 23:56:05.237137	0.00	completada	\N
139	\N	5	2026-11-10 23:56:07.954677	0.00	completada	\N
140	\N	5	2026-11-10 23:56:19.110438	0.00	completada	\N
141	\N	5	2026-11-10 23:56:21.731852	0.00	completada	\N
142	\N	5	2026-11-10 23:56:24.709128	0.00	completada	\N
143	\N	5	2026-11-10 23:56:27.180503	0.00	completada	\N
144	\N	5	2026-11-10 23:56:29.819995	0.00	completada	\N
145	\N	5	2026-11-10 23:56:32.131784	0.00	completada	\N
146	\N	5	2026-11-11 00:02:33.389272	0.00	completada	\N
147	\N	5	2026-11-11 00:05:00.551903	0.00	completada	\N
148	\N	5	2026-11-11 00:05:06.399568	0.00	completada	\N
149	\N	5	2026-11-11 06:25:29.352583	0.00	completada	\N
150	\N	5	2026-11-11 06:25:45.823445	0.00	completada	\N
151	\N	5	2026-11-11 06:25:48.452219	0.00	completada	\N
152	\N	5	2026-11-11 06:26:45.869547	0.00	completada	\N
15	\N	5	2026-10-27 15:49:05.649659	12.00	completada	\N
153	\N	5	2026-11-11 06:26:48.756264	0.00	completada	\N
16	\N	5	2026-10-27 16:06:50.844522	17.00	completada	\N
17	\N	5	2026-10-27 17:05:12.454857	8.50	completada	\N
154	\N	5	2026-11-11 06:31:22.694175	0.00	completada	\N
18	\N	5	2026-10-27 21:40:17.071471	8.50	completada	\N
19	\N	5	2026-10-28 08:10:21.327814	24.00	completada	\N
155	\N	5	2026-11-11 06:35:25.93232	0.00	completada	\N
156	\N	5	2026-11-11 06:35:29.097557	0.00	completada	\N
157	\N	5	2026-11-11 06:38:32.531026	0.00	completada	\N
158	\N	5	2026-11-11 06:38:35.838624	0.00	completada	\N
111	\N	5	2026-11-10 00:57:34.882919	0.00	completada	\N
159	\N	5	2026-11-11 06:38:38.23726	0.00	completada	\N
25	\N	5	2026-10-28 08:17:33.687036	60.00	completada	\N
26	\N	5	2026-10-28 08:18:04.806465	8.50	completada	\N
160	\N	5	2026-11-11 06:38:40.479221	0.00	completada	\N
161	\N	5	2026-11-11 06:38:43.44435	0.00	completada	\N
162	\N	5	2026-11-15 12:32:07.399263	0.00	completada	\N
163	\N	5	2026-11-15 12:37:35.825555	0.00	completada	\N
164	\N	5	2026-11-15 12:38:23.259775	0.00	completada	\N
31	\N	5	2026-11-04 11:56:02.038514	120.00	completada	\N
165	\N	5	2026-11-15 12:38:25.931307	0.00	completada	\N
166	\N	5	2026-11-15 12:38:28.792653	0.00	completada	\N
167	\N	5	2026-11-15 13:19:13.446354	0.00	completada	\N
168	\N	5	2026-11-15 13:19:32.333009	0.00	completada	\N
169	\N	5	2026-11-15 13:19:59.49425	0.00	completada	\N
170	\N	5	2026-11-15 13:20:08.683926	0.00	completada	\N
171	\N	5	2026-11-15 13:20:11.654998	0.00	completada	\N
172	\N	5	2026-11-15 13:20:14.684239	0.00	completada	\N
173	\N	5	2026-11-15 13:20:20.995727	0.00	completada	\N
174	\N	5	2026-11-15 13:20:23.940685	0.00	completada	\N
175	\N	5	2026-11-15 13:21:26.124199	0.00	completada	\N
176	\N	5	2026-11-15 13:21:56.985059	0.00	completada	\N
177	\N	5	2026-11-15 13:24:20.022295	0.00	completada	\N
178	\N	5	2026-11-15 13:24:25.813412	0.00	completada	\N
121	\N	5	2026-11-10 01:24:43.081584	0.00	completada	\N
122	\N	5	2026-11-10 01:24:47.69722	0.00	completada	\N
123	\N	5	2026-11-10 01:24:50.514014	0.00	completada	\N
124	\N	5	2026-11-10 01:24:57.816749	0.00	completada	\N
125	\N	5	2026-11-10 01:25:03.323677	0.00	completada	\N
126	\N	5	2026-11-10 01:37:38.199967	0.00	completada	\N
127	\N	5	2026-11-10 01:38:54.748874	0.00	completada	\N
128	\N	5	2026-11-10 01:44:14.83	0.00	completada	\N
129	\N	5	2026-11-10 01:44:17.829333	0.00	completada	\N
130	\N	5	2026-11-10 01:44:21.013204	0.00	completada	\N
131	\N	5	2026-11-10 01:44:23.75124	0.00	completada	\N
132	\N	5	2026-11-10 23:39:08.810404	0.00	completada	\N
179	\N	5	2026-11-15 13:26:26.056648	0.00	completada	\N
180	\N	5	2026-11-15 14:17:10.30691	0.00	completada	\N
181	\N	5	2026-11-15 14:17:16.393271	0.00	completada	\N
182	\N	5	2026-11-15 14:17:19.825808	0.00	completada	\N
183	\N	5	2026-11-15 14:18:37.726448	0.00	completada	\N
184	\N	5	2026-11-15 14:29:35.553596	0.00	completada	\N
185	\N	5	2026-11-15 14:59:43.128065	0.00	pendiente	\N
186	\N	5	2026-11-15 15:04:52.537165	0.00	completada	\N
187	\N	5	2026-11-15 15:04:56.533369	0.00	completada	\N
188	\N	5	2026-11-15 15:09:31.646656	0.00	completada	\N
189	\N	5	2026-11-15 15:10:44.042088	0.00	completada	\N
190	\N	5	2026-11-15 15:11:22.190982	0.00	completada	\N
191	\N	5	2026-11-15 15:15:52.89037	0.00	completada	\N
192	\N	5	2026-11-15 15:15:56.312464	0.00	completada	\N
193	\N	5	2026-11-15 15:23:47.116557	0.00	completada	\N
194	\N	5	2026-11-15 15:23:50.993793	0.00	completada	\N
195	\N	5	2026-11-15 16:13:41.329229	0.00	completada	\N
196	\N	5	2026-11-15 16:14:32.87053	0.00	completada	\N
197	\N	5	2026-11-15 16:17:50.366609	0.00	completada	\N
198	\N	5	2026-11-15 16:21:07.691158	0.00	completada	\N
199	\N	5	2026-11-15 16:21:45.344414	0.00	completada	\N
200	\N	5	2026-11-15 16:22:08.58719	0.00	completada	\N
201	\N	5	2026-11-15 16:22:46.674566	0.00	completada	\N
202	\N	5	2026-11-15 16:25:11.374224	0.00	completada	\N
203	\N	5	2026-11-15 16:25:37.829406	0.00	completada	\N
204	\N	5	2026-11-15 16:26:05.405462	0.00	completada	\N
205	\N	5	2026-11-15 16:26:35.99755	0.00	completada	\N
206	\N	5	2026-11-15 16:27:02.283948	0.00	completada	\N
207	\N	5	2026-11-15 16:28:59.530413	0.00	completada	\N
208	\N	5	2026-11-15 16:29:31.303275	0.00	completada	\N
209	\N	5	2026-11-15 16:45:29.857558	0.00	completada	\N
210	\N	5	2026-11-15 16:50:59.547467	0.00	completada	\N
211	\N	5	2026-11-15 16:51:21.85553	0.00	completada	\N
212	\N	5	2026-11-15 16:51:45.637508	0.00	completada	\N
\.


--
-- TOC entry 5469 (class 0 OID 0)
-- Dependencies: 220
-- Name: alergia_id_alergia_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alergia_id_alergia_seq', 4, false);


--
-- TOC entry 5470 (class 0 OID 0)
-- Dependencies: 223
-- Name: categoria_id_categoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categoria_id_categoria_seq', 11, false);


--
-- TOC entry 5471 (class 0 OID 0)
-- Dependencies: 226
-- Name: cliente_id_cliente_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cliente_id_cliente_seq', 5, true);


--
-- TOC entry 5472 (class 0 OID 0)
-- Dependencies: 228
-- Name: compra_id_compra_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.compra_id_compra_seq', 3, true);


--
-- TOC entry 5473 (class 0 OID 0)
-- Dependencies: 230
-- Name: detalle_compra_id_detalle_compra_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_compra_id_detalle_compra_seq', 3, true);


--
-- TOC entry 5474 (class 0 OID 0)
-- Dependencies: 232
-- Name: detalle_receta_id_detalle_receta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_receta_id_detalle_receta_seq', 2, true);


--
-- TOC entry 5475 (class 0 OID 0)
-- Dependencies: 234
-- Name: detalle_venta_id_detalle_venta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_venta_id_detalle_venta_seq', 240, true);


--
-- TOC entry 5476 (class 0 OID 0)
-- Dependencies: 236
-- Name: empleado_id_empleado_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.empleado_id_empleado_seq', 1, false);


--
-- TOC entry 5477 (class 0 OID 0)
-- Dependencies: 238
-- Name: inventario_id_inventario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventario_id_inventario_seq', 10, true);


--
-- TOC entry 5478 (class 0 OID 0)
-- Dependencies: 240
-- Name: lote_medicamento_id_lote_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lote_medicamento_id_lote_seq', 9, true);


--
-- TOC entry 5479 (class 0 OID 0)
-- Dependencies: 242
-- Name: medicamento_id_medicamento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.medicamento_id_medicamento_seq', 11, true);


--
-- TOC entry 5480 (class 0 OID 0)
-- Dependencies: 245
-- Name: metodo_pago_id_metodo_pago_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.metodo_pago_id_metodo_pago_seq', 1, false);


--
-- TOC entry 5481 (class 0 OID 0)
-- Dependencies: 247
-- Name: movimiento_inventario_id_movimiento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movimiento_inventario_id_movimiento_seq', 28, true);


--
-- TOC entry 5482 (class 0 OID 0)
-- Dependencies: 249
-- Name: oferta_id_oferta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.oferta_id_oferta_seq', 9, true);


--
-- TOC entry 5483 (class 0 OID 0)
-- Dependencies: 251
-- Name: oferta_medicamento_id_oferta_medicamento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.oferta_medicamento_id_oferta_medicamento_seq', 8, false);


--
-- TOC entry 5484 (class 0 OID 0)
-- Dependencies: 253
-- Name: pago_id_pago_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pago_id_pago_seq', 123, true);


--
-- TOC entry 5485 (class 0 OID 0)
-- Dependencies: 255
-- Name: permiso_id_permiso_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permiso_id_permiso_seq', 6, false);


--
-- TOC entry 5486 (class 0 OID 0)
-- Dependencies: 257
-- Name: persona_id_persona_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.persona_id_persona_seq', 6, true);


--
-- TOC entry 5487 (class 0 OID 0)
-- Dependencies: 259
-- Name: principio_activo_id_principio_activo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.principio_activo_id_principio_activo_seq', 9, true);


--
-- TOC entry 5488 (class 0 OID 0)
-- Dependencies: 261
-- Name: proveedor_id_proveedor_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proveedor_id_proveedor_seq', 4, false);


--
-- TOC entry 5489 (class 0 OID 0)
-- Dependencies: 263
-- Name: receta_medica_id_receta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.receta_medica_id_receta_seq', 2, true);


--
-- TOC entry 5490 (class 0 OID 0)
-- Dependencies: 265
-- Name: rol_id_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rol_id_rol_seq', 5, false);


--
-- TOC entry 5491 (class 0 OID 0)
-- Dependencies: 268
-- Name: sucursal_id_sucursal_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sucursal_id_sucursal_seq', 2, false);


--
-- TOC entry 5492 (class 0 OID 0)
-- Dependencies: 270
-- Name: ubicacion_inventario_id_ubicacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ubicacion_inventario_id_ubicacion_seq', 3, true);


--
-- TOC entry 5493 (class 0 OID 0)
-- Dependencies: 272
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- TOC entry 5494 (class 0 OID 0)
-- Dependencies: 274
-- Name: usuario_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_id_usuario_seq', 4, true);


--
-- TOC entry 5495 (class 0 OID 0)
-- Dependencies: 277
-- Name: venta_id_venta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.venta_id_venta_seq', 212, true);


--
-- TOC entry 5038 (class 2606 OID 16825)
-- Name: alergia alergia_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alergia
    ADD CONSTRAINT alergia_nombre_key UNIQUE (nombre);


--
-- TOC entry 5040 (class 2606 OID 16827)
-- Name: alergia alergia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alergia
    ADD CONSTRAINT alergia_pkey PRIMARY KEY (id_alergia);


--
-- TOC entry 5042 (class 2606 OID 16829)
-- Name: alergia_principio_activo alergia_principio_activo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alergia_principio_activo
    ADD CONSTRAINT alergia_principio_activo_pkey PRIMARY KEY (id_alergia, id_principio_activo);


--
-- TOC entry 5046 (class 2606 OID 16831)
-- Name: categoria categoria_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_nombre_key UNIQUE (nombre);


--
-- TOC entry 5048 (class 2606 OID 16833)
-- Name: categoria categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_pkey PRIMARY KEY (id_categoria);


--
-- TOC entry 5055 (class 2606 OID 16835)
-- Name: cliente_alergia cliente_alergia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente_alergia
    ADD CONSTRAINT cliente_alergia_pkey PRIMARY KEY (id_cliente, id_alergia);


--
-- TOC entry 5050 (class 2606 OID 16837)
-- Name: cliente cliente_id_persona_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_id_persona_key UNIQUE (id_persona);


--
-- TOC entry 5052 (class 2606 OID 16839)
-- Name: cliente cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_pkey PRIMARY KEY (id_cliente);


--
-- TOC entry 5059 (class 2606 OID 16841)
-- Name: compra compra_numero_factura_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compra
    ADD CONSTRAINT compra_numero_factura_key UNIQUE (numero_factura);


--
-- TOC entry 5061 (class 2606 OID 16843)
-- Name: compra compra_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compra
    ADD CONSTRAINT compra_pkey PRIMARY KEY (id_compra);


--
-- TOC entry 5065 (class 2606 OID 16845)
-- Name: detalle_compra detalle_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra
    ADD CONSTRAINT detalle_compra_pkey PRIMARY KEY (id_detalle_compra);


--
-- TOC entry 5070 (class 2606 OID 16847)
-- Name: detalle_receta detalle_receta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_receta
    ADD CONSTRAINT detalle_receta_pkey PRIMARY KEY (id_detalle_receta);


--
-- TOC entry 5074 (class 2606 OID 16849)
-- Name: detalle_venta detalle_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_pkey PRIMARY KEY (id_detalle_venta);


--
-- TOC entry 5080 (class 2606 OID 16851)
-- Name: empleado empleado_id_persona_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado
    ADD CONSTRAINT empleado_id_persona_key UNIQUE (id_persona);


--
-- TOC entry 5082 (class 2606 OID 16853)
-- Name: empleado empleado_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado
    ADD CONSTRAINT empleado_pkey PRIMARY KEY (id_empleado);


--
-- TOC entry 5086 (class 2606 OID 16855)
-- Name: inventario inventario_id_lote_id_ubicacion_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_id_lote_id_ubicacion_key UNIQUE (id_lote, id_ubicacion);


--
-- TOC entry 5088 (class 2606 OID 16857)
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id_inventario);


--
-- TOC entry 5094 (class 2606 OID 16859)
-- Name: lote_medicamento lote_medicamento_id_medicamento_numero_lote_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lote_medicamento
    ADD CONSTRAINT lote_medicamento_id_medicamento_numero_lote_key UNIQUE (id_medicamento, numero_lote);


--
-- TOC entry 5096 (class 2606 OID 16861)
-- Name: lote_medicamento lote_medicamento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lote_medicamento
    ADD CONSTRAINT lote_medicamento_pkey PRIMARY KEY (id_lote);


--
-- TOC entry 5098 (class 2606 OID 16863)
-- Name: medicamento medicamento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicamento
    ADD CONSTRAINT medicamento_pkey PRIMARY KEY (id_medicamento);


--
-- TOC entry 5102 (class 2606 OID 16865)
-- Name: medicamento_principio_activo medicamento_principio_activo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicamento_principio_activo
    ADD CONSTRAINT medicamento_principio_activo_pkey PRIMARY KEY (id_medicamento, id_principio_activo);


--
-- TOC entry 5104 (class 2606 OID 16867)
-- Name: metodo_pago metodo_pago_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodo_pago
    ADD CONSTRAINT metodo_pago_nombre_key UNIQUE (nombre);


--
-- TOC entry 5106 (class 2606 OID 16869)
-- Name: metodo_pago metodo_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodo_pago
    ADD CONSTRAINT metodo_pago_pkey PRIMARY KEY (id_metodo_pago);


--
-- TOC entry 5111 (class 2606 OID 16871)
-- Name: movimiento_inventario movimiento_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT movimiento_inventario_pkey PRIMARY KEY (id_movimiento);


--
-- TOC entry 5115 (class 2606 OID 16873)
-- Name: oferta_medicamento oferta_medicamento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta_medicamento
    ADD CONSTRAINT oferta_medicamento_pkey PRIMARY KEY (id_oferta_medicamento);


--
-- TOC entry 5113 (class 2606 OID 16875)
-- Name: oferta oferta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta
    ADD CONSTRAINT oferta_pkey PRIMARY KEY (id_oferta);


--
-- TOC entry 5121 (class 2606 OID 16877)
-- Name: pago pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_pkey PRIMARY KEY (id_pago);


--
-- TOC entry 5123 (class 2606 OID 16879)
-- Name: permiso permiso_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permiso
    ADD CONSTRAINT permiso_nombre_key UNIQUE (nombre);


--
-- TOC entry 5125 (class 2606 OID 16881)
-- Name: permiso permiso_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permiso
    ADD CONSTRAINT permiso_pkey PRIMARY KEY (id_permiso);


--
-- TOC entry 5127 (class 2606 OID 16883)
-- Name: persona persona_ci_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persona
    ADD CONSTRAINT persona_ci_key UNIQUE (ci);


--
-- TOC entry 5129 (class 2606 OID 16885)
-- Name: persona persona_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persona
    ADD CONSTRAINT persona_email_key UNIQUE (email);


--
-- TOC entry 5131 (class 2606 OID 16887)
-- Name: persona persona_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persona
    ADD CONSTRAINT persona_pkey PRIMARY KEY (id_persona);


--
-- TOC entry 5134 (class 2606 OID 16889)
-- Name: principio_activo principio_activo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.principio_activo
    ADD CONSTRAINT principio_activo_nombre_key UNIQUE (nombre);


--
-- TOC entry 5136 (class 2606 OID 16891)
-- Name: principio_activo principio_activo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.principio_activo
    ADD CONSTRAINT principio_activo_pkey PRIMARY KEY (id_principio_activo);


--
-- TOC entry 5139 (class 2606 OID 16893)
-- Name: proveedor proveedor_contacto_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedor
    ADD CONSTRAINT proveedor_contacto_email_key UNIQUE (contacto_email);


--
-- TOC entry 5141 (class 2606 OID 16895)
-- Name: proveedor proveedor_nombre_empresa_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedor
    ADD CONSTRAINT proveedor_nombre_empresa_key UNIQUE (nombre_empresa);


--
-- TOC entry 5143 (class 2606 OID 16897)
-- Name: proveedor proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedor
    ADD CONSTRAINT proveedor_pkey PRIMARY KEY (id_proveedor);


--
-- TOC entry 5147 (class 2606 OID 16899)
-- Name: receta_medica receta_medica_numero_receta_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receta_medica
    ADD CONSTRAINT receta_medica_numero_receta_key UNIQUE (numero_receta);


--
-- TOC entry 5149 (class 2606 OID 16901)
-- Name: receta_medica receta_medica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receta_medica
    ADD CONSTRAINT receta_medica_pkey PRIMARY KEY (id_receta);


--
-- TOC entry 5151 (class 2606 OID 16903)
-- Name: rol rol_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_nombre_key UNIQUE (nombre);


--
-- TOC entry 5157 (class 2606 OID 16905)
-- Name: rol_permiso rol_permiso_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol_permiso
    ADD CONSTRAINT rol_permiso_pkey PRIMARY KEY (id_rol, id_permiso);


--
-- TOC entry 5153 (class 2606 OID 16907)
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id_rol);


--
-- TOC entry 5159 (class 2606 OID 16909)
-- Name: sucursal sucursal_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sucursal
    ADD CONSTRAINT sucursal_nombre_key UNIQUE (nombre);


--
-- TOC entry 5161 (class 2606 OID 16911)
-- Name: sucursal sucursal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sucursal
    ADD CONSTRAINT sucursal_pkey PRIMARY KEY (id_sucursal);


--
-- TOC entry 5164 (class 2606 OID 16913)
-- Name: ubicacion_inventario ubicacion_inventario_id_sucursal_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicacion_inventario
    ADD CONSTRAINT ubicacion_inventario_id_sucursal_nombre_key UNIQUE (id_sucursal, nombre);


--
-- TOC entry 5166 (class 2606 OID 16915)
-- Name: ubicacion_inventario ubicacion_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicacion_inventario
    ADD CONSTRAINT ubicacion_inventario_pkey PRIMARY KEY (id_ubicacion);


--
-- TOC entry 5117 (class 2606 OID 16917)
-- Name: oferta_medicamento uk_oferta_medicamento; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta_medicamento
    ADD CONSTRAINT uk_oferta_medicamento UNIQUE (id_oferta, id_medicamento);


--
-- TOC entry 5168 (class 2606 OID 16919)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5170 (class 2606 OID 16921)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5174 (class 2606 OID 16923)
-- Name: usuario usuario_id_empleado_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_empleado_key UNIQUE (id_empleado);


--
-- TOC entry 5176 (class 2606 OID 16925)
-- Name: usuario usuario_nombre_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_nombre_usuario_key UNIQUE (nombre_usuario);


--
-- TOC entry 5178 (class 2606 OID 16927)
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 5182 (class 2606 OID 16929)
-- Name: usuario_rol usuario_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_pkey PRIMARY KEY (id_usuario, id_rol);


--
-- TOC entry 5187 (class 2606 OID 16931)
-- Name: venta venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta
    ADD CONSTRAINT venta_pkey PRIMARY KEY (id_venta);


--
-- TOC entry 5043 (class 1259 OID 16932)
-- Name: idx_alergia_principio_activo_alergia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alergia_principio_activo_alergia ON public.alergia_principio_activo USING btree (id_alergia);


--
-- TOC entry 5044 (class 1259 OID 16933)
-- Name: idx_alergia_principio_activo_principio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alergia_principio_activo_principio ON public.alergia_principio_activo USING btree (id_principio_activo);


--
-- TOC entry 5056 (class 1259 OID 16934)
-- Name: idx_cliente_alergia_alergia; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cliente_alergia_alergia ON public.cliente_alergia USING btree (id_alergia);


--
-- TOC entry 5057 (class 1259 OID 16935)
-- Name: idx_cliente_alergia_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cliente_alergia_cliente ON public.cliente_alergia USING btree (id_cliente);


--
-- TOC entry 5053 (class 1259 OID 16936)
-- Name: idx_cliente_persona; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cliente_persona ON public.cliente USING btree (id_persona);


--
-- TOC entry 5062 (class 1259 OID 16937)
-- Name: idx_compra_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_compra_fecha ON public.compra USING btree (fecha_compra);


--
-- TOC entry 5063 (class 1259 OID 16938)
-- Name: idx_compra_proveedor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_compra_proveedor ON public.compra USING btree (id_proveedor);


--
-- TOC entry 5066 (class 1259 OID 16939)
-- Name: idx_detalle_compra_compra; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_compra_compra ON public.detalle_compra USING btree (id_compra);


--
-- TOC entry 5067 (class 1259 OID 16940)
-- Name: idx_detalle_compra_lote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_compra_lote ON public.detalle_compra USING btree (id_lote);


--
-- TOC entry 5068 (class 1259 OID 16941)
-- Name: idx_detalle_compra_medicamento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_compra_medicamento ON public.detalle_compra USING btree (id_medicamento);


--
-- TOC entry 5071 (class 1259 OID 16942)
-- Name: idx_detalle_receta_medicamento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_receta_medicamento ON public.detalle_receta USING btree (id_medicamento);


--
-- TOC entry 5072 (class 1259 OID 16943)
-- Name: idx_detalle_receta_receta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_receta_receta ON public.detalle_receta USING btree (id_receta);


--
-- TOC entry 5075 (class 1259 OID 16944)
-- Name: idx_detalle_venta_lote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_venta_lote ON public.detalle_venta USING btree (id_lote);


--
-- TOC entry 5076 (class 1259 OID 16945)
-- Name: idx_detalle_venta_medicamento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_venta_medicamento ON public.detalle_venta USING btree (id_medicamento);


--
-- TOC entry 5077 (class 1259 OID 16946)
-- Name: idx_detalle_venta_receta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_venta_receta ON public.detalle_venta USING btree (id_receta);


--
-- TOC entry 5078 (class 1259 OID 16947)
-- Name: idx_detalle_venta_venta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_venta_venta ON public.detalle_venta USING btree (id_venta);


--
-- TOC entry 5083 (class 1259 OID 16948)
-- Name: idx_inventario_lote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_lote ON public.inventario USING btree (id_lote);


--
-- TOC entry 5084 (class 1259 OID 16949)
-- Name: idx_inventario_ubicacion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventario_ubicacion ON public.inventario USING btree (id_ubicacion);


--
-- TOC entry 5089 (class 1259 OID 16950)
-- Name: idx_lote_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lote_estado ON public.lote_medicamento USING btree (estado);


--
-- TOC entry 5090 (class 1259 OID 16951)
-- Name: idx_lote_medicamento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lote_medicamento ON public.lote_medicamento USING btree (id_medicamento);


--
-- TOC entry 5091 (class 1259 OID 16952)
-- Name: idx_lote_proveedor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lote_proveedor ON public.lote_medicamento USING btree (id_proveedor);


--
-- TOC entry 5092 (class 1259 OID 16953)
-- Name: idx_lote_vencimiento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lote_vencimiento ON public.lote_medicamento USING btree (fecha_vencimiento);


--
-- TOC entry 5107 (class 1259 OID 16954)
-- Name: idx_movimiento_inventario_empleado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimiento_inventario_empleado ON public.movimiento_inventario USING btree (id_empleado);


--
-- TOC entry 5108 (class 1259 OID 16955)
-- Name: idx_movimiento_inventario_inventario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimiento_inventario_inventario ON public.movimiento_inventario USING btree (id_inventario);


--
-- TOC entry 5109 (class 1259 OID 16956)
-- Name: idx_movimiento_inventario_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimiento_inventario_tipo ON public.movimiento_inventario USING btree (tipo_movimiento);


--
-- TOC entry 5099 (class 1259 OID 16957)
-- Name: idx_mpa_medicamento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mpa_medicamento ON public.medicamento_principio_activo USING btree (id_medicamento);


--
-- TOC entry 5100 (class 1259 OID 16958)
-- Name: idx_mpa_principio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mpa_principio ON public.medicamento_principio_activo USING btree (id_principio_activo);


--
-- TOC entry 5118 (class 1259 OID 16959)
-- Name: idx_pago_metodo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pago_metodo ON public.pago USING btree (id_metodo_pago);


--
-- TOC entry 5119 (class 1259 OID 16960)
-- Name: idx_pago_venta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pago_venta ON public.pago USING btree (id_venta);


--
-- TOC entry 5132 (class 1259 OID 16961)
-- Name: idx_principio_activo_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_principio_activo_nombre ON public.principio_activo USING btree (nombre);


--
-- TOC entry 5137 (class 1259 OID 16962)
-- Name: idx_proveedor_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedor_activo ON public.proveedor USING btree (activo);


--
-- TOC entry 5144 (class 1259 OID 16963)
-- Name: idx_receta_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receta_cliente ON public.receta_medica USING btree (id_cliente);


--
-- TOC entry 5145 (class 1259 OID 16964)
-- Name: idx_receta_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receta_estado ON public.receta_medica USING btree (estado);


--
-- TOC entry 5154 (class 1259 OID 16965)
-- Name: idx_rol_permiso_permiso; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rol_permiso_permiso ON public.rol_permiso USING btree (id_permiso);


--
-- TOC entry 5155 (class 1259 OID 16966)
-- Name: idx_rol_permiso_rol; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rol_permiso_rol ON public.rol_permiso USING btree (id_rol);


--
-- TOC entry 5162 (class 1259 OID 16967)
-- Name: idx_ubicacion_sucursal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ubicacion_sucursal ON public.ubicacion_inventario USING btree (id_sucursal);


--
-- TOC entry 5171 (class 1259 OID 16968)
-- Name: idx_usuario_cliente_unico; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_usuario_cliente_unico ON public.usuario USING btree (id_cliente) WHERE (id_cliente IS NOT NULL);


--
-- TOC entry 5172 (class 1259 OID 16969)
-- Name: idx_usuario_empleado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_empleado ON public.usuario USING btree (id_empleado);


--
-- TOC entry 5179 (class 1259 OID 16970)
-- Name: idx_usuario_rol_rol; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_rol_rol ON public.usuario_rol USING btree (id_rol);


--
-- TOC entry 5180 (class 1259 OID 16971)
-- Name: idx_usuario_rol_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_rol_usuario ON public.usuario_rol USING btree (id_usuario);


--
-- TOC entry 5183 (class 1259 OID 16972)
-- Name: idx_venta_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_venta_cliente ON public.venta USING btree (id_cliente);


--
-- TOC entry 5184 (class 1259 OID 16973)
-- Name: idx_venta_empleado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_venta_empleado ON public.venta USING btree (id_empleado);


--
-- TOC entry 5185 (class 1259 OID 16974)
-- Name: idx_venta_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_venta_fecha ON public.venta USING btree (fecha_venta);


--
-- TOC entry 5227 (class 2620 OID 16975)
-- Name: detalle_venta 03_registrar_salida_venta; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "03_registrar_salida_venta" AFTER INSERT ON public.detalle_venta FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_salida_automatica();


--
-- TOC entry 5228 (class 2620 OID 16976)
-- Name: inventario trg_inventario_sync_stock; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_inventario_sync_stock AFTER INSERT OR DELETE OR UPDATE ON public.inventario FOR EACH ROW EXECUTE FUNCTION public.fn_inventario_sync_stock_medicamento();


--
-- TOC entry 5229 (class 2620 OID 16977)
-- Name: venta trg_venta_validar_cierre; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_venta_validar_cierre BEFORE INSERT OR UPDATE OF estado ON public.venta FOR EACH ROW EXECUTE FUNCTION public.fn_venta_validar_cierre();


--
-- TOC entry 5188 (class 2606 OID 16978)
-- Name: alergia_principio_activo alergia_principio_activo_id_alergia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alergia_principio_activo
    ADD CONSTRAINT alergia_principio_activo_id_alergia_fkey FOREIGN KEY (id_alergia) REFERENCES public.alergia(id_alergia) ON DELETE CASCADE;


--
-- TOC entry 5189 (class 2606 OID 16983)
-- Name: alergia_principio_activo alergia_principio_activo_id_principio_activo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alergia_principio_activo
    ADD CONSTRAINT alergia_principio_activo_id_principio_activo_fkey FOREIGN KEY (id_principio_activo) REFERENCES public.principio_activo(id_principio_activo) ON DELETE CASCADE;


--
-- TOC entry 5190 (class 2606 OID 16988)
-- Name: categoria categoria_id_categoria_padre_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_id_categoria_padre_fkey FOREIGN KEY (id_categoria_padre) REFERENCES public.categoria(id_categoria) ON DELETE SET NULL;


--
-- TOC entry 5192 (class 2606 OID 16993)
-- Name: cliente_alergia cliente_alergia_id_alergia_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente_alergia
    ADD CONSTRAINT cliente_alergia_id_alergia_fkey FOREIGN KEY (id_alergia) REFERENCES public.alergia(id_alergia) ON DELETE RESTRICT;


--
-- TOC entry 5193 (class 2606 OID 16998)
-- Name: cliente_alergia cliente_alergia_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente_alergia
    ADD CONSTRAINT cliente_alergia_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.cliente(id_cliente) ON DELETE CASCADE;


--
-- TOC entry 5191 (class 2606 OID 17003)
-- Name: cliente cliente_id_persona_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_id_persona_fkey FOREIGN KEY (id_persona) REFERENCES public.persona(id_persona) ON DELETE CASCADE;


--
-- TOC entry 5194 (class 2606 OID 17008)
-- Name: compra compra_id_proveedor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compra
    ADD CONSTRAINT compra_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedor(id_proveedor) ON DELETE RESTRICT;


--
-- TOC entry 5195 (class 2606 OID 17013)
-- Name: detalle_compra detalle_compra_id_compra_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra
    ADD CONSTRAINT detalle_compra_id_compra_fkey FOREIGN KEY (id_compra) REFERENCES public.compra(id_compra) ON DELETE CASCADE;


--
-- TOC entry 5196 (class 2606 OID 17018)
-- Name: detalle_compra detalle_compra_id_lote_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra
    ADD CONSTRAINT detalle_compra_id_lote_fkey FOREIGN KEY (id_lote) REFERENCES public.lote_medicamento(id_lote) ON DELETE SET NULL;


--
-- TOC entry 5197 (class 2606 OID 17023)
-- Name: detalle_compra detalle_compra_id_medicamento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_compra
    ADD CONSTRAINT detalle_compra_id_medicamento_fkey FOREIGN KEY (id_medicamento) REFERENCES public.medicamento(id_medicamento) ON DELETE RESTRICT;


--
-- TOC entry 5198 (class 2606 OID 17028)
-- Name: detalle_receta detalle_receta_id_medicamento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_receta
    ADD CONSTRAINT detalle_receta_id_medicamento_fkey FOREIGN KEY (id_medicamento) REFERENCES public.medicamento(id_medicamento) ON DELETE RESTRICT;


--
-- TOC entry 5199 (class 2606 OID 17033)
-- Name: detalle_receta detalle_receta_id_receta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_receta
    ADD CONSTRAINT detalle_receta_id_receta_fkey FOREIGN KEY (id_receta) REFERENCES public.receta_medica(id_receta) ON DELETE CASCADE;


--
-- TOC entry 5200 (class 2606 OID 17038)
-- Name: detalle_venta detalle_venta_id_lote_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_id_lote_fkey FOREIGN KEY (id_lote) REFERENCES public.lote_medicamento(id_lote) ON DELETE RESTRICT;


--
-- TOC entry 5201 (class 2606 OID 17043)
-- Name: detalle_venta detalle_venta_id_medicamento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_id_medicamento_fkey FOREIGN KEY (id_medicamento) REFERENCES public.medicamento(id_medicamento) ON DELETE RESTRICT;


--
-- TOC entry 5202 (class 2606 OID 17048)
-- Name: detalle_venta detalle_venta_id_receta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_id_receta_fkey FOREIGN KEY (id_receta) REFERENCES public.receta_medica(id_receta) ON DELETE SET NULL;


--
-- TOC entry 5203 (class 2606 OID 17053)
-- Name: detalle_venta detalle_venta_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.venta(id_venta) ON DELETE CASCADE;


--
-- TOC entry 5204 (class 2606 OID 17058)
-- Name: empleado empleado_id_persona_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleado
    ADD CONSTRAINT empleado_id_persona_fkey FOREIGN KEY (id_persona) REFERENCES public.persona(id_persona) ON DELETE CASCADE;


--
-- TOC entry 5205 (class 2606 OID 17063)
-- Name: inventario inventario_id_lote_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_id_lote_fkey FOREIGN KEY (id_lote) REFERENCES public.lote_medicamento(id_lote) ON DELETE RESTRICT;


--
-- TOC entry 5206 (class 2606 OID 17068)
-- Name: inventario inventario_id_ubicacion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_id_ubicacion_fkey FOREIGN KEY (id_ubicacion) REFERENCES public.ubicacion_inventario(id_ubicacion) ON DELETE RESTRICT;


--
-- TOC entry 5207 (class 2606 OID 17073)
-- Name: lote_medicamento lote_medicamento_id_medicamento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lote_medicamento
    ADD CONSTRAINT lote_medicamento_id_medicamento_fkey FOREIGN KEY (id_medicamento) REFERENCES public.medicamento(id_medicamento) ON DELETE RESTRICT;


--
-- TOC entry 5208 (class 2606 OID 17078)
-- Name: lote_medicamento lote_medicamento_id_proveedor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lote_medicamento
    ADD CONSTRAINT lote_medicamento_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedor(id_proveedor) ON DELETE SET NULL;


--
-- TOC entry 5209 (class 2606 OID 17083)
-- Name: medicamento_principio_activo medicamento_principio_activo_id_medicamento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicamento_principio_activo
    ADD CONSTRAINT medicamento_principio_activo_id_medicamento_fkey FOREIGN KEY (id_medicamento) REFERENCES public.medicamento(id_medicamento) ON DELETE CASCADE;


--
-- TOC entry 5210 (class 2606 OID 17088)
-- Name: medicamento_principio_activo medicamento_principio_activo_id_principio_activo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicamento_principio_activo
    ADD CONSTRAINT medicamento_principio_activo_id_principio_activo_fkey FOREIGN KEY (id_principio_activo) REFERENCES public.principio_activo(id_principio_activo) ON DELETE RESTRICT;


--
-- TOC entry 5211 (class 2606 OID 17093)
-- Name: movimiento_inventario movimiento_inventario_id_empleado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT movimiento_inventario_id_empleado_fkey FOREIGN KEY (id_empleado) REFERENCES public.empleado(id_empleado) ON DELETE SET NULL;


--
-- TOC entry 5212 (class 2606 OID 17098)
-- Name: movimiento_inventario movimiento_inventario_id_inventario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT movimiento_inventario_id_inventario_fkey FOREIGN KEY (id_inventario) REFERENCES public.inventario(id_inventario) ON DELETE RESTRICT;


--
-- TOC entry 5213 (class 2606 OID 17103)
-- Name: oferta_medicamento oferta_medicamento_id_medicamento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta_medicamento
    ADD CONSTRAINT oferta_medicamento_id_medicamento_fkey FOREIGN KEY (id_medicamento) REFERENCES public.medicamento(id_medicamento) ON DELETE CASCADE;


--
-- TOC entry 5214 (class 2606 OID 17108)
-- Name: oferta_medicamento oferta_medicamento_id_oferta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oferta_medicamento
    ADD CONSTRAINT oferta_medicamento_id_oferta_fkey FOREIGN KEY (id_oferta) REFERENCES public.oferta(id_oferta) ON DELETE CASCADE;


--
-- TOC entry 5215 (class 2606 OID 17113)
-- Name: pago pago_id_metodo_pago_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_metodo_pago_fkey FOREIGN KEY (id_metodo_pago) REFERENCES public.metodo_pago(id_metodo_pago) ON DELETE RESTRICT;


--
-- TOC entry 5216 (class 2606 OID 17118)
-- Name: pago pago_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.venta(id_venta) ON DELETE CASCADE;


--
-- TOC entry 5217 (class 2606 OID 17123)
-- Name: receta_medica receta_medica_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receta_medica
    ADD CONSTRAINT receta_medica_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.cliente(id_cliente) ON DELETE RESTRICT;


--
-- TOC entry 5218 (class 2606 OID 17128)
-- Name: rol_permiso rol_permiso_id_permiso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol_permiso
    ADD CONSTRAINT rol_permiso_id_permiso_fkey FOREIGN KEY (id_permiso) REFERENCES public.permiso(id_permiso) ON DELETE CASCADE;


--
-- TOC entry 5219 (class 2606 OID 17133)
-- Name: rol_permiso rol_permiso_id_rol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol_permiso
    ADD CONSTRAINT rol_permiso_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol) ON DELETE CASCADE;


--
-- TOC entry 5220 (class 2606 OID 17138)
-- Name: ubicacion_inventario ubicacion_inventario_id_sucursal_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicacion_inventario
    ADD CONSTRAINT ubicacion_inventario_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursal(id_sucursal) ON DELETE RESTRICT;


--
-- TOC entry 5221 (class 2606 OID 17143)
-- Name: usuario usuario_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.cliente(id_cliente) ON DELETE SET NULL;


--
-- TOC entry 5222 (class 2606 OID 17148)
-- Name: usuario usuario_id_empleado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_id_empleado_fkey FOREIGN KEY (id_empleado) REFERENCES public.empleado(id_empleado) ON DELETE SET NULL;


--
-- TOC entry 5223 (class 2606 OID 17153)
-- Name: usuario_rol usuario_rol_id_rol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol) ON DELETE CASCADE;


--
-- TOC entry 5224 (class 2606 OID 17158)
-- Name: usuario_rol usuario_rol_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;


--
-- TOC entry 5225 (class 2606 OID 17163)
-- Name: venta venta_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta
    ADD CONSTRAINT venta_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.cliente(id_cliente) ON DELETE SET NULL;


--
-- TOC entry 5226 (class 2606 OID 17168)
-- Name: venta venta_id_empleado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta
    ADD CONSTRAINT venta_id_empleado_fkey FOREIGN KEY (id_empleado) REFERENCES public.empleado(id_empleado) ON DELETE SET NULL;


-- Completed on 2026-11-16 17:11:45

--
-- PostgreSQL database dump complete
--

\unrestrict H61Ifhyuufy76OnTRJxiDjrdzRe1LS5APSWx6gzyQusOivPef88kKZToecSqw25

