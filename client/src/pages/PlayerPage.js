import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { PlusCircleIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';

function formatDate(dateStr) {
  // Converte YYYY-MM-DD para DD-MM-YYYY
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}

const PERIODS = [
  { label: "Dia", value: "1" },
  { label: "5 dias", value: "5" },
  { label: "7 dias", value: "7" },
  { label: "Mês", value: "30" },
  { label: "3 meses", value: "90" },
  { label: "6 meses", value: "180" },
  { label: "Ano", value: "365" },
];

function PlayerPage() {
  const [actions, setActions] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ actionId: "", descricao: "", gastoPlanejado: false });
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState({ total: 0, porArea: {} });
  const [editEventId, setEditEventId] = useState(null);
  const [editForm, setEditForm] = useState({ actionId: '', descricao: '', gastoPlanejado: false });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState("1");
  const [chartData, setChartData] = useState([]);
  const [multiplicadores, setMultiplicadores] = useState({});

  // Buscar ações disponíveis
  useEffect(() => {
    fetch("http://localhost:5000/api/actions")
      .then(res => res.json())
      .then(setActions);
  }, []);

  // Buscar eventos (todos para análise de períodos)
  useEffect(() => {
    fetch("http://localhost:5000/api/events")
      .then(res => res.json())
      .then(setEvents);
  }, []);

  // Buscar score do dia selecionado
  useEffect(() => {
    fetch(`http://localhost:5000/api/score?date=${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        setScore(data);
        setMultiplicadores(data.multiplicadores || {});
      });
  }, [selectedDate]);

  // Geração dos dados do gráfico conforme período
  useEffect(() => {
    if (events.length === 0) return;
    // Gera lista de datas do período
    const end = new Date(selectedDate);
    const days = parseInt(period, 10);
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    // Para cada data, calcula score
    const areas = ["Saúde", "Relacionamentos", "Vida Profissional", "Hobbies e Lazer", "Espírito", "Mente", "Finanças"];
    const data = dates.map(date => {
      const eventosDia = events.filter(ev => ev.data === date);
      const scorePorArea = Object.fromEntries(areas.map(a => [a, 0]));
      eventosDia.forEach(ev => {
        const action = actions.find(a => a.id === ev.actionId || a.id === Number(ev.actionId));
        if (!action) return;
        for (const [area, val] of Object.entries(action.areas || {})) {
          scorePorArea[area] = (scorePorArea[area] || 0) + (val || 0);
        }
        if (action.sinergia && Object.keys(action.areas || {}).length >= 2) {
          for (const area of Object.keys(action.areas || {})) {
            scorePorArea[area] = (scorePorArea[area] || 0) + 1;
          }
        }
        if ("Finanças" in scorePorArea) {
          if (ev.gastoPlanejado) {
            scorePorArea["Finanças"] += action.penalidadeFinanceiraPlanejado || 0;
          } else {
            scorePorArea["Finanças"] += action.penalidadeFinanceiraNaoPlanejado || 0;
          }
        }
      });
      return {
        date,
        label: formatDate(date),
        total: Object.values(scorePorArea).reduce((a, b) => a + b, 0),
        ...scorePorArea
      };
    });
    setChartData(data);
  }, [events, actions, selectedDate, period]);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    fetch("http://localhost:5000/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionId: form.actionId,
        descricao: form.descricao,
        gastoPlanejado: form.gastoPlanejado,
        data: new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      })
    })
      .then(res => res.json())
      .then(() => {
        setForm({ actionId: "", descricao: "", gastoPlanejado: false });
        // Atualiza eventos e score
        fetch("http://localhost:5000/api/events").then(res => res.json()).then(setEvents);
        fetch("http://localhost:5000/api/score").then(res => res.json()).then(setScore);
      })
      .finally(() => setLoading(false));
  }

  function handleEditEvent(ev) {
    setEditEventId(ev.id);
    setEditForm({ actionId: ev.actionId, descricao: ev.descricao || '', gastoPlanejado: !!ev.gastoPlanejado });
  }
  function handleEditSubmit(e, id) {
    e.preventDefault();
    fetch(`http://localhost:5000/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionId: editForm.actionId,
        descricao: editForm.descricao,
        gastoPlanejado: editForm.gastoPlanejado,
        data: selectedDate
      })
    })
      .then(res => res.json())
      .then(() => {
        setEditEventId(null);
        fetch("http://localhost:5000/api/events").then(res => res.json()).then(setEvents);
        fetch("http://localhost:5000/api/score").then(res => res.json()).then(setScore);
      });
  }
  function handleDeleteEvent(id) {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      fetch(`http://localhost:5000/api/events/${id}`, { method: 'DELETE' })
        .then(() => {
          fetch("http://localhost:5000/api/events").then(res => res.json()).then(setEvents);
          fetch("http://localhost:5000/api/score").then(res => res.json()).then(setScore);
        });
    }
  }

  // Filtrar eventos da data selecionada
  const eventosDia = events.filter(ev => ev.data === selectedDate);

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Painel do Jogador</h1>
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2 text-white">Pontuação do Dia</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
          <label className="font-medium">Data:
            <input
              type="date"
              className="ml-2 border rounded p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="font-medium">Período:
            <select
              className="ml-2 border rounded p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              value={period}
              onChange={e => setPeriod(e.target.value)}
            >
              {PERIODS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex flex-wrap gap-4 items-center mb-4">
          <span className="font-bold text-lg text-blue-800 dark:text-blue-200">Total: {score.total}</span>
          {score.porArea && Object.entries(score.porArea).map(([area, val]) => (
            <span key={area} className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${multiplicadores[area] < 1 ? 'bg-yellow-100 text-yellow-800 border border-yellow-400' : 'bg-blue-100 text-blue-800'}`}>
              {area}: {val.toFixed(2)}
              {multiplicadores[area] && (
                <span className={`ml-1 text-xs font-semibold ${multiplicadores[area] < 1 ? 'text-yellow-700' : 'text-blue-700'}`}>x{multiplicadores[area]}</span>
              )}
            </span>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: '#fff', color: '#222' }} wrapperClassName="dark:bg-gray-800 dark:text-gray-100" />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#2563eb" name="Total" strokeWidth={2} />
              <Line type="monotone" dataKey="Saúde" stroke="#16a34a" name="Saúde" />
              <Line type="monotone" dataKey="Relacionamentos" stroke="#f59e42" name="Relacionamentos" />
              <Line type="monotone" dataKey="Vida Profissional" stroke="#a21caf" name="Vida Profissional" />
              <Line type="monotone" dataKey="Hobbies e Lazer" stroke="#0ea5e9" name="Hobbies e Lazer" />
              <Line type="monotone" dataKey="Espírito" stroke="#f43f5e" name="Espírito" />
              <Line type="monotone" dataKey="Mente" stroke="#facc15" name="Mente" />
              <Line type="monotone" dataKey="Finanças" stroke="#7c3aed" name="Finanças" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2 text-white">Histórico do Dia ({formatDate(selectedDate)})</h2>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          {eventosDia.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">Nenhum evento registrado neste dia.</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {eventosDia.map(ev => {
                const action = actions.find(a => a.id === ev.actionId || a.id === Number(ev.actionId));
                if (editEventId === ev.id) {
                  return (
                    <li key={ev.id} className="py-2 bg-blue-50 dark:bg-blue-900/20 rounded flex flex-col gap-2">
                      <form className="flex flex-col gap-2" onSubmit={e => handleEditSubmit(e, ev.id)}>
                        <select
                          className="border p-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          value={editForm.actionId}
                          onChange={e => setEditForm(f => ({ ...f, actionId: e.target.value }))}
                          required
                        >
                          <option value="">Selecione uma ação</option>
                          {actions.map(action => (
                            <option key={action.id} value={action.id}>{action.nome}</option>
                          ))}
                        </select>
                        <input
                          className="border p-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          value={editForm.descricao}
                          onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))}
                          placeholder="Descrição"
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editForm.gastoPlanejado}
                            onChange={e => setEditForm(f => ({ ...f, gastoPlanejado: e.target.checked }))}
                          />
                          Gasto planejado
                        </label>
                        <div className="flex gap-2">
                          <button className="bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1" type="submit"><PencilIcon className="w-4 h-4" />Salvar</button>
                          <button className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded" type="button" onClick={() => setEditEventId(null)}>Cancelar</button>
                        </div>
                      </form>
                    </li>
                  );
                }
                return (
                  <li key={ev.id} className="py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-medium text-blue-800 dark:text-blue-200">{action ? action.nome : "Ação desconhecida"}</div>
                      {ev.descricao && <div className="text-sm text-gray-600 dark:text-gray-300">{ev.descricao}</div>}
                      <div className="text-xs text-gray-400">{ev.gastoPlanejado ? "Gasto planejado" : ""}</div>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      <button className="text-blue-600 dark:text-blue-300 flex items-center gap-1" onClick={() => handleEditEvent(ev)}><PencilIcon className="w-4 h-4" />Editar</button>
                      <button className="text-red-600 flex items-center gap-1" onClick={() => handleDeleteEvent(ev.id)}><TrashIcon className="w-4 h-4" />Excluir</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default PlayerPage; 