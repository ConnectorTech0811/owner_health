const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/Client/ClientMedications.tsx', 'utf8');

// 1. Imports -> add Minus
content = content.replace(
  "import { Plus, Pill, Trash2, X, Loader2, Bell, BellOff, Check, AlertCircle, Clock, Calendar, Search, MapPin, History } from 'lucide-react';",
  "import { Plus, Pill, Trash2, X, Loader2, Bell, BellOff, Check, AlertCircle, Clock, Calendar, Search, MapPin, History, Minus } from 'lucide-react';"
);

// 2. Horarios state
content = content.replace(
  "const [form, setForm] = useState({\n    nome: '', posologia: '', horarios: '', data_inicio: today,\n    data_fim: '', observacoes: '', email_lembrete: '',\n  });",
  `const [form, setForm] = useState({
    nome: '', posologia: '', data_inicio: today,
    data_fim: '', observacoes: '', email_lembrete: '',
  });
  const [horariosList, setHorariosList] = useState<string[]>(['08:00']);`
);

// Reset form
content = content.replace(
  "setForm({ nome: '', posologia: '', horarios: '', data_inicio: today, data_fim: '', observacoes: '', email_lembrete: '' });",
  `setForm({ nome: '', posologia: '', data_inicio: today, data_fim: '', observacoes: '', email_lembrete: '' });
      setHorariosList(['08:00']);`
);

// Validations and save
content = content.replace(
  "if (!form.nome) { setError('Nome é obrigatório'); return; }\n    setSaving(true); setError('');",
  `if (!form.nome) { setError('Nome é obrigatório'); return; }
    if (form.data_fim && form.data_fim < form.data_inicio) { setError('A data de término não pode ser anterior à data de início.'); return; }
    if (form.email_lembrete && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.email_lembrete)) { setError('E-mail inválido.'); return; }
    setSaving(true); setError('');`
);

content = content.replace(
  "const payload = { ...form, horarios: form.horarios.split(',').map(h => h.trim()).filter(Boolean) };",
  "const payload = { ...form, horarios: horariosList.filter(h => h.trim() !== '') };"
);

// Form UI modifications
content = content.replace(
  "<div>\n                <label className=\"block text-xs font-bold text-slate-600 mb-1.5\">Horários (separados por vírgula)</label>\n                <input value={form.horarios} onChange={e => setForm(f => ({ ...f, horarios: e.target.value }))}\n                  placeholder=\"08:00, 14:00, 20:00\" className=\"w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition\" />\n              </div>",
  `<div className="space-y-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-600">Horários</label>
                  <button onClick={() => setHorariosList([...horariosList, '08:00'])} className="text-[10px] font-bold text-blue-600 hover:underline">+ Adicionar Horário</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {horariosList.map((h, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input type="time" value={h} onChange={e => {
                        const newH = [...horariosList];
                        newH[i] = e.target.value;
                        setHorariosList(newH);
                      }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition" />
                      {horariosList.length > 1 && (
                        <button onClick={() => setHorariosList(horariosList.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"><Minus className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>`
);

// Add Observacoes
content = content.replace(
  "<div>\n                <label className=\"block text-xs font-bold text-slate-600 mb-1.5\">E-mail para Lembretes (opcional)</label>\n                <input type=\"email\" value={form.email_lembrete} onChange={e => setForm(f => ({ ...f, email_lembrete: e.target.value }))}\n                  placeholder=\"seu@email.com — receberá alertas por e-mail\" className=\"w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition\" />\n              </div>",
  `<div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Observações Adicionais (Livre)</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Informações, efeitos observados ou detalhes abertos para escrever..." rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">E-mail para Lembretes (opcional)</label>
                <input type="email" value={form.email_lembrete} onChange={e => setForm(f => ({ ...f, email_lembrete: e.target.value }))}
                  placeholder="seu@email.com — receberá alertas por e-mail" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
              </div>`
);

// Show Observacoes in Card
content = content.replace(
  "{med.posologia && <p className=\"text-xs text-slate-500 font-medium\">{med.posologia}</p>}",
  `{med.posologia && <p className="text-xs text-slate-500 font-medium">{med.posologia}</p>}
                            {med.observacoes && <p className="text-[10px] text-slate-400 font-medium mt-1 italic leading-tight">{med.observacoes}</p>}`
);

fs.writeFileSync('frontend/src/pages/Client/ClientMedications.tsx', content);
