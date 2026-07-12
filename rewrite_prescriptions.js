const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/Client/ClientPrescriptions.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { Plus, Pill, Trash2, Download, X, Loader2, Upload, FileText } from 'lucide-react';",
  "import { Plus, Pill, Trash2, Download, X, Loader2, Upload, FileText, Edit, Eye, Minus } from 'lucide-react';"
);

// 2. States
content = content.replace(
  "const [error, setError] = useState('');",
  `const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<{url: string, type: string} | null>(null);`
);

// Form meds array instead of string
content = content.replace(
  "const [form, setForm] = useState({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', medicamentos: '', arquivo_url: '' });",
  `const [form, setForm] = useState({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', arquivo_url: '' });
  const [medicamentosList, setMedicamentosList] = useState<string[]>(['']);`
);

// Form reset handling
content = content.replace(
  /setForm\(\{ medico: '', data: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\], observacoes: '', medicamentos: '', arquivo_url: '' \}\);\n\s*setExtractedOcrText\(''\);\n\s*setShowModal\(true\);/g,
  `setForm({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', arquivo_url: '' });
          setMedicamentosList(['']);
          setEditingId(null);
          setExtractedOcrText('');
          setShowModal(true);`
);

// Handle Save endpoint and format
content = content.replace(
  "const res = await fetch(`${API_URL}/api/prescriptions/client/${clienteId}`, {\n        method: 'POST', headers, body: JSON.stringify(form),\n      });",
  `const payload = { ...form, medicamentos: JSON.stringify(medicamentosList.filter(m => m.trim() !== '')) };
      const url = editingId 
        ? \`\${API_URL}/api/prescriptions/\${editingId}\`
        : \`\${API_URL}/api/prescriptions/client/\${clienteId}\`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST', headers, body: JSON.stringify(payload),
      });`
);
content = content.replace(
  "setShowModal(false);\n      setForm({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', medicamentos: '', arquivo_url: '' });",
  `setShowModal(false);
      setEditingId(null);
      setForm({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', arquivo_url: '' });
      setMedicamentosList(['']);`
);

// Rendering medications inside the card correctly (since they might be JSON or string)
content = content.replace(
  "{item.medicamentos && (\n                  <div className=\"mt-2.5 bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/40\">\n                    <p className=\"text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1.5\">Medicamentos Extraídos</p>\n                    <p className=\"text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line\">{item.medicamentos}</p>\n                  </div>\n                )}",
  `{item.medicamentos && (
                  <div className="mt-2.5 space-y-1.5">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1.5">Medicamentos Extraídos</p>
                    {(() => {
                      let parsed = [];
                      try {
                        parsed = JSON.parse(item.medicamentos);
                      } catch {
                        parsed = item.medicamentos.split('\\n').filter(Boolean);
                      }
                      return Array.isArray(parsed) ? parsed.map((m, i) => (
                        <div key={i} className="bg-indigo-50/50 rounded-lg p-2 border border-indigo-100/40 text-xs text-slate-700 font-semibold flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                          <span>{m}</span>
                        </div>
                      )) : null;
                    })()}
                  </div>
                )}`
);

// Edit & Delete Buttons
content = content.replace(
  "<button onClick={() => handleDelete(item.id)} className=\"opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition\">\n                    <Trash2 className=\"w-4 h-4\" />\n                  </button>",
  `<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => {
                      let parsed = [];
                      try { parsed = JSON.parse(item.medicamentos || '[]'); } 
                      catch { parsed = (item.medicamentos || '').split('\\n').filter(Boolean); }
                      if (parsed.length === 0) parsed = [''];
                      
                      setForm({ medico: item.medico || '', data: item.data.split('T')[0], observacoes: item.observacoes || '', arquivo_url: item.arquivo_url || '' });
                      setMedicamentosList(parsed);
                      setEditingId(item.id);
                      setShowModal(true);
                    }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>`
);

