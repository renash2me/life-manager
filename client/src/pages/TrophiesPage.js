import React, { useEffect, useState } from "react";
import { TrophyIcon, FlagIcon, CheckCircleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';

function calcularProgressoObjetivo(obj, events, actions) {
  // Filtra eventos conforme intervalo, se houver
  let eventosFiltrados = events;
  if (obj.temPrazo && obj.intervalo && obj.unidade) {
    // Calcula data inicial do intervalo
    const datas = events.map(ev => ev.data).filter(Boolean).sort();
    if (datas.length === 0) return { atual: 0, meta: obj.quantidade || obj.pontos || obj.dias || 1, completo: false };
    const ultimaData = datas[datas.length - 1];
    const dtFim = new Date(ultimaData);
    let dtIni = new Date(dtFim);
    const n = Number(obj.intervalo);
    if (obj.unidade === 'dias') dtIni.setDate(dtFim.getDate() - n + 1);
    if (obj.unidade === 'semanas') dtIni.setDate(dtFim.getDate() - n * 7 + 1);
    if (obj.unidade === 'meses') dtIni.setMonth(dtFim.getMonth() - n);
    if (obj.unidade === 'ano') dtIni.setFullYear(dtFim.getFullYear() - n);
    const dtIniStr = dtIni.toISOString().slice(0, 10);
    eventosFiltrados = events.filter(ev => ev.data >= dtIniStr && ev.data <= ultimaData);
  }
  if (obj.tipo === "quantidade_evento") {
    const action = actions.find(a => a.nome === obj.evento);
    if (!action) return { atual: 0, meta: obj.quantidade, completo: false };
    const count = eventosFiltrados.filter(ev => String(ev.actionId) === String(action.id)).length;
    return { atual: count, meta: obj.quantidade, completo: count >= obj.quantidade };
  }
  if (obj.tipo === "sem_negativo") {
    const datas = Array.from(new Set(eventosFiltrados.map(ev => ev.data))).sort();
    let maxSeq = 0, seq = 0;
    for (const data of datas) {
      const eventosDia = eventosFiltrados.filter(ev => ev.data === data);
      let negativo = false;
      for (const ev of eventosDia) {
        const action = actions.find(a => String(a.id) === String(ev.actionId));
        if (action && action.areas && action.areas[obj.area] < 0) negativo = true;
      }
      if (!negativo) seq++;
      else seq = 0;
      if (seq > maxSeq) maxSeq = seq;
    }
    return { atual: maxSeq, meta: obj.dias, completo: maxSeq >= obj.dias };
  }
  if (obj.tipo === "pontuacao_area") {
    // Soma pontos da área no intervalo
    let pontos = 0;
    eventosFiltrados.forEach(ev => {
      const action = actions.find(a => String(a.id) === String(ev.actionId));
      if (action && action.areas && action.areas[obj.area]) {
        pontos += action.areas[obj.area];
      }
    });
    return { atual: pontos, meta: obj.pontos, completo: pontos >= obj.pontos };
  }
  return { atual: 0, meta: 1, completo: false };
}

function percentConclusao(objetivos) {
  if (!objetivos || objetivos.length === 0) return 0;
  const completos = objetivos.filter(o => o.completo).length;
  return Math.round((completos / objetivos.length) * 100);
}

function TrophiesPage() {
  const [trophies, setTrophies] = useState([]);
  const [events, setEvents] = useState([]);
  const [actions, setActions] = useState([]);
  const [tab, setTab] = useState('trofeu');
  const [modal, setModal] = useState(null); // { trophy, objetivos }

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/trophies").then(res => res.json()).then(setTrophies);
    fetch("http://localhost:5000/api/events").then(res => res.json()).then(setEvents);
    fetch("http://localhost:5000/api/actions").then(res => res.json()).then(setActions);
  }, []);

  // Calcular progresso de todos
  const data = trophies.map(trophy => {
    const objetivos = (trophy.objetivos || []).map(obj => calcularProgressoObjetivo(obj, events, actions));
    const completo = objetivos.every(o => o.completo);
    return { ...trophy, objetivos, completo, percent: percentConclusao(objetivos) };
  });

  const trofeus = data.filter(t => (t.tipo || 'trofeu') === 'trofeu');
  const metas = data.filter(t => t.tipo === 'meta');

  function renderCard(trophy, Icon) {
    return (
      <div
        key={trophy.id}
        className={`bg-card flex items-center gap-3 p-3 rounded-lg shadow cursor-pointer hover:border-blue-500 border-2 border-transparent transition relative group`}
        onClick={() => setModal(trophy)}
        title={trophy.descricao}
      >
        <Icon className="w-8 h-8 text-[#d4d4d4] group-hover:text-[var(--vscode-blue)]" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate text-base">{trophy.nome}</div>
          <div className="text-xs text-[#aaa] truncate">{trophy.descricao}</div>
        </div>
        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition">
          <div className="bg-[#252526] text-[#d4d4d4] px-2 py-1 rounded text-xs shadow border border-[#333]">{trophy.percent}%</div>
        </div>
        {trophy.completo && <CheckCircleIcon className="w-5 h-5 text-green-500 ml-2" title="Conquistado" />}
      </div>
    );
  }

  function renderModal(trophy) {
    if (!trophy) return null;
    // Calcular progresso dos objetivos do troféu selecionado
    const objetivos = (trophy.objetivos || []).map(obj => calcularProgressoObjetivo(obj, events, actions));
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-card w-full max-w-lg p-6 rounded-xl relative">
          <button className="absolute top-2 right-2 text-2xl btn btn-outline" onClick={() => setModal(null)}><XMarkIcon className="w-6 h-6" /></button>
          <div className="flex items-center gap-3 mb-2">
            {(trophy.tipo === 'meta') ? <FlagIcon className="w-8 h-8 text-[#d4d4d4]" /> : <TrophyIcon className="w-8 h-8 text-[#d4d4d4]" />}
            <div>
              <div className="font-bold text-lg">{trophy.nome}</div>
              <div className="text-sm text-[#aaa]">{trophy.descricao}</div>
            </div>
          </div>
          <div className="mb-3">
            <div className="font-medium mb-1">Checklist:</div>
            <ul className="list-none pl-0 space-y-1">
              {(trophy.objetivos || []).map((obj, idx) => {
                const prog = objetivos[idx];
                let label = '';
                if (obj.tipo === 'quantidade_evento') label = `${obj.evento}: Realizar ${obj.quantidade}x`;
                if (obj.tipo === 'sem_negativo') label = `${obj.area}: Ficar ${obj.dias} dias sem pontuação negativa`;
                if (obj.tipo === 'pontuacao_area') label = `${obj.area}: Alcançar ${obj.pontos} pontos`;
                if (obj.temPrazo && obj.intervalo && obj.unidade) label += ` em ${obj.intervalo} ${obj.unidade}`;
                return (
                  <li key={idx} className={prog.completo ? 'text-green-700 flex items-center gap-2' : 'text-gray-300 flex items-center gap-2'}>
                    {prog.completo ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <ClockIcon className="w-5 h-5 text-blue-400" />}
                    <span className={prog.completo ? 'line-through' : ''}><strong>{label}</strong></span>
                    <span className="ml-2 text-xs text-gray-500">[{prog.atual}/{prog.meta}]</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="font-medium mb-1">Recompensas:</div>
            <ul className="list-none pl-0 flex flex-wrap gap-2">
              {(trophy.recompensas || []).map((rec, idx) => {
                if (rec.tipo === 'trofeu') return <li key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Troféu</li>;
                if (rec.tipo === 'desbloqueia') return <li key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Desbloqueia: {rec.trofeu}</li>;
                if (rec.tipo === 'multiplicador') return <li key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Multiplicador em {rec.area}: +{rec.positivo || 1}x positivo, {rec.negativo || 1}x negativo</li>;
                return <li key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{rec.tipo}</li>;
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Troféus & Metas</h1>
      <div className="flex gap-2 mb-4">
        <button className={`btn ${tab === 'trofeu' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('trofeu')}>Troféus</button>
        <button className={`btn ${tab === 'meta' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('meta')}>Metas</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tab === 'trofeu' && trofeus.map(t => renderCard(t, TrophyIcon))}
        {tab === 'meta' && metas.map(t => renderCard(t, FlagIcon))}
      </div>
      {renderModal(modal)}
    </div>
  );
}

export default TrophiesPage; 