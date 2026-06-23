import React, { useState } from 'react';
import { Activity, Search, ChevronRight } from 'lucide-react';

interface Symptom { id: string; label: string; system: string; }
interface Specialty { name: string; desc: string; icon: string; minMatches: number; symptoms: string[]; }

const SYMPTOMS: Symptom[] = [
  // Cardio
  { id: 'chest_pain', label: 'Dor no peito', system: 'Cardiovascular' },
  { id: 'palpitations', label: 'Palpitações / coração acelerado', system: 'Cardiovascular' },
  { id: 'shortness_breath', label: 'Falta de ar', system: 'Cardiovascular' },
  { id: 'leg_swelling', label: 'Inchaço nas pernas', system: 'Cardiovascular' },
  // Digestivo
  { id: 'abdominal_pain', label: 'Dor abdominal', system: 'Digestivo' },
  { id: 'nausea', label: 'Náusea / vômito', system: 'Digestivo' },
  { id: 'diarrhea', label: 'Diarreia', system: 'Digestivo' },
  { id: 'constipation', label: 'Constipação / prisão de ventre', system: 'Digestivo' },
  { id: 'heartburn', label: 'Azia / queimação', system: 'Digestivo' },
  // Neurológico
  { id: 'headache', label: 'Dor de cabeça / enxaqueca', system: 'Neurológico' },
  { id: 'dizziness', label: 'Tontura / vertigem', system: 'Neurológico' },
  { id: 'numbness', label: 'Dormência / formigamento', system: 'Neurológico' },
  { id: 'memory_loss', label: 'Perda de memória / confusão', system: 'Neurológico' },
  // Mental
  { id: 'anxiety', label: 'Ansiedade / nervosismo', system: 'Saúde Mental' },
  { id: 'depression', label: 'Tristeza persistente / depressão', system: 'Saúde Mental' },
  { id: 'insomnia', label: 'Insônia / dificuldade de dormir', system: 'Saúde Mental' },
  { id: 'panic', label: 'Ataques de pânico', system: 'Saúde Mental' },
  // Musculoesquelético
  { id: 'back_pain', label: 'Dor nas costas', system: 'Musculoesquelético' },
  { id: 'joint_pain', label: 'Dor nas articulações', system: 'Musculoesquelético' },
  { id: 'muscle_weakness', label: 'Fraqueza muscular', system: 'Musculoesquelético' },
  { id: 'limited_motion', label: 'Dificuldade de movimento', system: 'Musculoesquelético' },
  // Respiratório
  { id: 'cough', label: 'Tosse persistente', system: 'Respiratório' },
  { id: 'wheezing', label: 'Chiado no peito', system: 'Respiratório' },
  { id: 'runny_nose', label: 'Coriza / nariz entupido', system: 'Respiratório' },
  // Endócrino
  { id: 'weight_gain', label: 'Ganho de peso inexplicado', system: 'Endócrino/Metabólico' },
  { id: 'fatigue', label: 'Cansaço excessivo / fadiga', system: 'Endócrino/Metabólico' },
  { id: 'thirst', label: 'Sede excessiva', system: 'Endócrino/Metabólico' },
  { id: 'hair_loss', label: 'Queda de cabelo', system: 'Endócrino/Metabólico' },
  // Dermatológico
  { id: 'skin_rash', label: 'Manchas / erupções na pele', system: 'Dermatológico' },
  { id: 'itching', label: 'Coceira intensa', system: 'Dermatológico' },
  { id: 'skin_change', label: 'Mudança em sinais ou pintas', system: 'Dermatológico' },
];

