# Exam_2_sw - Diagramador Colaborativo Inteligente

Sistema web avanzado para diseño colaborativo de diagramas ER y generación automática de código backend/frontend.

**Stack Principal:** Express + TypeScript + Prisma + Socket.IO + PostgreSQL 15 + React + Vite  
**Deploy:** Docker Compose | AWS EC2 t2.micro  
**Objetivo:** Reducir 90% del tiempo de desarrollo inicial de aplicaciones CRUD

---

## 🎯 Sobre el Proyecto

### Propósito

Herramienta integral para acelerar el desarrollo de sistemas de gestión mediante:

- Diseño visual de diagramas ER colaborativos en tiempo real
- Generación automática de scripts SQL optimizados
- Generación de backend Spring Boot completo (Entity, Repository, Service, Controller, DTOs)
- Generación de frontend Flutter funcional con CRUD básico
- Diseño asistido por IA (prompts de texto/voz, reconocimiento de imágenes)

### Casos de Uso

- Equipos distribuidos diseñando arquitectura de base de datos en tiempo real
- Prototipado rápido de sistemas CRUD para validación con clientes
- Estudiantes aprendiendo modelado de datos con feedback visual inmediato
- Migración de diagramas legacy (escaneados o de otros software) mediante IA

### Características Clave

- **Colaboración Real:** Múltiples usuarios editando simultáneamente con roles (OWNER/EDITOR/VIEWER)
- **Sincronización Instantánea:** Cambios propagados en < 100ms vía WebSocket
- **Generación Inteligente:** Del diagrama a código funcional listo para producción
- **IA Integrada:** Creación por voz, prompts en lenguaje natural, OCR de imágenes
- **Ligero:** Optimizado para AWS t2.micro (1GB RAM, 1 vCPU)

---

## ✅ Requerimientos del Sistema

### ✔️ Implementado

- [x] **Diagramador Web Funcional**
  - Editor ER interactivo con ReactFlow
  - Tablas con campos, tipos de datos, PK/FK
  - Relaciones visuales (1-1, 1-N, N-N)
  - Sistema de nodos y edges editable
- [x] **Trabajo Colaborativo**
  - Sistema de autenticación simple (email/nombre)
  - Proyectos multi-usuario con roles (OWNER, EDITOR, VIEWER)
  - Invitaciones reutilizables por token
  - Control de acceso por rol
- [x] **Cambios en Tiempo Real**
  - WebSocket con Socket.IO
  - Sincronización bidireccional de nodos y edges
  - Sistema de presencia (usuarios activos visibles)
  - Broadcast selectivo (excepto emisor)
- [x] **Edición Funcional de Tablas y Relaciones**
  - Panel de propiedades lateral (nombre, campos, tipos)
  - CRUD completo de campos (agregar, editar, eliminar, duplicar)
  - Selector de tipos PostgreSQL predefinidos
  - Configuración de PK, FK, nullable
  - Drag & drop para reposicionar tablas
  - Conexión visual entre tablas con detección automática PK/FK
  - Creación automática de tablas intermedias para N-N
- [x] **Generación de Script PostgreSQL**
  - Exportación a `.sql` con CREATE TABLE
  - PRIMARY KEY y FOREIGN KEY constraints
  - Tablas intermedias para relaciones N-N
  - Índices automáticos
  - ON DELETE CASCADE configurado

### ⏳ Pendiente de Implementación

- [ ] **Generación de Backend Spring Boot**
  - Estructura Maven/Gradle completa
  - Entities con anotaciones JPA (@Entity, @Table, @Column, etc.)
  - Repositories extendiendo JpaRepository
  - Services con lógica CRUD
  - Controllers REST con @GetMapping, @PostMapping, etc.
  - DTOs para Request/Response
  - application.properties configurado
  - Proyecto listo para `mvn spring-boot:run`
