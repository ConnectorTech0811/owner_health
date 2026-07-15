import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Settings,
  Save, Copy, Check, Send, Sparkles, Eye, ClipboardList, X,
  Type, AlignLeft, Circle, CheckSquare, List, BarChart3, Calendar,
  Loader2, AlertCircle, Edit3, ChevronRight
} from 'lucide-react';
import { API_URL } from '../../config';

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'scale' | 'date';

interface Option { id?: number; texto: string; ordem: number; }
interface Question {
  id?: number; section_id?: number; texto: string; tipo: QuestionType;
  obrigatoria: boolean; ordem: number; placeholder: string; descricao: string;
  escala_min?: number; escala_max?: number; escala_label_min?: string; escala_label_max?: string;
  options?: Option[]; _loading?: boolean;
}
interface Section {
  id?: number; empresa_id?: number; titulo: string; descricao: string;
  ordem: number; ativo: boolean; questions?: Question[]; _open?: boolean;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'text',     label: 'Resposta curta',    icon: <Type className="w-4 h-4" />,         desc: 'Texto de uma linha' },
  { value: 'textarea', label: 'Parágrafo',         icon: <AlignLeft className="w-4 h-4" />,    desc: 'Texto longo' },
  { value: 'radio',    label: 'Múltipla escolha',  icon: <Circle className="w-4 h-4" />,       desc: 'Escolha única' },
  { value: 'checkbox', label: 'Caixas de seleção', icon: <CheckSquare className="w-4 h-4" />,  desc: 'Múltipla seleção' },
  { value: 'select',   label: 'Lista suspensa',    icon: <List className="w-4 h-4" />,         desc: 'Dropdown' },
  { value: 'scale',    label: 'Escala linear',     icon: <BarChart3 className="w-4 h-4" />,    desc: 'Ex: 1 a 10' },
  { value: 'date',     label: 'Data',              icon: <Calendar className="w-4 h-4" />,     desc: 'Seletor de data' },
];

