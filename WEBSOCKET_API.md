# 🌐 WebSocket API - Socket.IO

## 🎯 Descripción

El servidor implementa WebSocket usando Socket.IO para colaboración en tiempo real en diagramas.

**URL de conexión:** `http://localhost:3001`

---

## 📡 Eventos del Cliente → Servidor

### 1. `join-diagram`

Unirse a un diagrama y crear/abrir una sesión.

**Payload:**

```javascript
{
  userId: string,
  diagramId: string
}
```

**Ejemplo:**

```javascript
socket.emit("join-diagram", {
  userId: "user_test",
  diagramId: "diag_1",
});
```

**Efectos:**

- Crea un registro en la tabla `Session`
- Une al socket a la room del diagrama
- Emite `presence-update` a todos los usuarios del diagrama

---

### 2. `ping-diagram`

Actualizar el timestamp de actividad de la sesión.

**Payload:**

```javascript
{
  userId: string,
  diagramId: string
}
```

**Ejemplo:**

```javascript
socket.emit("ping-diagram", {
  userId: "user_test",
  diagramId: "diag_1",
});
```

**Efectos:**

- Actualiza `lastPing` en la tabla `Session`
- Permite que el usuario siga apareciendo como "activo"

**Nota:** Los clientes deberían enviar este evento cada 30-45 segundos.

---

### 3. `leave-diagram`

Salir de un diagrama y cerrar la sesión.

**Payload:**

```javascript
{
  userId: string,
  diagramId: string
}
```

**Ejemplo:**

```javascript
socket.emit("leave-diagram", {
  userId: "user_test",
  diagramId: "diag_1",
});
```

**Efectos:**

- Actualiza `endedAt` en la tabla `Session`
- Emite `presence-update` a los usuarios restantes
- Remueve al socket de la room del diagrama

---

### 4. `lock-acquire`

Adquirir un lock sobre un recurso (nodo, edge, etc).

**Payload:**

```javascript
{
  userId: string,
  diagramId: string,
  resourceId: string  // Formato: "node:NombreNodo" o "edge:NodoA-NodoB"
}
```

**Ejemplo:**

```javascript
socket.emit("lock-acquire", {
  userId: "user_test",
  diagramId: "diag_1",
  resourceId: "node:Producto",
});
```

**Efectos:**

- Crea/actualiza un registro en la tabla `Lock` con TTL de 30 segundos
- Emite `lock-update` a todos los usuarios del diagrama

**Comportamiento:**

- Si el lock ya existe, se sobrescribe con el nuevo usuario
- El lock expira automáticamente después de 30 segundos

---

### 5. `lock-release`

Liberar un lock manualmente.

**Payload:**

```javascript
{
  lockId: string,
  diagramId: string
}
```

**Ejemplo:**

```javascript
socket.emit("lock-release", {
  lockId: "clh123456789",
  diagramId: "diag_1",
});
```

**Efectos:**

- Elimina el registro de la tabla `Lock`
- Emite `lock-removed` a todos los usuarios del diagrama

---

### 6. `diagram-change`

Notificar un cambio en el diagrama (agregar/editar/eliminar nodo/edge).

**Payload:**

```javascript
{
  userId: string,
  diagramId: string,
  action: string,      // "ADD_NODE", "UPDATE_NODE", "DELETE_NODE", etc.
  payload: object      // Datos específicos del cambio
}
```

**Ejemplo:**

```javascript
socket.emit("diagram-change", {
  userId: "user_test",
  diagramId: "diag_1",
  action: "ADD_NODE",
  payload: {
    name: "Producto",
    type: "entity",
    x: 100,
    y: 200,
  },
});
```

**Efectos:**

- Crea un registro en la tabla `DiagramChange` (auditoría)
- Emite `diagram-update` a todos los usuarios del diagrama (incluyendo el emisor)

---

## 📨 Eventos del Servidor → Cliente

### 1. `presence-update`

Notifica cambios en los usuarios activos del diagrama.

