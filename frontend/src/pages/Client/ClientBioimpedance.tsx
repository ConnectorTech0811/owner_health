import React, { useState, useEffect } from 'react';
import { Plus, Scale, Trash2, X, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { API_URL } from '../../config';

interface BioRecord {
  id: number; data: string; peso?: number; gordura_perc?: number;
  massa_muscular?: number; imc?: number; agua_perc?: number; massa_ossea?: number; observacoes?: string;
}

const imcClass = (imc?: number) => {
  if (!imc) return { label: 'N/A', color: 'text-slate-400' };
  if (imc < 18.5) return { label: 'Abaixo do peso', color: 'text-yellow-600' };
  if (imc < 25) return { label: 'Peso normal', color: 'text-emerald-600' };
  if (imc < 30) return { label: 'Sobrepeso', color: 'text-orange-500' };
  return { label: 'Obesidade', color: 'text-red-600' };
};

export const ClientBioimpedance: React.FC = () => {
  const [list, setList] = useState<BioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const clienteId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    peso: '', gordura_perc: '', massa_muscular: '', imc: '', agua_perc: '', massa_ossea: '', observacoes: '',
  });

  const calcImc = (peso: string) => {
    // placeholder simples: usuário informa altura internamente ou preenche manualmente
    setForm(f => ({ ...f, peso }));
  };

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/bioimpedance/client/${clienteId}`, { headers });
      const data = await res.json();
      setList(Array.isArray(data) ? [...data].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()) : []);
    } catch { setList([]); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.data || !form.peso) { setError('Data e peso são obrigatórios'); return; }
    setSaving(true); setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
      const res = await fetch(`${API_URL}/api/bioimpedance/client/${clienteId}`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setShowModal(false);
      setForm({ data: new Date().toISOString().split('T')[0], peso: '', gordura_perc: '', massa_muscular: '', imc: '', agua_perc: '', massa_ossea: '', observacoes: '' });
      fetchList();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este registro?')) return;
    await fetch(`${API_URL}/api/bioimpedance/${id}`, { method: 'DELETE', headers });
    fetchList();
  };

  const getTrend = (field: keyof BioRecord, idx: number) => {
    if (idx >= list.length - 1) return null;
    const curr = Number(list[idx][field]);
    const prev = Number(list[idx + 1][field]);
    if (isNaN(curr) || isNaN(prev) || curr === prev) return <Minus className="w-3 h-3 text-slate-400" />;
    return curr > prev
      ? <TrendingUp className="w-3 h-3 text-red-500" />
      : <TrendingDown className="w-3 h-3 text-emerald-500" />;
  };

  const fields = [
    { key: 'peso', label: 'Peso', unit: 'kg', color: 'text-slate-800' },
    { key: 'gordura_perc', label: 'Gordura', unit: '%', color: 'text-orange-600' },
    { key: 'massa_muscular', label: 'Músculo', unit: 'kg', color: 'text-emerald-600' },
    { key: 'imc', label: 'IMC', unit: '', color: 'text-blue-600' },
    { key: 'agua_perc', label: 'Água', unit: '%', color: 'text-cyan-600' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Bioimpedância</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Acompanhe a evolução da sua composição corporal</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
          <Plus className="w-4 h-4" /> Novo Registro
        </button>
      </div>

      {/* Resumo atual */}
      {list.length > 0 && (
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 rounded-2xl p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-3">Último Registro — {new Date(list[0].data).toLocaleDateString('pt-BR')}</p>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {fields.map(f => (
              <div key={f.key} className="text-center">
                <p className="text-2xl font-black">{list[0][f.key as keyof BioRecord] ?? '—'}{f.unit}</p>
                <p className="text-xs text-blue-200 font-bold mt-1">{f.label}</p>
                {f.key === 'imc' && (
                  <p className="text-[10px] font-bold mt-0.5 text-yellow-300">{imcClass(list[0].imc).label}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scale className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="font-black text-slate-700 mb-2">Nenhum registro ainda</h3>
          <p className="text-sm text-slate-400 mb-6">Adicione seus dados de bioimpedância para acompanhar sua evolução</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
            Adicionar Registro
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-500 uppercase tracking-wider">Peso</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-500 uppercase tracking-wider">Gordura</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-500 uppercase tracking-wider">Músculo</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-500 uppercase tracking-wider">IMC</th>
                  <th className="text-center px-3 py-3 font-bold text-slate-500 uppercase tracking-wider">Água</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((rec, idx) => (
                  <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-700">{new Date(rec.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 font-bold text-slate-800">
                        {rec.peso}kg {getTrend('peso', idx)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-orange-600">{rec.gordura_perc ? `${rec.gordura_perc}%` : '—'}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-600">{rec.massa_muscular ? `${rec.massa_muscular}kg` : '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-black ${imcClass(rec.imc).color}`}>{rec.imc ?? '—'}</span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-cyan-600">{rec.agua_perc ? `${rec.agua_perc}%` : '—'}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => handleDelete(rec.id)} className="text-slate-400 hover:text-red-500 transition p-1 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Novo Registro de Bioimpedância</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Data *</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
                </div>
                {[
                  { key: 'peso', label: 'Peso (kg) *', placeholder: '70.5' },
                  { key: 'gordura_perc', label: 'Gordura Corporal (%)', placeholder: '22.5' },
                  { key: 'massa_muscular', label: 'Massa Muscular (kg)', placeholder: '35.0' },
                  { key: 'imc', label: 'IMC', placeholder: '23.4' },
                  { key: 'agua_perc', label: 'Água Corporal (%)', placeholder: '55.0' },
                  { key: 'massa_ossea', label: 'Massa Óssea (kg)', placeholder: '2.8' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">{f.label}</label>
                    <input
                      type="number" step="0.1"
                      value={(form as Record<string, string>)[f.key]}
                      onChange={e => {
                        if (f.key === 'peso') calcImc(e.target.value);
                        else setForm(prev => ({ ...prev, [f.key]: e.target.value }));
                      }}
                      placeholder={f.placeholder}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition resize-none" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
