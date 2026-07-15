import React, { useState } from 'react';
import { X, Save, Loader2, Check } from 'lucide-react';

interface ProfileModalProps {
  user: any;
  onClose: () => void;
  tipoDisplay?: string;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, tipoDisplay }) => {
  const [nome, setNome] = useState(user.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simula uma chamada rápida de API
      await new Promise(r => setTimeout(r, 600));
      const updatedUser = { ...user, name: nome };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setSaved(true);
      setTimeout(() => {
        onClose();
        window.location.reload(); // Para atualizar o nome na UI
      }, 800);
    } catch {} finally {
      setSaving(false);
    }
  };

  const tipoLabel = tipoDisplay || user.tipo_profissional || 'Admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800">Meu Perfil</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nome de Exibição</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">E-mail (Login)</label>
            <input
              value={user.email || ''}
              disabled
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Cargo / Acesso</label>
            <input
              value={tipoLabel}
              disabled
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-500 capitalize outline-none"
            />
          </div>
        </div>
        <div className="p-6 pt-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 transition cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};
