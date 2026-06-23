import React, { useState, useEffect } from 'react';
import { Star, Send, Loader2, CheckCircle, MessageSquare } from 'lucide-react';
import { API_URL } from '../../config';

interface SatisfactionRecord {
  id: number; profissional_nome?: string; especialidade?: string;
  pontualidade: number; clareza: number; qualidade: number; media: number;
  comentario?: string; criado_em: string;
}

const StarRating: React.FC<{ value: number; onChange: (v: number) => void; label: string; color: string }> = ({ value, onChange, label, color }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-2">{label}</label>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-125 focus:outline-none"
          >
            <Star
              className="w-8 h-8 transition-colors"
              fill={(hovered || value) >= star ? color : 'transparent'}
              stroke={color}
              strokeWidth={1.5}
            />
          </button>
        ))}
        <span className="ml-2 text-sm font-black text-slate-500">{value > 0 ? `${value}/5` : ''}</span>
      </div>
    </div>
  );
};

const STAR_COLOR_MAP: Record<string, string> = {
  pontualidade: '#f59e0b',
  clareza: '#3b82f6',
  qualidade: '#10b981',
};

export const ClientSatisfaction: React.FC = () => {
  const [records, setRecords] = useState<SatisfactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const clienteId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [form, setForm] = useState({
    profissional_nome: '', especialidade: '', pontualidade: 0, clareza: 0, qualidade: 0, comentario: '',
  });

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/satisfaction/client/${clienteId}`, { headers });
      const data = await res.json();
      setRecords(Array.isArray(data) ? [...data].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()) : []);
    } catch { setRecords([]); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.pontualidade || !form.clareza || !form.qualidade) {
      setError('Por favor, avalie os três critérios'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/satisfaction/client/${clienteId}`, {
        method: 'POST', headers, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setSaved(true);
      setShowForm(false);
      setForm({ profissional_nome: '', especialidade: '', pontualidade: 0, clareza: 0, qualidade: 0, comentario: '' });
      fetchRecords();
      setTimeout(() => setSaved(false), 4000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally { setSaving(false); }
  };

  const renderStars = (val: number, color: string) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className="w-3.5 h-3.5" fill={val >= s ? color : 'transparent'} stroke={color} strokeWidth={1.5} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Pesquisa de Satisfação</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Avalie os atendimentos que você recebeu</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
        >
          <Star className="w-4 h-4" /> Nova Avaliação
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
          <CheckCircle className="w-4 h-4" /> Avaliação enviada com sucesso! Obrigado pelo feedback.
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" /> Avaliar Atendimento
          </h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm font-semibold">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome do Profissional</label>
              <input value={form.profissional_nome} onChange={e => setForm(f => ({ ...f, profissional_nome: e.target.value }))}
                placeholder="Dr(a). Nome do profissional"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Especialidade</label>
              <input value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
                placeholder="Ex: Cardiologia, Fisioterapia..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
            </div>
          </div>

          {/* Estrelas */}
          <div className="bg-slate-50 rounded-2xl p-6 space-y-6">
            <StarRating label="⏱️ Pontualidade" value={form.pontualidade} onChange={v => setForm(f => ({ ...f, pontualidade: v }))} color={STAR_COLOR_MAP.pontualidade} />
            <StarRating label="💬 Clareza nas Explicações" value={form.clareza} onChange={v => setForm(f => ({ ...f, clareza: v }))} color={STAR_COLOR_MAP.clareza} />
            <StarRating label="🏥 Qualidade do Atendimento" value={form.qualidade} onChange={v => setForm(f => ({ ...f, qualidade: v }))} color={STAR_COLOR_MAP.qualidade} />

            {(form.pontualidade > 0 && form.clareza > 0 && form.qualidade > 0) && (
              <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-200">
                <span className="text-sm font-bold text-slate-600">Média Geral</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black" style={{ color: '#d97706' }}>
                    {((form.pontualidade + form.clareza + form.qualidade) / 3).toFixed(1)}
                  </span>
                  <Star className="w-5 h-5 fill-amber-400 stroke-amber-400" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Comentário (opcional)</label>
            <textarea value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))} rows={3}
              placeholder="Compartilhe sua experiência com o atendimento..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar Avaliação</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
      ) : records.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="font-black text-slate-700 mb-2">Nenhuma avaliação ainda</h3>
          <p className="text-sm text-slate-400 mb-6">Avalie os profissionais e clínicas que te atenderam para ajudar outros pacientes</p>
          <button onClick={() => setShowForm(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
            Fazer Primeira Avaliação
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map(rec => {
            const avg = rec.media || ((rec.pontualidade + rec.clareza + rec.qualidade) / 3);
            return (
              <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-black text-slate-800">{rec.profissional_nome || 'Profissional'}</h3>
                    {rec.especialidade && <p className="text-xs text-slate-500 font-medium">{rec.especialidade}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(rec.criado_em).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl">
                    <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                    <span className="font-black text-amber-700 text-sm">{Number(avg).toFixed(1)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pontualidade</p>
                    {renderStars(rec.pontualidade, STAR_COLOR_MAP.pontualidade)}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Clareza</p>
                    {renderStars(rec.clareza, STAR_COLOR_MAP.clareza)}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Qualidade</p>
                    {renderStars(rec.qualidade, STAR_COLOR_MAP.qualidade)}
                  </div>
                </div>
                {rec.comentario && (
                  <div className="mt-4 bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{rec.comentario}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
