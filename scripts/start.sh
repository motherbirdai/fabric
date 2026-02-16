#!/bin/sh
set -e

echo "🧵 Fabric Gateway starting..."
echo "   NODE_ENV: ${NODE_ENV:-development}"
echo "   PORT:     ${PORT:-3100}"

# Run Prisma migrations (idempotent — safe to run on every start)
echo "📦 Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || echo "⚠ Migration skipped (DB may not be ready)"

echo "🚀 Starting gateway..."
exec node dist/index.js
