#!/bin/sh
set -e

echo "🔄 Initializing database..."
cd /app/packages/server

# Usar db push para sincronizar el schema con la BD
npx prisma db push --skip-generate

echo "✅ Database ready"
echo "🚀 Starting server..."
exec node dist/index.js
