-- Vincula las cuentas de cliente con su ficha de cliente para que las ventas
-- realizadas desde la tienda online queden asociadas al comprador correcto.
ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS id_cliente INTEGER
    REFERENCES cliente(id_cliente)
    ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_cliente_unico
ON usuario(id_cliente)
WHERE id_cliente IS NOT NULL;

-- Ficha propia para el usuario demo de la tienda online.
INSERT INTO persona (ci, nombre_completo, telefono, email)
VALUES ('DEMO-CLIENTE', 'Cliente Demo', '+591 70000000', 'cliente@farmacia.com')
ON CONFLICT (email) DO UPDATE
SET nombre_completo = EXCLUDED.nombre_completo,
    telefono = EXCLUDED.telefono;

INSERT INTO cliente (id_persona)
SELECT p.id_persona
FROM persona p
WHERE p.email = 'cliente@farmacia.com'
ON CONFLICT (id_persona) DO NOTHING;

UPDATE usuario u
SET id_cliente = c.id_cliente
FROM cliente c
JOIN persona p ON p.id_persona = c.id_persona
WHERE u.nombre_usuario = 'cliente@farmacia.com'
  AND p.email = 'cliente@farmacia.com';
