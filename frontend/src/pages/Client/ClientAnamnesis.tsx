import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList, CheckCircle, Loader2, ChevronRight, ChevronLeft,
  Send, AlertCircle, Circle, CheckSquare, Type, AlignLeft,
  BarChart3, Calendar, List, FileText, ShieldAlert, Lock
} from 'lucide-react';
import { API_URL } from '../../config';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'scale' | 'date';

interface Option { id: number; texto: string; ordem: number; }
interface Question {
  id: number; section_id: number; texto: string; tipo: QuestionType;
  obrigatoria: boolean; ordem: number; placeholder: string; descricao: string;
  escala_min?: number; escala_max?: number;
  escala_label_min?: string; escala_label_max?: string;
  options?: Option[];
  parent_option_id?: number | null;
}
interface Section {
  id: number; titulo: string; descricao: string; ordem: number;
  questions: Question[];
}
interface AnamnesisResponse {
  id: number; empresa_id: number; criado_em: string;
  status: string; respondido_em?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_ICON: Record<QuestionType, React.ReactNode> = {
  text:     <Type className="w-3.5 h-3.5" />,
  textarea: <AlignLeft className="w-3.5 h-3.5" />,
  radio:    <Circle className="w-3.5 h-3.5" />,
  checkbox: <CheckSquare className="w-3.5 h-3.5" />,
  select:   <List className="w-3.5 h-3.5" />,
  scale:    <BarChart3 className="w-3.5 h-3.5" />,
  date:     <Calendar className="w-3.5 h-3.5" />,
};

// ─── Question Renderer ────────────────────────────────────────────────────────

interface QuestionFieldProps {
  question: Question;
  value: string | string[];
  onChange: (val: string | string[]) => void;
  error?: boolean;
}

const QuestionField: React.FC<QuestionFieldProps> = ({ question, value, onChange, error }) => {
  const inputBase = `w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition ${
    error ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500/10' : 'border-slate-200 bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10'
  }`;

  switch (question.tipo) {
    case 'text':
      return (
        <input
          type="text"
          value={value as string}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder || 'Sua resposta...'}
          className={inputBase}
        />
      );

    case 'textarea':
      return (
        <textarea
          rows={4}
          value={value as string}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder || 'Sua resposta detalhada...'}
          className={`${inputBase} resize-none`}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={value as string}
          onChange={e => onChange(e.target.value)}
          className={inputBase}
        />
      );

