import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Plus, Trash2, Loader2, ShieldCheck
} from 'lucide-react';
import { API_URL } from '../../config';

export const CompanyHealthPlans: React.FC = () => {
  const [plansList, setPlansList] = useState<any[]>([]); // Todos os planos cadastrados na plataforma
  const [companyPlans, setCompanyPlans] = useState<any[]>([]); // Planos credenciados pela clínica
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({ operadora: '', plano: '', produto: '', valor_consulta: '', valor_exame: '', valor_plano: '' });
  const [newPlanLoading, setNewPlanLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedPlanProcedures, setSelectedPlanProcedures] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  useEffect(() => {
    fetchPlans();
  }, [token, companyId]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      if (token && companyId) {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Obter dados detalhados da empresa (inclui planos vinculados)
        const resCompany = await fetch(`${API_URL}/api/companies/${companyId}`, { headers });
        const companyDetail = await resCompany.json();
        setCompanyPlans(companyDetail.health_plans || []);

        // Obter todos os planos cadastrados no sistema
        const resAllPlans = await fetch(`${API_URL}/api/health-plans`, { headers });
        const allPlans = await resAllPlans.json();
        setPlansList(Array.isArray(allPlans) ? allPlans : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanForm.operadora || !newPlanForm.plano) {
      setError('Preencha a operadora e o nome do plano.');
      return;
    }
    setNewPlanLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/health-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          operadora: newPlanForm.operadora,
          plano: newPlanForm.plano,
          produto: newPlanForm.produto || 'Básico',
          valor_consulta: newPlanForm.valor_consulta ? parseFloat(newPlanForm.valor_consulta) : 0,
          valor_exame: newPlanForm.valor_exame ? parseFloat(newPlanForm.valor_exame) : 0,
          valor_plano: newPlanForm.valor_plano ? parseFloat(newPlanForm.valor_plano) : 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar plano.');
      
      setSuccess('Plano criado com sucesso! Agora você pode vinculá-lo.');
      setShowNewPlanModal(false);
      setNewPlanForm({ operadora: '', plano: '', produto: '', valor_consulta: '', valor_exame: '', valor_plano: '' });
      fetchPlans(); // Reload plans list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setNewPlanLoading(false);
    }
  };

  const handleLinkPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedPlanId) {
      setError('Selecione um plano de saúde da lista.');
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/companies/${companyId}/health-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          health_plan_id: selectedPlanId,
          procedures: selectedPlanProcedures
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao vincular convênio.');
      }

      setSuccess('Plano de saúde credenciado com sucesso!');
      setSelectedPlanId('');
      setSelectedPlanProcedures('');
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRemovePlan = async (relationId: number) => {
    if (!confirm('Deseja realmente remover este plano de saúde dos convênios atendidos?')) return;
    try {
      const response = await fetch(`${API_URL}/api/companies/health-plans/${relationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchPlans();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* Formulário de Vinculação de Planos */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-md font-bold text-slate-800 flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              <span>Credenciar Convênio</span>
              </div>
              <button
                onClick={() => setShowNewPlanModal(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                + Criar Novo Plano
              </button>
            </h3>

            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Escolha uma operadora de plano de saúde e detalhe quais procedimentos ou exames sua clínica realiza por ela.
            </p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[11px] font-bold">⚠️ {error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-[11px] font-bold">✓ {success}</div>}

          <form onSubmit={handleLinkPlan} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Selecione o Convênio *</label>
              <select
                value={selectedPlanId}
                onChange={e => setSelectedPlanId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none"
              >
                <option value="">Selecione...</option>
                {plansList.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.operadora} - {plan.plano} ({plan.produto})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Procedimentos Cobertos</label>
              <textarea
                value={selectedPlanProcedures}
                onChange={e => setSelectedPlanProcedures(e.target.value)}
                rows={4}
                placeholder="Ex: Consulta Cardiológica, Raio-X, Exames de Sangue..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar Convênio'}
            </button>
          </form>
        </div>

        <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-5 flex gap-3 text-indigo-800">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
          <div className="space-y-1">
            <p className="text-xs font-black">Central de Planos de Saúde</p>
            <p className="text-[10px] leading-relaxed font-semibold opacity-95">
              Credenciar os planos de saúde garante que pacientes que filtrem pesquisas por convênio encontrem seus médicos com mais facilidade na busca da plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* Planos Credenciados */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5.5 h-5.5 text-indigo-600" />
              <span>Convênios Aceitos pela Clínica</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Lista de operadoras que a clínica atende para consultas e exames.
            </p>
          </div>

          {companyPlans.length === 0 ? (
            <div className="border border-dashed border-slate-150 p-10 text-center rounded-2xl">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs text-slate-400 font-bold">Nenhum convênio cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyPlans.map(item => (
                <div key={item.id} className="border border-slate-150 bg-slate-50 p-4 rounded-2xl relative flex flex-col justify-between hover:border-slate-300 transition-all">
                  <button
                    onClick={() => handleRemovePlan(item.id)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="pr-8">
                    <h4 className="text-sm font-black text-slate-800">{item.company_name}</h4>
                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider mt-0.5">
                      {item.plan_name} • {item.product_name}
                    </p>

                    {item.procedures && (
                      <div className="mt-3">
                        <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Procedimentos Permitidos:</p>
                        <p className="text-xs text-slate-600 font-semibold leading-relaxed mt-1 bg-white p-3.5 rounded-xl border border-slate-150">
                          {item.procedures}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </div>

      {showNewPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-md font-black text-slate-800">Criar Novo Plano de Saúde</h3>
              <button onClick={() => setShowNewPlanModal(false)} className="text-slate-400 hover:text-slate-600"><span className="text-xl">×</span></button>
            </div>
            <form onSubmit={handleCreateNewPlan} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Operadora *</label>
                <input required type="text" placeholder="Ex: Unimed" value={newPlanForm.operadora} onChange={e => setNewPlanForm({...newPlanForm, operadora: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Nome do Plano *</label>
                <input required type="text" placeholder="Ex: Unimed Ouro Flex" value={newPlanForm.plano} onChange={e => setNewPlanForm({...newPlanForm, plano: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition" />
              </div>
                            <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Produto/Segmentação</label>
                <input type="text" placeholder="Ex: Enfermaria" value={newPlanForm.produto} onChange={e => setNewPlanForm({...newPlanForm, produto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition" />
              </div>
                            <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Valor do Plano / Contrato (R$)</label>
                <input type="number" step="0.01" placeholder="Ex: 299.90" value={newPlanForm.valor_plano} onChange={e => setNewPlanForm({...newPlanForm, valor_plano: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Valor Consulta (R$)</label>
                  <input type="number" step="0.01" placeholder="Ex: 100.00" value={newPlanForm.valor_consulta} onChange={e => setNewPlanForm({...newPlanForm, valor_consulta: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Valor Exames (R$)</label>
                  <input type="number" step="0.01" placeholder="Ex: 50.00" value={newPlanForm.valor_exame} onChange={e => setNewPlanForm({...newPlanForm, valor_exame: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition" />
                </div>
              </div>
              <button type="submit" disabled={newPlanLoading} className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5">
                {newPlanLoading ? 'Criando...' : 'Salvar Plano'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
