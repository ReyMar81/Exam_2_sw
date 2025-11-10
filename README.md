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
- **Diseño asistido por IA:** Creación por prompts en lenguaje natural con GPT-4o-mini (voz e imágenes en desarrollo)

### Casos de Uso

- Equipos distribuidos diseñando arquitectura de base de datos en tiempo real
- Prototipado rápido de sistemas CRUD para validación con clientes
- Estudiantes aprendiendo modelado de datos con feedback visual inmediato
- Migración de diagramas legacy (escaneados o de otros software) mediante IA

### Características Clave

- **Colaboración Real:** Múltiples usuarios editando simultáneamente con roles (OWNER/EDITOR/VIEWER)
- **Sincronización Instantánea:** Cambios propagados en < 100ms vía WebSocket
- **Generación Inteligente:** Del diagrama a código funcional listo para producción
- **IA Integrada:** ✅ Prompts de texto en lenguaje natural | ⏳ Reconocimiento de voz e imágenes (en desarrollo)
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
  - Exportación a `.sql` con CREATE TABLE optimizado
  - **Algoritmo de resolución de dependencias:** Ordenamiento topológico automático
    - Tablas base (sin FK) se crean primero
    - Tablas dependientes en orden correcto
    - Detección de dependencias circulares con advertencias
  - **Detección inteligente de tablas intermedias (N:M):**
    - **Join pura** (solo 2 FKs): Clave primaria compuesta `PRIMARY KEY (fk1, fk2)`
    - **Join extendida** (2 FKs + columnas extra): `id SERIAL PRIMARY KEY` normal
  - PRIMARY KEY y FOREIGN KEY constraints con `ON DELETE CASCADE`
  - Índices automáticos en tablas intermedias para optimizar búsquedas
  - Validación de integridad referencial
  - Scripts listos para ejecutar en PostgreSQL 12+
- [x] **Generación de Backend Spring Boot**
  - Generación automática de proyecto **Maven completo** en ZIP descargable
  - Estructura estándar profesional: `entity / repository / service / controller`
  - **Arquitectura generada:**
    - **Entities** con anotaciones JPA completas:
      - `@Entity`, `@Table`, `@Id`, `@GeneratedValue(strategy = IDENTITY)`
      - Relaciones: `@ManyToOne`, `@OneToMany`, `@ManyToMany` con `@JoinTable`
      - Lombok: `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor` para getters/setters
    - **Repositories** extendiendo `JpaRepository<T, ID>` con CRUD incorporado
    - **Services** con lógica de negocio completa:
      - `findAll()`, `findById()`, `save()`, `update()`, `delete()`
      - Validaciones básicas y manejo de errores
    - **Controllers REST** con endpoints funcionales:
      - `GET /{entidad}` - Listar todos
      - `GET /{entidad}/{id}` - Obtener por ID
      - `POST /{entidad}` - Crear
      - `PUT /{entidad}/{id}` - Actualizar
      - `DELETE /{entidad}/{id}` - Eliminar
      - CORS habilitado con `@CrossOrigin(origins = "*")`
  - **Detección inteligente de tablas intermedias:**
    - **Join pura** (solo 2 FKs): No genera entidad, usa `@ManyToMany` en entidades principales
    - **Join extendida** (2 FKs + campos): Genera entidad completa con CRUD
  - **Base de datos:** H2 en memoria (`jdbc:h2:mem:testdb`) con auto-creación de esquema
  - **Configuración incluida:**
    - `pom.xml` con Spring Boot 3.2, JPA, H2, Lombok
    - `application.properties` con puerto aleatorio (8180-9080)
    - `Dockerfile` multi-stage optimizado (Maven build + JRE Alpine runtime)
    - `docker-compose.yml` con healthcheck y restart policy
    - `.dockerignore` para builds eficientes
    - `README.md` con instrucciones completas
  - **Archivo principal nombrado correctamente:** `{ProjectName}Application.java`
  - **Mapeo automático de tipos:** SQL → Java (INT→Long, VARCHAR→String, TIMESTAMP→LocalDateTime)
  - **Conversión de nombres:** snake_case → PascalCase/camelCase
  - **Listo para ejecutar:**
    - Con Maven: `mvn spring-boot:run`
    - Con Docker: `docker compose up --build`
  - **Compatible con:** Java 17+, Maven 3.6+, Postman, H2 Console (`/h2-console`)
  - **Endpoints generados** según nombres reales de las entidades del diagrama