**Payload:**

```javascript
{
  diagramId: string,
  users: Array<{
    id: string,
    userId: string,
    diagramId: string,
    startedAt: Date,
    endedAt: Date | null,
    lastPing: Date,
    user: {
      id: string,
      email: string,
      name: string,
      createdAt: Date
    }
  }>
}
```

**Cuándo se emite:**

- Cuando un usuario ejecuta `join-diagram`
- Cuando un usuario ejecuta `leave-diagram`

**Ejemplo:**

```javascript
socket.on("presence-update", (data) => {
  console.log(`Usuarios activos: ${data.users.length}`);
  data.users.forEach((u) => {
    console.log(`- ${u.user.name}`);
  });
});
```

---

### 2. `lock-update`

Notifica que un lock ha sido adquirido o actualizado.

**Payload:**

```javascript
{
  id: string,
  diagramId: string,
  resourceId: string,
  userId: string,
  acquiredAt: Date,
  expiresAt: Date
}
```

**Cuándo se emite:**

- Cuando un usuario ejecuta `lock-acquire`

**Ejemplo:**

```javascript
socket.on("lock-update", (lock) => {
  console.log(`${lock.userId} bloqueó ${lock.resourceId}`);
  // Deshabilitar edición del recurso si no soy el dueño del lock
  if (lock.userId !== currentUserId) {
    disableResourceEditing(lock.resourceId);
  }
});
```

---

### 3. `lock-removed`

Notifica que un lock ha sido liberado.

**Payload:**

```javascript
{
  lockId: string;
}
```

**Cuándo se emite:**

- Cuando un usuario ejecuta `lock-release`

**Ejemplo:**

```javascript
socket.on("lock-removed", (data) => {
  console.log(`Lock ${data.lockId} liberado`);
  // Rehabilitar edición del recurso
  enableResourceEditing(data.lockId);
});
```

---

### 4. `diagram-update`

Notifica un cambio en el diagrama.

**Payload:**

```javascript
{
  id: string,
  diagramId: string,
  userId: string,
  action: string,
  payload: object,
  createdAt: Date
}
```

**Cuándo se emite:**

- Cuando un usuario ejecuta `diagram-change`

**Ejemplo:**

```javascript
socket.on("diagram-update", (change) => {
  console.log(`${change.userId} ejecutó ${change.action}`);

  switch (change.action) {
    case "ADD_NODE":
      addNodeToCanvas(change.payload);
      break;
    case "UPDATE_NODE":
      updateNodeInCanvas(change.payload);
      break;
    case "DELETE_NODE":
      removeNodeFromCanvas(change.payload);
      break;
  }
});
```

---

## 🔄 Flujo de Colaboración Típico

### Usuario se une a un diagrama:

```javascript
// 1. Conectar
const socket = io("http://localhost:3001");

socket.on("connect", () => {
  // 2. Unirse al diagrama
  socket.emit("join-diagram", {
    userId: currentUser.id,
    diagramId: currentDiagram.id,
  });

  // 3. Configurar ping automático cada 30 segundos
  setInterval(() => {
    socket.emit("ping-diagram", {
      userId: currentUser.id,
      diagramId: currentDiagram.id,
    });
  }, 30000);
});

// 4. Escuchar presencia
socket.on("presence-update", (data) => {
  updateUserList(data.users);
});

// 5. Escuchar cambios
socket.on("diagram-update", (change) => {
  applyChangeToCanvas(change);
});

// 6. Escuchar locks
socket.on("lock-update", (lock) => {
  if (lock.userId !== currentUser.id) {
    lockResource(lock.resourceId);
  }
});
```

### Usuario edita un nodo:

