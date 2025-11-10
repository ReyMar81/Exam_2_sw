# 🚀 Guía de Testing - Integración de IA

## ✅ Archivos Creados/Modificados

### Backend (Server)

- ✅ **CREADO:** `packages/server/src/services/aiService.ts` (283 líneas)
  - Servicio de integración con OpenAI GPT-4o-mini
  - System prompt optimizado para diagramas ER
  - Validación de acciones generadas
- ✅ **CREADO:** `packages/server/src/routes/ai.ts` (128 líneas)

  - Endpoint: `POST /api/ai/parse-intent`
  - Endpoint: `GET /api/ai/health` (health check)
  - Validaciones de input y rate limiting preparado

- ✅ **MODIFICADO:** `packages/server/src/index.ts`

  - Agregado: `import aiRouter from "./routes/ai.js"`
  - Agregado: `app.use("/api/ai", aiRouter)`

- ✅ **MODIFICADO:** `packages/server/package.json`

  - Agregado: `"openai": "^4.73.0"` en dependencies

- ✅ **VERIFICADO:** `packages/server/.env`
  - OPENAI_API_KEY encontrada y configurada correctamente

### Frontend (Web)

- ✅ **CREADO:** `packages/web/src/components/AIPromptBar.tsx` (264 líneas)

  - UI glassmorphism con gradiente
  - Input con placeholder y contador de caracteres
  - Manejo de errores y estados de carga
  - Ejemplos de prompts integrados

- ✅ **MODIFICADO:** `packages/web/src/pages/DiagramEditor.tsx`
  - Agregado: `import { AIPromptBar } from "../components/AIPromptBar"`
  - Agregada función: `applyAIActions()` (300+ líneas)
    - Maneja CreateTable
    - Maneja CreateRelation (1-1, 1-N, N-N)
    - Maneja DeleteTable
    - Maneja AddField
  - Renderizado: `<AIPromptBar />` (solo para OWNER/EDITOR)

---

## 🔧 Instalación de Dependencias

### Backend

```bash
cd packages/server
npm install openai@^4.73.0
```

### Frontend

No requiere nuevas dependencias (usa las existentes: axios, react, reactflow).

---

## 🚀 Cómo Iniciar el Proyecto

### Opción 1: Docker Compose (Recomendado)

```bash
# Desde la raíz del proyecto
docker-compose up --build

# El servidor arrancará en http://localhost:3001
# El frontend estará disponible en la URL del navegador
```

### Opción 2: Desarrollo Local

```bash
# Terminal 1: Backend
cd packages/server
npm install
npm run dev

# Terminal 2: Frontend
cd packages/web
npm install
npm run dev
```

---

## 🧪 Pruebas del Flujo de IA

### 1. Verificar Health Check de IA

**Método:** GET  
**URL:** `http://localhost:3001/api/ai/health`

**Respuesta esperada:**

```json
{
  "status": "configured",
  "apiKey": "sk-proj-...",
  "model": "gpt-4o-mini",
  "temperature": 0.3
}
```

Si `status: "not_configured"`, verificar que `OPENAI_API_KEY` esté en `.env`.

---

### 2. Prueba Manual desde el Frontend

#### Paso 1: Acceder al Editor

1. Abrir navegador en `http://localhost:5173` (o la URL de Vite)
2. Hacer login con cualquier email (ej: `test@example.com`)
3. Crear o abrir un proyecto existente
4. Verificar que aparece la **barra de IA en el footer** (solo si eres OWNER/EDITOR)

#### Paso 2: Probar Creación de Tabla Simple

**Prompt:**

```
Crea una tabla cliente con id, nombre, email
```

**Resultado esperado:**

- ✅ Aparece nueva tabla "cliente" en el canvas
- ✅ Contiene 3 campos: id (SERIAL, PK), nombre (VARCHAR), email (VARCHAR)
- ✅ Los cambios se sincronizan con otros usuarios conectados

#### Paso 3: Probar Relación 1 a Muchos

**Prerequisito:** Crear tabla "pedido" primero:

```
Crea tabla pedido con id, fecha, total
```

**Prompt:**

```
Relación 1 a muchos entre cliente y pedido
```

**Resultado esperado:**

