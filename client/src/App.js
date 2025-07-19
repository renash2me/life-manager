import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from "react-router-dom";
import PlayerPage from "./pages/PlayerPage";
import TrophiesPage from "./pages/TrophiesPage";
import AdminPage from "./pages/AdminPage";
import ProfilePage from "./pages/ProfilePage";
import VersionIndicator from "./components/VersionIndicator";
import { UserCircleIcon, Cog6ToothIcon, Bars3Icon } from '@heroicons/react/24/outline';

// AddEventModal component
function AddEventModal({ open, onClose, onEventAdded }) {
  const [form, setForm] = useState({ actionId: "", descricao: "", gastoPlanejado: false });
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  React.useEffect(() => {
    if (open) {
      fetch("http://localhost:5000/api/actions").then(res => res.json()).then(setActions);
    }
  }, [open]);
  
  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    fetch("http://localhost:5000/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        data: new Date().toISOString().slice(0, 10)
      })
    })
      .then(res => res.json())
      .then(() => {
        setForm({ actionId: "", descricao: "", gastoPlanejado: false });
        onEventAdded && onEventAdded();
        onClose();
      })
      .finally(() => setLoading(false));
  }
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-card w-full max-w-md relative p-6">
        <button className="absolute top-2 right-2 text-2xl btn btn-outline" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4 text-white">Adicionar Evento</h2>
        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
          <label>
            Ação:
            <select
              className="border p-1 rounded w-full mt-1"
              value={form.actionId}
              onChange={e => setForm(f => ({ ...f, actionId: e.target.value }))}
              required
            >
              <option value="">Selecione uma ação</option>
              {actions.map(action => (
                <option key={action.id} value={action.id}>{action.nome}</option>
              ))}
            </select>
          </label>
          <label>
            Descrição (opcional):
            <input
              className="border p-1 rounded w-full mt-1"
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.gastoPlanejado}
              onChange={e => setForm(f => ({ ...f, gastoPlanejado: e.target.checked }))}
            />
            Gasto planejado
          </label>
          <button
            className="btn btn-primary mt-2"
            type="submit"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Registrar Evento"}
          </button>
        </form>
      </div>
    </div>
  );
}

function FloatingAddButton({ onClick, show }) {
  if (!show) return null;
  return (
    <button
      className="fixed bottom-6 right-6 bg-[var(--vscode-blue)] text-white rounded-full w-16 h-16 flex items-center justify-center text-4xl shadow-lg z-40 hover:bg-blue-700 transition border-4 border-[#1e1e1e]"
      onClick={onClick}
      aria-label="Adicionar Evento"
    >
      +
    </button>
  );
}

function Sidebar({ open, onToggle }) {
  const [player, setPlayer] = useState({
    nome: "Jogador Exemplo",
    foto: "https://ui-avatars.com/api/?name=Jogador+Exemplo&background=007acc&color=fff"
  });

  // Carregar dados do perfil do localStorage
  React.useEffect(() => {
    const savedProfile = localStorage.getItem('playerProfile');
    if (savedProfile) {
      const profileData = JSON.parse(savedProfile);
      setPlayer(profileData);
    }
  }, []);

  return (
    <aside className={`fixed top-0 left-0 h-full z-50 bg-[#252526] text-[#d4d4d4] flex flex-col transition-all duration-300 ${open ? 'w-64' : 'w-16'} shadow-lg`}>
      <div className="flex items-center gap-2 p-4 border-b border-[#333]">
        <button onClick={onToggle} className="text-[#d4d4d4] focus:outline-none">
          <Bars3Icon className="w-7 h-7" />
        </button>
        {open && <span className="ml-2 text-lg font-bold tracking-tight">Life Manager</span>}
      </div>
      <nav className="flex-1 flex flex-col gap-1 mt-4">
        <NavLink to="/" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded transition ${isActive ? 'bg-[var(--vscode-blue)] text-white' : 'hover:bg-[#2c2c32]'}`}>🏠 {open && 'Painel'}</NavLink>
        <NavLink to="/trophies" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded transition ${isActive ? 'bg-[var(--vscode-blue)] text-white' : 'hover:bg-[#2c2c32]'}`}>🏆 {open && 'Troféus & Metas'}</NavLink>
      </nav>
      <div className="mt-auto flex flex-col gap-2 p-4 border-t border-[#333]">
        <NavLink to="/admin" className={({ isActive }) => `flex items-center gap-2 px-2 py-2 rounded transition text-sm ${isActive ? 'bg-[var(--vscode-blue)] text-white' : 'hover:bg-[#2c2c32]'}`}> <Cog6ToothIcon className="w-5 h-5" /> {open && 'Administração'}</NavLink>
        <div className="flex items-center gap-2 mt-4">
          <img src={player.foto} alt="avatar" className="w-10 h-10 rounded-full border-2 border-[#007acc]" />
          {open && (
            <div className="flex flex-col ml-2">
              <span className="font-semibold text-[#d4d4d4]">{player.nome}</span>
              <NavLink to="/perfil" className="text-xs text-[var(--vscode-blue)] hover:underline flex items-center gap-1"><UserCircleIcon className="w-4 h-4" /> Editar perfil</NavLink>
            </div>
          )}
        </div>
        {open && (
          <div className="mt-2 pt-2 border-t border-[#333]">
            <VersionIndicator />
          </div>
        )}
      </div>
    </aside>
  );
}

function AppRoutes({ onOpenModal, onEventAdded }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
      <div className={`flex-1 ml-${sidebarOpen ? '64' : '16'} transition-all duration-300`}>
        <main className="p-4">
          <Routes>
            <Route path="/" element={<PlayerPage onEventAdded={onEventAdded} />} />
            <Route path="/trophies" element={<TrophiesPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
      {!isAdmin && <FloatingAddButton onClick={onOpenModal} show={true} />}
    </div>
  );
}

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  
  function handleEventAdded() {
    setRefresh(r => r + 1);
  }
  
  return (
    <Router>
      <AddEventModal open={modalOpen} onClose={() => setModalOpen(false)} onEventAdded={handleEventAdded} />
      <AppRoutes onOpenModal={() => setModalOpen(true)} onEventAdded={handleEventAdded} key={refresh} />
    </Router>
  );
}

export default App;
