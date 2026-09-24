#!/bin/bash
set -e

echo "=========================================="
echo "🚀 INICIANDO ATUALIZAÇÃO - OWNER HEALTH"
echo "=========================================="

cd /home/opc/owner_health

# 1. Atualizar o código do GitHub
echo "📥 1/3 - Baixando atualizações do GitHub..."
GIT_SSH_COMMAND='ssh -i ~/.ssh/owner_health_github' git fetch origin main
git reset --hard origin/main

# 2. Reconstruir e reiniciar o Backend
echo "⚙️ 2/3 - Reconstruindo e reiniciando o Backend..."
sudo podman stop owner-backend || true
sudo podman rm owner-backend || true
sudo podman build -t owner-backend:latest /home/opc/owner_health/backend
sudo podman run -d --name owner-backend --network host \
  --env-file /home/opc/owner-health-vm/backend.env \
  --restart=always owner-backend:latest

# 3. Reconstruir e reiniciar o Frontend (com SSL)
echo "🎨 3/3 - Reconstruindo e reiniciando o Frontend..."
sudo podman stop owner-frontend || true
sudo podman rm owner-frontend || true
sudo podman build --no-cache -t owner-frontend:latest /home/opc/owner_health/frontend
sudo podman run -d --name owner-frontend --network host \
  -v /etc/letsencrypt:/etc/letsencrypt:ro,Z \
  --restart=always owner-frontend:latest

echo "=========================================="
echo "✅ ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=========================================="
sudo podman ps
