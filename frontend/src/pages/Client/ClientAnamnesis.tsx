import React, { useState, useEffect } from 'react';
import { ClipboardList, Save, Loader2, Plus, CheckCircle } from 'lucide-react';
import { API_URL } from '../../config';

interface AnamnesisRecord {
  id: number; queixa_principal?: string; historico_doencas?: string; alergias?: string;
  medicamentos_uso?: string; historico_familiar?: string; habitos?: string;
  pressao_arterial?: string; glicemia?: string; cirurgias_anteriores?: string;
  observacoes?: string; criado_em: string;
}

const SECTION_CLASS = 'bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4';
const LABEL_CLASS = 'block text-xs font-bold text-slate-600 mb-1.5';
const INPUT_CLASS = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition';
const TEXTAREA_CLASS = `${INPUT_CLASS} resize-none`;

export const ClientAnamnesis: React.FC = () => {
  const [records, setRecords] = useState<AnamnesisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'view' | 'form'>('view');
  const [error, setError] = useState('');

  const clienteId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [form, setForm] = useState({
    queixa_principal: '', historico_doencas: '', alergias: '', medicamentos_uso: '',
    historico_familiar: '', habitos: '', pressao_arterial: '', glicemia: '',
    cirurgias_anteriores: '', observacoes: '',
  });

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/anamnesis/client/${clienteId}`, { headers });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { setRecords([]); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`${API_URL}/api/anamnesis/client/${clienteId}`, {
        method: 'POST', headers, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setSaved(true);
      setMode('view');
      fetchRecords();
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const loadRecord = (rec: AnamnesisRecord) => {
    setForm({
      queixa_principal: rec.queixa_principal || '',
      historico_doencas: rec.historico_doencas || '',
      alergias: rec.alergias || '',
      medicamentos_uso: rec.medicamentos_uso || '',
      historico_familiar: rec.historico_familiar || '',
      habitos: rec.habitos || '',
      pressao_arterial: rec.pressao_arterial || '',
      glicemia: rec.glicemia || '',
      cirurgias_anteriores: rec.cirurgias_anteriores || '',
      observacoes: rec.observacoes || '',
    });
    setMode('form');
  };

  const sf = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Pré-Consulta / Anamnese</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Preencha suas informações de saúde para agilizar suas consultas</p>
        </div>
        <button
          onClick={() => { setForm({ queixa_principal: '', historico_doencas: '', alergias: '', medicamentos_uso: '', historico_familiar: '', habitos: '', pressao_arterial: '', glicemia: '', cirurgias_anteriores: '', observacoes: '' }); setMode('form'); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
        >
          <Plus className="w-4 h-4" /> Nova Anamnese
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
          <CheckCircle className="w-4 h-4" /> Anamnese salva com sucesso!
        </div>
      )}

      {mode === 'view' ? (
        loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="font-black text-slate-700 mb-2">Nenhuma anamnese registrada</h3>
            <p className="text-sm text-slate-400 mb-6">Preencha seu histórico de saúde para facilitar suas consultas médicas</p>
            <button onClick={() => setMode('form')} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              Preencher Agora
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map(rec => (
              <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => loadRecord(rec)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">Anamnese de {new Date(rec.criado_em).toLocaleDateString('pt-BR')}</p>
                      {rec.queixa_principal && <p className="text-xs text-slate-500">{rec.queixa_principal.slice(0, 60)}...</p>}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 hover:underline">Editar</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {rec.alergias && <div className="bg-red-50 rounded-lg p-2"><p className="font-bold text-red-700 text-[10px] uppercase">Alergias</p><p className="text-slate-700 mt-0.5">{rec.alergias.slice(0, 40)}</p></div>}
                  {rec.pressao_arterial && <div className="bg-blue-50 rounded-lg p-2"><p className="font-bold text-blue-700 text-[10px] uppercase">PA</p><p className="text-slate-700 mt-0.5">{rec.pressao_arterial}</p></div>}
                  {rec.glicemia && <div className="bg-orange-50 rounded-lg p-2"><p className="font-bold text-orange-700 text-[10px] uppercase">Glicemia</p><p className="text-slate-700 mt-0.5">{rec.glicemia}</p></div>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold">{error}</div>}

          <div className={SECTION_CLASS}>
            <h2 className="text-sm font-black text-slate-700 border-b border-slate-100 pb-3">🩺 Queixa Principal</h2>
            <div>
              <label className={LABEL_CLASS}>Queixa Principal</label>
              <textarea value={form.queixa_principal} onChange={e => sf('queixa_principal', e.target.value)} rows={3}
                placeholder="Descreva o principal motivo da consulta..." className={TEXTAREA_CLASS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Pressão Arterial</label>
                <input value={form.pressao_arterial} onChange={e => sf('pressao_arterial', e.target.value)} placeholder="Ex: 120/80 mmHg" className={INPUT_CLASS} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Glicemia</label>
                <input value={form.glicemia} onChange={e => sf('glicemia', e.target.value)} placeholder="Ex: 98 mg/dL" className={INPUT_CLASS} />
              </div>
            </div>
          </div>

          <div className={SECTION_CLASS}>
            <h2 className="text-sm font-black text-slate-700 border-b border-slate-100 pb-3">📋 Histórico de Saúde</h2>
            <div>
              <label className={LABEL_CLASS}>Histórico de Doenças</label>
              <textarea value={form.historico_doencas} onChange={e => sf('historico_doencas', e.target.value)} rows={3}
                placeholder="Doenças crônicas, condições pré-existentes..." className={TEXTAREA_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Alergias</label>
              <textarea value={form.alergias} onChange={e => sf('alergias', e.target.value)} rows={2}
                placeholder="Medicamentos, alimentos, substâncias..." className={TEXTAREA_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Cirurgias Anteriores</label>
              <textarea value={form.cirurgias_anteriores} onChange={e => sf('cirurgias_anteriores', e.target.value)} rows={2}
                placeholder="Cirurgias realizadas e datas aproximadas..." className={TEXTAREA_CLASS} />
            </div>
          </div>

          <div className={SECTION_CLASS}>
            <h2 className="text-sm font-black text-slate-700 border-b border-slate-100 pb-3">💊 Medicamentos e Histórico Familiar</h2>
            <div>
              <label className={LABEL_CLASS}>Medicamentos em Uso</label>
              <textarea value={form.medicamentos_uso} onChange={e => sf('medicamentos_uso', e.target.value)} rows={3}
                placeholder="Liste os medicamentos que usa atualmente..." className={TEXTAREA_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Histórico Familiar</label>
              <textarea value={form.historico_familiar} onChange={e => sf('historico_familiar', e.target.value)} rows={3}
                placeholder="Doenças na família (diabetes, hipertensão, câncer...)..." className={TEXTAREA_CLASS} />
            </div>
          </div>

          <div className={SECTION_CLASS}>
            <h2 className="text-sm font-black text-slate-700 border-b border-slate-100 pb-3">🌿 Hábitos e Estilo de Vida</h2>
            <div>
              <label className={LABEL_CLASS}>Hábitos</label>
              <textarea value={form.habitos} onChange={e => sf('habitos', e.target.value)} rows={3}
                placeholder="Atividade física, alimentação, tabagismo, álcool, sono..." className={TEXTAREA_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Observações Adicionais</label>
              <textarea value={form.observacoes} onChange={e => sf('observacoes', e.target.value)} rows={2}
                placeholder="Informações relevantes que não se encaixaram acima..." className={TEXTAREA_CLASS} />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setMode('view')} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar Anamnese</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
