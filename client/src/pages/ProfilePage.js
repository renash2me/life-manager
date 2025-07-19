import React, { useState, useEffect } from "react";
import { UserCircleIcon, CameraIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from "react-router-dom";

function ProfilePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "Jogador Exemplo",
    foto: "https://ui-avatars.com/api/?name=Jogador+Exemplo&background=007acc&color=fff"
  });
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Carregar dados do perfil (mock por enquanto)
  useEffect(() => {
    // Aqui você pode carregar os dados do localStorage ou API
    const savedProfile = localStorage.getItem('playerProfile');
    if (savedProfile) {
      setForm(JSON.parse(savedProfile));
    }
  }, []);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // Simular salvamento (aqui você pode integrar com API)
    setTimeout(() => {
      const profileData = {
        ...form,
        foto: previewImage || form.foto
      };
      
      // Salvar no localStorage (ou enviar para API)
      localStorage.setItem('playerProfile', JSON.stringify(profileData));
      
      setLoading(false);
      alert('Perfil atualizado com sucesso!');
      navigate('/');
    }, 1000);
  }

  function handleReset() {
    setForm({
      nome: "Jogador Exemplo",
      foto: "https://ui-avatars.com/api/?name=Jogador+Exemplo&background=007acc&color=fff"
    });
    setPreviewImage(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4">
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => navigate('/')}
          className="btn btn-outline flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Voltar
        </button>
        <h1 className="text-2xl font-bold text-white">Editar Perfil</h1>
      </div>

      <div className="bg-card p-6 rounded-xl shadow">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Seção da Foto */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img 
                src={previewImage || form.foto} 
                alt="Foto do perfil" 
                className="w-24 h-24 rounded-full border-4 border-[#007acc] object-cover"
              />
              <label className="absolute bottom-0 right-0 bg-[#007acc] text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition">
                <CameraIcon className="w-4 h-4" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-center">
              <p className="text-sm text-[#aaa] mb-2">Clique no ícone da câmera para alterar a foto</p>
              <p className="text-xs text-[#666]">Formatos aceitos: JPG, PNG, GIF (máx. 5MB)</p>
            </div>
          </div>

          {/* Seção do Nome */}
          <div className="space-y-2">
            <label className="block font-medium text-white">
              Nome do Jogador
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full border p-3 rounded bg-[#1e1e1e] text-[#d4d4d4] border-[#333] focus:border-[#007acc] focus:outline-none"
              placeholder="Digite seu nome"
              required
              minLength={2}
              maxLength={50}
            />
            <p className="text-xs text-[#666]">
              {form.nome.length}/50 caracteres
            </p>
          </div>

          {/* Informações Adicionais */}
          <div className="bg-[#1e1e1e] p-4 rounded border border-[#333]">
            <h3 className="font-medium text-white mb-2 flex items-center gap-2">
              <UserCircleIcon className="w-5 h-5" />
              Informações da Conta
            </h3>
            <div className="space-y-2 text-sm text-[#aaa]">
              <p>• Data de criação: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>• Status: Ativo</p>
              <p>• Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-outline"
            >
              Resetar
            </button>
          </div>
        </form>
      </div>

      {/* Dicas */}
      <div className="mt-6 bg-[#1e1e1e] p-4 rounded border border-[#333]">
        <h3 className="font-medium text-white mb-2">💡 Dicas</h3>
        <ul className="text-sm text-[#aaa] space-y-1">
          <li>• Use uma foto clara e bem iluminada para melhor identificação</li>
          <li>• O nome será exibido no painel principal e na sidebar</li>
          <li>• As alterações são salvas automaticamente no seu dispositivo</li>
          <li>• Você pode alterar essas informações a qualquer momento</li>
        </ul>
      </div>
    </div>
  );
}

export default ProfilePage; 