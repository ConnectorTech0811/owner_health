import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Loader2, Sparkles, Send, Copy, Check
} from 'lucide-react';
import { API_URL } from '../../config';

export const CompanyAnamnesisConfig: React.FC = () => {
  const [fields, setFields] = useState<Record<string, boolean>>({
    queixa_principal: true,
    historico_doencas: true,
    alergias: true,
    medicamentos_uso: true,
    historico_familiar: true,
    habitos: true,
    pressao_arterial: true,
    glicemia: true,
    cirurgias_anteriores: true
  });

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  const FIELD_LABELS: Record<string, string> = {
    queixa_principal: 'Queixa Principal / Motivo da Consulta',
    historico_doencas: 'Histórico de Doenças Crônicas',
    alergias: 'Alergias e Reações Alimentares/Medicamentosas',
    medicamentos_uso: 'Medicamentos e Suplementos em Uso Contínuo',
    historico_familiar: 'Histórico de Saúde Familiar (Cardiopatias, Câncer, etc.)',
    habitos: 'Hábitos e Estilo de Vida (Fumo, Álcool, Atividade Física)',
    pressao_arterial: 'Medição Recente de Pressão Arterial',
    glicemia: 'Medição Recente de Glicemia em Jejum',
    cirurgias_anteriores: 'Histórico de Cirurgias e Internações Anteriores'
  };

  useEffect(() => {
    fetchConfig();
  }, [token, companyId]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      if (token && companyId) {
        const res = await fetch(`${API_URL}/api/companies/${companyId}/anamnesis-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && data.campos_ativos) {
          const parsed = typeof data.campos_ativos === 'string' ? JSON.parse(data.campos_ativos) : data.campos_ativos;
          setFields(parsed);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleField = (key: string) => {
    setFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/anamnesis-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ campos_ativos: fields })
      });
      if (!res.ok) {
        throw new Error('Erro ao salvar as configurações.');
      }
      setSuccess('Configurações de anamnese salvas com sucesso!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCopyLink = () => {
    const inviteLink = `https://owner-health-ktsf.vercel.app/client/anamnesis`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">Personalizar Pré-Consulta</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Configure os campos do formulário de anamnese que seus pacientes preencherão antes das consultas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Configuração da Ficha */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5.5 h-5.5 text-indigo-600" />
              <span>Campos Ativos da Ficha</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Habilite ou desabilite as seções visíveis no formulário de pré-consulta dos pacientes.
            </p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[11px] font-bold">⚠️ {error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-[11px] font-bold">✓ {success}</div>}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-3">
              {Object.entries(fields).map(([key, isActive]) => (
                <div
                  key={key}
                  onClick={() => handleToggleField(key)}
                  className="flex items-center justify-between p-4 rounded-xl border cursor-pointer hover:border-indigo-400 transition-all select-none bg-slate-50"
                  style={{ borderColor: isActive ? '#4f46e5' : '#e2e8f0' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: isActive ? '#4f46e5' : 'white',
                        borderColor: isActive ? '#4f46e5' : '#cbd5e1'
                      }}
                    >
                      {isActive && <span className="text-white text-[10px] font-black">✓</span>}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{FIELD_LABELS[key] || key}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Configuração de Anamnese'}
            </button>
          </form>
        </div>
      </div>

      {/* Lado Direito: Envio ao Paciente */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-600" />
              <span>Enviar para o Paciente</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Compartilhe o formulário pré-consulta com seus pacientes para preenchimento domiciliar antes da consulta.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col gap-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Link de Pré-Consulta</span>
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between font-mono text-[10px] text-slate-600 truncate select-all">
              <span>https://owner-health-ktsf.vercel.app/client/anamnesis</span>
            </div>
            
            <button
              onClick={handleCopyLink}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link Anamnese</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-5 flex gap-3 text-indigo-800">
          <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
          <div className="space-y-1">
            <p className="text-xs font-black">Triagem Inteligente</p>
            <p className="text-[10px] leading-relaxed font-semibold opacity-95">
              Os pacientes recebem um questionário dinâmico. O preenchimento reduz em até 40% o tempo gasto na anamnese presencial durante a consulta médica.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
