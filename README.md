<<<<<<< HEAD
# Life Manager Game 🎮

Um jogo de gerenciamento de vida que ajuda você a equilibrar diferentes áreas da vida através de pontuação e metas.

## 🚀 Versão Atual: 1.0.0

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)

## 📋 Pré-requisitos

- **Docker** (recomendado) ou **Node.js 18+**
- **npm** ou **yarn**
- **Git**

## 🐳 Deploy com Docker (Recomendado)

### Opção 1: Docker Compose (Mais Fácil)

```bash
# Clone o repositório
git clone https://github.com/your-username/better-life-game.git
cd better-life-game

# Iniciar com Docker Compose
docker-compose up -d

# Acessar a aplicação
open http://localhost:5000
```

### Opção 2: Docker Manual

```bash
# Build da imagem
docker build -t life-manager-game .

# Executar container
docker run -d \
  --name life-manager-game \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  life-manager-game

# Acessar a aplicação
open http://localhost:5000
```

### Comandos Docker Úteis

```bash
# Ver logs
docker-compose logs -f

# Parar aplicação
docker-compose down

# Rebuild e reiniciar
docker-compose down
docker-compose up -d --build

# Backup dos dados
cp -r data/ backup-$(date +%Y%m%d)/
```

## 💻 Desenvolvimento Local

### Instalar Dependências

```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install

# Voltar para raiz
cd ..
```

### Executar em Desenvolvimento

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

### Scripts Disponíveis

```bash
# Desenvolvimento completo
npm run dev

# Build de produção
npm run build

# Comandos Docker
npm run docker:build
npm run docker:run
npm run docker:compose
```

## 🎮 Funcionalidades

### ✨ Sistema de Pontuação
- **7 Áreas da Vida**: Saúde, Relacionamentos, Vida Profissional, Hobbies e Lazer, Espírito, Mente, Finanças
- **Registro de Eventos**: Adicione eventos diários que afetam diferentes áreas
- **Cálculo Automático**: Pontuação calculada automaticamente com bônus de sinergia
- **Sistema de Decadência**: Penalidades por inatividade em áreas específicas

### 🏆 Troféus e Metas
- **Objetivos Personalizáveis**: Crie metas com múltiplos critérios
- **Progresso Visual**: Acompanhe seu progresso com indicadores visuais
- **Recompensas**: Sistema de recompensas e multiplicadores
- **Prazos Opcionais**: Defina prazos para suas metas

### 👤 Perfil do Jogador
- **Personalização**: Altere seu nome e foto de perfil
- **Dados Persistentes**: Informações salvas localmente
- **Interface Intuitiva**: Design responsivo e moderno

### 🔧 Área de Administração
- **Gerenciamento de Ações**: Crie e edite ações disponíveis
- **Sistema de Categorias**: Organize ações por categorias
- **Configuração de Metas**: Defina objetivos e recompensas
- **Interface de Cards**: Edição intuitiva com cards clicáveis

## 🎨 Interface

- **Design VSCode**: Tema escuro inspirado no Visual Studio Code
- **Responsivo**: Funciona perfeitamente em desktop e mobile
- **Sidebar Colapsível**: Navegação intuitiva
- **Botão Flutuante**: Adição rápida de eventos
- **Gráficos Interativos**: Visualização de progresso ao longo do tempo

## 📊 Estrutura do Projeto

```
better-life-game/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   └── ...
│   └── package.json
├── server/                # Backend Node.js/Express
│   ├── index.js          # Servidor principal
│   ├── actions.json      # Dados das ações
│   ├── events.json       # Dados dos eventos
│   ├── trophies.json     # Dados dos troféus
│   └── package.json
├── data/                  # Dados persistentes (Docker)
├── Dockerfile            # Configuração Docker
├── docker-compose.yml    # Orquestração Docker
└── README.md
```

## 🔄 Sistema de Versionamento

O jogo inclui um sistema de versionamento integrado:

- **Indicador de Versão**: Mostra a versão atual na sidebar
- **Verificação de Atualizações**: Alerta quando há novas versões disponíveis
- **Release Notes**: Histórico completo de mudanças
- **Atualização Automática**: Processo simplificado via Docker

### Verificar Atualizações

```bash
# Via API
curl http://localhost:5000/api/version

# Via interface
# O indicador na sidebar mostra automaticamente se há atualizações
```

## 🔒 Segurança

- **Usuário Não-Root**: Container Docker executando com usuário não privilegiado
- **Health Checks**: Monitoramento automático da aplicação
- **Volumes Seguros**: Dados persistentes em volumes isolados
- **CORS Configurado**: Configuração adequada para requisições

## 📈 Performance

- **Multi-stage Build**: Imagens Docker otimizadas
- **Lazy Loading**: Carregamento sob demanda de componentes
- **Caching**: Dados em cache para melhor performance
- **Compressão**: Assets otimizados para produção

## 🐛 Troubleshooting

### Problemas Comuns

**Container não inicia:**
```bash
# Verificar logs
docker-compose logs

# Verificar se a porta 5000 está livre
lsof -i :5000
```

**Dados não persistem:**
```bash
# Verificar volume
docker volume ls

# Backup manual
docker cp life-manager-game:/app/data ./backup
```

**Erro de permissão:**
```bash
# Corrigir permissões do diretório data
chmod 755 data/
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/your-username/better-life-game/issues)
- **Documentação**: [Wiki](https://github.com/your-username/better-life-game/wiki)
- **Release Notes**: [RELEASE_NOTES.md](./RELEASE_NOTES.md)

---

**Desenvolvido com ❤️ pela Life Manager Team**

*Versão 1.0.0 - Janeiro 2024* 
=======
# life-manager
Projeto de gamificaao da vida. Em busca da minha melhor versão
>>>>>>> a3008bf205f5e25ad29b54412c9b97603f98f106