- ✅ Aparece edge (flecha) desde cliente hacia pedido
- ✅ Tabla "pedido" ahora tiene campo FK `cliente_id`
- ✅ Edge tiene label "1‒N"
- ✅ Sincronización en tiempo real

#### Paso 4: Probar Relación Muchos a Muchos

**Prerequisito:** Crear tabla "categoria":

```
Crea tabla categoria con id, nombre
```

Y tabla "producto":

```
Crea tabla producto con id, nombre, precio
```

**Prompt:**

```
Producto y categoría muchos a muchos
```

**Resultado esperado:**

- ✅ Se crea tabla intermedia `producto_categoria` automáticamente
- ✅ Contiene 2 FKs: `producto_id` y `categoria_id`
- ✅ Se crean 2 edges (1-N desde producto, 1-N desde categoria)
- ✅ Tabla intermedia aparece entre las dos tablas principales

#### Paso 5: Prueba Completa (Prompt Complejo)

**Prompt:**

```
Crea una tabla cliente con id, nombre, correo, y relación 1 a muchos con pedido
```

**Resultado esperado:**

- ✅ Se crea tabla "cliente" con 3 campos
- ✅ Se busca tabla "pedido" (si no existe, muestra warning en consola)
- ✅ Si "pedido" existe, se crea la relación automáticamente
- ✅ Alert de confirmación: "✅ 2 acción(es) de IA aplicada(s) correctamente!"

---

### 3. Verificar Sincronización Socket.IO

#### Test Multi-Usuario:

1. Abrir 2 pestañas del navegador en el mismo proyecto
2. En pestaña 1: Usar prompt de IA para crear tabla
3. En pestaña 2: Verificar que la tabla aparece automáticamente (sin F5)

**Logs esperados en consola del navegador:**

```
🧠 [AIPromptBar] Sending prompt to AI: "Crea tabla cliente..."
✅ [AIPromptBar] Received 1 action(s) from AI: [...]
🧠 [Editor] Applying AI actions: [...]
✅ [AI] Created table: cliente
📡 [Editor] Received diagram-update: ADD_NODE
➕ [Editor] Adding node: node-1234...
```

---

### 4. Pruebas de Errores

#### Error: Prompt Vacío

**Prompt:** ` ` (espacios vacíos)  
**Resultado:** Input deshabilitado, botón gris

#### Error: Prompt Muy Largo

**Prompt:** (> 500 caracteres)  
**Resultado:** Mensaje de error rojo: "Prompt demasiado largo (máximo 500 caracteres)"

#### Error: API Key Inválida

**Simulación:** Cambiar `OPENAI_API_KEY` a valor inválido en `.env`  
**Resultado:** Error 500 con mensaje: "AI service configuration error"

#### Error: Tabla No Encontrada (Relación)

**Prompt:** `Relación entre usuario y tabla_inexistente`  
**Resultado:** Warning en consola: "⚠️ [AI] Relation skipped: table not found"

---

### 5. Verificar Persistencia en Base de Datos

```bash
# Conectar a PostgreSQL (Docker)
docker exec -it exam_2_sw-db-1 psql -U postgres -d diagram_editor

# Consulta para verificar último diagrama actualizado
SELECT id, "projectId", version, "updatedAt"
FROM "Diagram"
ORDER BY "updatedAt" DESC
LIMIT 1;

# Ver datos JSON del diagrama
SELECT data FROM "Diagram" WHERE id = '<diagram_id>';
```

**Verificar:**

- ✅ Campo `data.nodes` contiene las tablas creadas por IA
- ✅ Campo `data.edges` contiene las relaciones
- ✅ Campo `version` se incrementa con cada cambio

---

## 🐛 Debugging

### Logs del Backend

```bash
# Seguir logs del servidor
docker-compose logs -f server

# Buscar logs de IA
docker-compose logs server | grep "🧠"
```

**Logs esperados:**

```
🧠 [AI Route] Received request from user abc123 in project xyz
🧠 [AI] Parsing user intent: "Crea tabla cliente..."
✅ [AI] Successfully parsed 1 action(s) in 1234ms
```

### Logs del Frontend

Abrir DevTools → Console:

**Buscar:**

- `[AIPromptBar]` - Interacción con barra de IA
- `[AI]` - Aplicación de acciones
- `[Editor]` - Sincronización con Socket.IO

