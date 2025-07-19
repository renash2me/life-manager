const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend React
app.use(express.static(path.join(__dirname, '../client/build')));

// Rota catch-all para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const actionsPath = path.join(__dirname, 'actions.json');
const eventsPath = path.join(__dirname, 'events.json');
const trophiesPath = path.join(__dirname, 'trophies.json');

// Utilitários para ler/gravar JSON
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return [];
  }
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Listar ações disponíveis
app.get('/api/actions', (req, res) => {
  const actions = readJson(actionsPath);
  res.json(actions);
});

// Listar eventos (pode filtrar por data futuramente)
app.get('/api/events', (req, res) => {
  const events = readJson(eventsPath);
  res.json(events);
});

// Registrar novo evento
app.post('/api/events', (req, res) => {
  const events = readJson(eventsPath);
  const event = req.body;
  event.id = Date.now();
  events.push(event);
  writeJson(eventsPath, events);
  res.status(201).json(event);
});

// Editar evento
app.put('/api/events/:id', (req, res) => {
  const events = readJson(eventsPath);
  const id = req.params.id;
  const idx = events.findIndex(e => String(e.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: 'Evento não encontrado' });
  events[idx] = { ...events[idx], ...req.body, id: events[idx].id };
  writeJson(eventsPath, events);
  res.json(events[idx]);
});

// Excluir evento
app.delete('/api/events/:id', (req, res) => {
  let events = readJson(eventsPath);
  const id = req.params.id;
  const before = events.length;
  events = events.filter(e => String(e.id) !== String(id));
  if (events.length === before) return res.status(404).json({ error: 'Evento não encontrado' });
  writeJson(eventsPath, events);
  res.status(204).end();
});

// CRUD de ações (Admin)
app.get('/api/admin/actions', (req, res) => {
  const actions = readJson(actionsPath);
  res.json(actions);
});

app.post('/api/admin/actions', (req, res) => {
  const actions = readJson(actionsPath);
  const action = req.body;
  action.id = Date.now();
  actions.push(action);
  writeJson(actionsPath, actions);
  res.status(201).json(action);
});

app.put('/api/admin/actions/:id', (req, res) => {
  const actions = readJson(actionsPath);
  const id = parseInt(req.params.id);
  const idx = actions.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Ação não encontrada' });
  actions[idx] = { ...actions[idx], ...req.body, id };
  writeJson(actionsPath, actions);
  res.json(actions[idx]);
});

app.delete('/api/admin/actions/:id', (req, res) => {
  let actions = readJson(actionsPath);
  const id = parseInt(req.params.id);
  const before = actions.length;
  actions = actions.filter(a => a.id !== id);
  if (actions.length === before) return res.status(404).json({ error: 'Ação não encontrada' });
  writeJson(actionsPath, actions);
  res.status(204).end();
});

// CRUD de metas/troféus (Admin)
app.get('/api/admin/trophies', (req, res) => {
  const trophies = readJson(trophiesPath);
  res.json(trophies);
});

app.post('/api/admin/trophies', (req, res) => {
  const trophies = readJson(trophiesPath);
  const trophy = req.body;
  trophy.id = Date.now();
  trophies.push(trophy);
  writeJson(trophiesPath, trophies);
  res.status(201).json(trophy);
});

app.put('/api/admin/trophies/:id', (req, res) => {
  const trophies = readJson(trophiesPath);
  const id = req.params.id;
  const idx = trophies.findIndex(t => String(t.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: 'Troféu/meta não encontrado' });
  trophies[idx] = { ...trophies[idx], ...req.body, id: trophies[idx].id };
  writeJson(trophiesPath, trophies);
  res.json(trophies[idx]);
});

app.delete('/api/admin/trophies/:id', (req, res) => {
  let trophies = readJson(trophiesPath);
  const id = req.params.id;
  const before = trophies.length;
  trophies = trophies.filter(t => String(t.id) !== String(id));
  if (trophies.length === before) return res.status(404).json({ error: 'Troféu/meta não encontrado' });
  writeJson(trophiesPath, trophies);
  res.status(204).end();
});

