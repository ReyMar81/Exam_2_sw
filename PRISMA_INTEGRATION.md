# 🎯 Prisma ORM - Configuración Completada

## ✅ Estado Actual

Prisma ORM ha sido integrado exitosamente en el backend del proyecto **Exam_2_sw**.

### Modelos creados en PostgreSQL:

- ✅ **User** - Usuarios del sistema
- ✅ **Project** - Proyectos de diagramas
- ✅ **ProjectUser** - Relación usuarios-proyectos con roles (OWNER, EDITOR, VIEWER)
- ✅ **Diagram** - Diagramas individuales con versionamiento

## 🚀 Endpoints Disponibles

### Health Checks

```bash
# Health básico
curl http://localhost:3001/health
# Respuesta: {"status":"ok"}

# Verificación de base de datos
curl http://localhost:3001/dbcheck
# Respuesta: {"ok":true,"users":[]}
```

## 🛠️ Comandos Útiles

### Trabajar con Prisma en Docker

```bash
# Ejecutar migraciones
docker compose exec app sh -c "cd packages/server && npx prisma migrate dev --name nombre_migracion"

# Generar cliente de Prisma
docker compose exec app sh -c "cd packages/server && npx prisma generate"

# Abrir Prisma Studio (UI visual para la DB)
docker compose exec app sh -c "cd packages/server && npx prisma studio"

# Ver estado de migraciones
docker compose exec app sh -c "cd packages/server && npx prisma migrate status"

# Resetear base de datos (¡CUIDADO!)
docker compose exec app sh -c "cd packages/server && npx prisma migrate reset"
```

### Comandos de Docker Compose

```bash
# Ver logs del servidor
docker compose logs app -f

# Reiniciar servicios
docker compose restart

# Detener servicios
docker compose down

# Reconstruir y levantar
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 📊 Estructura de Base de Datos

### User

```prisma
id        String   @id @default(cuid())
email     String   @unique
name      String
createdAt DateTime @default(now())
```

### Project

```prisma
id          String   @id @default(cuid())
name        String
description String?
isPublic    Boolean  @default(false)
ownerId     String
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```

### ProjectUser (Relación muchos a muchos)

```prisma
id        String  @id @default(cuid())
role      Role    @default(VIEWER)  // OWNER, EDITOR, VIEWER
userId    String
projectId String
```

### Diagram

```prisma
id        String   @id @default(cuid())
projectId String
authorId  String
name      String
data      Json     # Datos del diagrama (nodos, edges, etc.)
version   Int      @default(1)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

## 🔐 Variables de Entorno

El archivo `.env` en `packages/server/`:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@db:5432/diagram_editor?schema=public"
```

## 📝 Próximos Pasos

1. ✅ Prisma ORM integrado
2. ✅ Modelos base creados
3. ✅ Migraciones ejecutadas
4. 🔲 Crear endpoints CRUD para Users
5. 🔲 Crear endpoints CRUD para Projects
6. 🔲 Crear endpoints CRUD para Diagrams
7. 🔲 Implementar autenticación (JWT)
8. 🔲 Implementar WebSockets para colaboración en tiempo real

## 🐛 Troubleshooting

### Si el contenedor no inicia:

```bash
docker compose logs app
```

### Si hay problemas con Prisma:

```bash
# Regenerar cliente
docker compose exec app sh -c "cd packages/server && npx prisma generate"

# Ver estado de la base de datos
docker compose exec app sh -c "cd packages/server && npx prisma db pull"
```

### Si necesitas resetear todo:

```bash
docker compose down -v  # -v elimina los volúmenes
docker compose up -d
docker compose exec app sh -c "cd packages/server && npx prisma migrate dev --name init"
```

## 📦 Archivos Modificados

- `packages/server/package.json` - Añadidas dependencias de Prisma
- `packages/server/prisma/schema.prisma` - Schema con los modelos
- `packages/server/src/index.ts` - Integración de PrismaClient y endpoint `/dbcheck`
- `packages/server/.env` - Variables de entorno
- `Dockerfile` - Instalación de OpenSSL y generación de Prisma
- `docker-compose.yml` - Variable DATABASE_URL añadida

## ✨ Verificación Final

```bash
# 1. Verificar que los contenedores están corriendo
docker compose ps

# 2. Probar health check
curl http://localhost:3001/health

# 3. Probar conexión a base de datos
curl http://localhost:3001/dbcheck

# 4. Ver las tablas creadas
docker compose exec db psql -U postgres -d diagram_editor -c "\dt"
```

---

**¡Prisma ORM está listo para usar! 🎉**
