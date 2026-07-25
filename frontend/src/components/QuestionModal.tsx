import React, { useState } from 'react';
import { X, ChevronDown, Edit3 } from 'lucide-react';
import type { Question, Option } from '../pages/Company/CompanyAnamnesisConfig';
import { QUESTION_TYPES, QUESTION_TYPE_MAP } from '../pages/Company/CompanyAnamnesisConfig';

interface QuestionModalProps {
  question: Question | null;
  sectionId: number | string;
  onSave: (q: Question) => void;
  onClose: () => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({ question, sectionId, onSave, onClose }) => {
  const [form, setForm] = useState<Question>(question || {
    section_id: sectionId, texto: '', tipo: 'text', obrigatoria: false,
    ordem: 0, placeholder: '', descricao: '', escala_min: 1, escala_max: 10,
    escala_label_min: 'Mínimo', escala_label_max: 'Máximo', options: []
  });
  const [typeOpen, setTypeOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>(
    question?.options?.length ? question.options : [{ id: Math.floor(Math.random() * 1000000000), texto: '', ordem: 0 }]
  );

  const sf = (key: keyof Question, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    const processedOptions = options.filter(o => o.texto.trim()).map((o, i) => ({
      ...o,
      id: o.id || (Date.now() + i),
      ordem: i
    }));
    const q = { ...form, options: processedOptions };
    onSave(q);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
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

          {/* Descrição */}
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

          {/* Placeholder para texto */}
          {['text', 'textarea'].includes(form.tipo) && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Texto de Exemplo (Placeholder)</label>
              <input
                value={form.placeholder}
                onChange={e => sf('placeholder', e.target.value)}
                placeholder="Ex: Digite sua resposta aqui..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition bg-slate-50"
              />
            </div>
          )}

          {/* Opções para Múltipla Escolha / Checkbox / Select */}
          {['radio', 'checkbox', 'select'].includes(form.tipo) && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Opções de Resposta</label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={opt.texto}
                      onChange={e => {
                        const newO = [...options];
                        newO[i].texto = e.target.value;
                        setOptions(newO);
                      }}
                      placeholder={`Opção ${i + 1}`}
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition"
                    />
                    <button onClick={() => setOptions(o => o.filter((_, idx) => idx !== i))}
                      className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setOptions(o => [...o, { id: Math.floor(Math.random() * 1000000000), texto: '', ordem: o.length }])}
                  className="text-xs font-bold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-lg transition mt-2">
                  + Adicionar Opção
                </button>
              </div>
            </div>
          )}

          {/* Escala */}
          {form.tipo === 'scale' && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor Mínimo</label>
                  <select value={form.escala_min || 1} onChange={e => sf('escala_min', Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                    {[0, 1].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor Máximo</label>
                  <select value={form.escala_max || 10} onChange={e => sf('escala_max', Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                    {[3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rótulo Mínimo</label>
                  <input value={form.escala_label_min} onChange={e => sf('escala_label_min', e.target.value)} placeholder="Ex: Sem dor" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rótulo Máximo</label>
                  <input value={form.escala_label_max} onChange={e => sf('escala_label_max', e.target.value)} placeholder="Ex: Dor máxima" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Obrigatória */}
          <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-violet-300 transition">
            <input type="checkbox" checked={form.obrigatoria} onChange={e => sf('obrigatoria', e.target.checked)} className="w-5 h-5 text-violet-600 rounded border-slate-300 focus:ring-violet-500" />
            <div>
              <span className="block text-sm font-bold text-slate-700">Tornar pergunta obrigatória</span>
              <span className="block text-[10px] text-slate-500">O paciente não poderá avançar sem responder</span>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!form.texto.trim()} className="px-6 py-2.5 text-sm font-bold text-white rounded-xl transition shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            Salvar Pergunta
          </button>
        </div>
      </div>
    </div>
  );
};
