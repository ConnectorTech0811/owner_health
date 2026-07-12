import React from 'react';
import { Settings, Shield, Bell, Database, Save } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 fade-in">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 text-white shadow-lg">
            <Settings className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Configurações do Sistema</h1>
        </div>
        <p className="text-sm font-semibold text-slate-500">Gerencie os parâmetros globais da plataforma Owner Health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Segurança e Retenção */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Database className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-black text-slate-800">Retenção de Dados & Auditoria</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Tempo de Retenção de Logs (Meses)
                </label>
                <input 
                  type="number" 
                  defaultValue={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-2 font-semibold">Logs de auditoria mais antigos que este período serão apagados automaticamente.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Shield className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-black text-slate-800">Segurança Global</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-800">Forçar 2FA para Profissionais</p>
                  <p className="text-xs font-semibold text-slate-500">Exige autenticação em duas etapas para médicos e secretários.</p>
                </div>
                <input type="checkbox" className="w-5 h-5 accent-indigo-600 cursor-pointer" />
              </label>

              <label className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-800">Bloqueio Automático de Inatividade</p>
                  <p className="text-xs font-semibold text-slate-500">Desconecta usuários inativos após 30 minutos.</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-indigo-600 cursor-pointer" />
              </label>
            </div>
          </div>
        </div>

        {/* Notificações e Side Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-white space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black">Notificações do Sistema</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 mt-1 accent-amber-500" />
                <div>
                  <p className="text-sm font-bold">Alertas de Erro Crítico</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Envia e-mail para admins quando APIs falham repetidamente.</p>
                </div>
              </label>
            </div>
          </div>

          <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/30">
            <Save className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>

      </div>
    </div>
  );
};
