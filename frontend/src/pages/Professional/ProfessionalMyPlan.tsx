import React, { useState, useEffect } from 'react';
import { ShieldCheck, Stethoscope, ClipboardList, Building2, Mail, CheckCircle2, Edit2, Loader2, Award } from 'lucide-react';
import { API_URL } from '../../config';

export const ProfessionalMyPlan: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [professional, setProfessional] = useState<any>(null);
  const [linkedPlans, setLinkedPlans] = useState<any[]>([]);
  const [linkedCompanies, setLinkedCompanies] = useState<any[]>([]);
  
  // Editar valor da consulta pelo próprio médico
  const [editingFee, setEditingFee] = useState(false);
  const [newFee, setNewFee] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const [feeSuccess, setFeeSuccess] = useState('');

  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : {};

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const profRes = await fetch(`${API_URL}/api/professionals`, { headers });
      const profData = await profRes.json();
      const profList = Array.isArray(profData) ? profData : [];
      
      const prof = profList.find((p: any) =>
        p.email?.toLowerCase() === user.email?.toLowerCase() || p.usuario_id === user.id
      );

      if (prof) {
        const detailRes = await fetch(`${API_URL}/api/professionals/${prof.id}`, { headers });
        const detail = await detailRes.json();
        setProfessional(detail);
        setNewFee(detail.valor_consulta ? String(detail.valor_consulta) : '150.00');
        setLinkedCompanies(Array.isArray(detail.companies) ? detail.companies : []);
        setLinkedPlans(Array.isArray(detail.health_plans) ? detail.health_plans : []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFee = async () => {
    if (!professional || !newFee) return;
    setSavingFee(true);
    setFeeSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/professionals/${professional.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          valor_consulta: parseFloat(newFee)
        })
      });

      if (!res.ok) throw new Error('Falha ao atualizar valor da consulta');
      
      setFeeSuccess('Valor atualizado com sucesso!');
      setProfessional({ ...professional, valor_consulta: parseFloat(newFee) });
      setTimeout(() => {
        setEditingFee(false);
        setFeeSuccess('');
      }, 1200);
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar valor');
    } finally {
      setSavingFee(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const valorConsulta = professional?.valor_consulta ? parseFloat(professional.valor_consulta) : 150;

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Meu Plano & Vínculos</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Gestão do seu perfil profissional, licença, valor de consulta e clínicas credenciadas.
        </p>
      </div>

      {/* Card do profissional */}
      {professional && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs border border-indigo-100">
              <Stethoscope className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {professional.tipo_profissional === 'medico' ? 'Médico' : (professional.tipo_profissional || 'Profissional de Saúde')}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ativo no Sistema
                </span>
              </div>
              
              <h2 className="text-xl font-black text-slate-800 mt-1">{professional.nome}</h2>
              
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                {professional.numero_conselho && (
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {professional.numero_conselho}
                  </span>
                )}
                {professional.especialidade && (
                  <span className="text-slate-600 font-semibold">• {professional.especialidade}</span>
                )}
                <span className="flex items-center gap-1 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {professional.email}
                </span>
              </div>
            </div>
          </div>

          {/* Card do Valor da Consulta - Exclusivo para Médicos */}
          {professional.tipo_profissional === 'medico' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center min-w-[220px]">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Valor da Sua Consulta</span>
              
              {editingFee ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-slate-600">R$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={newFee}
                      onChange={e => setNewFee(e.target.value)}
                      className="w-full bg-white border border-indigo-300 rounded-lg px-2 py-1 text-sm font-bold text-indigo-700 focus:outline-none"
                    />
                  </div>
                  {feeSuccess && <p className="text-[10px] font-bold text-emerald-600">{feeSuccess}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpdateFee}
                      disabled={savingFee}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      {savingFee ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setEditingFee(false)}
                      className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 mt-1">
                  <span className="text-xl font-black text-indigo-600">R$ {valorConsulta.toFixed(2).replace('.', ',')}</span>
                  <button
                    onClick={() => setEditingFee(true)}
                    className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                    title="Alterar valor da consulta"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid com Licença, Clínicas e Convênios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status da Licença da Plataforma */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">Licença do Profissional</h3>
          </div>
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">Plano Enterprise</span>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Ativo</span>
            </div>
            <p className="text-xs text-indigo-700 font-medium leading-relaxed">
              Acesso ilimitado ao sistema de agendamento, anamneses personalizadas e prontuário dos pacientes.
            </p>
          </div>
          <div className="space-y-2 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Agendamento e Controle de Horários
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Criador de Anamnese por Paciente
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Histórico de Consultas & Prontuário
            </div>
          </div>
        </div>

        {/* Clínicas vinculadas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">Clínicas / Hospitais</h3>
          </div>
          {linkedCompanies.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center">
              <p className="text-xs text-slate-400 font-bold">Nenhuma clínica vinculada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedCompanies.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{c.nome_fantasia || c.razao_social}</p>
                    {c.email && <p className="text-[11px] text-slate-500 mt-0.5">{c.email}</p>}
                    <span className="inline-block text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">Credenciado</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Convênios/planos atendidos */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">Convênios Atendidos</h3>
          </div>
          {linkedPlans.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-1">
              <p className="text-xs text-slate-600 font-bold">Atendimento Particular Habilitado</p>
              <p className="text-[11px] text-slate-400">Para vincular planos como Unimed ou SulAmérica, solicite à administração da clínica.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedPlans.map((plan: any) => (
                <div key={plan.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{plan.company_name || plan.operadora}</p>
                  <p className="text-xs font-bold text-slate-800">{plan.plan_name || plan.plano}</p>
                  {(plan.product_name || plan.produto) && (
                    <p className="text-[10px] text-slate-500 font-semibold">{plan.product_name || plan.produto}</p>
                  )}
                  {plan.procedures && (
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Procedimentos: {plan.procedures}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