- [ ] **Generación de Frontend Flutter**
  - Estructura de proyecto Flutter completa
  - Models (clases Dart desde entidades)
  - Providers/BLoC para estado
  - Screens CRUD (List, Create, Edit, Delete)
  - Widgets reutilizables (forms, cards, botones)
  - API service con http package
  - Configuración básica (pubspec.yaml, main.dart)
  - Listo para `flutter run` → APK funcional
- [ ] **Diseño Asistido por IA**
  - Generación de diagramas desde prompt de texto
  - Reconocimiento de voz para creación de tablas
  - OCR/Visión por computadora para replicar diagramas desde imágenes
  - Sugerencias inteligentes de relaciones
  - Auto-completado de campos comunes (createdAt, updatedAt, etc.)

### 🎛️ Requisitos Técnicos

- **RAM:** < 512MB en ejecución (compatible con t2.micro)
- **Storage:** < 100MB imagen Docker comprimida
- **CPU:** Optimizado para 1 vCPU (sin procesamiento pesado en servidor)
- **Red:** WebSocket con reconexión automática para redes inestables

---

## 📁 Estructura del Proyecto

```
EXAM_2_SW/
│
├── packages/
│   ├── server/                      # Backend Node.js + Express
│   │   ├── prisma/
│   │   │   └── schema.prisma        # Modelos de base de datos
│   │   │
│   │   └── src/
│   │        ├── routes/             # API REST endpoints
│   │        │   ├── changes.ts      # Auditoría de cambios
│   │        │   ├── diagrams.ts     # CRUD de diagramas
│   │        │   ├── invitations.ts  # Sistema de invitaciones
│   │        │   ├── locks.ts        # Bloqueos distribuidos
│   │        │   ├── projects.ts     # Gestión de proyectos
│   │        │   ├── sessions.ts     # Control de presencia
│   │        │   └── users.ts        # Autenticación
│   │        │
│   │        ├── utils/
│   │        │   └── ensureUserExists.ts  # Helper de usuarios
│   │        │
│   │        └── index.ts            # Servidor principal (Express + Socket.IO)
│   │
│   ├── shared/                      # Tipos compartidos (TypeScript)
│   │   ├── types.ts                 # Interfaces, enums, DTOs ⭐
│   │   └── package.json
│   │
│   └── web/                         # Frontend React + Vite
│       └── src/
│           ├── components/          # Componentes React
│           │   ├── ErrorBoundary.tsx # Manejo de errores
│           │   ├── PropertiesPanel.tsx # Editor de propiedades
│           │   ├── Sidebar.tsx      # Panel lateral
│           │   └── TableNode.tsx    # Nodo de tabla ER
│           │
│           ├── pages/               # Vistas principales
│           │   ├── AcceptInvite.tsx # Procesamiento de invitaciones
│           │   ├── Dashboard.tsx    # Panel de proyectos
│           │   ├── DiagramEditor.tsx # Editor principal ⭐
│           │   └── Login.tsx        # Autenticación con diseño glassmorphism
│           │
│           ├── store/               # Estado global (Zustand)
│           │   └── useAppStore.ts   # Usuario y proyecto actual
│           │
│           ├── utils/               # Utilidades
│           │   ├── relationHandler.ts # Lógica de relaciones
│           │   ├── relationPrompt.ts  # Modal de tipo de relación
│           │   ├── relationStyles.ts  # Estilos de edges
│           │   └── sqlGenerator.ts    # Generador SQL ⭐
│           │
│           ├── api.ts               # Cliente Axios con env vars
│           ├── App.tsx              # Componente raíz
│           ├── main.tsx             # Punto de entrada
│           ├── socketManager.ts     # Gestor de conexiones ⭐
│           ├── vite-env.d.ts        # Tipos para Vite
│           │
│           ├── index.html
│           ├── package.json
│           ├── tsconfig.json
│           ├── vite.config.ts
│           ├── .env.example        # Variables de entorno (template)
│           └── .env                # Variables de entorno (git-ignored)
│
├── scripts/
│   └── deploy.sh                    # Script de despliegue Docker
│
├── .env.example                     # Variables de entorno
├── .gitignore
├── docker-compose.yml               # Orquestación de servicios
├── Dockerfile                       # Build multi-stage
├── package.json                     # Monorepo workspaces
├── README.md                        # Este archivo
```