    case 'radio':
      return (
        <div className="space-y-2.5">
          {(question.options || []).map(opt => {
            const selected = value === opt.texto;
            return (
              <button
                key={opt.id}
                onClick={() => onChange(opt.texto)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  selected
                    ? 'border-violet-500 bg-violet-50'
                    : error ? 'border-red-200 bg-red-50/30 hover:border-red-300' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                  selected ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                }`}>
                  {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-semibold ${selected ? 'text-violet-700' : 'text-slate-700'}`}>
                  {opt.texto}
                </span>
              </button>
            );
          })}
        </div>
      );

    case 'checkbox': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2.5">
          {(question.options || []).map(opt => {
            const checked = selected.includes(opt.texto);
            return (
              <button
                key={opt.id}
                onClick={() => {
                  const newVal = checked
                    ? selected.filter(v => v !== opt.texto)
                    : [...selected, opt.texto];
                  onChange(newVal);
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  checked
                    ? 'border-violet-500 bg-violet-50'
                    : error ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                  checked ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                }`}>
                  {checked && <span className="text-white text-[10px] font-black">✓</span>}
                </div>
                <span className={`text-sm font-semibold ${checked ? 'text-violet-700' : 'text-slate-700'}`}>
                  {opt.texto}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    case 'select':
      return (
        <select
          value={value as string}
          onChange={e => onChange(e.target.value)}
          className={`${inputBase} cursor-pointer`}
        >
          <option value="">Selecione uma opção...</option>
          {(question.options || []).map(opt => (
            <option key={opt.id} value={opt.texto}>{opt.texto}</option>
          ))}
        </select>
      );

    case 'scale': {
      const min = question.escala_min || 1;
      const max = question.escala_max || 10;
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      const currentVal = Number(value) || 0;
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {nums.map(n => (
              <button
                key={n}
                onClick={() => onChange(String(n))}
                className={`flex-1 min-w-[36px] h-11 rounded-xl text-sm font-black transition-all border-2 ${
                  currentVal === n
                    ? 'border-violet-500 bg-violet-500 text-white shadow-md scale-105'
                    : error ? 'border-red-200 text-red-400 bg-red-50 hover:border-red-400' : 'border-slate-200 text-slate-600 bg-white hover:border-violet-400 hover:bg-violet-50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span>{question.escala_label_min || 'Mínimo'}</span>
            <span>{question.escala_label_max || 'Máximo'}</span>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const ClientAnamnesis: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reqParam = searchParams.get('requestId') || searchParams.get('token') || searchParams.get('request_id');

  const clienteId = localStorage.getItem('activeProfileId') || '1';
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Estado geral
  const [mode, setMode] = useState<'history' | 'form' | 'done'>('history');
  const [activeTab, setActiveTab] = useState<'pendentes' | 'historico'>('pendentes');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [responses, setResponses] = useState<AnamnesisResponse[]>([]);
  const [currentRequestId, setCurrentRequestId] = useState<number | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [errors, setErrors] = useState<Record<number, boolean>>({});
  const [submitError, setSubmitError] = useState('');
  const [unauthorizedError, setUnauthorizedError] = useState('');
  const [viewingAnswersId, setViewingAnswersId] = useState<number | null>(null);
  const [viewingAnswersData, setViewingAnswersData] = useState<{form: Section[], answers: Record<number,string>} | null>(null);
  const [loadingViewAnswers, setLoadingViewAnswers] = useState(false);

  useEffect(() => {
    loadData();
  }, [clienteId]);

  const loadData = async () => {
    setLoading(true);
    setUnauthorizedError('');
    try {
      const respRes = await fetch(`${API_URL}/api/patient-anamnesis/client/${clienteId}/requests`, { headers });
      if (respRes.ok) {
        const data: AnamnesisResponse[] = await respRes.json();
        const list = Array.isArray(data) ? data : [];
        setResponses(list);

        if (reqParam) {
          const targetId = parseInt(reqParam, 10);
          const found = list.find(r => r.id === targetId);
          if (found) {
            if (found.status === 'aguardando') {
              startForm(targetId);
            } else {
              openAnswers(targetId);
            }
          } else {
            setUnauthorizedError('Acesso não autorizado: Este formulário de anamnese não pertence à sua conta ou não foi encontrado.');
          }
        } else {
          // Se não houver reqParam, verifica se existe apenas 1 pendente para abrir automaticamente
          const pending = list.filter(r => r.status === 'aguardando');
          if (pending.length > 0) {
            startForm(pending[0].id);
          }
        }
      }
    } catch {
      setResponses([]);
    } finally { setLoading(false); }
  };

  const openAnswers = async (reqId: number) => {
    setLoadingViewAnswers(true);
    setViewingAnswersId(reqId);
    try {
      const [formRes, answersRes] = await Promise.all([
        fetch(`${API_URL}/api/patient-anamnesis/request/${reqId}/form`, { headers }),
        fetch(`${API_URL}/api/patient-anamnesis/request/${reqId}/answers`, { headers })
      ]);
      const formData: Section[] = formRes.ok ? await formRes.json() : [];
      const answersData = answersRes.ok ? await answersRes.json() : [];
      // Convert answers array to map: question_id -> resposta
      const answersMap: Record<number, string> = {};
      (Array.isArray(answersData) ? answersData : []).forEach((a: any) => {
        answersMap[a.question_id] = a.resposta;
      });
      setViewingAnswersData({ form: formData, answers: answersMap });
    } catch {
      setViewingAnswersData(null);
    } finally {
      setLoadingViewAnswers(false);
    }
  };

  const startForm = async (reqId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/patient-anamnesis/request/${reqId}/form`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          alert('Este formulário não possui perguntas configuradas. Entre em contato com seu médico.');
          return;
        }
        setSections(data);
        setCurrentRequestId(reqId);
        setAnswers({});
        setErrors({});
        setCurrentSection(0);
        setSubmitError('');
        setMode('form');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Erro ao carregar formulário: ${errData.error || res.statusText}`);
      }
    } catch (e) {
      console.error('startForm error:', e);
      alert('Erro de conexão ao carregar formulário. Tente novamente.');
    }
  };

  const handleAnswer = (questionId: number, val: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: val }));
    setErrors(prev => ({ ...prev, [questionId]: false }));
  };

  // Helper: dado uma pergunta condicional, retorna qual resposta ativa ela
  const getParentOptionOf = (q: Question, allQuestions: Question[]): { questionId: number; optionTexto: string } | null => {
    if (!q.parent_option_id) return null;
    for (const other of allQuestions) {
      const found = (other.options || []).find(o => o.id === q.parent_option_id);
      if (found) return { questionId: other.id, optionTexto: found.texto };
    }
    return null;
  };

  // Filtra apenas perguntas visíveis (condicionais que devem aparecer)
  const getVisibleQuestions = (sectionQs: Question[]): Question[] => {
    return sectionQs.filter(q => {
      if (!q.parent_option_id) return true;
      const parentOpt = getParentOptionOf(q, sectionQs);
      if (!parentOpt) return true;
      return answers[parentOpt.questionId] === parentOpt.optionTexto;
    });
  };

  const validateSection = (sectionIdx: number): boolean => {
    const section = sections[sectionIdx];
    const newErrors: Record<number, boolean> = {};
    let valid = true;
    for (const q of section.questions) {
      // Pula perguntas condicionais cujo pai não está selecionado
      if (q.parent_option_id != null) {
        const parentOpt = getParentOptionOf(q, section.questions);
        if (parentOpt && answers[parentOpt.questionId] !== parentOpt.optionTexto) continue;
      }
      if (q.obrigatoria) {
        const val = answers[q.id];
        const isEmpty = !val || (Array.isArray(val) ? val.length === 0 : val.trim() === '');
        if (isEmpty) { newErrors[q.id] = true; valid = false; }
      }
    }
    setErrors(prev => ({ ...prev, ...newErrors }));
    return valid;
  };

  const handleNext = () => {
    if (!validateSection(currentSection)) return;
    if (currentSection < sections.length - 1) {
      setCurrentSection(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!currentRequestId) return;
    setSubmitting(true); setSubmitError('');
    try {
      const res = await fetch(`${API_URL}/api/patient-anamnesis/request/${currentRequestId}/submit`, {
        method: 'POST', headers,
        body: JSON.stringify({ answers })
      });
      if (!res.ok) throw new Error('Erro ao enviar');
      setMode('done');
      loadData();
    } catch (e) {
      setSubmitError('Erro ao enviar as respostas. Tente novamente.');
    } finally { setSubmitting(false); }
  };

  const progress = sections.length > 0 ? ((currentSection) / sections.length) * 100 : 0;
  const section = sections[currentSection];
  const isLast = currentSection === sections.length - 1;

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-3">
        <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#6366f1' }} />
        <p className="text-sm text-slate-400 font-medium">Carregando formulário...</p>
      </div>
    </div>
  );

  // ─── Done ──────────────────────────────────────────────────────────────────

  if (mode === 'done') return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center max-w-md space-y-5 animate-fadeIn">
        <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Respostas enviadas!</h2>
          <p className="text-sm text-slate-500 mt-2">
            Seu formulário de anamnese foi salvo com sucesso. O médico terá acesso às suas respostas antes da consulta.
          </p>
        </div>
        <button onClick={() => setMode('history')}
          className="px-8 py-3 rounded-xl text-sm font-bold text-white transition hover:-translate-y-0.5 shadow-md"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          Ver meu histórico
        </button>
      </div>
    </div>
  );

  // ─── Form ──────────────────────────────────────────────────────────────────

  if (mode === 'form') {
    if (!section) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold text-slate-800">Formulário não encontrado</h2>
          <p className="text-slate-500">Este formulário não existe mais ou ocorreu um erro ao carregá-lo.</p>
          <button onClick={() => { setMode('history'); loadData(); }} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">Voltar</button>
        </div>
      );
    }
    
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Barra de progresso */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setMode('history'); setSections([]); setCurrentRequestId(null); }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-violet-600 transition px-3 py-1.5 rounded-lg hover:bg-violet-50 border border-slate-200"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </button>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seção {currentSection + 1} de {sections.length}</p>
              <h2 className="text-base font-black text-slate-800 mt-0.5">{section.titulo}</h2>
              {section.descricao && <p className="text-xs text-slate-400 mt-0.5">{section.descricao}</p>}
            </div>
          </div>
          <span className="text-2xl font-black text-violet-600">{Math.round(progress + (100 / sections.length))}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress + (100 / sections.length), 100)}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
          />
        </div>
        {/* Breadcrumb de seções */}
        <div className="flex items-center gap-1 mt-3 flex-wrap">
          {sections.map((s, i) => (
            <React.Fragment key={i}>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                i === currentSection ? 'bg-violet-100 text-violet-700 border border-violet-200' :
                i < currentSection ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                'text-slate-400'
              }`}>
                {i < currentSection ? '✓ ' : ''}{s.titulo.length > 20 ? s.titulo.slice(0, 20) + '...' : s.titulo}
              </span>
              {i < sections.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Perguntas da seção atual */}
      <div className="space-y-4">
        {getVisibleQuestions(section.questions).map((q, qi) => {
          const hasError = errors[q.id];
          return (
            <div key={q.id} className={`bg-white rounded-2xl border shadow-sm p-6 transition-all ${
              hasError ? 'border-red-300 shadow-red-50' : 'border-slate-200 hover:border-violet-200'
            }`}>
              {/* Header da pergunta */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-black"
                    style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', color: '#6d28d9' }}>
                    {qi + 1}
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-800 leading-snug">
                      {q.texto}
                      {q.obrigatoria && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {q.descricao && <p className="text-xs text-slate-400 mt-1 font-medium">{q.descricao}</p>}
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-violet-500 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {TIPO_ICON[q.tipo]}
                </span>
              </div>
              {/* Campo de resposta */}
              <QuestionField
                question={q}
                value={answers[q.id] ?? (q.tipo === 'checkbox' ? [] : '')}
                onChange={val => handleAnswer(q.id, val)}
                error={hasError}
              />
              {hasError && (
                <p className="flex items-center gap-1.5 text-xs font-bold text-red-500 mt-2">
                  <AlertCircle className="w-3.5 h-3.5" /> Esta pergunta é obrigatória
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Erro de submit */}
      {submitError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold">
          <AlertCircle className="w-4 h-4" /> {submitError}
        </div>
      )}

      {/* Navegação */}
      <div className="flex gap-3">
        {currentSection > 0 && (
          <button onClick={handlePrev}
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
        )}
        <button onClick={handleNext} disabled={submitting}
          className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:-translate-y-0.5 shadow-md disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
          ) : isLast ? (
            <><Send className="w-4 h-4" /> Enviar respostas</>
          ) : (
            <>Próxima seção <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
  }

  // ─── History / Overview ────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Pré-Consulta / Anamnese</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Preencha suas informações de saúde antes da consulta para agilizar o atendimento
          </p>
        </div>
      </div>

      {/* Alerta de acesso não autorizado */}
      {unauthorizedError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 text-red-900 mb-6 shadow-sm">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-black text-red-800">Acesso Restrito</h3>
            <p className="text-xs font-semibold text-red-700 mt-1">{unauthorizedError}</p>
          </div>
        </div>
      )}

      {/* Tabs de Navegação */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pendentes' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Solicitações Pendentes
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'historico' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Histórico de Respostas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'pendentes' && (
            <>
              {responses.filter(r => r.status === 'aguardando').length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Solicitações Pendentes
                    </h3>
                    <p className="text-xs font-semibold text-amber-700/80 mt-1">Você tem formulários de anamnese aguardando preenchimento.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {responses.filter(r => r.status === 'aguardando').map(r => (
                      <button key={r.id} onClick={() => startForm(r.id)} className="flex items-center gap-2 px-6 py-3 font-bold text-white rounded-xl transition shadow-md hover:shadow-lg hover:-translate-y-0.5 justify-center"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <ClipboardList className="w-4 h-4" /> Responder Anamnese #{r.id}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl p-10 text-center border-2 border-dashed border-slate-200 bg-slate-50 space-y-2">
                  <Lock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h2 className="text-base font-black text-slate-800">Nenhum Formulário Disponível</h2>
                  <p className="text-slate-600 text-xs font-semibold max-w-md mx-auto leading-relaxed">
                    Não há formulário de anamnese pendente para o seu usuário. Caso seu médico tenha enviado um formulário, verifique com a clínica.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'historico' && (
            <>
              {responses.filter(r => r.status === 'concluido').length === 0 ? (
                <div className="rounded-3xl p-10 text-center border-2 border-dashed border-slate-200 bg-slate-50">
                  <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h2 className="text-lg font-black text-slate-700">Nenhum formulário respondido</h2>
                  <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                    Você ainda não respondeu nenhuma anamnese. Suas respostas ficarão salvas aqui para consulta futura.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      Formulários Respondidos
                    </h3>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                      {responses.filter(r => r.status === 'concluido').length} registro(s)
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {responses.filter(r => r.status === 'concluido').map((r) => (
                      <div key={r.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">Anamnese #{r.id}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Respondido em: {new Date(r.respondido_em || r.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => openAnswers(r.id)} className="px-4 py-2 bg-white border border-slate-200 hover:border-violet-300 hover:text-violet-600 rounded-xl text-xs font-bold text-slate-600 transition shadow-sm">
                          Visualizar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-500" /> Minhas Anamneses
            </h3>
            <div className="text-center p-4">
              <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Nesta seção você pode visualizar solicitações pendentes enviadas pelo seu médico, e acessar o histórico de tudo que já respondeu.
              </p>
            </div>
          </div>

          {/* Info card */}
            <div className="rounded-2xl p-5 space-y-2" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
              <Sparkles className="w-5 h-5 text-violet-600" />
              <p className="text-xs font-black text-violet-800">Por que preencher?</p>
              <p className="text-[11px] text-violet-700 leading-relaxed font-medium">
                A anamnese prévia permite que seu médico se prepare para a consulta, tornando o atendimento mais ágil e preciso.
              </p>
            </div>
          </div>
      </div>

      {/* Modal de visualização de respostas */}
      {viewingAnswersId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setViewingAnswersId(null); setViewingAnswersData(null); }} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative z-10 animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800">Anamnese #{viewingAnswersId}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Suas respostas registradas</p>
              </div>
              <button onClick={() => { setViewingAnswersId(null); setViewingAnswersData(null); }} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
                <span className="text-slate-600 font-bold text-sm">✕</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingViewAnswers ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>
              ) : !viewingAnswersData || viewingAnswersData.form.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">Nenhuma resposta encontrada</p>
                </div>
              ) : (
                viewingAnswersData.form.map(sec => (
                  <div key={sec.id}>
                    <h3 className="text-sm font-black text-slate-700 mb-3 pb-2 border-b border-slate-100">{sec.titulo}</h3>
                    <div className="space-y-4">
                      {(sec.questions || []).map(q => {
                        const ans = viewingAnswersData.answers[q.id];
                        let displayAns = ans || <span className="italic text-slate-400 text-xs">Não respondida</span>;
                        try { if (ans && ans.startsWith('[')) { const arr = JSON.parse(ans); displayAns = arr.join(', '); } } catch {}
                        return (
                          <div key={q.id} className="bg-slate-50 rounded-xl p-4">
                            <p className="text-xs font-bold text-slate-500 mb-1">{q.texto}{q.obrigatoria && <span className="text-red-400 ml-1">*</span>}</p>
                            <p className="text-sm font-semibold text-slate-800">{displayAns}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Importação faltante
const Sparkles: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
  </svg>
);
