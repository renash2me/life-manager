import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

function VersionIndicator() {
  const [versionInfo, setVersionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkVersion();
  }, []);

  async function checkVersion() {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/version');
      if (!response.ok) throw new Error('Erro ao verificar versão');
      
      const data = await response.json();
      setVersionInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#666]">
        <div className="w-3 h-3 border border-[#666] border-t-transparent rounded-full animate-spin"></div>
        Verificando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#666]">
        <InformationCircleIcon className="w-3 h-3" />
        v{versionInfo?.current || '1.0.0'}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[#666]">v{versionInfo?.current || '1.0.0'}</span>
      
      {versionInfo?.hasUpdate ? (
        <div className="flex items-center gap-1 text-yellow-500" title="Nova versão disponível">
          <ExclamationTriangleIcon className="w-3 h-3" />
          <span className="hidden sm:inline">Atualização</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-green-500" title="Versão atualizada">
          <CheckCircleIcon className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

export default VersionIndicator; 