```javascript
// 1. Adquirir lock
socket.emit("lock-acquire", {
  userId: currentUser.id,
  diagramId: currentDiagram.id,
  resourceId: `node:${nodeId}`,
});

// 2. Hacer cambio local
updateNodeLocally(nodeId, newData);

// 3. Notificar cambio
socket.emit("diagram-change", {
  userId: currentUser.id,
  diagramId: currentDiagram.id,
  action: "UPDATE_NODE",
  payload: { nodeId, ...newData },
});

// 4. Liberar lock después de 5 segundos de inactividad
setTimeout(() => {
  socket.emit("lock-release", {
    lockId: lockId,
    diagramId: currentDiagram.id,
  });
}, 5000);
```

### Usuario sale del diagrama:

```javascript
// Antes de cerrar/cambiar de página
socket.emit("leave-diagram", {
  userId: currentUser.id,
  diagramId: currentDiagram.id,
});

socket.disconnect();
```

---

## 🎯 Acciones de Diagrama Soportadas

| Acción           | Descripción                            |
| ---------------- | -------------------------------------- |
| `ADD_NODE`       | Agregar un nuevo nodo                  |
| `UPDATE_NODE`    | Actualizar propiedades de un nodo      |
| `DELETE_NODE`    | Eliminar un nodo                       |
| `MOVE_NODE`      | Mover un nodo (cambiar posición)       |
| `RESIZE_NODE`    | Redimensionar un nodo                  |
| `ADD_EDGE`       | Agregar una relación/conexión          |
| `UPDATE_EDGE`    | Actualizar propiedades de una relación |
| `DELETE_EDGE`    | Eliminar una relación                  |
| `ADD_COMMENT`    | Agregar un comentario                  |
| `UPDATE_COMMENT` | Actualizar un comentario               |
| `DELETE_COMMENT` | Eliminar un comentario                 |

---

## ⚡ Optimizaciones Recomendadas

### 1. Throttling de eventos

Para eventos frecuentes (como `MOVE_NODE`), usa throttling:

```javascript
let moveTimeout;
function handleNodeMove(nodeId, x, y) {
  clearTimeout(moveTimeout);
  moveTimeout = setTimeout(() => {
    socket.emit("diagram-change", {
      action: "MOVE_NODE",
      payload: { nodeId, x, y },
    });
  }, 100); // Esperar 100ms antes de enviar
}
```

### 2. Batching de cambios

Agrupar múltiples cambios pequeños:

```javascript
let changeQueue = [];
let batchTimeout;

function queueChange(action, payload) {
  changeQueue.push({ action, payload });

  clearTimeout(batchTimeout);
  batchTimeout = setTimeout(() => {
    socket.emit("diagram-change", {
      action: "BATCH_UPDATE",
      payload: changeQueue,
    });
    changeQueue = [];
  }, 200);
}
```

### 3. Reconexión automática

Socket.IO maneja reconexiones automáticamente, pero deberías re-unirte al diagrama:

```javascript
socket.on("reconnect", () => {
  socket.emit("join-diagram", {
    userId: currentUser.id,
    diagramId: currentDiagram.id,
  });
});
```

---

## 🛡️ Seguridad

### Recomendaciones futuras:

1. **Autenticación:** Agregar JWT tokens en el handshake

```javascript
const socket = io("http://localhost:3001", {
  auth: { token: jwtToken },
});
```

2. **Validación de permisos:** Verificar que el usuario tenga permisos en el diagrama
3. **Rate limiting:** Limitar eventos por usuario/segundo
4. **Sanitización:** Validar payloads antes de guardar en DB

---

## 📊 Monitoreo

Ver conexiones activas en tiempo real:

```bash
# Logs del servidor
docker compose logs app -f

# Buscar conexiones WebSocket
docker compose logs app | grep "\[ws\]"
```

Ver datos en base de datos:

```bash
# Sesiones activas
docker compose exec db psql -U postgres -d diagram_editor \
  -c "SELECT * FROM \"Session\" WHERE \"endedAt\" IS NULL;"

# Locks activos
docker compose exec db psql -U postgres -d diagram_editor \
  -c "SELECT * FROM \"Lock\" WHERE \"expiresAt\" > NOW();"
```
