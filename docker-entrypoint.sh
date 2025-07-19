#!/bin/sh

# Script de inicialização do Docker
set -e

echo "🚀 Iniciando Life Manager Game..."

# Verificar se os arquivos JSON existem, se não, criar com dados padrão
if [ ! -f "/app/data/actions.json" ]; then
    echo "📝 Criando arquivo actions.json padrão..."
    echo '[]' > /app/data/actions.json
fi

if [ ! -f "/app/data/events.json" ]; then
    echo "📝 Criando arquivo events.json padrão..."
    echo '[]' > /app/data/events.json
fi

if [ ! -f "/app/data/trophies.json" ]; then
    echo "📝 Criando arquivo trophies.json padrão..."
    echo '[]' > /app/data/trophies.json
fi

# Copiar arquivos JSON para o diretório do servidor se não existirem
cp -n /app/data/actions.json /app/server/actions.json 2>/dev/null || true
cp -n /app/data/events.json /app/server/events.json 2>/dev/null || true
cp -n /app/data/trophies.json /app/server/trophies.json 2>/dev/null || true

# Função para sincronizar dados
sync_data() {
    echo "💾 Sincronizando dados..."
    cp /app/server/actions.json /app/data/actions.json
    cp /app/server/events.json /app/data/events.json
    cp /app/server/trophies.json /app/data/trophies.json
}

# Configurar trap para sincronizar dados ao sair
trap sync_data EXIT

# Iniciar o servidor
echo "🌐 Iniciando servidor na porta 5000..."
cd /app/server
node index.js &

# Aguardar o servidor iniciar
sleep 3

# Verificar se o servidor está rodando
if curl -f http://localhost:5000/api/actions > /dev/null 2>&1; then
    echo "✅ Servidor iniciado com sucesso!"
else
    echo "❌ Erro ao iniciar o servidor"
    exit 1
fi

# Manter o container rodando
echo "🎮 Life Manager Game está rodando!"
echo "📱 Acesse: http://localhost:5000"
echo "🔧 API disponível em: http://localhost:5000/api"

# Aguardar indefinidamente
wait 