const SPECIALTIES: Specialty[] = [
  { name: 'Cardiologia', desc: 'Coração e sistema cardiovascular', icon: '❤️', minMatches: 1, symptoms: ['chest_pain', 'palpitations', 'shortness_breath', 'leg_swelling'] },
  { name: 'Gastroenterologia', desc: 'Aparelho digestivo', icon: '🫁', minMatches: 1, symptoms: ['abdominal_pain', 'nausea', 'diarrhea', 'constipation', 'heartburn'] },
  { name: 'Neurologia', desc: 'Sistema nervoso', icon: '🧠', minMatches: 1, symptoms: ['headache', 'dizziness', 'numbness', 'memory_loss'] },
  { name: 'Psicologia / Psiquiatria', desc: 'Saúde mental e emocional', icon: '🧘', minMatches: 1, symptoms: ['anxiety', 'depression', 'insomnia', 'panic'] },
  { name: 'Ortopedia / Fisioterapia', desc: 'Ossos, músculos e articulações', icon: '🦴', minMatches: 1, symptoms: ['back_pain', 'joint_pain', 'muscle_weakness', 'limited_motion'] },
  { name: 'Pneumologia', desc: 'Sistema respiratório', icon: '🫧', minMatches: 1, symptoms: ['cough', 'wheezing', 'shortness_breath', 'runny_nose'] },
  { name: 'Endocrinologia', desc: 'Hormônios e metabolismo', icon: '⚗️', minMatches: 1, symptoms: ['weight_gain', 'fatigue', 'thirst', 'hair_loss'] },
  { name: 'Dermatologia', desc: 'Pele, cabelo e unhas', icon: '🩺', minMatches: 1, symptoms: ['skin_rash', 'itching', 'skin_change'] },
];

const SYSTEMS = [...new Set(SYMPTOMS.map(s => s.system))];

export const ClientSymptoms: React.FC = () => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState('Todos');

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setSearched(false);
  };

  const suggestions = SPECIALTIES.filter(sp =>
    sp.symptoms.filter(s => selected.has(s)).length >= sp.minMatches
  ).sort((a, b) =>
    b.symptoms.filter(s => selected.has(s)).length - a.symptoms.filter(s => selected.has(s)).length
  );

  const filtered = filter === 'Todos' ? SYMPTOMS : SYMPTOMS.filter(s => s.system === filter);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Meus Sintomas</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Selecione os sintomas que está sentindo para descobrir qual especialidade procurar</p>
      </div>

      {/* Filtro por sistema */}
      <div className="flex flex-wrap gap-2">
        {['Todos', ...SYSTEMS].map(sys => (
          <button key={sys} onClick={() => setFilter(sys)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${filter === sys ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400'}`}>
            {sys}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sintomas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Selecione seus sintomas
            {selected.size > 0 && (
              <span className="ml-auto bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>
            )}
          </h2>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filtered.map(sym => (
              <label key={sym.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${selected.has(sym.id) ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}>
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 transition ${selected.has(sym.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}
                  onClick={() => toggle(sym.id)}>
                  {selected.has(sym.id) && <span className="text-white text-[10px] font-black">✓</span>}
                </div>
                <div onClick={() => toggle(sym.id)} className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{sym.label}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{sym.system}</p>
                </div>
              </label>
            ))}
          </div>
          {selected.size > 0 && (
            <button
              onClick={() => setSearched(true)}
              className="w-full mt-4 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
            >
              <Search className="w-4 h-4" /> Ver especialidades sugeridas
            </button>
          )}
        </div>

        {/* Sugestões */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-700 mb-4">💡 Especialidades Sugeridas</h2>
          {!searched || selected.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-3xl">🩺</div>
              <p className="text-sm text-slate-500 font-medium">Selecione seus sintomas ao lado e clique em <strong>"Ver especialidades sugeridas"</strong> para receber uma indicação.</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-slate-500 font-medium">Não conseguimos identificar uma especialidade específica. Recomendamos consultar um <strong>Clínico Geral</strong> para avaliação inicial.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((sp, i) => {
                const matches = sp.symptoms.filter(s => selected.has(s)).length;
                return (
                  <div key={sp.name} className={`flex items-center gap-4 p-4 rounded-xl border transition ${i === 0 ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="text-3xl">{sp.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-800 text-sm">{sp.name}</p>
                        {i === 0 && <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase">Principal</span>}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{sp.desc}</p>
                      <p className="text-[10px] text-blue-600 font-bold mt-1">{matches} sintoma{matches > 1 ? 's' : ''} compatível{matches > 1 ? 'is' : ''}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                );
              })}
              <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                <p className="text-xs text-yellow-700 font-medium">⚠️ <strong>Atenção:</strong> Esta sugestão é informativa e não substitui uma consulta médica. Busque um profissional de saúde para diagnóstico adequado.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
