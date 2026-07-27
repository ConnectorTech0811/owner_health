import React, { useState } from 'react';
import { X, Plus, Trash2, GripVertical, Settings, Save, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { DropResult } from 'react-beautiful-dnd';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { Section, Question } from './CompanyAnamnesisConfig';
import { QUESTION_TYPE_MAP } from './CompanyAnamnesisConfig';
import { QuestionModal } from '../../components/QuestionModal';
import { API_URL } from '../../config';

interface Template {
  id: number;
  titulo?: string;
  nome?: string;
  conteudo?: Section[];
  sections_data?: Section[];
  criado_em: string;
}

interface Props {
  template: Template;
  onClose: () => void;
  onSaved: () => void;
}

const genId = () => Math.floor(Math.random() * 1000000000);

export const TemplateEditorModal: React.FC<Props> = ({ template, onClose, onSaved }) => {
  const [sections, setSections] = useState<Section[]>(
    (template.sections_data || template.conteudo || []).map(s => ({ ...s, _open: true }))
  );
  const [templateName, setTemplateName] = useState(template.nome || template.titulo || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [modalQuestion, setModalQuestion] = useState<{ question: Question | null; sectionIdx: number; parentOptionId?: number } | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSectionIdx, setAddingSectionIdx] = useState<number | null>(null);

  // ── Seções ──────────────────────────────────────────────────────────────────

  const handleAddSection = () => {
    const titulo = newSectionTitle.trim() || 'Nova Seção';
    const newS: Section = { id: genId(), titulo, descricao: '', ordem: sections.length, ativo: true, _open: true, questions: [] };
    setSections(prev => [...prev, newS]);
    setNewSectionTitle('');
    setAddingSectionIdx(null);
  };

  const handleDeleteSection = (sIdx: number) => {
    if (!window.confirm('Deseja excluir esta seção?')) return;
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

  const handleAddQuestion = (sIdx: number, parentOptionId?: number) => {
    setModalQuestion({ question: null, sectionIdx: sIdx, parentOptionId });
  };

  const handleEditQuestion = (sIdx: number, qIdx: number) => {
    setModalQuestion({ question: sections[sIdx].questions![qIdx], sectionIdx: sIdx });
  };

  const handleDeleteQuestion = (sIdx: number, qIdx: number) => {
    setSections(prev => prev.map((s, i) => i === sIdx
      ? { ...s, questions: s.questions!.filter((_, qi) => qi !== qIdx) }
      : s
    ));
  };

  const handleModalSave = (q: Question) => {
    if (!modalQuestion) return;
    const { sectionIdx } = modalQuestion;
    const isEdit = !!q.id;
    
    const localQ = { ...q, id: q.id || genId(), parent_option_id: modalQuestion.parentOptionId || q.parent_option_id };
    
    setSections(prev => prev.map((s, si) => si !== sectionIdx ? s : {
      ...s, questions: isEdit
        ? s.questions!.map(ex => String(ex.id) === String(q.id) ? localQ : ex)
        : [...(s.questions || []), localQ]
    }));
    
    setModalQuestion(null);
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────────

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIdx = result.source.index;
    const destIdx = result.destination.index;

    if (result.type === 'SECTION') {
      const newSec = Array.from(sections);
      const [removed] = newSec.splice(sourceIdx, 1);
      newSec.splice(destIdx, 0, removed);
      newSec.forEach((s, i) => s.ordem = i);
      setSections(newSec);
    } else if (result.type === 'QUESTION') {
      const [sourceS] = result.source.droppableId.split('-').map(Number);
      const [destS] = result.destination.droppableId.split('-').map(Number);
      const newSec = [...sections];
      const sourceQuestions = Array.from(newSec[sourceS].questions || []);
      const [removedQ] = sourceQuestions.splice(sourceIdx, 1);
      
      if (sourceS === destS) {
        sourceQuestions.splice(destIdx, 0, removedQ);
        newSec[sourceS].questions = sourceQuestions;
      } else {
        const destQuestions = Array.from(newSec[destS].questions || []);
        destQuestions.splice(destIdx, 0, removedQ);
        newSec[sourceS].questions = sourceQuestions;
        newSec[destS].questions = destQuestions;
      }
      setSections(newSec);
    }
  };

  // ── Salvar ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/anamnesis-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ titulo: templateName, nome: templateName, conteudo: sections, sections_data: sections })
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      onSaved();
    } catch (err) {
      setError('Erro ao salvar o modelo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render Helpers ──────────────────────────────────────────────────────────

  const renderQuestionItem = (q: Question, qIdx: number, sIdx: number) => (
    <Draggable key={String(q.id)} draggableId={`q-${q.id}`} index={qIdx}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps} className="bg-white rounded-2xl border border-slate-100 p-4 transition-all hover:border-violet-200 hover:shadow-md group">
          <div className="flex items-start gap-4">
            <div {...provided.dragHandleProps} className="mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-5 h-5 text-slate-300 hover:text-violet-500" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500">
                    {QUESTION_TYPE_MAP[q.tipo]?.icon} {QUESTION_TYPE_MAP[q.tipo]?.label}
                  </span>
                  {q.obrigatoria && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">Obrig.</span>}
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditQuestion(sIdx, qIdx)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition" title="Editar pergunta"><Settings className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteQuestion(sIdx, qIdx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir pergunta"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <h4 className="text-sm font-bold text-slate-800">{q.texto}</h4>
              
              {/* Lógica condicional preview */}
              {(q.tipo === 'radio' || q.tipo === 'select' || q.tipo === 'checkbox') && q.options && (
                <div className="mt-4 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{qIdx + 1} - Pergunta do formulário</p>
                  {q.options.map((opt, i) => {
                    const childQuestions = (sections[sIdx].questions || []).filter(child => String(child.parent_option_id) === String(opt.id));
                    const stepNum = `${qIdx + 1}.${i + 1}`;
                    return (
                      <div key={i} className="space-y-1.5 p-2 rounded-lg bg-white border border-slate-150">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-700">{opt.texto}</span>
                          <button
                            onClick={() => handleAddQuestion(sIdx, opt.id)}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer"
                          >
                            + {stepNum} Pergunta seguinte
                          </button>
                        </div>
                        {childQuestions.length > 0 && (
                          <div className="pl-3 border-l-2 border-violet-400 space-y-1 mt-1">
                            {childQuestions.map(c => (
                              <p key={c.id} className="text-[10px] font-bold text-violet-700 flex items-center gap-1">
                                ↳ {c.texto}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 rounded-t-3xl">
          <div className="flex-1 mr-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              Editar Modelo
            </h2>
            <input 
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="mt-1 w-full max-w-md border-b-2 border-transparent hover:border-slate-200 focus:border-violet-500 outline-none text-sm font-bold text-slate-600 bg-transparent transition-colors px-1 py-0.5"
              placeholder="Nome do modelo"
            />
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-red-500 text-xs font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4"/> {error}</span>}
            <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {saving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Modelo</>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="board" type="SECTION">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-6">
                    {sections.map((sec, sIdx) => (
                      <Draggable key={String(sec.id)} draggableId={`s-${sec.id}`} index={sIdx}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                            {/* Section Header */}
                            <div className={`p-5 flex items-start gap-4 transition-colors ${sec._open ? 'bg-slate-50/50 border-b border-slate-100' : ''}`}>
                              <div {...provided.dragHandleProps} className="mt-2 cursor-grab text-slate-300 hover:text-violet-500 transition-colors">
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 mr-4">
                                    <input value={sec.titulo} onChange={e => handleSectionTitleChange(sIdx, e.target.value)} placeholder="Título da Seção" className="w-full text-lg font-black text-slate-800 placeholder:text-slate-300 bg-transparent outline-none focus:border-b-2 border-violet-500 transition-colors" />
                                    <input value={sec.descricao} onChange={e => handleSectionDescChange(sIdx, e.target.value)} placeholder="Descrição opcional..." className="w-full text-xs text-slate-500 mt-1 bg-transparent outline-none focus:border-b border-violet-500 transition-colors" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Seção {sIdx + 1} &bull; {(sec.questions || []).length} perguntas</span>
                                    <button onClick={() => handleDeleteSection(sIdx)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition ml-2"><Trash2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleToggleSection(sIdx)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 flex items-center justify-center transition">
                                      {sec._open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Questions */}
                            {sec._open && (
                              <div className="p-5 bg-slate-50">
                                <Droppable droppableId={`${sIdx}-questions`} type="QUESTION">
                                  {(provided) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 min-h-[50px]">
                                      {(sec.questions || []).map((q, qIdx) => renderQuestionItem(q, qIdx, sIdx))}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                                
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center">
                                  <button onClick={() => handleAddQuestion(sIdx)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-violet-600 hover:text-white bg-violet-50 hover:bg-violet-600 transition shadow-sm hover:shadow">
                                    <Plus className="w-4 h-4" /> Adicionar pergunta principal
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            
            {/* Add Section Button */}
            <div className="mt-6 flex justify-center">
              {addingSectionIdx === -1 ? (
                <div className="w-full max-w-md bg-white p-2 flex items-center gap-2 rounded-2xl shadow-lg border border-violet-100">
                  <input autoFocus value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSection()} placeholder="Nome da nova seção..." className="flex-1 px-4 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
                  <button onClick={handleAddSection} className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 shadow-md">
                    <Plus className="w-5 h-5" />
                  </button>
                  <button onClick={() => setAddingSectionIdx(null)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setAddingSectionIdx(-1)} className="group flex items-center gap-3 px-8 py-4 bg-white hover:bg-slate-50 border-2 border-dashed border-slate-200 hover:border-violet-300 rounded-3xl transition text-sm font-bold text-slate-400 hover:text-violet-600">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 group-hover:bg-violet-100 flex items-center justify-center transition">
                    <Plus className="w-5 h-5" />
                  </div>
                  Adicionar Nova Seção
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal Nova Pergunta */}
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