// View file UI
content = content.replace(
  /<a href=\{item\.arquivo_url\} download="receita\.png" className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">\n\s*<Download className="w-3\.5 h-3\.5" \/> Baixar\n\s*<\/a>/,
  `<div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const isPdf = item.arquivo_url?.startsWith('data:application/pdf');
                        setViewingFile({ url: item.arquivo_url!, type: isPdf ? 'pdf' : 'image' });
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                    <a href={item.arquivo_url} download={\`receita\${item.arquivo_url?.startsWith('data:application/pdf') ? '.pdf' : '.png'}\`} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
                      <Download className="w-3.5 h-3.5" /> Baixar
                    </a>
                  </div>`
);

// Handling multiple medicines in the form
content = content.replace(
  /<div className="col-span-2">\n\s*<label className="block text-xs font-bold text-slate-600 mb-1\.5">Medicamentos Prescritos<\/label>\n\s*<textarea value=\{form\.medicamentos\} onChange=\{e => setForm\(f => \(\{ \.\.\.f, medicamentos: e\.target\.value \}\)\)\}\n\s*rows=\{3\} placeholder="Liste os medicamentos prescritos\.\.\." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition resize-none" \/>\n\s*<\/div>/,
  `<div className="col-span-2 space-y-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-600">Medicamentos Prescritos (Linhas independentes)</label>
                    <button onClick={() => setMedicamentosList([...medicamentosList, ''])} className="text-[10px] font-bold text-blue-600 hover:underline">+ Adicionar Medicamento</button>
                  </div>
                  {medicamentosList.map((med, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input 
                        value={med} 
                        onChange={e => {
                          const newList = [...medicamentosList];
                          newList[index] = e.target.value;
                          setMedicamentosList(newList);
                        }}
                        placeholder="Ex: Dipirona 500mg - 1 comp 6/6h" 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" 
                      />
                      {medicamentosList.length > 1 && (
                        <button onClick={() => setMedicamentosList(medicamentosList.filter((_, i) => i !== index))} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition">
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>`
);

// OCR Integration for Medications List
content = content.replace(
  "let medList = '1. Dipirona 500mg - Tomar 1 comprimido de 6 em 6 horas se houver dor ou febre.\\n2. Amoxicilina 500mg - Tomar 1 cápsula a cada 8 horas por 7 dias.';",
  `let medList = ['Dipirona 500mg - Tomar 1 comprimido de 6/6h se houver dor ou febre.', 'Amoxicilina 500mg - Tomar 1 cápsula a cada 8 horas por 7 dias.'];`
);

content = content.replace(
  "medList = '1. Losartana Potássica 50mg - Tomar 1 comprimido em jejum pela manhã.';",
  `medList = ['Losartana Potássica 50mg - Tomar 1 comprimido em jejum pela manhã.'];`
);

content = content.replace(
  "setForm(f => ({\n          ...f,\n          medico: doctor,\n          medicamentos: medList,\n          observacoes: '[OCR IA] Receituário lido com sucesso pela Inteligência Artificial.',\n          arquivo_url: reader.result as string\n        }));",
  `setForm(f => ({
          ...f,
          medico: doctor,
          observacoes: '[OCR IA] Receituário lido com sucesso pela Inteligência Artificial.',
          arquivo_url: reader.result as string
        }));
        setMedicamentosList(medList);`
);

// 10. Add Viewer Modal
content = content.replace(
  "export const ClientPrescriptions: React.FC = () => {",
  `export const ClientPrescriptions: React.FC = () => {`
);

content = content.replace(
  "</div>\n  );\n};\n",
  `
      {/* Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-600"/> Visualizador de Documento</h3>
              <button onClick={() => setViewingFile(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
              {viewingFile.type === 'pdf' ? (
                <iframe src={viewingFile.url} className="w-full h-full rounded-xl border border-slate-200" title="PDF Viewer" />
              ) : (
                <img src={viewingFile.url} alt="Documento" className="max-w-full max-h-full object-contain rounded-xl shadow-sm" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
`
);

fs.writeFileSync('frontend/src/pages/Client/ClientPrescriptions.tsx', content);
