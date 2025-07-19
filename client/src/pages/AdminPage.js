import React, { useEffect, useState } from "react";
import { PencilIcon, TrashIcon, PlusCircleIcon, TrophyIcon, FlagIcon } from '@heroicons/react/24/outline';

const adminSections = [
  { key: 'eventos', label: 'Eventos', icon: PlusCircleIcon },
  { key: 'categorias', label: 'Categorias', icon: FlagIcon },
  { key: 'pontuacoes', label: 'Pontuações & Bônus', icon: TrophyIcon },
  { key: 'metas', label: 'Metas & Troféus', icon: TrophyIcon },
];

function AdminMenu({ section, setSection }) {
  const [show, setShow] = useState(true);
  const lastScroll = React.useRef(window.scrollY);

  React.useEffect(() => {
    function onScroll() {
      const current = window.scrollY;
      if (current > lastScroll.current && current > 35) {
        setShow(false);
      } else if (current < lastScroll.current) {
        setShow(true);
      }
      lastScroll.current = current;
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 right-0 flex gap-2 items-center py-2 pr-4 bg-transparent border-0 m-0 z-50 transition-transform duration-1000 ${show ? 'translate-y-0' : '-translate-y-20'}`} style={{ pointerEvents: show ? 'auto' : 'none' }}>
      {adminSections.map(s => (
        <button
          key={s.key}
          className={`flex items-center gap-2 px-3 py-2 rounded transition text-left ${section === s.key ? 'bg-[var(--vscode-blue)] text-white' : 'hover:bg-[#2c2c32]'}`}
          onClick={() => setSection(s.key)}
        >
          <s.icon className="w-5 h-5" /> {s.label}
        </button>
      ))}
    </nav>
  );
}

function AdminPage() {
  const [section, setSection] = useState('eventos');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTrophyModal, setShowTrophyModal] = useState(false);
  const [actions, setActions] = useState([]);
  const [form, setForm] = useState({ nome: "", descricao: "", areas: {}, categorias: [], gastoPlanejado: false, sinergia: false });
  const [editingId, setEditingId] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [editTrophy, setEditTrophy] = useState(null);

  // TROFÉUS/METAS
  const [trophies, setTrophies] = useState([]);
  const [trophyForm, setTrophyForm] = useState({ nome: '', descricao: '', objetivos: [], recompensas: [] });
  const [editingTrophyId, setEditingTrophyId] = useState(null);

  // Extrair todas as categorias já cadastradas
  const allCategories = Array.from(new Set(actions.flatMap(a => a.categorias || [])));

  // Buscar ações para o select de eventos
  const [allActions, setAllActions] = useState([]);
  useEffect(() => {
    fetch("http://localhost:5000/api/actions").then(res => res.json()).then(setAllActions);
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/actions")
      .then(res => res.json())
      .then(setActions);
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/trophies")
      .then(res => res.json())
      .then(setTrophies);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `http://localhost:5000/api/admin/actions/${editingId}` : "http://localhost:5000/api/admin/actions";
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
      .then(res => res.json())
      .then((saved) => {
        setForm({ nome: "", descricao: "", areas: {}, categorias: [], gastoPlanejado: false, sinergia: false });
        setEditingId(null);
        // Atualiza lista
        return fetch("http://localhost:5000/api/admin/actions").then(res => res.json()).then(setActions);
      });
  }

  function handleTrophySubmit(e) {
    e.preventDefault();
    const method = editingTrophyId ? "PUT" : "POST";
    const url = editingTrophyId ? `http://localhost:5000/api/admin/trophies/${editingTrophyId}` : "http://localhost:5000/api/admin/trophies";
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trophyForm)
    })
      .then(res => res.json())
      .then(() => {
        setTrophyForm({ nome: '', descricao: '', objetivos: [], recompensas: [] });
        setEditingTrophyId(null);
        fetch("http://localhost:5000/api/admin/trophies").then(res => res.json()).then(setTrophies);
      });
  }

  function handleEdit(action) {
    setForm({ ...action });
    setEditingId(action.id);
  }

  function handleDelete(id) {
    if (window.confirm("Tem certeza que deseja excluir esta ação?")) {
      fetch(`http://localhost:5000/api/admin/actions/${id}`, { method: "DELETE" })
        .then(() => fetch("http://localhost:5000/api/admin/actions").then(res => res.json()).then(setActions));
    }
  }

  function handleTrophyEdit(trophy) {
    setTrophyForm({ ...trophy });
    setEditingTrophyId(trophy.id);
  }
  function handleTrophyDelete(id) {
    if (window.confirm("Tem certeza que deseja excluir este troféu/meta?")) {
      fetch(`http://localhost:5000/api/admin/trophies/${id}`, { method: "DELETE" })
        .then(() => fetch("http://localhost:5000/api/admin/trophies").then(res => res.json()).then(setTrophies));
    }
  }

  function addObjetivo() {
    setTrophyForm(f => ({ ...f, objetivos: [...(f.objetivos || []), { tipo: '', evento: '', quantidade: 1, area: '', dias: 1, pontos: 1, temPrazo: false, intervalo: '', unidade: 'dias' }] }));
  }
  function updateObjetivo(idx, obj) {
    setTrophyForm(f => ({ ...f, objetivos: f.objetivos.map((o, i) => i === idx ? obj : o) }));
  }
  function removeObjetivo(idx) {
    setTrophyForm(f => ({ ...f, objetivos: f.objetivos.filter((_, i) => i !== idx) }));
  }
  function addRecompensa() {
    setTrophyForm(f => ({ ...f, recompensas: [...(f.recompensas || []), { tipo: '' }] }));
  }
  function updateRecompensa(idx, obj) {
    setTrophyForm(f => ({ ...f, recompensas: f.recompensas.map((o, i) => i === idx ? obj : o) }));
  }
  function removeRecompensa(idx) {
    setTrophyForm(f => ({ ...f, recompensas: f.recompensas.filter((_, i) => i !== idx) }));
  }

  // Funções para abrir/fechar modais
  function openEventModal(action) {
    setEditEvent(
      action ||
      {
        nome: "",
        descricao: "",
        areas: {},
        categorias: [],
        gastoPlanejado: false,
        sinergia: false,
        penalidadeFinanceiraPlanejado: 0,
        penalidadeFinanceiraNaoPlanejado: 0
      }
    );
    setShowEventModal(true);
  }
  function closeEventModal() {
    setEditEvent(null);
    setShowEventModal(false);
  }
  function openTrophyModal(trophy) {
    setEditTrophy(trophy || null);
    setShowTrophyModal(true);
  }
  function closeTrophyModal() {
    setEditTrophy(null);
    setShowTrophyModal(false);
  }

  // Áreas da vida disponíveis
  const areasDisponiveis = ["Saúde", "Relacionamentos", "Vida Profissional", "Hobbies e Lazer", "Espírito", "Mente", "Finanças"];

  // Renderização das sessões
  function renderSection() {
    if (section === 'eventos') {
      return (
        <div className="max-w-2xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white">Eventos</h1>
            <button className="btn btn-primary flex items-center gap-2" onClick={() => openEventModal()}><PlusCircleIcon className="w-5 h-5" />Novo Evento</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {actions.map(action => (
              <div 
                key={action.id} 
                className="bg-card flex flex-col gap-2 p-4 rounded-lg shadow cursor-pointer hover:border-blue-500 border-2 border-transparent transition"
                onClick={() => openEventModal(action)}
              >
                <div className="font-semibold text-base text-white truncate">{action.nome}</div>
                <div className="text-xs text-[#aaa] truncate">{action.descricao}</div>
                <div className="flex flex-wrap gap-1 text-xs mt-2">
                  {(action.categorias || []).map(cat => <span key={cat} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{cat}</span>)}
                </div>
              </div>
            ))}
          </div>
          {showEventModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-card w-full max-w-lg p-6 rounded-xl relative">
                <button className="absolute top-2 right-2 text-2xl btn btn-outline" onClick={closeEventModal}>&times;</button>
                <h2 className="text-xl font-bold mb-4 text-white">{editEvent ? 'Editar Evento' : 'Novo Evento'}</h2>
                <form onSubmit={e => {
                  e.preventDefault();
                  // Salvar ou atualizar evento
                  // ... lógica de POST/PUT ...
                  closeEventModal();
                }} className="flex flex-col gap-2">
                  <input className="border p-1 rounded" placeholder="Nome" value={editEvent?.nome || ''} onChange={e => setEditEvent(ev => ({ ...ev, nome: e.target.value }))} required />
                  <textarea className="border p-1 rounded" placeholder="Descrição" value={editEvent?.descricao || ''} onChange={e => setEditEvent(ev => ({ ...ev, descricao: e.target.value }))} />
                  <div>
                    <label className="block font-medium">Áreas Afetadas</label>
                    <div className="grid grid-cols-2 gap-2">
                      {areasDisponiveis.map(area => (
                        <div key={area} className="flex items-center gap-2">
                          <span>{area}</span>
                          <input
                            type="number"
                            className="border p-1 rounded w-20"
                            value={editEvent?.areas?.[area] || ''}
                            onChange={e => setEditEvent(ev => ({ ...ev, areas: { ...ev.areas, [area]: Number(e.target.value) } }))}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium">Categorias</label>
                    <input className="border p-1 rounded w-full" value={editEvent?.categorias?.join(', ') || ''} onChange={e => setEditEvent(ev => ({ ...ev, categorias: e.target.value.split(',').map(s => s.trim()) }))} placeholder="Separe por vírgula" />
                  </div>
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!editEvent?.gastoPlanejado} onChange={e => setEditEvent(ev => ({ ...ev, gastoPlanejado: e.target.checked }))} />
                      Gasto planejado
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!editEvent?.sinergia} onChange={e => setEditEvent(ev => ({ ...ev, sinergia: e.target.checked }))} />
                      Gera bônus por sinergia
                    </label>
                  </div>
                  <div>
                    <label className="block font-medium">Penalidade Financeira (gasto planejado)</label>
                    <input type="number" className="border p-1 rounded w-32" value={editEvent?.penalidadeFinanceiraPlanejado || ''} onChange={e => setEditEvent(ev => ({ ...ev, penalidadeFinanceiraPlanejado: Number(e.target.value) }))} placeholder="Ex: -1" />
                  </div>
                  <div>
                    <label className="block font-medium">Penalidade Financeira (gasto NÃO planejado)</label>
                    <input type="number" className="border p-1 rounded w-32" value={editEvent?.penalidadeFinanceiraNaoPlanejado || ''} onChange={e => setEditEvent(ev => ({ ...ev, penalidadeFinanceiraNaoPlanejado: Number(e.target.value) }))} placeholder="Ex: -3" />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-primary" type="submit">Salvar</button>
                    <button className="btn btn-outline" type="button" onClick={closeEventModal}>Cancelar</button>
                    {editEvent?.id && (
                      <button 
                        className="btn btn-danger" 
                        type="button" 
                        onClick={() => {
                          if (window.confirm("Tem certeza que deseja excluir esta ação?")) {
                            fetch(`http://localhost:5000/api/admin/actions/${editEvent.id}`, { method: "DELETE" })
                              .then(() => {
                                fetch("http://localhost:5000/api/admin/actions").then(res => res.json()).then(setActions);
                                closeEventModal();
                              });
                          }
                        }}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }
    if (section === 'categorias') {
      return <div className="p-4">Sessão de Categorias (em breve)</div>;
    }
    if (section === 'pontuacoes') {
      return <div className="p-4">Sessão de Pontuações & Bônus (em breve)</div>;
    }
    if (section === 'metas') {
      return (
        <div className="max-w-2xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white">Metas & Troféus</h1>
            <button className="btn btn-primary flex items-center gap-2" onClick={() => openTrophyModal()}><PlusCircleIcon className="w-5 h-5" />Nova Meta/Troféu</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trophies.map(trophy => (
              <div 
                key={trophy.id} 
                className="bg-card flex flex-col gap-2 p-4 rounded-lg shadow cursor-pointer hover:border-blue-500 border-2 border-transparent transition"
                onClick={() => openTrophyModal(trophy)}
              >
                <div className="font-semibold text-base text-white truncate">{trophy.nome}</div>
                <div className="text-xs text-[#aaa] truncate">{trophy.descricao}</div>
              </div>
            ))}
          </div>
          {showTrophyModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-card w-full max-w-lg p-6 rounded-xl relative">
                <button className="absolute top-2 right-2 text-2xl btn btn-outline" onClick={closeTrophyModal}>&times;</button>
                <h2 className="text-xl font-bold mb-4 text-white">{editTrophy ? 'Editar Meta/Troféu' : 'Nova Meta/Troféu'}</h2>
                <form onSubmit={e => {
                  e.preventDefault();
                  // Salvar ou atualizar meta/troféu
                  // ... lógica de POST/PUT ...
                  closeTrophyModal();
                }} className="flex flex-col gap-2">
                  <div className="flex gap-4 items-center">
                    <label className="block font-medium">Tipo</label>
                    <select className="border p-1 rounded" value={editTrophy?.tipo || 'trofeu'} onChange={e => setEditTrophy(ev => ({ ...ev, tipo: e.target.value }))}>
                      <option value="trofeu">Troféu</option>
                      <option value="meta">Meta</option>
                    </select>
                  </div>
                  <input className="border p-1 rounded" placeholder="Nome" value={editTrophy?.nome || ''} onChange={e => setEditTrophy(ev => ({ ...ev, nome: e.target.value }))} required />
                  <textarea className="border p-1 rounded" placeholder="Descrição" value={editTrophy?.descricao || ''} onChange={e => setEditTrophy(ev => ({ ...ev, descricao: e.target.value }))} />
                  <div className="mb-2">
                    <label className="block font-medium">Objetivos (Checklist)</label>
                    {(editTrophy?.objetivos || []).map((obj, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-2 mb-2 bg-gray-50 p-2 rounded">
                        <select className="border p-1 rounded w-full md:w-auto" value={obj.tipo} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, tipo: e.target.value } : o) }))}>
                          <option value="">Tipo de objetivo</option>
                          <option value="quantidade_evento">Quantidade de eventos</option>
                          <option value="sem_negativo">Sem pontuação negativa</option>
                          <option value="pontuacao_area">Pontuação em área</option>
                        </select>
                        {obj.tipo === 'quantidade_evento' && (
                          <>
                            <select className="border p-1 rounded w-full md:w-auto" value={obj.evento} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, evento: e.target.value } : o) }))}>
                              <option value="">Selecione o evento</option>
                              {allActions.map(a => (
                                <option key={a.id} value={a.nome}>{a.nome}</option>
                              ))}
                            </select>
                            <input className="border p-1 rounded w-20" type="number" min="1" value={obj.quantidade} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, quantidade: Number(e.target.value) } : o) }))} placeholder="Qtd" />
                          </>
                        )}
                        {obj.tipo === 'sem_negativo' && (
                          <>
                            <input className="border p-1 rounded w-full md:w-auto" placeholder="Área" value={obj.area} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, area: e.target.value } : o) }))} />
                            <input className="border p-1 rounded w-20" type="number" min="1" value={obj.dias} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, dias: Number(e.target.value) } : o) }))} placeholder="Dias" />
                          </>
                        )}
                        {obj.tipo === 'pontuacao_area' && (
                          <>
                            <select className="border p-1 rounded w-full md:w-auto" value={obj.area} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, area: e.target.value } : o) }))}>
                              <option value="">Selecione a área</option>
                              {areasDisponiveis.map(area => (
                                <option key={area} value={area}>{area}</option>
                              ))}
                            </select>
                            <input className="border p-1 rounded w-24" type="number" min="1" value={obj.pontos} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, pontos: Number(e.target.value) } : o) }))} placeholder="Pontos" />
                          </>
                        )}
                        <label className="flex items-center gap-2 mt-1">
                          <input type="checkbox" checked={!!obj.temPrazo} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, temPrazo: e.target.checked } : o) }))} />
                          Tem prazo
                        </label>
                        {obj.temPrazo && (
                          <div className="flex gap-2 items-center mt-1">
                            <input className="border p-1 rounded w-24" type="number" min="1" value={obj.intervalo || ''} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, intervalo: e.target.value } : o) }))} placeholder="Intervalo" />
                            <select className="border p-1 rounded" value={obj.unidade || 'dias'} onChange={e => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.map((o, i) => i === idx ? { ...o, unidade: e.target.value } : o) }))}>
                              <option value="dias">dias</option>
                              <option value="semanas">semanas</option>
                              <option value="meses">meses</option>
                              <option value="ano">ano</option>
                            </select>
                          </div>
                        )}
                        <button type="button" className="text-red-600 ml-2" onClick={() => setEditTrophy(t => ({ ...t, objetivos: t.objetivos.filter((_, i) => i !== idx) }))}>&times;</button>
                      </div>
                    ))}
                    <button type="button" className="text-blue-600 underline mt-1" onClick={() => setEditTrophy(t => ({ ...t, objetivos: [...(t.objetivos || []), { tipo: '', evento: '', quantidade: 1, area: '', dias: 1, pontos: 1, temPrazo: false, intervalo: '', unidade: 'dias' }] }))}>Adicionar objetivo</button>
                  </div>
                  <div className="mb-2">
                    <label className="block font-medium">Recompensas</label>
                    {(editTrophy?.recompensas || []).map((rec, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-2 mb-2 bg-gray-50 p-2 rounded">
                        <select className="border p-1 rounded w-full md:w-auto" value={rec.tipo} onChange={e => setEditTrophy(t => ({ ...t, recompensas: t.recompensas.map((o, i) => i === idx ? { ...o, tipo: e.target.value } : o) }))}>
                          <option value="">Tipo de recompensa</option>
                          <option value="trofeu">Troféu</option>
                          <option value="desbloqueia">Desbloqueia outro troféu</option>
                          <option value="multiplicador">Multiplicador de pontuação</option>
                        </select>
                        {rec.tipo === 'desbloqueia' && (
                          <input className="border p-1 rounded w-full md:w-auto" placeholder="Nome do troféu" value={rec.trofeu || ''} onChange={e => setEditTrophy(t => ({ ...t, recompensas: t.recompensas.map((o, i) => i === idx ? { ...o, trofeu: e.target.value } : o) }))} />
                        )}
                        {rec.tipo === 'multiplicador' && (
                          <>
                            <input className="border p-1 rounded w-full md:w-auto" placeholder="Área" value={rec.area || ''} onChange={e => setEditTrophy(t => ({ ...t, recompensas: t.recompensas.map((o, i) => i === idx ? { ...o, area: e.target.value } : o) }))} />
                            <input className="border p-1 rounded w-20" type="number" step="0.01" placeholder="Positivo" value={rec.positivo || ''} onChange={e => setEditTrophy(t => ({ ...t, recompensas: t.recompensas.map((o, i) => i === idx ? { ...o, positivo: Number(e.target.value) } : o) }))} />
                            <input className="border p-1 rounded w-20" type="number" step="0.01" placeholder="Negativo" value={rec.negativo || ''} onChange={e => setEditTrophy(t => ({ ...t, recompensas: t.recompensas.map((o, i) => i === idx ? { ...o, negativo: Number(e.target.value) } : o) }))} />
                          </>
                        )}
                        <button type="button" className="text-red-600 ml-2" onClick={() => setEditTrophy(t => ({ ...t, recompensas: t.recompensas.filter((_, i) => i !== idx) }))}>&times;</button>
                      </div>
                    ))}
                    <button type="button" className="text-blue-600 underline mt-1" onClick={() => setEditTrophy(t => ({ ...t, recompensas: [...(t.recompensas || []), { tipo: '' }] }))}>Adicionar recompensa</button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-primary" type="submit">Salvar</button>
                    <button className="btn btn-outline" type="button" onClick={closeTrophyModal}>Cancelar</button>
                    {editTrophy?.id && (
                      <button 
                        className="btn btn-danger" 
                        type="button" 
                        onClick={() => {
                          if (window.confirm("Tem certeza que deseja excluir este troféu/meta?")) {
                            fetch(`http://localhost:5000/api/admin/trophies/${editTrophy.id}`, { method: "DELETE" })
                              .then(() => {
                                fetch("http://localhost:5000/api/admin/trophies").then(res => res.json()).then(setTrophies);
                                closeTrophyModal();
                              });
                          }
                        }}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e]">
      <AdminMenu section={section} setSection={setSection} />
      <div className="p-6" style={{ marginTop: '60px' }}>
        {renderSection()}
      </div>
    </div>
  );
}

export default AdminPage; 