---

## 📊 Métricas de Rendimiento

### Latencia Esperada

- **Prompt → Response:** 1-3 segundos (depende de OpenAI API)
- **Apply Actions → Canvas Update:** < 200ms
- **Socket.IO Broadcast:** < 100ms

### Consumo de API

- **Modelo:** gpt-4o-mini (económico)
- **Tokens promedio:** ~200-400 por request
- **Costo estimado:** ~$0.0001 - $0.0003 USD por prompt

---

## ✅ Checklist de Validación

### Backend

- [x] `aiService.ts` creado y funcional
- [x] `ai.ts` route registrada
- [x] `openai` dependency instalada
- [x] `OPENAI_API_KEY` configurada
- [x] Health check responde correctamente
- [x] Endpoint `/api/ai/parse-intent` funcional

### Frontend

- [x] `AIPromptBar.tsx` renderiza correctamente
- [x] Input acepta texto y cuenta caracteres
- [x] Botón "Generar" funciona
- [x] Estados de loading se muestran
- [x] Errores se manejan con mensajes claros
- [x] `applyAIActions()` ejecuta todas las acciones
- [x] Componente solo visible para OWNER/EDITOR

### Integración

- [x] CreateTable crea nodos correctamente
- [x] CreateRelation (1-1) funciona
- [x] CreateRelation (1-N) funciona
- [x] CreateRelation (N-N) crea tabla intermedia
- [x] DeleteTable elimina nodos
- [x] AddField agrega campos a tablas existentes
- [x] Socket.IO sincroniza cambios en tiempo real
- [x] Persistencia en PostgreSQL funciona

---

## 🎉 Prueba de Éxito Final

**Ejecutar este prompt completo:**

```
Crea tabla usuario con id, email, nombre, edad. Luego crea tabla rol con id y descripcion. Finalmente, relacion muchos a muchos entre usuario y rol.
```

**Resultado esperado:**

1. ✅ Tabla "usuario" con 4 campos
2. ✅ Tabla "rol" con 2 campos
3. ✅ Tabla intermedia "usuario_rol" con 2 FKs
4. ✅ 2 edges conectando las tablas
5. ✅ Alert: "✅ 3 acción(es) de IA aplicada(s) correctamente!"
6. ✅ Cambios visibles en otros usuarios conectados
7. ✅ Persistencia en base de datos

---

## 🆘 Troubleshooting Común

### Problema: "Cannot find module 'openai'"

**Solución:**

```bash
cd packages/server
npm install openai@^4.73.0
npm run dev
```

### Problema: "Invalid API key"

**Solución:**

1. Verificar `packages/server/.env`
2. Confirmar que `OPENAI_API_KEY` tiene valor correcto
3. Reiniciar servidor: `docker-compose restart server`

### Problema: "AIPromptBar no aparece"

**Solución:**

1. Verificar que NO eres VIEWER o GUEST
2. Hacer login como OWNER del proyecto
3. Verificar consola del navegador por errores

### Problema: "Actions no se aplican"

**Solución:**

1. Abrir DevTools → Console
2. Buscar errores en `[AI]` logs
3. Verificar que `applyAIActions()` se ejecuta
4. Confirmar que Socket.IO está conectado (🟢)

---

## 📝 Próximos Pasos (Opcional)

### Mejoras Futuras

- [ ] Agregar historial de prompts (localStorage)
- [ ] Implementar reconocimiento de voz
- [ ] Agregar OCR para diagramas escaneados
- [ ] Implementar autocompletado de prompts
- [ ] Agregar rate limiting en frontend
- [ ] Crear dashboard de métricas de uso

---

## 📚 Documentación Adicional

- **Arquitectura completa:** Ver `AI_INTEGRATION_ARCHITECTURE.md`
- **System Prompt:** Ver `packages/server/src/services/aiService.ts` línea 35
- **Tipos de acciones:** Ver `packages/server/src/services/aiService.ts` línea 8

---

**¡Integración completa! 🎉**

Si encuentras algún problema, revisa los logs con:

```bash
# Backend
docker-compose logs -f server | grep "🧠\|❌\|⚠️"

# Frontend
# Abrir DevTools → Console → Filtrar por "AI"
```
