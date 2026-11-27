#!/bin/sh
(
  set -e

  usuario=${POSTGRES_USER:-admin}
  base_datos=${POSTGRES_DB:-farmacia}
  init_dir=/tmp/farmacia-init
  trabajo=/tmp/farmacia-init-trabajo
  dump="$init_dir/respaldo_farmacia.sql"
  produccion="$init_dir/02_produccion.sql"
  mkdir -p "$trabajo"

  preparar() {
    origen=$1
    destino=$2
    temporal="$destino.sinbom"

    if [ "$(head -c 3 "$origen" | od -An -tx1 | tr -d ' \n')" = "efbbbf" ]; then
      tail -c +4 "$origen" > "$temporal"
    else
      cat "$origen" > "$temporal"
    fi

    tr -d '\r' < "$temporal" \
      | sed \
        -e '/^\\restrict /d' \
        -e '/^\\unrestrict /d' \
        -e '/^SET transaction_timeout = /d' \
        -e "s/OWNER TO postgres;/OWNER TO \"${usuario}\";/g" \
        > "$destino"

    rm -f "$temporal"
  }

  echo "[init] Preparando dump para PostgreSQL 18..."
  preparar "$dump" "$trabajo/01_dump.sql"
  preparar "$produccion" "$trabajo/02_produccion.sql_limpio"

  echo "[init] Cargando dump en $base_datos como $usuario..."
  psql -v ON_ERROR_STOP=1 --username "$usuario" --dbname "$base_datos" -f "$trabajo/01_dump.sql"

  echo "[init] Aplicando ajustes de produccion..."
  psql -v ON_ERROR_STOP=1 --username "$usuario" --dbname "$base_datos" -f "$trabajo/02_produccion.sql_limpio"

  echo "[init] Inicializacion completada."
)