- [x] **Generación de Frontend Flutter**
  - Generación automática de proyecto **Flutter completo** en ZIP descargable
  - Estructura estándar profesional con **Material Design 3**
  - **Arquitectura generada:**
    - **Models** con null-safety completo:
      - IDs autogenerados: `int?` (nullable)
      - Foreign Keys: `int?` en ENTITY, `int` (required) en JOIN tables
      - Campos obligatorios: `required` keyword en constructores
      - Métodos: `fromJson()`, `toJson()`, `copyWith()`
      - **Composite keys** para JOIN_ENRICHED: método `getCompositeKey()`
    - **API Service** con modo dual:
      - **Modo local** (por defecto): Datos mock para testing inmediato
      - **Modo backend**: Conexión HTTP a Spring Boot
      - Configuración simple: flag `useBackend` en `api_service.dart`
      - Endpoints completos: GET, POST, PUT, DELETE por entidad
      - Manejo de composite keys para tablas intermedias enriquecidas
    - **Providers** con gestión de estado (Provider package):
      - CRUD completo: `fetchAll()`, `create()`, `update()`, `delete()`
      - Estados: `items`, `isLoading`, `error`
      - Lógica diferenciada: PK simple vs composite key
      - `ChangeNotifier` para reactividad automática
    - **Screens** con UI completa:
      - **ListScreen**: Listado con búsqueda, eliminación con confirmación
      - **FormScreen**: Formulario create/edit con validación
      - **Navigation Drawer**: Menú lateral en todas las screens con íconos
        - Entidades normales: ícono `table_chart`
        - Tablas intermedias enriquecidas: ícono `link`
      - Navegación automática entre entidades con rutas nombradas
  - **Clasificación inteligente de tablas (coherente con SQL/Spring Boot):**
    - **ENTITY** (tabla normal): Genera CRUD completo
    - **JOIN_PURE** (solo 2 FKs): **NO genera código** (relación manejada en backend)
    - **JOIN_ENRICHED** (2+ FKs + datos): Genera CRUD con composite key
    - Lógica centralizada en `relationUtils.ts` compartida entre generadores
  - **Configuración incluida:**
    - `pubspec.yaml` con dependencias: provider 6.1.0, http 1.2.0
    - `analysis_options.yaml` con Flutter lints
    - `.gitignore` completo para Flutter
    - `README.md` con instrucciones de:
      - Instalación (`flutter pub get`)
      - Ejecución (`flutter run`, `flutter run -d chrome`)
      - Configuración de backend (cambiar `useBackend` y `baseUrl`)
      - Estructura del proyecto generada
      - Lista de entidades con endpoints
  - **Mapeo automático de tipos:** SQL → Dart (INT→int, VARCHAR→String, TIMESTAMP→DateTime)
  - **Conversión de nombres:** snake_case → PascalCase (clases), camelCase (propiedades)
  - **Listo para ejecutar:**
    - Instalación: `flutter pub get`
    - Web: `flutter run -d chrome`
    - Android/iOS: `flutter run`
  - **Compatible con:** Flutter 3.0+, Dart 3.0+, Material Design 3
- [x] **Diseño Asistido por IA (Parcial)**
  - **Generación desde prompts de texto en lenguaje natural** ✅ IMPLEMENTADO
    - Integración con OpenAI GPT-4o-mini
    - Servicio backend (`aiService.ts`) con system prompt optimizado (180+ líneas)
    - Endpoint REST: `POST /api/ai/parse-intent` + health check
    - Componente frontend: `AIPromptBar` con UI glassmorphism morado
    - **Acciones soportadas:**
      - `CreateTable` - Crear tablas con campos inferidos automáticamente
      - `CreateRelation` - Relaciones 1-1, 1-N, N-N (con tabla intermedia automática)
      - `AddField` - Agregar campos a tablas existentes (con manejo diferido)
      - `RenameTable` - Renombrar tablas intermedias personalizadas
      - `DeleteTable` - Eliminar tablas completas
      - `DeleteRelation` - Eliminar relaciones específicas
    - **Características:**
      - Inferencia inteligente de tipos SQL desde texto natural
      - Detección automática de cardinalidades (1-1, 1-N, N-N)
      - Manejo especial de relaciones muchos-a-muchos:
        - Creación automática de tabla intermedia
        - Soporte para campos adicionales en tabla intermedia
        - Renombrado personalizado de tablas intermedias
      - Ejecución diferida de `AddField` para evitar pérdida de atributos
      - Sincronización en tiempo real vía Socket.IO
      - Control de acceso por rol (solo OWNER/EDITOR pueden usar IA)
      - Validación de respuestas JSON con manejo de errores
      - Rate limit y gestión de API key inválida
    - **System Prompt:** 180+ líneas con ejemplos detallados y reglas de inferencia
    - **Variables de entorno:** `OPENAI_API_KEY` requerida
    - **Testing:** Guía completa en `TESTING_GUIDE.md` (600+ líneas)
  - **Ejemplos de uso:**
    - "Crea una tabla cliente con id, nombre, email, teléfono"
    - "Relación 1 a muchos entre cliente y pedido"
    - "Crea una relación muchos a muchos entre persona y perfil con campos fecha_creacion y activo"
    - "Agrega campo telefono VARCHAR(20) a tabla usuario"

### ⏳ Pendiente de Implementación

- [ ] **Diseño Asistido por IA (Restante)**
  - Reconocimiento de voz para creación de tablas (Web Speech API)
  - OCR/Visión por computadora para replicar diagramas desde imágenes (GPT-4 Vision)
  - Sugerencias inteligentes de relaciones basadas en contexto
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
│   │        │   ├── ai.ts           # 🧠 Endpoints de IA (parse-intent, health)
│   │        │   ├── changes.ts      # Auditoría de cambios
│   │        │   ├── diagrams.ts     # CRUD de diagramas
│   │        │   ├── invitations.ts  # Sistema de invitaciones
│   │        │   ├── locks.ts        # Bloqueos distribuidos
│   │        │   ├── projects.ts     # Gestión de proyectos
│   │        │   ├── sessions.ts     # Control de presencia
│   │        │   └── users.ts        # Autenticación
│   │        │
│   │        ├── services/
│   │        │   └── aiService.ts    # 🧠 Integración OpenAI GPT-4o-mini
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
│           │   ├── AIPromptBar.tsx  # 🧠 Barra de prompts IA (glassmorphism)
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
│           │   ├── relationUtils.ts   # Clasificación centralizada de tablas ⭐
│           │   ├── sqlGenerator.ts    # Generador SQL ⭐
│           │   ├── springBootGenerator.ts # Generador Spring Boot ⭐
│           │   └── flutterGenerator.ts    # Generador Flutter ⭐
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

**`ai.ts`** 🧠

> Endpoints de integración con IA para generación automática de diagramas

