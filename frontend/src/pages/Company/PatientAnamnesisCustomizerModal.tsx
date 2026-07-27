import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Sparkles, Edit3 } from 'lucide-react';
import { API_URL } from '../../config';
import { QuestionModal } from '../../components/QuestionModal';
import type { Question, Section, QuestionType } from './CompanyAnamnesisConfig';
import { QUESTION_TYPE_MAP } from './CompanyAnamnesisConfig';

const needsOptions = (tipo: QuestionType) => tipo === 'radio' || tipo === 'checkbox' || tipo === 'select';

interface Props {
  companyId: string | number;
  patientId: string | number;
  onClose: () => void;
  onSuccess: () => void;
}

export const PatientAnamnesisCustomizerModal: React.FC<Props> = ({ companyId, patientId, onClose, onSuccess }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'scratch' | 'template'>('scratch');

  // Question Modal state
  const [modalQuestion, setModalQuestion] = useState<{ sectionIdx: number; question: Question | null; parentOptionId?: number | string } | null>(null);

  // Estado para adicionar nova seção
  const [newSecTitle, setNewSecTitle] = useState('');
  const [showAddSecInput, setShowAddSecInput] = useState(false);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/anamnesis/form/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((s: any, si: number) => ({
          ...s, id: s.id || `s_${Date.now()}_${si}`,
          questions: (s.questions || []).map((q: any, qi: number) => ({
            ...q, id: q.id || `q_${Date.now()}_${si}_${qi}`,
            options: (q.options || []).map((o: any, oi: number) => ({ ...o, id: o.id || `o_${si}_${qi}_${oi}` }))
          }))
        }));
        setSections(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: 'scratch' | 'template') => {
    setMode(newMode);
    if (newMode === 'scratch') {
      setSections([{
        id: `s_${Date.now()}`,
        titulo: 'Informações da Consulta',
        descricao: 'Perguntas personalizadas para esta consulta',
        ordem: 0,
        ativo: true,
        questions: []
      }]);
    } else {
      fetchTemplate();
    }
  };

  useEffect(() => {
    // Iniciar por padrão no modo 'scratch' (do zero) para o médico
    handleModeChange('scratch');
  }, []);

  const handleAddSection = () => {
    if (!newSecTitle.trim()) return;
    setSections(prev => [
      ...prev,
      {
        id: `s_${Date.now()}`,
        titulo: newSecTitle.trim(),
        descricao: '',
        ordem: prev.length,
        ativo: true,
        questions: []
      }
    ]);
    setNewSecTitle('');
    setShowAddSecInput(false);
  };

  const handleDeleteSection = (sIdx: number) => {
    setSections(prev => prev.filter((_, i) => i !== sIdx));
  };

  const handleModalSave = (q: Question) => {
    if (!modalQuestion) return;
    const { sectionIdx, parentOptionId } = modalQuestion;
    const isEdit = !!q.id;
    const localQ = { 
      ...q, 
      id: q.id || `q_${Date.now()}`, 
      parent_option_id: parentOptionId !== undefined ? parentOptionId : q.parent_option_id 
    };

    setSections(prev => prev.map((s, si) => si !== sectionIdx ? s : {
      ...s, questions: isEdit
        ? (s.questions || []).map(ex => String(ex.id) === String(q.id) ? localQ : ex)
        : [...(s.questions || []), localQ]
    }));
    setModalQuestion(null);
  };

  const handleDeleteQuestion = (sIdx: number, qIdx: number) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      const qList = s.questions || [];
      const qId = qList[qIdx]?.id;
      return {
        ...s,
        questions: qList.filter((q, qi) => qi !== qIdx && q.parent_option_id !== qId)
      };
    }));
  };

  const handleSend = async () => {
    if (sections.length === 0 || sections.every(s => (s.questions || []).length === 0)) {
      alert('Adicione pelo menos uma pergunta para enviar ao paciente.');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const doctorId = user.id || user.usuario_id || localStorage.getItem('profissionalId');

      const res = await fetch(`${API_URL}/api/patient-anamnesis/empresa/${companyId}/request/custom`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: patientId,
          sections,
          medico_id: doctorId
        })
      });
      if (res.ok) {
        alert('Formulário personalizado enviado com sucesso para o paciente!');
        onSuccess();
      } else {
        alert('Erro ao enviar solicitação.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar solicitação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-black text-slate-800">Personalizar Anamnese para o Paciente</h2>
            <p className="text-xs text-slate-500">Crie um formulário exclusivo do zero ou use o modelo da clínica como base.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Seleção de Modo */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3">
          <button
            onClick={() => handleModeChange('scratch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${mode === 'scratch' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Plus className="w-4 h-4" /> Criar do Zero (Exclusivo)
          </button>
          <button
            onClick={() => handleModeChange('template')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${mode === 'template' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Sparkles className="w-4 h-4" /> Usar Modelo da Clínica como Base
          </button>
        </div>

        {/* Conteúdo das Seções & Perguntas */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" /></div>
          ) : (
            <>
              {sections.map((sec, sIdx) => (
                <div key={sec.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-800">{sec.titulo}</h3>
                      {sec.descricao && <p className="text-xs text-slate-500 mt-0.5">{sec.descricao}</p>}
                    </div>
                    <button onClick={() => handleDeleteSection(sIdx)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition cursor-pointer" title="Remover Seção">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Lista de Perguntas */}
                  <div className="space-y-3">
                    {(sec.questions || []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Nenhuma pergunta nesta seção ainda.</p>
                    ) : (
                      (() => {
                        const secQuestions = sec.questions || [];
                        const topLevel = secQuestions.filter(q => !q.parent_option_id);

                        const renderConfigQ = (q: Question, qIdx: number, level: number = 0, qNumPrefix: string = '') => {
                          return (
                            <div key={q.id || qIdx} className={`${level > 0 ? 'ml-4 mt-2' : ''}`}>
                              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-violet-300 transition space-y-3 shadow-2xs">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-xs font-black text-slate-800">{q.texto}</p>
                                      {q.obrigatoria && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">* Obrigatória</span>}
                                      {level > 0 && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">↳ Step Condicional ({qNumPrefix})</span>}
                                    </div>
                                    <span className="inline-block text-[9px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full mt-1">
                                      {QUESTION_TYPE_MAP[q.tipo]?.label || q.tipo}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => setModalQuestion({ sectionIdx: sIdx, question: q })}
                                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 transition cursor-pointer"
                                      title="Editar Pergunta"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteQuestion(sIdx, secQuestions.indexOf(q))}
                                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition cursor-pointer"
                                      title="Remover Pergunta"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Alternativas e Sub-fluxos condicionais por alternativa */}
                                {needsOptions(q.tipo) && q.options && q.options.length > 0 && (
                                  <div className="mt-3 space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                      {qNumPrefix || '1'} - Pergunta do formulário
                                    </p>
                                    {q.options.map((o, oIdx) => {
                                      const childQuestions = secQuestions.filter(c => c.parent_option_id != null && String(c.parent_option_id) === String(o.id));
                                      const stepNum = `${qNumPrefix || '1'}.${oIdx + 1}`;

                                      return (
                                        <div key={o.id || oIdx} className="space-y-2 border border-slate-150 rounded-xl p-3 bg-slate-50/80">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                                              <span className="text-xs font-bold text-slate-700">{o.texto}</span>
                                            </div>
                                            <button
                                              onClick={() => setModalQuestion({ sectionIdx: sIdx, question: null, parentOptionId: o.id })}
                                              className="text-[10px] font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                            >
                                              <Plus className="w-3 h-3 text-violet-600" /> {stepNum} Pergunta seguinte
                                            </button>
                                          </div>

                                          {/* Sub-perguntas especificamente vinculadas a esta opção */}
                                          {childQuestions.length > 0 && (
                                            <div className="mt-2 space-y-2 pl-3 border-l-2 border-violet-400">
                                              <p className="text-[9px] font-black text-violet-700 uppercase tracking-wider flex items-center gap-1">
                                                <span>↳ SE ESCOLHER "{o.texto.toUpperCase()}", RESPONDER TAMBÉM:</span>
                                              </p>
                                              {childQuestions.map(child => renderConfigQ(child, secQuestions.indexOf(child), level + 1, stepNum))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        };
                        return topLevel.map((q, tIdx) => renderConfigQ(q, secQuestions.indexOf(q), 0, String(tIdx + 1)));
                      })()
                    )}
                  </div>

                  {/* Botão de adicionar pergunta principal nesta seção */}
                  <button
                    onClick={() => setModalQuestion({ sectionIdx: sIdx, question: null })}
                    className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1.5 pt-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Pergunta nesta Seção
                  </button>
                </div>
              ))}

              {/* Botão de Adicionar Nova Seção */}
              {showAddSecInput ? (
                <div className="p-4 bg-white rounded-3xl border border-violet-200 space-y-3">
                  <input
                    type="text"
                    placeholder="Título da Nova Seção (ex: Sintomas Atuais)..."
                    value={newSecTitle}
                    onChange={e => setNewSecTitle(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-violet-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddSection} className="px-4 py-2 bg-violet-600 text-white font-bold text-xs rounded-xl hover:bg-violet-700 transition cursor-pointer">
                      Criar Seção
                    </button>
                    <button onClick={() => setShowAddSecInput(false)} className="px-3 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition cursor-pointer">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSecInput(true)}
                  className="w-full py-4 rounded-3xl border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/50 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Adicionar Nova Seção
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-6 bg-white border-t border-slate-200 rounded-b-3xl flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
            Cancelar
          </button>
          <button onClick={handleSend} disabled={saving || loading} className="px-6 py-3 font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50">
            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save className="w-4 h-4" />}
            Enviar para o Paciente
          </button>
        </div>
      </div>

      {/* Modal Pergunta */}
      {modalQuestion && (
        <QuestionModal
          question={modalQuestion.question}
          sectionId={sections[modalQuestion.sectionIdx]?.id || 0}
          onSave={handleModalSave}
          onClose={() => setModalQuestion(null)}
        />
      )}
    </div>
  );
};
