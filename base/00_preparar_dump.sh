#!/bin/sh
set -e

# En K8s el ConfigMap se monta en /docker-entrypoint-initdb.d
DUMP_ORIGINAL=/docker-entrypoint-initdb.d/respaldo_farmacia.sql.txt
DUMP_LIMPIO=/tmp/respaldo_farmacia_limpio.sql

echo "[init] Limpiando dump de PostgreSQL..."
sed \
  -e '/^\\restrict /d' \
  -e '/^\\unrestrict /d' \
  -e '/^SET transaction_timeout = /d' \
  -e "s/OWNER TO postgres;/OWNER TO \"${POSTGRES_USER}\";/g" \
  "$DUMP_ORIGINAL" > "$DUMP_LIMPIO"

echo "[init] Cargando dump limpio en $POSTGRES_DB..."
psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -f "$DUMP_LIMPIO"

echo "[init] Dump cargado correctamente."