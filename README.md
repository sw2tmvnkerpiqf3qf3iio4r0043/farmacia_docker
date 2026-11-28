# Sistema de Gestión de Farmacia — Despliegue con Docker

Proyecto contenerizado con **Docker Compose** que integra la base de datos relacional **PostgreSQL 18**, la API REST en **Node.js / Express** y la aplicación web en **React / Vite (TypeScript)** servida con **Nginx**.

## Acceso a los servicios
1. **Aplicación Web (Frontend):** http://localhost:8080
2. **API Backend:** http://localhost:3001
3. **Base de datos PostgreSQL 18:** puerto interno `5432` (base de datos `farmacia`, usuario `admin`)

## Estructura del repositorio

```text
farmacia_docker/
├── base/                    # Respaldos y scripts de inicialización SQL (01_respaldo.sql, 02_produccion.sql)
├── farmacia-backend/        # API REST en Node.js + Express + PostgreSQL
├── farmacia-front/          # Interfaz web en React + Vite + TypeScript
├── k8s/                     # Manifiestos de despliegue para Kubernetes
├── docker-compose.yml       # Orquestación principal de servicios (db, backend, frontend)
└── docker-compose-swarm.yml # Configuración para Docker Swarm
