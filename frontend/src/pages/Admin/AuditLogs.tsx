import React, { useEffect, useState } from 'react';
import { History, Search, ArrowRight, Activity, Filter, Clock } from 'lucide-react';
import { API_URL } from '../../config';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, tableFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (actionFilter) query.append('action', actionFilter);
      if (tableFilter) query.append('table', tableFilter);
      if (emailFilter) query.append('userEmail', emailFilter);

      const res = await fetch(`${API_URL}/api/audit-logs?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const result = await res.json();
      if (result.data) {
        setLogs(result.data);
        setTotalPages(result.meta.last_page);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch(action.toUpperCase()) {
      case 'INSERT': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'UPDATE': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'DELETE': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getActionIcon = (_action: string) => {
    return <Activity className="w-3 h-3" />;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 text-white shadow-lg">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Auditoria de Sistema</h1>
          </div>
          <p className="text-sm font-semibold text-slate-500">Monitoramento e log de ações no banco de dados.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-500 mr-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-bold">Filtros:</span>
        </div>
        
        <select 
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
        >
          <option value="">Todas as Ações</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>

        <select 
          value={tableFilter}
          onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
        >
          <option value="">Todas as Tabelas</option>
          <option value="profissionais">Profissionais</option>
          <option value="empresas">Empresas</option>
          <option value="usuarios">Usuários</option>
          <option value="planos_saude">Planos de Saúde</option>
          <option value="clientes">Clientes</option>
          <option value="profissional_empresas">Vínculos (Clínica/Prof)</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por e-mail do usuário..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Ação / Data</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Tabela / Registro</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-semibold">
                    Carregando logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-semibold">Nenhum log encontrado para os filtros atuais.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest w-fit ${getActionColor(log.action_type)}`}>
                            {getActionIcon(log.action_type)}
                            {log.action_type}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <Clock className="w-3 h-3" />
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm font-black text-slate-800">{log.user_email}</p>
                        <p className="text-xs font-semibold text-slate-500">ID: {log.user_id || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm font-bold text-indigo-600">{log.table_name}</p>
                        {log.record_id && (
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">ID Reg: {log.record_id}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col items-end gap-2 text-right">
                          <details className="w-full max-w-sm text-left group/details">
                            <summary className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer list-none flex items-center justify-end gap-1">
                              <span>Ver payload JSON</span>
                              <ArrowRight className="w-3 h-3 group-open/details:rotate-90 transition-transform" />
                            </summary>
                            <div className="mt-2 space-y-2 p-3 bg-slate-900 rounded-xl overflow-x-auto">
                              {log.old_values && (
                                <div>
                                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">Antes</span>
                                  <pre className="text-[10px] text-slate-300 font-mono leading-relaxed">
                                    {JSON.stringify(JSON.parse(log.old_values), null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.old_values && log.new_values && (
                                <div className="h-px bg-slate-800 my-2"></div>
                              )}
                              {log.new_values && (
                                <div>
                                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Depois</span>
                                  <pre className="text-[10px] text-slate-300 font-mono leading-relaxed">
                                    {JSON.stringify(JSON.parse(log.new_values), null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Anterior
            </button>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