const QUESTION_TYPE_MAP: Record<QuestionType, { label: string; icon: React.ReactNode }> = {
  text:     { label: 'Resposta curta',    icon: <Type className="w-3.5 h-3.5" /> },
  textarea: { label: 'Parágrafo',         icon: <AlignLeft className="w-3.5 h-3.5" /> },
  radio:    { label: 'Múltipla escolha',  icon: <Circle className="w-3.5 h-3.5" /> },
  checkbox: { label: 'Caixas de seleção', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  select:   { label: 'Lista suspensa',    icon: <List className="w-3.5 h-3.5" /> },
  scale:    { label: 'Escala linear',     icon: <BarChart3 className="w-3.5 h-3.5" /> },
  date:     { label: 'Data',              icon: <Calendar className="w-3.5 h-3.5" /> },
};

const needsOptions = (tipo: QuestionType) => ['radio', 'checkbox', 'select'].includes(tipo);

// ─── Modal de edição de pergunta ──────────────────────────────────────────────

interface QuestionModalProps {
  question: Question | null;
  sectionId: number;
  onSave: (q: Question) => void;
  onClose: () => void;
}

const QuestionModal: React.FC<QuestionModalProps> = ({ question, sectionId, onSave, onClose }) => {
  const [form, setForm] = useState<Question>(question || {
    section_id: sectionId, texto: '', tipo: 'text', obrigatoria: false,
    ordem: 0, placeholder: '', descricao: '', escala_min: 1, escala_max: 10,
    escala_label_min: 'Mínimo', escala_label_max: 'Máximo', options: []
  });
  const [typeOpen, setTypeOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(
    question?.options?.map(o => o.texto) || ['']
  );

  const sf = (key: keyof Question, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    const q = { ...form, options: options.filter(o => o.trim()).map((o, i) => ({ texto: o, ordem: i })) };
    onSave(q);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">{question ? 'Editar Pergunta' : 'Nova Pergunta'}</h2>
              <p className="text-xs text-slate-400 font-medium">Configure os detalhes da pergunta</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Enunciado */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Enunciado da pergunta *</label>
            <input
              value={form.texto}
              onChange={e => sf('texto', e.target.value)}
              placeholder="Ex: Qual é o motivo da sua consulta?"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition bg-slate-50"
            />
          </div>

          {/* Descrição/Subtítulo */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Descrição / Instrução (opcional)</label>
            <input
              value={form.descricao}
              onChange={e => sf('descricao', e.target.value)}
              placeholder="Ex: Marque todas que se aplicam"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition bg-slate-50"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipo de resposta</label>
            <div className="relative">
              <button
                onClick={() => setTypeOpen(o => !o)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium bg-slate-50 flex items-center justify-between hover:border-violet-400 transition"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  {QUESTION_TYPE_MAP[form.tipo].icon}
                  {QUESTION_TYPE_MAP[form.tipo].label}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {typeOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {QUESTION_TYPES.map(t => (
                    <button key={t.value} onClick={() => { sf('tipo', t.value); setTypeOpen(false); }}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition ${form.tipo === t.value ? 'bg-violet-50' : ''}`}>
                      <span className={`text-sm ${form.tipo === t.value ? 'text-violet-600' : 'text-slate-500'}`}>{t.icon}</span>
                      <span>
                        <span className={`block text-xs font-bold ${form.tipo === t.value ? 'text-violet-700' : 'text-slate-700'}`}>{t.label}</span>
                        <span className="block text-[10px] text-slate-400">{t.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Placeholder (text/textarea) */}
          {(form.tipo === 'text' || form.tipo === 'textarea') && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Texto de exemplo (placeholder)</label>
              <input
                value={form.placeholder}
                onChange={e => sf('placeholder', e.target.value)}
                placeholder="Ex: Digite sua resposta aqui..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition bg-slate-50"
              />
            </div>
          )}

          {/* Escala linear */}
          {form.tipo === 'scale' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Valor mínimo</label>
                <input type="number" value={form.escala_min} onChange={e => sf('escala_min', Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Valor máximo</label>
                <input type="number" value={form.escala_max} onChange={e => sf('escala_max', Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Rótulo do mínimo</label>
                <input value={form.escala_label_min} onChange={e => sf('escala_label_min', e.target.value)}
                  placeholder="Ex: Sem dor" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Rótulo do máximo</label>
                <input value={form.escala_label_max} onChange={e => sf('escala_label_max', e.target.value)}
                  placeholder="Ex: Dor insuportável" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition bg-slate-50" />
              </div>
            </div>
          )}

          {/* Opções (radio/checkbox/select) */}
          {needsOptions(form.tipo) && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Opções de resposta</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                    <input
                      value={opt}
                      onChange={e => { const n = [...options]; n[idx] = e.target.value; setOptions(n); }}
                      placeholder={`Opção ${idx + 1}`}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition bg-slate-50"
                    />
                    {options.length > 1 && (
                      <button onClick={() => setOptions(o => o.filter((_, i) => i !== idx))} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition">
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setOptions(o => [...o, ''])}
                  className="flex items-center gap-2 text-xs font-bold text-violet-600 hover:text-violet-700 mt-1 transition">
                  <Plus className="w-3.5 h-3.5" /> Adicionar opção
                </button>
              </div>
            </div>
          )}

          {/* Obrigatória */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-bold text-slate-700">Resposta obrigatória</p>
              <p className="text-xs text-slate-400 mt-0.5">O paciente não poderá avançar sem responder</p>
            </div>
            <button onClick={() => sf('obrigatoria', !form.obrigatoria)}
              className={`w-12 h-6 rounded-full transition-all ${form.obrigatoria ? 'bg-violet-600' : 'bg-slate-300'}`}
              style={{ position: 'relative' }}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.obrigatoria ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            Cancelar
          </button>
          <button onClick={handleSave}
            disabled={!form.texto.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
            style={{ background: form.texto.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : undefined }}>
            <Save className="w-4 h-4" /> Salvar Pergunta
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const CompanyAnamnesisConfig: React.FC = () => {
  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'builder' | 'responses'>('builder');
  const [modalQuestion, setModalQuestion] = useState<{ question: Question | null; sectionIdx: number } | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSectionIdx, setAddingSectionIdx] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const nextId = useRef(1000);
  const genId = () => nextId.current++;

  // Carrega seções + perguntas + opções
  useEffect(() => { loadForm(); }, []);

  const loadForm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/anamnesis/form/${companyId}`, { headers });
      if (!res.ok) throw new Error('Falha');
      const data: Section[] = await res.json();
      setSections(data.map(s => ({ ...s, _open: true, questions: s.questions || [] })));
    } catch {
      setSections([]);
    } finally { setLoading(false); }
  };

  // ── Seções ──────────────────────────────────────────────────────────────────

  const handleAddSection = async () => {
    const titulo = newSectionTitle.trim() || 'Nova Seção';
    try {
      const res = await fetch(`${API_URL}/api/anamnesis/empresa/${companyId}/sections`, {
        method: 'POST', headers,
        body: JSON.stringify({ titulo, descricao: '', ordem: sections.length, ativo: true })
      });
      const data = await res.json();
      setSections(prev => [...prev, { ...data, _open: true, questions: [] }]);
      setNewSectionTitle('');
      setAddingSectionIdx(null);
    } catch {
      const newS: Section = { id: genId(), empresa_id: Number(companyId), titulo, descricao: '', ordem: sections.length, ativo: true, _open: true, questions: [] };
      setSections(prev => [...prev, newS]);
      setNewSectionTitle('');
      setAddingSectionIdx(null);
    }
  };

  const handleDeleteSection = async (sIdx: number) => {
    const s = sections[sIdx];
    if (s.id) {
      try { await fetch(`${API_URL}/api/anamnesis/sections/${s.id}`, { method: 'DELETE', headers }); } catch {}
    }
    setSections(prev => prev.filter((_, i) => i !== sIdx));
  };

  const handleToggleSection = (sIdx: number) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, _open: !s._open } : s));
  };

  const handleSectionTitleChange = (sIdx: number, val: string) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, titulo: val } : s));
  };

  const handleSectionDescChange = (sIdx: number, val: string) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, descricao: val } : s));
  };

  // ── Perguntas ────────────────────────────────────────────────────────────────

  const handleAddQuestion = (sIdx: number) => {
    setModalQuestion({ question: null, sectionIdx: sIdx });
  };

  const handleEditQuestion = (sIdx: number, qIdx: number) => {
    setModalQuestion({ question: sections[sIdx].questions![qIdx], sectionIdx: sIdx });
  };

  const handleDeleteQuestion = async (sIdx: number, qIdx: number) => {
    const q = sections[sIdx].questions![qIdx];
    if (q.id) {
      try { await fetch(`${API_URL}/api/anamnesis/questions/${q.id}`, { method: 'DELETE', headers }); } catch {}
    }
    setSections(prev => prev.map((s, i) => i === sIdx
      ? { ...s, questions: s.questions!.filter((_, qi) => qi !== qIdx) }
      : s
    ));
  };

  const handleModalSave = async (q: Question) => {
    if (!modalQuestion) return;
    const { sectionIdx } = modalQuestion;
    const section = sections[sectionIdx];
    const sectionId = section.id!;
    const isEdit = !!q.id;

    try {
      if (isEdit) {
        // Atualiza pergunta
        await fetch(`${API_URL}/api/anamnesis/questions/${q.id}`, {
          method: 'PUT', headers, body: JSON.stringify(q)
        });
        // Atualiza opções
        if (needsOptions(q.tipo)) {
          await fetch(`${API_URL}/api/anamnesis/questions/${q.id}/options/bulk`, {
            method: 'PUT', headers, body: JSON.stringify({ options: q.options })
          });
        }
        setSections(prev => prev.map((s, si) => si !== sectionIdx ? s : {
          ...s, questions: s.questions!.map(existing => String(existing.id) === String(q.id) ? q : existing)
        }));
      } else {
        // Cria pergunta
        const res = await fetch(`${API_URL}/api/anamnesis/sections/${sectionId}/questions`, {
          method: 'POST', headers, body: JSON.stringify(q)
        });
        const created = await res.json();
        // Cria opções
        if (needsOptions(q.tipo) && q.options?.length) {
          await fetch(`${API_URL}/api/anamnesis/questions/${created.id}/options/bulk`, {
            method: 'PUT', headers, body: JSON.stringify({ options: q.options })
          });
        }
        setSections(prev => prev.map((s, si) => si !== sectionIdx ? s : {
          ...s, questions: [...(s.questions || []), { ...created, ...q, options: q.options }]
        }));
      }
    } catch {
      // Fallback local
      const localQ = { ...q, id: q.id || genId(), section_id: sectionId };
      setSections(prev => prev.map((s, si) => si !== sectionIdx ? s : {
        ...s, questions: isEdit
          ? s.questions!.map(ex => String(ex.id) === String(q.id) ? localQ : ex)
          : [...(s.questions || []), localQ]
      }));
    }
    setModalQuestion(null);
  };

  // ── Salvar tudo ─────────────────────────────────────────────────────────────

  const handleSaveAll = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      for (let si = 0; si < sections.length; si++) {
        const s = sections[si];
        if (s.id) {
          await fetch(`${API_URL}/api/anamnesis/sections/${s.id}`, {
            method: 'PUT', headers, body: JSON.stringify({ titulo: s.titulo, descricao: s.descricao, ordem: si })
          });
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Erro ao salvar as configurações');
    } finally { setSaving(false); }
  };

  const handleCopyLink = () => {
    const linkBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'https://owner-health-ktsf.vercel.app' 
      : window.location.origin;
    navigator.clipboard.writeText(`${linkBase}/client/anamnesis`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-3">
        <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#6366f1' }} />
        <p className="text-sm text-slate-400 font-medium">Carregando formulário...</p>
      </div>
    </div>
  );

  return (
    <>
      {modalQuestion !== null && (
        <QuestionModal
          question={modalQuestion.question}
          sectionId={sections[modalQuestion.sectionIdx]?.id || 0}
          onSave={handleModalSave}
          onClose={() => setModalQuestion(null)}
        />
      )}

      <div className="space-y-6 animate-fadeIn">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Formulário de Anamnese</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Crie e organize as perguntas que seus pacientes responderão antes das consultas
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                <Check className="w-3.5 h-3.5" /> Salvo!
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </span>
            )}
            <button onClick={handleSaveAll} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:-translate-y-0.5 shadow-md disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { key: 'builder', label: 'Construtor', icon: <Edit3 className="w-3.5 h-3.5" /> },
            { key: 'responses', label: 'Compartilhar', icon: <Send className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Main Content ── */}
          <div className="lg:col-span-2 space-y-4">
            {tab === 'builder' ? (
              <>
                {/* Seções */}
                {sections.length === 0 && (
                  <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                      <ClipboardList className="w-8 h-8 text-violet-500" />
                    </div>
                    <h3 className="font-black text-slate-700 text-base mb-1">Formulário em branco</h3>
                    <p className="text-sm text-slate-400 mb-6">Adicione seções e perguntas para montar seu formulário de anamnese</p>
                    <button onClick={() => setAddingSectionIdx(-1)}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      + Criar primeira seção
                    </button>
                  </div>
                )}

                {sections.map((section, sIdx) => (
                  <div key={sIdx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Cabeçalho da seção */}
                    <div className="p-5 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #f8f7ff, #f5f3ff)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center cursor-grab" style={{ background: '#ede9fe' }}>
                          <GripVertical className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="flex-1">
                          <input
                            value={section.titulo}
                            onChange={e => handleSectionTitleChange(sIdx, e.target.value)}
                            className="w-full font-black text-slate-800 text-sm bg-transparent border-b-2 border-transparent focus:border-violet-400 focus:outline-none pb-0.5 transition"
                            placeholder="Título da seção"
                          />
                          <input
                            value={section.descricao}
                            onChange={e => handleSectionDescChange(sIdx, e.target.value)}
                            className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none mt-1 transition"
                            placeholder="Descrição da seção (opcional)"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-violet-500 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                            Seção {sIdx + 1} · {section.questions?.length || 0} perguntas
                          </span>
                          <button onClick={() => handleToggleSection(sIdx)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center transition hover:bg-slate-50">
                            {section._open ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                          </button>
                          <button onClick={() => handleDeleteSection(sIdx)} className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center transition hover:bg-red-100">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Perguntas */}
                    {section._open && (
                      <div className="p-4 space-y-3">
                        {(section.questions || []).map((q, qIdx) => (
                          <div key={qIdx} className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-violet-200 hover:bg-violet-50/30 transition group">
                            <div className="w-5 h-5 mt-0.5 flex-shrink-0 cursor-grab opacity-40 group-hover:opacity-70 transition">
                              <GripVertical className="w-full h-full text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-slate-800 leading-snug">{q.texto}</p>
                                  {q.descricao && <p className="text-xs text-slate-400 mt-0.5">{q.descricao}</p>}
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {q.obrigatoria && (
                                    <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">obrig.</span>
                                  )}
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                                    {QUESTION_TYPE_MAP[q.tipo].icon}
                                    {QUESTION_TYPE_MAP[q.tipo].label}
                                  </span>
                                  <button onClick={() => handleEditQuestion(sIdx, qIdx)}
                                    className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:border-violet-400 transition">
                                    <Edit3 className="w-3 h-3 text-slate-500" />
                                  </button>
                                  <button onClick={() => handleDeleteQuestion(sIdx, qIdx)}
                                    className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition">
                                    <Trash2 className="w-3 h-3 text-slate-400" />
                                  </button>
                                </div>
                              </div>
                              {/* Preview mini das opções */}
                              {needsOptions(q.tipo) && q.options && q.options.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {q.options.slice(0, 4).map((o, oi) => (
                                    <span key={oi} className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{o.texto}</span>
                                  ))}
                                  {q.options.length > 4 && (
                                    <span className="text-[10px] font-medium text-slate-400">+{q.options.length - 4} opções</span>
                                  )}
                                </div>
                              )}
                              {q.tipo === 'scale' && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] text-slate-400">{q.escala_label_min || 'Mín'}</span>
                                  <div className="flex gap-1">
                                    {Array.from({ length: Math.min((q.escala_max || 10) - (q.escala_min || 1) + 1, 10) }, (_, i) => (
                                      <div key={i} className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500">
                                        {(q.escala_min || 1) + i}
                                      </div>
                                    ))}
                                  </div>
                                  <span className="text-[10px] text-slate-400">{q.escala_label_max || 'Máx'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <button onClick={() => handleAddQuestion(sIdx)}
                          className="w-full py-3 rounded-2xl border-2 border-dashed border-violet-200 text-sm font-bold text-violet-500 hover:border-violet-400 hover:bg-violet-50 transition flex items-center justify-center gap-2">
                          <Plus className="w-4 h-4" /> Adicionar pergunta
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Adicionar seção */}
                {addingSectionIdx !== null ? (
                  <div className="bg-white rounded-3xl border border-violet-200 p-5 shadow-sm">
                    <p className="text-xs font-bold text-slate-600 mb-2">Nome da nova seção</p>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newSectionTitle}
                        onChange={e => setNewSectionTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') { setAddingSectionIdx(null); setNewSectionTitle(''); } }}
                        placeholder="Ex: Histórico de Saúde"
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition"
                      />
                      <button onClick={handleAddSection}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        Criar
                      </button>
                      <button onClick={() => { setAddingSectionIdx(null); setNewSectionTitle(''); }}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingSectionIdx(sections.length)}
                    className="w-full py-4 rounded-3xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/50 transition flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Adicionar nova seção
                  </button>
                )}
              </>
            ) : (
              /* Aba de Compartilhamento */
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-800 mb-1">Enviar para pacientes</h3>
                  <p className="text-sm text-slate-500">Compartilhe o link abaixo com seus pacientes para que preencham o formulário antes da consulta.</p>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Link do formulário</p>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-600 break-all select-all">
                    {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                      ? 'https://owner-health-ktsf.vercel.app' 
                      : window.location.origin}/client/anamnesis
                  </div>
                </div>
                <button onClick={handleCopyLink}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {copied ? <><Check className="w-4 h-4 text-emerald-300" /> Link copiado!</> : <><Copy className="w-4 h-4" /> Copiar link</>}
                </button>
                <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                  <Sparkles className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-violet-800">Anamnese Inteligente</p>
                    <p className="text-[11px] text-violet-700 mt-0.5 leading-relaxed">
                      O preenchimento prévio reduz em até 40% o tempo gasto na consulta. As respostas ficam disponíveis imediatamente no prontuário do paciente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {/* Estatísticas */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-500" /> Resumo do Formulário
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Seções', value: sections.length, color: 'violet' },
                  { label: 'Perguntas', value: sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0), color: 'indigo' },
                  {
                    label: 'Obrigatórias',
                    value: sections.reduce((acc, s) => acc + (s.questions?.filter(q => q.obrigatoria).length || 0), 0),
                    color: 'red'
                  },
                ].map(stat => (
                  <div key={stat.label} className={`flex items-center justify-between p-3 rounded-xl bg-${stat.color}-50 border border-${stat.color}-100`}>
                    <span className={`text-xs font-bold text-${stat.color}-700`}>{stat.label}</span>
                    <span className={`text-lg font-black text-${stat.color}-600`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipos disponíveis */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-4">Tipos de pergunta</h3>
              <div className="space-y-2">
                {QUESTION_TYPES.map(t => (
                  <div key={t.value} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50">
                    <span className="text-violet-500">{t.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{t.label}</p>
                      <p className="text-[10px] text-slate-400">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview link */}
            <a href="/client/anamnesis" target="_blank" rel="noreferrer"
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition group shadow-sm">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-slate-700">Visualizar formulário</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