---

## � Índice del Proyecto

### 🗄️ Base de Datos (Prisma)

**`packages/server/prisma/schema.prisma`**

> Define la estructura de la base de datos y las relaciones entre tablas

- **User** - Gestión de usuarios del sistema (email único, autenticación)
- **Project** - Proyectos contenedores de diagramas (permisos públicos/privados)
- **ProjectUser** - Control de acceso por proyecto con roles (OWNER, EDITOR, VIEWER)
- **Diagram** - Diagramas individuales con datos JSON y versionamiento
- **Session** - Seguimiento de usuarios activos en diagramas (presencia en tiempo real)
- **Lock** - Sistema de bloqueos optimistas con TTL para edición colaborativa
- **DiagramChange** - Auditoría completa de cambios (historial y rollback)
- **Invitation** - Sistema de invitaciones por email con tokens únicos

---

### 🛣️ Rutas del Backend (API REST)

**`packages/server/src/routes/`**

**`changes.ts`**

> Registro de auditoría para cambios en diagramas

- `POST /api/changes/add` - Guardar cambio en el historial (acción + payload)
- `GET /api/changes/:diagramId` - Obtener últimos 50 cambios de un diagrama

**`diagrams.ts`**

> CRUD de diagramas y persistencia de datos visuales

- `POST /api/diagrams/:projectId` - Crear o actualizar diagrama (auto-incrementa versión)
- `GET /api/diagrams/:projectId` - Obtener diagrama de un proyecto
- `GET /api/diagrams/single/:projectId` - Alias para compatibilidad con frontend

**`invitations.ts`**

> Sistema de invitaciones reutilizables para compartir proyectos

- `POST /api/invitations/create` - Generar token de invitación con rol asignado
- `GET /api/invitations/:token` - Validar y obtener detalles de invitación
- `POST /api/invitations/accept` - Aceptar invitación y unirse al proyecto (reutilizable)

**`locks.ts`**

> Bloqueos distribuidos para evitar conflictos de edición simultánea

- `POST /api/locks/acquire` - Adquirir lock de recurso con TTL de 30s (auto-renovable)
- `POST /api/locks/release` - Liberar lock manualmente

**`projects.ts`**

> Gestión de proyectos y permisos de usuarios

- `GET /api/projects/:userId` - Listar proyectos donde el usuario es owner o colaborador
- `POST /api/projects` - Crear nuevo proyecto (auto-asigna rol OWNER)
- `GET /api/projects/role/:projectId?userId=` - Verificar rol del usuario en proyecto

**`sessions.ts`**

> Control de presencia en tiempo real (quién está editando)

- `POST /api/sessions/open` - Abrir sesión en diagrama (marca presencia)
- `POST /api/sessions/close` - Cerrar sesión manualmente
- `GET /api/sessions/active/:diagramId` - Listar usuarios activos (últimos 60s)

**`users.ts`**

> Autenticación simple basada en email (sin contraseña)

- `POST /api/users/login` - Login/registro automático (crea usuario si no existe)

---

### 🔧 Utilidades del Backend

**`packages/server/src/utils/`**

**`ensureUserExists.ts`**

> Función helper para garantizar integridad referencial de usuarios

- Verifica si un userId existe en la base de datos
- Si no existe, crea un usuario placeholder automáticamente (email: `{userId}@auto.local`)
- Usado en `changes.ts`, `locks.ts` y `sessions.ts` para evitar errores de FK

---

### ⚡ Servidor Principal

**`packages/server/src/index.ts`**

> Punto de entrada que integra Express + Socket.IO + Prisma para colaboración en tiempo real

**Configuración:**

- Express con CORS, Helmet y JSON parser
- Socket.IO con CORS habilitado para todos los orígenes
- Prisma Client para acceso a base de datos
- Servidor HTTP compartido para REST + WebSocket

**Endpoints REST:**

