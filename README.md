# Exam_2_sw - Diagramador Colaborativo

✅ **Estado:** Backend con Prisma ORM + Socket.IO + Frontend base  
🛠️ **Stack:** Express + TypeScript + Prisma + Socket.IO + PostgreSQL 15 + React + Vite  
🐳 **Deploy:** Docker Compose (un solo comando)

---

## 🚀 Quick Start

### Con Docker (Recomendado)

```bash
# 1. Levantar servicios
docker compose build --no-cache
docker compose up -d

# 2. Ejecutar migraciones de Prisma
docker compose exec app sh -c "cd packages/server && npx prisma migrate dev --name init"

# 3. Verificar
curl http://localhost:3001/health
curl http://localhost:3001/dbcheck
```

### Desarrollo local (sin Docker)

Requiere Node.js 18+, PostgreSQL corriendo localmente:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp packages/server/.env.example packages/server/.env
# Editar packages/server/.env y cambiar DATABASE_URL a localhost

# 3. Ejecutar migraciones
cd packages/server
npm run prisma:migrate

# 4. Levantar servicios (2 terminales)
npm run dev:server  # Terminal 1
npm run dev:web     # Terminal 2
```

---

## 📊 Base de Datos (Prisma ORM)

### ✅ Modelos Implementados:

- **User** - Usuarios del sistema (email único, nombre)
- **Project** - Proyectos de diagramas (nombre, descripción, público/privado)
- **ProjectUser** - Relación usuarios-proyectos con roles (OWNER, EDITOR, VIEWER)
- **Diagram** - Diagramas individuales (JSON data, versionamiento)
- **Session** ✨ - Sesiones de usuarios en diagramas (presencia)
- **Lock** ✨ - Bloqueos de recursos con TTL (locks colaborativos)
- **DiagramChange** ✨ - Historial de cambios (auditoría)

Ver documentación completa: [`PRISMA_INTEGRATION.md`](PRISMA_INTEGRATION.md)

---

## 🌐 WebSocket (Socket.IO)

### ✅ Colaboración en Tiempo Real:

- **Presencia de usuarios** - Ver quién está editando el diagrama
- **Locks distribuidos** - Coordinar edición de recursos (TTL: 30s)
- **Cambios en tiempo real** - Sincronizar modificaciones instantáneamente
- **Eventos de sesión** - Notificaciones de conexión/desconexión

**Documentación completa:** [`WEBSOCKET_API.md`](WEBSOCKET_API.md)

### 🧪 Probar WebSocket:

```bash
# 1. Instalar cliente de prueba
cd test-client
npm install

# 2. Terminal 1: Cliente 1
node client1.js

# 3. Terminal 2: Cliente 2
node client2.js
```

Ver [`test-client/README.md`](test-client/README.md) para más detalles.

---

## 🔌 Endpoints API

### Health Checks

```bash
GET /health        # {"status":"ok"}
GET /dbcheck       # {"ok":true,"users":[]}
```

### REST API (Colaboración)

```bash
# Sesiones
POST   /api/sessions/open
POST   /api/sessions/close
GET    /api/sessions/active/:diagramId

# Locks
POST   /api/locks/acquire
POST   /api/locks/release

# Auditoría
POST   /api/changes/add
GET    /api/changes/:diagramId
```

Ver [`COLLABORATION_API.md`](COLLABORATION_API.md) para detalles.

### WebSocket (Socket.IO)

```javascript
// Conectar
const socket = io("http://localhost:3001");

// Eventos cliente → servidor
socket.emit("join-diagram", { userId, diagramId });
socket.emit("diagram-change", { userId, diagramId, action, payload });
socket.emit("lock-acquire", { userId, diagramId, resourceId });

// Eventos servidor → cliente
socket.on("presence-update", (data) => { ... });
socket.on("diagram-update", (change) => { ... });
socket.on("lock-update", (lock) => { ... });
```

Ver [`WEBSOCKET_API.md`](WEBSOCKET_API.md) para documentación completa.

### Servicios Activos

- 🔧 **Backend (REST + WebSocket):** http://localhost:3001
- 🎨 **Frontend:** http://localhost:5173
- 🗄️ **PostgreSQL:** localhost:5432
- 📊 **Prisma Studio:** `docker compose exec app sh -c "cd packages/server && npx prisma studio"`

---

## 🛠️ Comandos Útiles

### Docker

```bash
# Ver logs
docker compose logs app -f

# Reiniciar
docker compose restart

# Detener todo
docker compose down

# Limpiar y reconstruir
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Prisma (dentro del contenedor)

```bash
# Migración nueva
docker compose exec app sh -c "cd packages/server && npx prisma migrate dev --name nombre"

# Regenerar cliente
docker compose exec app sh -c "cd packages/server && npx prisma generate"

# Prisma Studio (UI visual)
docker compose exec app sh -c "cd packages/server && npx prisma studio"
```

---

## Estructura

```
Exam_2_sw/
├── packages/
│   ├── server/              # Backend Express + TypeScript + Socket.IO
│   │   ├── src/
│   │   │   ├── index.ts     # Servidor HTTP + WebSocket
│   │   │   └── routes/      # REST endpoints
│   │   └── prisma/          # Schema y migraciones
│   ├── web/                 # Frontend React + Vite
│   └── shared/              # Tipos compartidos
├── test-client/             # Clientes de prueba WebSocket ✨
├── scripts/
│   └── deploy.sh            # Script de despliegue Docker
├── Dockerfile               # Multi-stage build
├── docker-compose.yml
├── WEBSOCKET_API.md         # Documentación WebSocket ✨
├── COLLABORATION_API.md     # Documentación REST API ✨
└── PRISMA_INTEGRATION.md    # Documentación Prisma
```

## 📚 Documentación

- **[WEBSOCKET_API.md](WEBSOCKET_API.md)** - API completa de Socket.IO
- **[COLLABORATION_API.md](COLLABORATION_API.md)** - Endpoints REST de colaboración
- **[PRISMA_INTEGRATION.md](PRISMA_INTEGRATION.md)** - Modelos y configuración de Prisma
- **[test-client/README.md](test-client/README.md)** - Guía de pruebas WebSocket

## 🎯 Características Implementadas

✅ **Backend REST API**

- Express + TypeScript
- Prisma ORM + PostgreSQL
- Endpoints de sesiones, locks y auditoría

✅ **WebSocket en Tiempo Real**

- Socket.IO integrado
- Presencia de usuarios
- Locks distribuidos
- Sincronización de cambios

✅ **Base de Datos**

- 8 tablas relacionadas
- Migraciones con Prisma
- Índices optimizados

✅ **Testing**

- Clientes de prueba WebSocket
- Datos de seed
- Scripts de verificación

## Próximos pasos

- ✅ ~~Integrar Prisma ORM~~
- ✅ ~~Implementar WebSocket para colaboración~~
- 🔲 Implementar autenticación JWT
- 🔲 Crear UI para diagramas
- 🔲 Implementar undo/redo
- 🔲 Exportar/importar diagramas
- 🔲 Configurar CI/CD
