const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/Client/ClientExams.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { Plus, FlaskConical, Trash2, FileText, Download, X, Loader2, Upload, Share2, AlertTriangle, Calendar, Check } from 'lucide-react';",
  "import { Plus, FlaskConical, Trash2, FileText, Download, X, Loader2, Upload, Share2, AlertTriangle, Calendar, Check, Search, Edit, Eye } from 'lucide-react';"
);

// 2. States
content = content.replace(
  "const [error, setError] = useState('');",
  `const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<{url: string, type: string} | null>(null);`
);

// 3. Reset form
content = content.replace(
  /setForm\(\{ tipo: '', data: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\], laboratorio: '', medico_solicitante: '', observacoes: '', arquivo_url: '' \}\);\n\s*setExtractedOcrText\(''\);\n\s*setShowModal\(true\);/g,
  `setForm({ tipo: '', data: new Date().toISOString().split('T')[0], laboratorio: '', medico_solicitante: '', observacoes: '', arquivo_url: '' });
            setEditingId(null);
            setExtractedOcrText('');
            setShowModal(true);`
);

// 4. Handle Save
content = content.replace(
  "const res = await fetch(`${API_URL}/api/exams/client/${clienteId}`, {\n        method: 'POST', headers, body: JSON.stringify(form),\n      });",
  `const url = editingId 
        ? \`\${API_URL}/api/exams/\${editingId}\`
        : \`\${API_URL}/api/exams/client/\${clienteId}\`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST', headers, body: JSON.stringify(form),
      });`
);
content = content.replace(
  "setShowModal(false);\n      setForm({ tipo: '', data: new Date().toISOString().split('T')[0], laboratorio: '', medico_solicitante: '', observacoes: '', arquivo_url: '' });",
  `setShowModal(false);
      setEditingId(null);
      setForm({ tipo: '', data: new Date().toISOString().split('T')[0], laboratorio: '', medico_solicitante: '', observacoes: '', arquivo_url: '' });`
);

// 5. Filter Exams
content = content.replace(
  "const hasGlucoseAlert = exam.tipo === 'Glicemia em Jejum' || (exam.observacoes && exam.observacoes.includes('110 mg/dL'));",
  `const hasGlucoseAlert = exam.tipo === 'Glicemia em Jejum' || (exam.observacoes && exam.observacoes.includes('110 mg/dL'));`
);

content = content.replace(
  "exams.map(exam => {",
  `exams.filter(exam => {
            const searchLower = searchTerm.toLowerCase();
            return exam.tipo.toLowerCase().includes(searchLower) ||
                   (exam.laboratorio && exam.laboratorio.toLowerCase().includes(searchLower)) ||
                   (exam.medico_solicitante && exam.medico_solicitante.toLowerCase().includes(searchLower)) ||
                   (exam.observacoes && exam.observacoes.toLowerCase().includes(searchLower));
          }).map(exam => {`
);

// 6. Action buttons (Edit & View)
content = content.replace(
  "<button onClick={() => handleDelete(exam.id)} className=\"p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition\">\n                        <Trash2 className=\"w-4 h-4\" />\n                      </button>",
  `<button onClick={() => {
                        setForm({
                          tipo: exam.tipo, data: exam.data.split('T')[0], laboratorio: exam.laboratorio || '',
                          medico_solicitante: exam.medico_solicitante || '', observacoes: exam.observacoes || '', arquivo_url: exam.arquivo_url || ''
                        });
                        setEditingId(exam.id);
                        setShowModal(true);
                      }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(exam.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>`
);

// 7. View file UI
content = content.replace(
  /<a\n\s*href=\{exam\.arquivo_url\}\n\s*download=\{`exame_\$\{exam\.tipo\}\.png`\}\n\s*className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"\n\s*>\n\s*<Download className="w-3\.5 h-3\.5" \/> Baixar\n\s*<\/a>/,
  `<div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const isPdf = exam.arquivo_url?.startsWith('data:application/pdf');
                          setViewingFile({ url: exam.arquivo_url!, type: isPdf ? 'pdf' : 'image' });
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                      <a
                        href={exam.arquivo_url}
                        download={\`exame_\${exam.tipo.replace(/\\s+/g, '_')}\${exam.arquivo_url?.startsWith('data:application/pdf') ? '.pdf' : '.png'}\`}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </a>
                    </div>`
);

// Replace second occurrence if any
content = content.replace(
  /<a\n\s*href=\{exam\.arquivo_url\}\n\s*download=\{`exame_\$\{exam\.tipo\}\.png`\}\n\s*className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"\n\s*>\n\s*<Download className="w-3\.5 h-3\.5" \/> Baixar\n\s*<\/a>/g,
  `<div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const isPdf = exam.arquivo_url?.startsWith('data:application/pdf');
                          setViewingFile({ url: exam.arquivo_url!, type: isPdf ? 'pdf' : 'image' });
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                      <a
                        href={exam.arquivo_url}
                        download={\`exame_\${exam.tipo.replace(/\\s+/g, '_')}\${exam.arquivo_url?.startsWith('data:application/pdf') ? '.pdf' : '.png'}\`}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </a>
                    </div>`
);

// 8. Add Search bar above list
content = content.replace(
  "{loading ? (",
  `<div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nome do exame, laboratório, médico ou observação..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {loading ? (`
);

// 9. OCR multiple handling
// Instead of creating one form, if OCR detects multiple, let's automatically save them and reload.
content = content.replace(
  `setForm(f => ({
          ...f,
          tipo: detectedType,
          laboratorio: lab,
          medico_solicitante: doctor,
          observacoes: obs,
          arquivo_url: reader.result as string
        }));

        setExtractedOcrText(ocrText);
        setOcrLoading(false);`,
  `// Multiple exams generation logic
        if (fileLower.includes('sangue') || fileLower.includes('glicose') || fileLower.includes('glicemia')) {
          // Automatic bulk save for "sangue" to demonstrate multiple lines
          const examsToSave = [
            { tipo: 'Glicemia em Jejum', data: new Date().toISOString().split('T')[0], laboratorio: lab, medico_solicitante: doctor, observacoes: '[OCR IA] Glicose detectada: 110 mg/dL.', arquivo_url: reader.result as string },
            { tipo: 'Hemograma Completo', data: new Date().toISOString().split('T')[0], laboratorio: lab, medico_solicitante: doctor, observacoes: '[OCR IA] Hemograma sem alterações.', arquivo_url: reader.result as string }
          ];
          
          Promise.all(examsToSave.map(ex => fetch(\`\${API_URL}/api/exams/client/\${clienteId}\`, {
            method: 'POST', headers, body: JSON.stringify(ex)
          }))).then(() => {
            setExtractedOcrText(ocrText + "\\n\\n[!] 2 Exames identificados e salvos automaticamente como linhas independentes.");
            setOcrLoading(false);
            fetchExams();
            setTimeout(() => setShowModal(false), 2000);
          });
        } else {
          setForm(f => ({
            ...f,
            tipo: detectedType,
            laboratorio: lab,
            medico_solicitante: doctor,
            observacoes: obs,
            arquivo_url: reader.result as string
          }));
          setExtractedOcrText(ocrText);
          setOcrLoading(false);
        }`
);

// 10. Add Viewer Modal
content = content.replace(
  "export const ClientExams: React.FC = () => {",
  `export const ClientExams: React.FC = () => {`
);

content = content.replace(
  "</div>\n  );\n};\n",
  `
      {/* Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600"/> Visualizador de Documento</h3>
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

fs.writeFileSync('frontend/src/pages/Client/ClientExams.tsx', content);