- `POST /api/ai/parse-intent` - Parsear prompt de texto natural y generar acciones JSON
  - **Request body:** `{ prompt: string }` (máximo 500 caracteres)
  - **Response:** `{ actions: AIAction[] }` - Array de acciones estructuradas
  - **Acciones soportadas:** CreateTable, CreateRelation, AddField, RenameTable, DeleteTable, DeleteRelation
  - **Validaciones:**
    - Prompt no vacío
    - Longitud máxima 500 caracteres
    - JSON válido en respuesta
    - Schema de acciones correcto
  - **Manejo de errores:**
    - 400: Prompt inválido o vacío
    - 401: API key de OpenAI inválida
    - 429: Rate limit excedido
    - 500: Error de parseo o respuesta inválida
  - **Integración:** OpenAI GPT-4o-mini con system prompt de 180+ líneas
  - **Características:**
    - Inferencia automática de tipos SQL
    - Detección de cardinalidades (1-1, 1-N, N-N)
    - Manejo especial de relaciones muchos-a-muchos
    - Validación de estructura JSON estricta
- `GET /api/ai/health` - Health check del servicio de IA
  - **Response:** `{ status: "ok", hasApiKey: boolean, keyPreview: string }`
  - **Uso:** Verificar configuración de `OPENAI_API_KEY` en variables de entorno

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

### 🔧 Utilidades y Servicios del Backend

**`packages/server/src/services/`**

**`aiService.ts`** 🧠⭐

> Servicio de integración con OpenAI API para procesamiento de lenguaje natural

- **Función principal:** `parseUserIntent(prompt: string): Promise<{ actions: AIAction[] }>`
  - Envía prompt a GPT-4o-mini con system prompt especializado
  - Retorna array de acciones estructuradas en JSON
  - Validación automática de respuestas
  - Manejo de errores específicos de OpenAI
- **Configuración:**
  - Modelo: `gpt-4o-mini` (optimizado costo/rendimiento)
  - Temperature: `0.3` (balance creatividad/precisión)
  - Response format: `json_object` (respuestas JSON estrictas)
  - Timeout implícito: 30s (OpenAI SDK default)
- **System Prompt (180+ líneas):**
  - Reglas generales de formato JSON
  - Definiciones de 6 tipos de acciones (CreateTable, CreateRelation, AddField, etc.)
  - Reglas de inferencia de tipos SQL desde texto natural
  - Detección automática de cardinalidades
  - **Reglas especiales para relaciones N-N:**
    - No crear tabla intermedia con CreateTable (el sistema lo hace automáticamente)
    - Devolver CreateRelation con cardinality MANY_TO_MANY
    - Si hay atributos adicionales, usar AddField con targetTable inferida
    - Si hay nombre personalizado, usar RenameTable antes de AddField
  - 8+ ejemplos completos con casos de uso reales
  - Mapeo de tipos: email→VARCHAR(100), edad→INT, precio→DECIMAL(10,2), etc.
- **Tipos exportados:**
  ```typescript
  type AIAction =
    | { type: "CreateTable"; name: string; fields: AIField[] }
    | {
        type: "CreateRelation";
        fromTable: string;
        toTable: string;
        cardinality: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY";
      }
    | {
        type: "AddField";
        tableName?: string;
        targetTable?: string;
        field?: AIField;
        fields?: AIField[];
      }
    | { type: "RenameTable"; oldName: string; newName: string }
    | { type: "DeleteTable"; name: string }
    | { type: "DeleteRelation"; fromTable: string; toTable: string };
  ```
- **Función auxiliar:** `validateActions(actions: AIAction[]): { valid: boolean; errors: string[] }`
  - Valida estructura y campos requeridos de cada acción
  - Detecta tipos de acción desconocidos
  - Retorna lista de errores descriptivos
- **Logs detallados:**
  - Emoji coding: 🧠 [AI], ✅, ❌, ⚠️
  - Preview de prompts (primeros 100 chars)
  - Tiempo de respuesta en ms
  - Conteo de acciones generadas
- **Manejo de errores:**
  - `invalid_api_key`: API key incorrecta o faltante
  - `rate_limit` (429): Límite de requests excedido
  - Respuestas vacías o JSON inválido
  - Acciones con schema incorrecto
- **Variables de entorno requeridas:**
  - `OPENAI_API_KEY` - API key de OpenAI (obligatoria)

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
- Monta todas las rutas bajo `/api/*`:
  - `/api/sessions` - Control de presencia
  - `/api/locks` - Bloqueos distribuidos
  - `/api/changes` - Auditoría de cambios
  - `/api/users` - Autenticación
  - `/api/projects` - Gestión de proyectos
  - `/api/invitations` - Sistema de invitaciones
  - `/api/diagrams` - CRUD de diagramas
  - `/api/ai` - 🧠 Endpoints de IA (parse-intent, health)
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
- `OPENAI_API_KEY` - 🧠 API key de OpenAI para integración de IA (requerida para funcionalidades de IA)

**`packages/server/.env.example`**

> Plantilla de variables de entorno para desarrollo

- Incluye ejemplos para Docker y desarrollo local
- Template de `OPENAI_API_KEY` con instrucciones de obtención

**`packages/server/package.json`**

> Dependencias y scripts del servidor

- **Scripts:**
  - `dev` - Desarrollo con hot-reload (ts-node-dev)
  - `build` - Compilar TypeScript a JavaScript
  - `start` - Ejecutar servidor compilado
  - `prisma:generate` - Generar cliente Prisma
  - `prisma:migrate` - Crear migración inicial
- **Dependencias principales:**
  - Express, Prisma Client, Socket.IO, CORS, Helmet, dotenv
  - **openai** 4.73.0+ - 🧠 SDK oficial de OpenAI para Node.js
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

**`AIPromptBar.tsx`** 🧠⭐

> Barra flotante de prompts IA con diseño glassmorphism en footer del editor