- `GET /health` - Health check básico
- `GET /dbcheck` - Verificar conexión a DB y listar usuarios
- Monta todas las rutas bajo `/api/*` (sessions, locks, changes, users, projects, invitations, diagrams)
- Sirve frontend estático desde `/app/packages/web/dist`
- Catch-all route para SPA routing (React Router)

**Eventos WebSocket (Socket.IO):**

_Colaboración por Proyecto (Principal):_

- `join-project` - Usuario se une a proyecto, obtiene rol y emite presencia
- `ping-diagram` - Mantener presencia activa (heartbeat cada 30s)
- `leave-project` - Salir manualmente del proyecto
- `diagram-change` - Enviar cambios incrementales (ADD_NODE, UPDATE_NODE, DELETE_NODE, ADD_EDGE, etc.)
  - Valida rol (VIEWER no puede editar)
  - Persiste cambios en DB automáticamente
  - Broadcast a otros usuarios del proyecto (excepto emisor)

_Legacy (Compatibilidad):_

- `join-diagram`, `leave-diagram`, `lock-acquire`, `lock-release`

**Características:**

- Sistema de presencia en memoria (`io.presence` Map)
- Limpieza automática de usuarios inactivos cada 60s
- Manejo global de errores (uncaughtException, unhandledRejection)
- Logs detallados con emojis para debugging

---

### ⚙️ Configuración del Servidor

**`packages/server/.env`**

> Variables de entorno para el servidor (no commitear)

- `PORT=3001` - Puerto del servidor Express
- `DATABASE_URL` - Conexión a PostgreSQL (host: `db` en Docker, `localhost` en local)

**`packages/server/.env.example`**

> Plantilla de variables de entorno para desarrollo

- Incluye ejemplos para Docker y desarrollo local

**`packages/server/package.json`**

> Dependencias y scripts del servidor

- **Scripts:**
  - `dev` - Desarrollo con hot-reload (ts-node-dev)
  - `build` - Compilar TypeScript a JavaScript
  - `start` - Ejecutar servidor compilado
  - `prisma:generate` - Generar cliente Prisma
  - `prisma:migrate` - Crear migración inicial
- **Dependencias principales:** Express, Prisma Client, Socket.IO, CORS, Helmet, dotenv
- **Dev dependencies:** TypeScript, ts-node-dev, tipos para Node/Express

**`packages/server/tsconfig.json`**

> Configuración de TypeScript para el servidor

- Target: ES2020 con módulos ES2020
- Module resolution: Bundler
- Output: `dist/` desde `src/`
- Strict mode habilitado

---

### 🎨 Componentes del Frontend

**`packages/web/src/components/`**

**`ErrorBoundary.tsx`**

> Componente de manejo de errores global para React

- Captura errores de renderizado en toda la aplicación
- Muestra pantalla amigable con detalles del error
- Incluye stack trace del componente para debugging
- Botón para recargar la página automáticamente

**`TableNode.tsx`**

> Nodo visual para tablas de base de datos (ER Diagram)

- Renderiza nombre de tabla y campos con tipos de datos
- Indicadores visuales: 🔑 PK (borde dorado), 🔗 FK (borde azul)
- Handles de conexión arriba (target) y abajo (source)
- Resaltado especial cuando está seleccionado (borde cyan con glow)
- Mensaje interactivo cuando está seleccionado
- Diseño compacto (240px ancho) con scroll automático

**`PropertiesPanel.tsx`**

> Panel lateral derecho para editar propiedades de tablas

- Edición de nombre de tabla
- CRUD de campos (nombre, tipo, PK, FK, nullable)
- Selector de tipos PostgreSQL predefinidos (VARCHAR, INT, TIMESTAMP, etc.)
- Configuración de relaciones FK con tablas disponibles
- Selector de tipo de relación (1-1, 1-N, N-N)
- Botones de duplicar/eliminar campo
- Auto-actualiza nodo en canvas al modificar
- Integración con Socket.IO para sincronización en tiempo real

**`Sidebar.tsx`**