// Cálculo de pontuação total e por área, com multiplicadores e decadência
app.get('/api/score', (req, res) => {
  const events = readJson(eventsPath);
  const actions = readJson(actionsPath);
  const data = req.query.date || new Date().toISOString().slice(0, 10);
  const eventosDia = events.filter(ev => ev.data === data);

  // Áreas possíveis
  const areas = ["Saúde", "Relacionamentos", "Vida Profissional", "Hobbies e Lazer", "Espírito", "Mente", "Finanças"];
  let score = Object.fromEntries(areas.map(a => [a, 0]));
  let multiplicadores = Object.fromEntries(areas.map(a => [a, 1.0]));

  // Decadência por tempo sem pontuação
  const diasDecadencia = 7;
  const multiplicadorDecadencia = 0.8;
  areas.forEach(area => {
    // Último dia com pontos na área
    const eventosArea = events.filter(ev => {
      const action = actions.find(a => a.id === ev.actionId || a.id === Number(ev.actionId));
      return action && action.areas && action.areas[area] && action.areas[area] > 0;
    });
    const ultData = eventosArea.length > 0 ? eventosArea.map(ev => ev.data).sort().reverse()[0] : null;
    if (ultData) {
      const diff = Math.floor((new Date(data) - new Date(ultData)) / (1000 * 60 * 60 * 24));
      if (diff >= diasDecadencia) multiplicadores[area] = multiplicadorDecadencia;
    } else {
      multiplicadores[area] = multiplicadorDecadencia;
    }
  });

  // Decadência por ausência de evento específico (exemplo para Espírito)
  // Se não houver "Frequentar um Culto/Missa" nos últimos 30 dias, multiplicador 0.7
  const eventosUltimos30 = events.filter(ev => {
    const diff = Math.floor((new Date(data) - new Date(ev.data)) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff < 30;
  });
  const temCulto = eventosUltimos30.some(ev => {
    const action = actions.find(a => a.id === ev.actionId || a.id === Number(ev.actionId));
    return action && action.nome && ["Culto", "Missa", "Frequentar um Culto/Missa"].some(nome => action.nome.includes(nome));
  });
  const oracoesSemana = events.filter(ev => {
    const diff = Math.floor((new Date(data) - new Date(ev.data)) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff < 7;
  }).filter(ev => {
    const action = actions.find(a => a.id === ev.actionId || a.id === Number(ev.actionId));
    return action && action.nome && action.nome.toLowerCase().includes("oração");
  }).length;
  if (!temCulto) {
    if (oracoesSemana >= 3) multiplicadores["Espírito"] = Math.min(multiplicadores["Espírito"], 0.7);
    else multiplicadores["Espírito"] = Math.min(multiplicadores["Espírito"], 0.5);
  }

  // Soma pontos das áreas do dia, aplicando multiplicador
  eventosDia.forEach(ev => {
    const action = actions.find(a => a.id === ev.actionId || a.id === Number(ev.actionId));
    if (!action) return;
    for (const [area, val] of Object.entries(action.areas || {})) {
      score[area] = (score[area] || 0) + (val || 0) * (multiplicadores[area] || 1);
    }
    // Bônus de sinergia
    if (action.sinergia && Object.keys(action.areas || {}).length >= 2) {
      for (const area of Object.keys(action.areas || {})) {
        score[area] = (score[area] || 0) + 1 * (multiplicadores[area] || 1);
      }
    }
    // Penalidade financeira
    if ("Finanças" in score) {
      if (ev.gastoPlanejado) {
        score["Finanças"] += (action.penalidadeFinanceiraPlanejado || 0) * (multiplicadores["Finanças"] || 1);
      } else {
        score["Finanças"] += (action.penalidadeFinanceiraNaoPlanejado || 0) * (multiplicadores["Finanças"] || 1);
      }
    }
  });

  // Soma total
  const total = Object.values(score).reduce((a, b) => a + b, 0);
  res.json({ total, porArea: score, multiplicadores });
});

// Placeholders para os outros endpoints
app.get('/api/trophies', (req, res) => res.json([]));
app.post('/api/admin/trophies', (req, res) => res.status(201).json({}));

// Endpoint para verificar versão e atualizações
app.get('/api/version', (req, res) => {
  const currentVersion = "1.0.0";
  const latestVersion = "1.0.0"; // Em produção, isso viria de uma API externa
  
  res.json({
    current: currentVersion,
    latest: latestVersion,
    hasUpdate: currentVersion !== latestVersion,
    releaseNotes: "https://github.com/your-username/better-life-game/releases",
    lastChecked: new Date().toISOString()
  });
});

// Endpoint para informações do sistema
app.get('/api/system', (req, res) => {
  res.json({
    name: "Life Manager Game",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Life Manager Game v1.0.0`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
}); 