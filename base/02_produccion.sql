UPDATE medicamento
   SET imagen = regexp_replace(imagen, '^https?://[^/]+/uploads/', '/uploads/')
 WHERE imagen ~ '^https?://[^/]+/uploads/';

UPDATE medicamento
   SET imagen = '/uploads/default.svg'
 WHERE imagen IS NULL OR imagen !~ '^/uploads/';

ALTER TABLE receta_medica ADD COLUMN IF NOT EXISTS imagen_url varchar(500);

ALTER TABLE venta ADD COLUMN IF NOT EXISTS id_ubicacion integer REFERENCES ubicacion_inventario(id_ubicacion) ON DELETE SET NULL;

ALTER TABLE venta DROP CONSTRAINT IF EXISTS venta_estado_check;
ALTER TABLE venta ADD CONSTRAINT venta_estado_check
  CHECK (estado::text = ANY (ARRAY['pendiente', 'en_camino', 'completada', 'anulada', 'devuelta_parcial', 'devuelta_total']));

UPDATE metodo_pago SET nombre = 'Efectivo' WHERE lower(nombre) = 'efectivo';
UPDATE metodo_pago SET nombre = 'QR' WHERE lower(nombre) IN ('qr', 'qr_simple');

INSERT INTO metodo_pago (nombre, activo)
SELECT 'Efectivo', TRUE
WHERE NOT EXISTS (SELECT 1 FROM metodo_pago WHERE lower(nombre) = 'efectivo');

INSERT INTO metodo_pago (nombre, activo)
SELECT 'QR', TRUE
WHERE NOT EXISTS (SELECT 1 FROM metodo_pago WHERE lower(nombre) = 'qr');

UPDATE usuario
   SET contrasena_hash = '$2a$12$1WLgXAC.X3wiL0LuFx2j3.4ByDK56IY7LKCNsNF6JXq43myaiUpp.'
 WHERE lower(nombre_usuario) = 'demo@agenda.com';

UPDATE usuario
   SET contrasena_hash = '$2a$12$9h4ypr4nQbpB9S4wRvLDUOtLNmEFNj8gFDO0wkQbSJN3ri87Jm2kK'
 WHERE lower(nombre_usuario) = 'cliente@farmacia.com';