> Panel lateral izquierdo con estadísticas y acciones

- Contador de tablas y relaciones
- Botón para agregar nueva tabla
- Botón para exportar SQL
- Lista navegable de todas las tablas con:
  - Nombre y contadores (campos, PK, FK)
  - Indicador visual de tabla seleccionada
  - Botón de eliminar tabla con confirmación
- Diseño compacto (280px ancho) con scroll

---

### Paquete Compartido (Shared)

**`packages/shared/types.ts`** (156 líneas)

> Tipos TypeScript compartidos entre frontend y backend - Single source of truth

**Contenido completo:**

- **Enums (1):**

  - `Role` - OWNER, EDITOR, VIEWER (control de permisos)

- **Tipos de Diagrama (2):**

  - `Field` - Estructura de campos de tabla (12 propiedades: id, name, type, isPrimary, isForeign, nullable, references, referencesField, relationType, unique, defaultValue)
  - `TableData` - Datos completos de nodo tabla (name, label, fields[])

- **Modelos Prisma (8):**

  - `User` - Usuario del sistema (id, email, name, createdAt)
  - `Project` - Proyecto contenedor (id, name, description, isPublic, ownerId, users, diagrams)
  - `ProjectUser` - Relación usuario-proyecto con rol (id, role, userId, projectId)
  - `Diagram` - Diagrama ER (id, projectId, authorId, name, data JSON, version)
  - `Session` - Sesión de presencia (id, userId, diagramId, lastPing)
  - `Lock` - Bloqueo de recursos (id, diagramId, resourceId, userId, expiresAt)
  - `DiagramChange` - Auditoría de cambios (id, diagramId, userId, action, payload)
  - `Invitation` - Invitaciones por token (id, projectId, email, role, token)

- **Eventos WebSocket (2):**

  - `PresenceUser` - Usuario activo (userId, name, role, socketId)
  - `DiagramUpdatePayload` - Cambios en tiempo real (action: ADD_NODE/UPDATE_NODE/DELETE_NODE/MOVE_NODE/ADD_EDGE/DELETE_EDGE)

- **API DTOs (6):**
  - `LoginRequest` / `LoginResponse` - Autenticación
  - `CreateProjectRequest` - Crear proyecto
  - `CreateInvitationRequest` / `CreateInvitationResponse` - Sistema de invitaciones
  - `AcceptInvitationRequest` - Aceptar invitación

**Uso:** `import type { Field, TableData, Role, User } from "@shared/types"`

**Archivos que lo usan (5):**

- `packages/web/src/components/TableNode.tsx`
- `packages/web/src/components/Sidebar.tsx`
- `packages/web/src/components/PropertiesPanel.tsx`
- `packages/web/src/utils/sqlGenerator.ts`
- `packages/web/src/utils/relationHandler.ts`

**Ventajas:**

- Elimina duplicación de tipos en 5+ archivos
- TypeScript valida compatibilidad automáticamente
- Preparado para generación Spring Boot/Flutter/OpenAPI

**`packages/shared/package.json`**

> Configuración del paquete shared (privado, monorepo)

---

### �📄 Páginas del Frontend

**`packages/web/src/pages/`**

**`Login.tsx`**

> Página de autenticación con diseño glassmorphism premium