- **Interfaz de usuario:**
  - Input de texto con placeholder descriptivo y límite de 500 caracteres
  - Contador de caracteres en tiempo real (ej: "0/500")
  - Botón "Generar" con gradiente morado (#667eea → #764ba2)
  - Spinner de loading durante procesamiento
  - Mensajes de error inline (no alerts) con estilo rojo
  - Lista de ejemplos de uso como referencia rápida
  - Diseño glassmorphism con backdrop-filter blur y fondo semi-transparente
- **Funcionalidad:**
  - Envía prompt a endpoint `/api/ai/parse-intent` vía POST
  - Validación local de longitud (máx 500 chars) antes de enviar
  - Callback `onActionsReceived(actions)` para aplicar acciones en editor
  - Manejo de estados: normal, loading, error
  - Limpia input después de éxito
  - Control de acceso: solo visible para OWNER/EDITOR (no VIEWER/GUEST)
- **Props:**
  - `projectId: string` - ID del proyecto actual
  - `userId: string` - ID del usuario (para logs y auditoría)
  - `onActionsReceived: (actions: any[]) => void` - Callback para aplicar acciones
- **Integración con DiagramEditor:**
  - Renderizado condicional: `{!isViewer && !isGuest && <AIPromptBar />}`
  - Posicionado en footer con `position: fixed; bottom: 0`
  - Conectado con función `applyAIActions()` para ejecución de acciones
  - Sincronización automática vía Socket.IO después de aplicar
- **Estilos:**
  - Ancho: 60% de la pantalla (centrado)
  - Altura fija: ~100px con padding generoso
  - Border radius: 16px con sombra elegante
  - Gradiente de fondo: rgba(17, 25, 40, 0.85)
  - Efectos hover: translateY(-2px) y sombra más pronunciada
  - Responsive: se adapta a diferentes tamaños de pantalla
- **Ejemplos integrados:**
  - "Crea una tabla cliente con id, nombre, email, teléfono"
  - "Relación 1 a muchos entre cliente y pedido"
  - "Crea una relación muchos a muchos entre persona y perfil"
  - "Agrega campo telefono VARCHAR(20) a tabla usuario"
- **Manejo de errores:**
  - API key inválida: "Error: Invalid OpenAI API key"
  - Rate limit: "Rate limit exceeded. Please try again later"
  - Prompt vacío: "Por favor ingresa un prompt"
  - Prompt muy largo: "El prompt no puede exceder 500 caracteres"
  - Error de red: "Error al procesar el prompt"

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
  - Eventos: `ADD_NODE`, `UPDATE_NODE`, `DELETE_NODE`, `MOVE_NODE`, `ADD_EDGE`, `DELETE_EDGE`, `SYNC_EDGES`
  - Broadcast a todos los usuarios del proyecto (excepto emisor)
- Sistema de presencia: muestra usuarios activos en barra superior
- Integración con `PropertiesPanel`, `Sidebar` y `AIPromptBar` 🧠
- Carga/guardado automático desde/hacia base de datos
- Soporte para eliminación con clic derecho y tecla Delete
- Exportación SQL, Spring Boot y Flutter con generadores
- Throttling de movimientos para optimizar red
- Manejo de reconexión y limpieza de sockets al salir
- **Integración de IA (Nuevo):**
  - Componente `AIPromptBar` renderizado en footer (solo OWNER/EDITOR)
  - Función `applyAIActions(actions: any[])` para ejecutar acciones de IA:
    - **Estrategia de ejecución en 3 fases:**
      1. **Primera pasada:** Ejecuta CreateTable, CreateRelation, DeleteTable
      2. **Segunda pasada:** Ejecuta RenameTable (para personalizar nombres de tablas intermedias)
      3. **Tercera pasada:** Ejecuta AddField de forma diferida (después de que tablas existan)
    - **Ventajas del manejo diferido:**
      - Evita pérdida de atributos en tablas intermedias N-N
      - Garantiza que tablas existan antes de agregar campos
      - Soporta tanto formato `tableName` como `targetTable`
      - Soporta arrays múltiples de campos (`fields[]`)
    - **Referencia local de nodos actualizada (`updatedNodes`):**
      - Mantiene sincronía entre estado React y operaciones de IA
      - Permite búsqueda de tablas generadas dinámicamente
      - Se actualiza después de cada CreateTable y CreateRelation
    - **Sincronización Socket.IO automática:**
      - Emite `diagram-change` después de cada acción
      - Delays entre acciones (50-150ms) para evitar race conditions
      - Broadcast a todos los colaboradores en tiempo real
    - **Acciones implementadas:**
      - `CreateTable`: Crea nodo con campos, posición aleatoria
      - `CreateRelation`:
        - 1-1 y 1-N: Crea FK en tabla correcta + edge visual
        - N-N: Crea tabla intermedia automática + 2 edges (hacia cada tabla)
      - `AddField`: Agrega campos a tabla específica (soporta múltiples)
      - `RenameTable`: Cambia nombre de tabla (útil para personalizar joins)
      - `DeleteTable`: Elimina tabla + edges relacionados
    - **Manejo de relaciones N-N especial:**
      - Detecta campos PK de ambas tablas (`sourcePK`, `targetPK`)
      - Crea tabla intermedia con nombre inferido: `{tabla1}_{tabla2}`
      - Genera 2 FKs con nombres compuestos: `{tabla}_{pk_name}`
      - Posiciona tabla intermedia entre las tablas relacionadas
      - Crea 2 edges tipo 1-N desde cada tabla original
      - Almacena metadata en `edge.data` (sourceField, targetField, relationType)
    - **Validación y logs detallados:**
      - Logs con emoji coding: 🧠 [AI], ✅, ⚠️, ❌
      - Advertencias si tabla no encontrada para AddField
      - Alert final con conteo de acciones aplicadas
      - Console tracking de cada acción ejecutada

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

> Generador automático de scripts SQL optimizados desde diagrama ER con detección inteligente de tablas intermedias

- **Funciones principales:**
  - `generateSQL(nodes, edges)` - Crea script SQL completo con ordenamiento inteligente:
    - **Algoritmo de resolución de dependencias:** Ordenamiento topológico
      - Separa tablas base (sin FK) vs dependientes (con FK)
      - Crea tablas en orden correcto automáticamente
      - Detección de dependencias circulares con advertencias
    - **Detección inteligente de tablas intermedias (N:M):**
      - **Join pura** (exactamente 2 FKs, sin otras columnas):
        - Genera `PRIMARY KEY (fk1, fk2)` compuesta
        - No incluye campo `id` separado
        - Ideal para relaciones puras many-to-many
      - **Join extendida** (2 FKs + columnas adicionales):
        - Genera `id SERIAL PRIMARY KEY` normal
        - Permite campos extra (cantidad, fecha, etc.)
        - Funciona como entidad completa
    - CREATE TABLE con todas las columnas y constraints
    - PRIMARY KEY y FOREIGN KEY con `ON DELETE CASCADE`
    - Tablas intermedias para relaciones N-N automáticas desde edges
    - Índices automáticos en FKs para optimizar búsquedas
    - Comentarios mínimos para producción
  - `downloadSQL(sql, fileName)` - Descarga SQL como archivo `.sql`
- **Ejemplos generados:**

  ```sql
  -- Join pura (proyecto_etiqueta)
  CREATE TABLE proyecto_etiqueta (
    proyecto_id INT NOT NULL,
    etiqueta_id INT NOT NULL,
    PRIMARY KEY (proyecto_id, etiqueta_id),
    FOREIGN KEY (proyecto_id) REFERENCES proyecto(id) ON DELETE CASCADE,
    FOREIGN KEY (etiqueta_id) REFERENCES etiqueta(id) ON DELETE CASCADE
  );

  -- Join extendida (carrito)
  CREATE TABLE carrito (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    fecha TIMESTAMP DEFAULT now(),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY (producto_id) REFERENCES producto(id)
  );
  ```

- Soporte: PostgreSQL 12+
- Normalización automática de nombres (lowercase, snake_case)
- Compatible con Prisma, TypeORM y Sequelize

**`springBootGenerator.ts`** ⭐

> Generador automático de proyectos Spring Boot completos desde diagrama ER con Docker integrado

- **Función principal:**
  - `generateSpringBootProject(model, projectName)` - Genera ZIP con proyecto Maven completo:
    - **Estructura del proyecto:**
      - `pom.xml` - Maven con Spring Boot 3.2, JPA, H2, Lombok
      - `Dockerfile` - Multi-stage build (Maven + JRE Alpine optimizado)
      - `docker-compose.yml` - Configuración lista para ejecutar con puerto dinámico
      - `.dockerignore` - Optimización de build Docker
      - `application.properties` - H2 en memoria con puerto aleatorio (8180-9080)
      - `{ProjectName}Application.java` - Clase principal correctamente nombrada
      - `src/main/java/{package}/entity/` - Entidades JPA
      - `src/main/java/{package}/repository/` - Repositorios JPA
      - `src/main/java/{package}/service/` - Servicios con lógica CRUD
      - `src/main/java/{package}/controller/` - Controllers REST
      - `README.md` - Documentación completa con ejemplos cURL
    - **Entidades JPA con Lombok:**
      - Anotaciones: `@Entity`, `@Table`, `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`
      - Primary Keys: `@Id` + `@GeneratedValue(strategy = IDENTITY)`
      - **Detección inteligente de relaciones:**
        - **Join pura** (solo 2 FKs sin columnas extra):
          - ❌ NO genera entidad Java separada
          - ✅ Genera `@ManyToMany` con `@JoinTable` en entidades principales
          - Ejemplo: `proyecto_etiqueta` → relación en Proyecto.java y Etiqueta.java
        - **Join extendida** (2 FKs + campos adicionales):
          - ✅ Genera entidad completa con `@Id` autoincremental
          - ✅ Genera CRUD completo (Repository, Service, Controller)
          - Relaciones: `@ManyToOne` para las FKs
          - Ejemplo: `carrito` con campos cantidad, fecha
        - Relaciones normales: `@ManyToOne`, `@OneToMany` según corresponda
    - **Repositorios:** Interfaces extendiendo `JpaRepository<Entity, Long>`
    - **Servicios:** CRUD completo
      - `findAll()` - Listar todos los registros
      - `findById(id)` - Buscar por ID
      - `save(entity)` - Crear nuevo
      - `update(id, entity)` - Actualizar existente
      - `delete(id)` - Eliminar por ID
    - **Controllers REST con endpoints funcionales:**
      - `GET /{entidad}` - Listar todos
      - `GET /{entidad}/{id}` - Obtener por ID
      - `POST /{entidad}` - Crear nuevo
      - `PUT /{entidad}/{id}` - Actualizar
      - `DELETE /{entidad}/{id}` - Eliminar
      - `@CrossOrigin(origins = "*")` - CORS habilitado
    - **Base de datos H2:**
      - URL: `jdbc:h2:mem:testdb`
      - Console: `/h2-console` (User: `sa`, Password: vacío)
      - JPA: `spring.jpa.hibernate.ddl-auto=create-drop` (auto-crea tablas)
  - `downloadSpringBootProject(zipBuffer, projectName)` - Descarga ZIP
- **Características avanzadas:**
  - Puerto aleatorio (8180-9080) para evitar conflictos
  - Dockerfile multi-stage para imágenes optimizadas (~200MB)
  - Usuario no-root en contenedor por seguridad
  - Healthcheck integrado en docker-compose
  - README con ejemplos cURL y instrucciones Docker/Maven
- **Mapeo de tipos SQL → Java:**
  - `INT/SERIAL` → `Long`
  - `VARCHAR/TEXT` → `String`
  - `BOOLEAN` → `Boolean`
  - `DECIMAL/NUMERIC` → `Double`
  - `TIMESTAMP/DATETIME` → `LocalDateTime`
  - `DATE` → `LocalDate`
  - `TIME` → `LocalTime`
- **Conversión de nombres:**
  - snake_case → PascalCase (clases)
  - snake_case → camelCase (variables)
- **Ejemplos generados:**

  ```java
  // Join pura: NO genera entidad, usa @ManyToMany
  @Entity
  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public class Proyecto {
      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;

      @ManyToMany
      @JoinTable(
          name = "proyecto_etiqueta",
          joinColumns = @JoinColumn(name = "proyecto_id"),
          inverseJoinColumns = @JoinColumn(name = "etiqueta_id")
      )
      private Set<Etiqueta> etiquetas = new HashSet<>();
  }

  // Join extendida: Genera entidad completa
  @Entity
  @Table(name = "carrito")
  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public class Carrito {
      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;

      @ManyToOne
      @JoinColumn(name = "usuario_id")
      private Usuario usuario;

      @ManyToOne
      @JoinColumn(name = "producto_id")
      private Producto producto;

      private Integer cantidad;
      private LocalDateTime fecha;
  }
  ```

- **Listo para ejecutar:**
  - Maven: `mvn spring-boot:run`
  - Docker: `docker compose up --build`
- Soporte: Java 17+, Spring Boot 3.2, Maven 3.6+
- Compatible con IntelliJ IDEA, Eclipse, VS Code
- Listo para despliegue: Docker, Heroku, AWS Elastic Beanstalk

**`relationUtils.ts`** ⭐⭐⭐

> Módulo centralizado de clasificación de tablas para coherencia entre todos los generadores

- **Propósito:** Garantizar que SQL, Spring Boot y Flutter clasifiquen tablas intermedias de la misma forma
- **Tipos exportados:**

  ```typescript
  type TableKind = "ENTITY" | "JOIN_PURE" | "JOIN_ENRICHED";

  interface TableClassification {
    kind: TableKind;
    foreignKeys: Field[];
    nonForeignFields: Field[];
    primaryKey: Field | null;
  }
  ```

- **Funciones principales:**
  - `classifyTable(fields: Field[]): TableClassification`
    - Analiza la estructura de una tabla y retorna su clasificación
    - **ENTITY:** Tabla normal con datos propios (0, 1, o más FKs)
    - **JOIN_PURE:** Tabla intermedia N-M con SOLO 2 FKs (sin columnas adicionales)
      - Ejemplo: `proyecto_etiqueta (proyecto_id, etiqueta_id)`
      - Timestamps opcionales (created_at, updated_at) NO cuentan como campos adicionales
    - **JOIN_ENRICHED:** Tabla intermedia N-M con 2+ FKs + columnas de datos
      - Ejemplo: `carrito (usuario_id, producto_id, cantidad, fecha)`
  - `shouldGenerateCRUD(kind: TableKind): boolean`
    - Retorna `true` para ENTITY y JOIN_ENRICHED
    - Retorna `false` para JOIN_PURE (solo relación, sin entidad propia)
    - Usado por generadores para filtrar tablas a generar
  - `needsCompositeKey(classification): boolean`
    - Detecta si una tabla JOIN_ENRICHED necesita clave compuesta
    - Retorna `true` si no tiene PK simple y tiene 2+ FKs
- **Impacto en generadores:**
  - **SQL:** JOIN_PURE obtiene `PRIMARY KEY (fk1, fk2)` compuesta
  - **Spring Boot:** JOIN_PURE usa `@ManyToMany`, JOIN_ENRICHED genera Entity completa
  - **Flutter:** JOIN_PURE NO genera código, JOIN_ENRICHED genera CRUD con composite key
- **Ventajas:**
  - ✅ Lógica única y mantenible en un solo lugar
  - ✅ Consistencia garantizada entre backend y frontend
  - ✅ Fácil de extender con nuevos tipos de tablas
  - ✅ Reducción de bugs por diferencias de clasificación

**`flutterGenerator.ts`** ⭐

> Generador automático de proyectos Flutter completos desde diagrama ER con arquitectura Provider

- **Función principal:**
  - `generateFlutterProject(model, projectName)` - Genera ZIP con proyecto Flutter completo:
    - **Estructura del proyecto:**
      - `pubspec.yaml` - Dependencias: flutter, provider 6.1.0, http 1.2.0
      - `analysis_options.yaml` - Flutter lints con reglas relajadas
      - `.gitignore` - Archivos de Flutter/Dart/IDEs/Platforms
      - `lib/main.dart` - App principal con MultiProvider y rutas nombradas
      - `lib/models/{tabla}_model.dart` - Modelos Dart para cada entidad
      - `lib/services/api_service.dart` - Servicio HTTP + datos mock
      - `lib/providers/{tabla}_provider.dart` - Providers con estado CRUD
      - `lib/screens/{tabla}_list_screen.dart` - Pantallas de listado
      - `lib/screens/{tabla}_form_screen.dart` - Pantallas de formulario
      - `README.md` - Documentación completa con instrucciones
    - **Modelos Dart con null-safety:**
      - Reglas de nullable:
        - **IDs autogenerados:** `int?` (nullable, generado por backend)
        - **Foreign Keys en ENTITY:** `int?` (nullable, opcional)
        - **Foreign Keys en JOIN tables:** `int` (required, parte de la relación)
        - **Campos NOT NULL:** Sin `?`, con `required` en constructor
        - **Campos NULL:** Con `?`, sin `required`
      - Métodos generados:
        - `fromJson(Map<String, dynamic>)` - Deserialización desde API
        - `toJson()` - Serialización para API
        - `copyWith({...})` - Actualización inmutable de propiedades
        - `getCompositeKey()` - Solo en JOIN*ENRICHED (ej: `"$userId*$productoId"`)
      - Tipos mapeados: INT→int, VARCHAR→String, BOOLEAN→bool, TIMESTAMP→DateTime
    - **API Service con modo dual:**
      - **Configuración:**
        ```dart
        static const bool useBackend = false; // Cambiar a true para backend real
        static const String baseUrl = "http://localhost:8080";
        ```
      - **Modo local (useBackend = false):**
        - Datos mock generados automáticamente (2 registros de ejemplo por tabla)
        - Delay artificial de 300ms para simular latencia de red
        - Perfecto para desarrollo sin backend
      - **Modo backend (useBackend = true):**
        - Peticiones HTTP reales a Spring Boot
        - Endpoints: GET /tabla, GET /tabla/:id, POST /tabla, PUT /tabla/:id, DELETE /tabla/:id
        - Manejo de errores HTTP (throw Exception si statusCode != 200/201)
      - **Métodos por entidad:**
        - Tabla normal: `fetch{Clase}s()`, `fetch{Clase}ById()`, `create{Clase}()`, `update{Clase}()`, `delete{Clase}()`
        - JOIN_ENRICHED: Métodos adicionales con composite key (`update{Clase}ByCompositeKey()`, `delete{Clase}ByCompositeKey()`)
    - **Providers con ChangeNotifier:**
      - Estado: `List<Model> _items`, `bool _isLoading`, `String? _error`
      - Getters: `items`, `isLoading`, `error`
      - Métodos CRUD:
        - `fetchAll()` - Carga inicial desde API
        - `create(item)` - Crea nuevo registro
        - `update(item)` - Actualiza existente (PK simple o composite key)
        - `delete(id)` - Elimina por ID (o composite key si aplica)
      - `notifyListeners()` después de cada operación para actualizar UI
    - **Screens con Material Design 3:**
      - **ListScreen:**
        - AppBar con título y botón de agregar
        - **Navigation Drawer** con lista de todas las entidades:
          - Íconos: `table_chart` (ENTITY), `link` (JOIN_ENRICHED)
          - Resalta screen actual con color morado
          - Navegación automática con `Navigator.pushNamed()`
        - ListView con Card por cada registro
        - Botones de acción: Editar, Eliminar (con confirmación)
        - Estados: Loading spinner, error message, empty state
        - Búsqueda (pendiente, estructura preparada)
      - **FormScreen:**
        - AppBar con título (Crear/Editar)
        - Form con TextEditingController por cada campo editable
        - Validación básica (campos required)
        - Botón guardar con feedback visual
        - Navegación de regreso automática después de guardar
        - Manejo de IDs nullable (auto-asignados por backend)
    - **Clasificación de tablas con relationUtils:**
      - Usa `classifyTable()` para determinar tipo de tabla
      - Filtra con `shouldGenerateCRUD()`:
        - ✅ **ENTITY**: Genera código completo
        - ✅ **JOIN_ENRICHED**: Genera código con composite key
        - ❌ **JOIN_PURE**: NO genera código (relación manejada en backend)
      - Coherencia total con SQL y Spring Boot
  - `downloadFlutterProject(zipBuffer, projectName)` - Descarga ZIP
- **Características avanzadas:**
  - Material Design 3 con esquema de colores deepPurple
  - Hot reload habilitado (desarrollo Flutter estándar)
  - Null safety completo (Dart 3.0+)
  - Arquitectura escalable (fácil agregar BLoC o Riverpod)
  - README con ejemplos de configuración backend
- **Conversión de nombres:**
  - snake_case → PascalCase (clases)
  - snake_case → camelCase (propiedades)
- **Ejemplos generados:**

  ```dart
  // Modelo con null-safety correcto
  class Usuario {
    final int? id;           // Nullable: autogenerado
    final String nombre;     // Required: NOT NULL
    final String? email;     // Nullable: campo opcional

    Usuario({this.id, required this.nombre, this.email});

    factory Usuario.fromJson(Map<String, dynamic> json) {
      return Usuario(
        id: json['id'] as int?,
        nombre: json['nombre'] as String,
        email: json['email'] as String?,
      );
    }

    Map<String, dynamic> toJson() => {
      'id': id,
      'nombre': nombre,
      'email': email,
    };
  }

  // JOIN_ENRICHED con composite key
  class Carrito {
    final int usuarioId;     // Required: FK en join table
    final int productoId;    // Required: FK en join table
    final int cantidad;      // Required: campo adicional

    Carrito({required this.usuarioId, required this.productoId, required this.cantidad});

    String getCompositeKey() => "${usuarioId}_${productoId}";
  }
  ```

- **Listo para ejecutar:**
  - Instalación: `flutter pub get`
  - Web: `flutter run -d chrome`
  - Android/iOS: `flutter run`
- Soporte: Flutter 3.0+, Dart 3.0+, Android/iOS/Web/Desktop
- Compatible con Material Design 3, Provider, HTTP package

---

## 🏗️ Arquitectura de Coherencia entre Generadores

### Problema Resuelto

En versiones anteriores, cada generador (SQL, Spring Boot, Flutter) tenía su propia lógica de detección de tablas intermedias, lo que causaba inconsistencias:

- ❌ SQL generaba PK compuesta para una tabla, pero Spring Boot generaba Entity completa
- ❌ Flutter generaba CRUD para tablas que Spring Boot manejaba con `@ManyToMany`
- ❌ Código generado no funcionaba correctamente sin modificaciones manuales

### Solución: `relationUtils.ts`

Se centralizó la lógica de clasificación en un módulo compartido que garantiza que **todos los generadores clasifiquen las tablas de la misma forma**.

### Clasificación Unificada

| Tipo de Tabla     | Características                       | SQL                       | Spring Boot                | Flutter                                      |
| ----------------- | ------------------------------------- | ------------------------- | -------------------------- | -------------------------------------------- |
| **ENTITY**        | Tabla normal con 0-N FKs              | PK simple `id`            | Entity + CRUD completo     | Models + Providers + Screens                 |
| **JOIN_PURE**     | Exactamente 2 FKs, sin columnas extra | PK compuesta `(fk1, fk2)` | `@ManyToMany` (sin Entity) | **NO genera código**                         |
| **JOIN_ENRICHED** | 2+ FKs + columnas adicionales         | PK compuesta o `id`       | Entity + CRUD completo     | Models + Providers + Screens (composite key) |

### Ejemplo Comparativo

**Diagrama ER con 3 tablas:**

```
Usuario (id, nombre, email)
Producto (id, nombre, precio)
Carrito (usuario_id, producto_id, cantidad, fecha)
```

**Generación SQL:**

```sql
CREATE TABLE usuario (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100)
);

CREATE TABLE producto (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2)
);

-- JOIN_ENRICHED: Tiene campos extra (cantidad, fecha)
CREATE TABLE carrito (
  usuario_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  fecha TIMESTAMP DEFAULT now(),
  PRIMARY KEY (usuario_id, producto_id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (producto_id) REFERENCES producto(id)
);
```

**Generación Spring Boot:**

```java
// Usuario.java - ENTITY normal
@Entity
public class Usuario {
    @Id @GeneratedValue(strategy = IDENTITY)
    private Long id;
    private String nombre;
    private String email;
}

// Carrito.java - JOIN_ENRICHED con campos adicionales
@Entity
@Table(name = "carrito")
public class Carrito {
    @Id @GeneratedValue(strategy = IDENTITY)
    private Long id;  // Generado automáticamente

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "producto_id")
    private Producto producto;

    private Integer cantidad;  // Campo adicional
    private LocalDateTime fecha;  // Campo adicional
}

// CarritoRepository.java - CRUD completo
public interface CarritoRepository extends JpaRepository<Carrito, Long> {}
```

**Generación Flutter:**

```dart
// usuario_model.dart - ENTITY normal
class Usuario {
  final int? id;
  final String nombre;
  final String? email;

  Usuario({this.id, required this.nombre, this.email});
}

// carrito_model.dart - JOIN_ENRICHED
class Carrito {
  final int usuarioId;    // Required: FK en join table
  final int productoId;   // Required: FK en join table
  final int cantidad;     // Required: campo adicional
  final DateTime? fecha;  // Nullable: campo adicional

  Carrito({
    required this.usuarioId,
    required this.productoId,
    required this.cantidad,
    this.fecha
  });

  // Método especial para composite key
  String getCompositeKey() => "${usuarioId}_${productoId}";
}

// carrito_provider.dart - Provider con CRUD
class CarritoProvider extends ChangeNotifier {
  Future<void> update(Carrito item) async {
    final compositeKey = item.getCompositeKey();
    await ApiService.updateCarritoByCompositeKey(compositeKey, item.toJson());
    // ...
  }
}

// carrito_list_screen.dart + carrito_form_screen.dart
// Screens completas generadas
```

### Caso Especial: JOIN_PURE

Si la tabla intermedia **solo tuviera las 2 FKs** (sin cantidad ni fecha):

```sql
-- proyecto_etiqueta: Solo relaciona, sin datos propios
CREATE TABLE proyecto_etiqueta (
  proyecto_id INT NOT NULL,
  etiqueta_id INT NOT NULL,
  PRIMARY KEY (proyecto_id, etiqueta_id),
  FOREIGN KEY (proyecto_id) REFERENCES proyecto(id),
  FOREIGN KEY (etiqueta_id) REFERENCES etiqueta(id)
);
```

**Generación Spring Boot:**

```java
// proyecto_etiqueta NO genera Entity separada
// En su lugar, genera @ManyToMany en las entidades principales:

@Entity
public class Proyecto {
    @Id @GeneratedValue(strategy = IDENTITY)
    private Long id;

    @ManyToMany
    @JoinTable(
        name = "proyecto_etiqueta",
        joinColumns = @JoinColumn(name = "proyecto_id"),
        inverseJoinColumns = @JoinColumn(name = "etiqueta_id")
    )
    private Set<Etiqueta> etiquetas = new HashSet<>();
}
```

**Generación Flutter:**

```dart
// proyecto_etiqueta NO genera código
// La relación se maneja automáticamente en el backend con @ManyToMany
```

### Ventajas de la Arquitectura

1. **Consistencia Total:** Los 3 generadores usan la misma lógica de `relationUtils.ts`
2. **Código Funcional:** Backend y frontend compatibles sin modificaciones manuales
3. **Mantenibilidad:** Cambios en la lógica de clasificación se hacen en un solo lugar
4. **Escalabilidad:** Fácil agregar nuevos tipos de tablas (ej: auditoría, versionado)
5. **Testing:** Lógica centralizada es más fácil de probar

### Reglas de Detección

```typescript
// relationUtils.ts - Lógica compartida

// JOIN_PURE: Solo 2 FKs
if (
  foreignKeys.length === 2 &&
  (nonForeignFields.length === 0 || hasOnlyTimestamps)
) {
  return { kind: "JOIN_PURE" };
}

// JOIN_ENRICHED: 2+ FKs con datos adicionales
if (
  foreignKeys.length >= 2 &&
  nonForeignFields.length > 0 &&
  !hasOnlyTimestamps
) {
  return { kind: "JOIN_ENRICHED" };
}

// ENTITY: Tabla normal
return { kind: "ENTITY" };
```

**Timestamps ignorados:** `created_at`, `updated_at`, `timestamp` NO cuentan como campos adicionales significativos.

---

### 🌐 Configuración y Punto de Entrada del Frontend

**`packages/web/src/`**

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
  - **Archivos:** adm-zip 0.5.10 (generación de proyectos Spring Boot)
- **Dev dependencies:** TypeScript, Vite, plugin React, @types/node

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
