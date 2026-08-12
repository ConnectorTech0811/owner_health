import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, X } from 'lucide-react';
import { API_URL } from '../config';

interface Notification {
  id: number;
  mensagem: string;
  lida: number;
  tipo: string;
  referencia_id: number;
  criado_em: string;
}

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isLogged = !!user;

  useEffect(() => {
    if (isLogged) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Polling cada 30s
      return () => clearInterval(interval);
    }
  }, [isLogged]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notificacoes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/notificacoes/${id}/lida`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: 1 } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/notificacoes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setSelectedIds(prev => prev.filter(selId => selId !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const bulkMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    try {
      await fetch(`${API_URL}/api/notificacoes/bulk/lida`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selectedIds })
      });
      setNotifications(prev => prev.map(n => selectedIds.includes(n.id) ? { ...n, lida: 1 } : n));
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await fetch(`${API_URL}/api/notificacoes/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selectedIds })
      });
      setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length && notifications.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleAction = async (notificacao: Notification, aprovado: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/bloqueios/solicitacoes/${notificacao.referencia_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ aprovado })
      });
      if (res.ok) {
        // Marca como lida para sumir da lista de "pendentes"
        await markAsRead(notificacao.id);
        fetchNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isLogged) return null;

  const unreadCount = notifications.filter(n => n.lida === 0).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in origin-top-right">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {unreadCount} novas
            </span>
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === notifications.length && notifications.length > 0}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] font-semibold text-slate-600">
                  {selectedIds.length > 0 ? `${selectedIds.length} selecionadas` : 'Selecionar todas'}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button 
                  onClick={bulkMarkAsRead} 
                  disabled={selectedIds.length === 0}
                  className={`text-[10px] font-bold ${selectedIds.length > 0 ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-300 cursor-not-allowed'}`}
                >
                  Ler
                </button>
                <button 
                  onClick={bulkDelete} 
                  disabled={selectedIds.length === 0}
                  className={`text-[10px] font-bold ${selectedIds.length > 0 ? 'text-red-600 hover:text-red-800' : 'text-slate-300 cursor-not-allowed'}`}
                >
                  Excluir
                </button>
              </div>
            </div>
          )}
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs font-medium">Nenhuma notificação no momento</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => {
                      if (notif.lida === 0) markAsRead(notif.id);
                      setSelectedNotification(notif);
                    }}
                    className={`p-4 flex gap-3 transition-colors cursor-pointer ${notif.lida === 0 ? 'bg-indigo-50/30 hover:bg-indigo-50' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <div className="mt-0.5 shrink-0 flex items-start gap-2">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(notif.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(notif.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className={`${notif.lida === 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <Info size={16} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs ${notif.lida === 0 ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                        {notif.mensagem}
                      </p>
                      <span className="text-[9px] text-slate-400 font-medium mt-1 block">
                        {new Date(notif.criado_em).toLocaleString('pt-BR')}
                      </span>
                      {notif.tipo === 'acao_necessaria' && notif.lida === 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <button onClick={() => handleAction(notif, true)} className="px-2 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded">
                            Aprovar
                          </button>
                          <button onClick={() => handleAction(notif, false)} className="px-2 py-1 text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 rounded">
                            Negar
                          </button>
                        </div>
                      )}
                      {(notif.tipo === 'acesso_prontuario' || notif.mensagem.includes('prontuário')) && (
                        <div className="mt-2">
                          <a
                            href={`/professional/patients?cpf=${notif.referencia_id || ''}`}
                            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-xs"
                          >
                            Ver Prontuário
                          </a>
                        </div>
                      )}
                      {notif.tipo === 'documento_emitido' && (
                        <div className="mt-2">
                          <a
                            href={`/client/prescriptions?viewId=${notif.referencia_id || ''}`}
                            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-xs"
                          >
                            Visualizar Documento
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-center gap-2">
                      {notif.lida === 0 && notif.tipo !== 'acao_necessaria' && (
                        <button 
                          onClick={() => markAsRead(notif.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                          title="Marcar como lida"
                        >
                          <Check size={12} />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(notif.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Excluir notificação"
                      >
                        <span className="text-[10px] font-bold">X</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal da Notificação */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedNotification(null)} />
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-[70] animate-fadeIn">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Info size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">Detalhes da Notificação</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {new Date(selectedNotification.criado_em).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedNotification(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-slate-700 text-sm leading-relaxed">
                  {selectedNotification.mensagem}
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                {(selectedNotification.tipo === 'acesso_prontuario' || selectedNotification.mensagem.includes('prontuário')) && (
                  <a
                    href={`/professional/patients?cpf=${selectedNotification.referencia_id || ''}`}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                  >
                    Ver Prontuário
                  </a>
                )}
                {selectedNotification.tipo === 'documento_emitido' && (
                  <a
                    href={`/client/prescriptions?viewId=${selectedNotification.referencia_id || ''}`}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                  >
                    Visualizar Documento
                  </a>
                )}
                <button onClick={() => setSelectedNotification(null)} className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-300 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