- Formulario de login/registro con email y nombre
- Sistema de autenticación sin contraseña (crea usuario si no existe)
- Diseño glassmorphism con gradientes (#667eea, #764ba2) y backdrop blur
- Validación avanzada: regex para email, campos requeridos
- Mensajes de error informativos con styling dedicado (no alerts)
- Soporte para invitaciones: si viene de `/invite/:token` vincula automáticamente al proyecto
- Redirección inteligente: retorna a URL guardada o va a dashboard
- Efectos hover en inputs (focus border color) y botón (translateY)
- Guarda estado de sesión en `useAppStore`
- Soporte para Enter key en ambos inputs

**`Dashboard.tsx`**

> Panel principal del usuario autenticado

- Lista de proyectos del usuario (owner o colaborador)
- Creación de nuevos proyectos
- Generación de links de invitación reutilizables por proyecto
- Input para unirse a proyectos mediante link de invitación
- Botón de cerrar sesión con limpieza de socket
- Estadísticas por proyecto (miembros, diagramas)
- Navegación directa a editor de proyecto

**`AcceptInvite.tsx`**

> Página de procesamiento de invitaciones

- Valida token de invitación desde URL (`/invite/:token`)
- Dos flujos:
  - **Usuario guest:** Crea usuario temporal y accede como VIEWER
  - **Usuario autenticado:** Vincula al proyecto con rol asignado
- Muestra estado de carga y nombre del proyecto
- Redirección automática al editor con parámetro `fromInvite`

**`DiagramEditor.tsx`** ⭐

> Editor principal de diagramas ER (corazón de la aplicación)

- Canvas ReactFlow para dibujar tablas y relaciones
- CRUD completo de tablas (agregar, editar, eliminar)
- Sistema de relaciones visuales (1-1, 1-N, N-N) con detección automática de PK/FK
- Creación automática de tablas intermedias para relaciones N-N
- Validación de permisos por rol (OWNER/EDITOR pueden editar, VIEWER solo ve)
- Sincronización en tiempo real vía Socket.IO:
  - Eventos: `ADD_NODE`, `UPDATE_NODE`, `DELETE_NODE`, `MOVE_NODE`, `ADD_EDGE`, `DELETE_EDGE`
  - Broadcast a todos los usuarios del proyecto (excepto emisor)
- Sistema de presencia: muestra usuarios activos en barra superior
- Integración con `PropertiesPanel` y `Sidebar`
- Carga/guardado automático desde/hacia base de datos
- Soporte para eliminación con clic derecho y tecla Delete
- Exportación SQL con `sqlGenerator`
- Throttling de movimientos para optimizar red
- Manejo de reconexión y limpieza de sockets al salir

---

### 🗂️ Gestión de Estado (Zustand)

**`packages/web/src/store/`**

**`useAppStore.ts`**

> Store global de aplicación con persistencia en localStorage

- **Estado:**
  - `user` - Usuario autenticado actual (id, email, name)
  - `project` - Proyecto actualmente abierto
- **Acciones:**
  - `setUser()` - Establecer usuario después del login
  - `setProject()` - Cambiar proyecto activo
  - `logout()` - Limpiar sesión (user y project a null)
- Usa `zustand/middleware/persist` para mantener sesión entre recargas
- Logs de debugging con emojis

---

### 🛠️ Utilidades del Frontend

**`packages/web/src/utils/`**

**`relationHandler.ts`**

> Lógica de negocio para manejo de relaciones entre tablas

- **Funciones principales:**
  - `determinePKFK()` - Detecta automáticamente qué tabla debe tener PK y cuál FK en una relación
    - Prioriza tabla con PK existente
    - Si ambas tienen PK, source es PK por defecto (lógica 1-N)
  - `createFKField()` - Crea campo FK automáticamente en tabla foránea
    - Nombra FK como `{tabla}_{campo_pk}` (ej: `usuario_id`)
    - Evita duplicados verificando existencia previa
    - Soporta tipo de relación (1-1, 1-N, N-N)
  - `removeFKRelation()` - Elimina edge asociado a campo FK específico
  - `removeRelationByReference()` - Elimina todas las relaciones entre dos tablas
  - `updateFKRelation()` - Actualiza relación cuando cambia tabla referenciada
- Interfaces completas: `Field`, `TableData`

**`relationPrompt.ts`**

> Modal interactivo para seleccionar tipo de relación

- Usa SweetAlert2 para UI atractiva
- Opciones: 1-1, 1-N, N-N con ejemplos y descripciones
- Styling dark mode personalizado
- Aplica estilos dinámicos al select después del render
- Retorna tipo seleccionado o null si cancela

**`relationStyles.ts`**

> Definición de estilos visuales para edges de ReactFlow

- `defaultEdgeStyle` - Estilo base con línea verde punteada
- `getEdgeStyle(type)` - Retorna estilo según tipo de relación:
  - **1-1**: Azul claro (`#74b9ff`) con animación
  - **1-N**: Cyan (`#00cec9`) con animación
  - **N-N**: Rojo (`#ff7675`) con línea más gruesa
  - **FK**: Verde (`#00b894`) genérico
- `selectedEdgeStyle` - Púrpura (`#667eea`) para resaltar selección
- Todos con `strokeDasharray` para efecto punteado
- Labels con background oscuro semi-transparente

**`sqlGenerator.ts`** ⭐

> Generador automático de scripts SQL desde diagrama ER

- **Funciones principales:**
  - `generateSQL(nodes, edges)` - Crea script SQL completo:
    - Header con metadatos (fecha, cantidad tablas/relaciones)
    - CREATE TABLE para cada tabla con todas las columnas
    - PRIMARY KEY constraints
    - FOREIGN KEY constraints con ON DELETE CASCADE
    - Tablas intermedias para relaciones N-N con índices optimizados
    - Comentarios explicativos y comandos de ejecución
  - `downloadSQL(sql, fileName)` - Descarga SQL como archivo .sql
- Soporta PostgreSQL específicamente
- Normaliza nombres (lowercase, sin espacios)
- Detecta tipo de relación desde edge label
- Genera índices automáticos en tablas intermedias
- **⚠️ Nota:** No valida si las tablas ya existen (podría agregar IF NOT EXISTS)

---

### 🌐 Configuración y Punto de Entrada del Frontend

**`packages/web/src/`**

**`api.ts`**

> Cliente Axios configurado para peticiones HTTP al backend

- BaseURL: `http://localhost:3001`
- Exporta instancia `api` lista para usar en todo el frontend

**`api.ts`**

> Cliente Axios configurado para comunicación con backend

- Base URL configurable mediante variable de entorno `VITE_API_URL`
- Fallback a `http://localhost:3001` para desarrollo local
- Permite cambio sencillo de URL para producción editando `.env`
- Usado en todos los componentes para peticiones HTTP

**`socketManager.ts`** ⭐

> Gestor centralizado de conexiones Socket.IO con patrón Singleton

- Base URL configurable mediante variable de entorno `VITE_API_URL`
- **Funciones:**
  - `getSocket(user)` - Obtiene o crea instancia única de socket
    - Solo se conecta si hay usuario autenticado
    - Incluye auth con userId y name
    - Registra listeners de eventos connect/disconnect/error
    - Retorna null si no hay usuario (previene conexiones sin autenticar)
  - `disconnectSocket()` - Desconecta y limpia socket (importante en logout)
  - `isSocketConnected()` - Verifica estado de conexión
- Logs detallados con emojis para debugging
- Previene múltiples conexiones del mismo usuario

**`vite-env.d.ts`**

> Declaraciones de tipos TypeScript para variables de entorno de Vite

- Define interface `ImportMetaEnv` con `VITE_API_URL`
- Habilita autocompletado de `import.meta.env.VITE_API_URL`
- Referencia tipos de Vite client

**`App.tsx`**

> Componente raíz con lógica de autenticación y routing optimizado

- Verifica estado de usuario desde `useAppStore`
- Redirección automática:
  - Si NO hay usuario → `/login`
  - Si hay usuario en `/` → `/dashboard`
- Renderiza `Dashboard` solo si usuario está autenticado
- Protege rutas privadas automáticamente
- Logs de debugging para tracking de navegación
- **Mejora:** Evita renderizado innecesario con `return null` durante redirecciones

**`main.tsx`**

> Punto de entrada de la aplicación React

- Configura React Router con rutas principales:
  - `/` - App (Redirige a `/login` o `/dashboard`)
  - `/dashboard` - Dashboard del usuario
  - `/login` - Página de autenticación
  - `/project/:projectId` - Editor de diagramas
  - `/invite/:token` - Procesamiento de invitaciones
- Envuelve toda la app con `ErrorBoundary` para captura de errores
- Usa `createRoot` (React 18+) para renderizado

---

### ⚙️ Configuración del Frontend

**`packages/web/`**

**`index.html`**

> Punto de entrada HTML de la SPA

- Título: "Exam_2_sw Web"
- Meta viewport para responsive design
- Div `#root` donde React monta la aplicación
- Carga `main.tsx` como módulo ES6

**`package.json`**

> Configuración del proyecto frontend

- **Scripts:**
  - `dev` - Servidor de desarrollo Vite
  - `build` - Build de producción
  - `preview` - Preview del build en puerto 5173
- **Dependencias:**
  - **UI/Framework:** React 18.3, React Router DOM 6.28
  - **Diagramas:** ReactFlow 11.11 (librería de canvas para nodos y edges)
  - **Estado:** Zustand 5.0 (gestión de estado ligera)
  - **HTTP:** Axios 1.7
  - **WebSocket:** Socket.IO Client 4.8
  - **Modales:** SweetAlert2 11.14
- **Dev dependencies:** TypeScript, Vite, plugin React

**`tsconfig.json`**

> Configuración de TypeScript para el frontend

- Target: ES2020 con librerías DOM
- Module: ES2020 con resolución Bundler
- JSX: react-jsx (React 17+ sin imports explícitos)
- Strict mode habilitado
- noEmit: true (Vite maneja la compilación)
- Include: solo carpeta `src/`

**`vite.config.ts`**

> Configuración de Vite (bundler y dev server)

- Plugin React para JSX y Fast Refresh
- Servidor en puerto 5173
- `host: true` para acceso desde red local (útil para Docker)

---

### 🚀 Scripts y Herramientas

**`scripts/`**

**`deploy.sh`**

> Script automatizado de despliegue con Docker

- Limpieza completa: detiene contenedores, elimina volúmenes y limpia sistema Docker
- Build completo sin caché (`--no-cache`) para asegurar imagen actualizada
- Levanta servicios en modo detached (`-d`)
- Muestra estado final de servicios con `docker compose ps`
- **Uso:** `bash scripts/deploy.sh`
- **⚠️ Advertencia:** Elimina volúmenes, se perderán datos de base de datos

---

### 🐳 Configuración Docker y Deploy

**Raíz del proyecto:**

**`.env.example`**

> Plantilla de variables de entorno globales

- `PORT=3001` - Puerto del servidor
- Credenciales PostgreSQL (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)
- HOST y PORT de base de datos

**`.gitignore`**

> Archivos ignorados por Git

- node_modules, dist, build
- Variables de entorno (.env\*)
- Logs y archivos temporales
- Carpeta `data/` (volúmenes Docker)
- IDE configs (.vscode, .idea)

**`docker-compose.yml`** ⭐

> Orquestación de servicios con Docker Compose

- **Servicio `db`:**
  - PostgreSQL 15
  - Puerto 5432 expuesto
  - Volumen persistente en `./data/postgres`
  - Healthcheck cada 5s con `pg_isready`
- **Servicio `app`:**
  - Depende de `db` (espera healthcheck)
  - Puerto 3001 expuesto
  - Variables de entorno inyectadas
  - Comando: `node packages/server/dist/index.js`

**`Dockerfile`** ⭐

> Build multi-stage optimizado

- **Stage 1 (webbuild):** Compila React con Vite
- **Stage 2 (serverbuild):** Compila TypeScript server, genera Prisma client
- **Stage 3 (runtime):**
  - Alpine Linux (imagen ligera ~50MB)
  - Instala OpenSSL para Prisma
  - Copia solo archivos necesarios (dist, node_modules producción)
  - Expone puerto 3001
- **Optimización:** Solo dependencias de producción, sin devDependencies

**`package.json`** (Raíz)

> Configuración de monorepo con workspaces

- Workspaces: `packages/*` (server, web, shared)
- Scripts npm:
  - `dev:server` - Ejecuta servidor en modo desarrollo
  - `dev:web` - Ejecuta frontend con Vite
  - `build` - Compila ambos proyectos

---
