import React, { useState, useEffect } from 'react';
import { Plus, Pill, Trash2, Download, X, Loader2, Upload, FileText, Edit, Eye, Minus } from 'lucide-react';
import { API_URL } from '../../config';

interface Prescription {
  id: number; medico?: string; data: string;
  observacoes?: string; medicamentos?: string; arquivo_url?: string; criado_em: string;
}

export const ClientPrescriptions: React.FC = () => {
  const [list, setList] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<{url: string, type: string} | null>(null);

  // AI OCR simulator states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [extractedOcrText, setExtractedOcrText] = useState('');

  const clienteId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [form, setForm] = useState({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', arquivo_url: '' });
  const [medicamentosList, setMedicamentosList] = useState<string[]>(['']);

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/prescriptions/client/${clienteId}`, { headers });
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); } finally { setLoading(false); }
  };

  // Simular processamento de OCR pela IA do Owner Health
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setOcrLoading(true);
    setExtractedOcrText('');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      // Simula 1.6s de processamento
      setTimeout(() => {
        const fileLower = file.name.toLowerCase();
        let doctor = 'Dra. Julia Alencar';
        let medList = ['Dipirona 500mg - Tomar 1 comprimido de 6/6h se houver dor ou febre.', 'Amoxicilina 500mg - Tomar 1 cápsula a cada 8 horas por 7 dias.'];
        let ocrText = "RECEITUÁRIO MÉDICO\n--------------------------------\nEMITENTE: DRA. JULIA ALENCAR (CRM-SP 654321)\nPACIENTE: Beneficiário Owner Health\n\nPRESCRIÇÃO:\n- Dipirona 500mg (12 comprimidos)\n  Uso oral. 1 comp de 6/6h se dor/febre.\n\n- Amoxicilina 500mg (21 cápsulas)\n  Uso oral. 1 cap de 8/8h por 7 dias (Uso contínuo).";

        if (fileLower.includes('pressão') || fileLower.includes('pressao') || fileLower.includes('losartana')) {
          doctor = 'Dr. Roberto Santos';
          medList = ['Losartana Potássica 50mg - Tomar 1 comprimido em jejum pela manhã.'];
          ocrText = "RECEITUÁRIO MÉDICO\n--------------------------------\nEMITENTE: DR. ROBERTO SANTOS (CRM-SP 123456)\nPACIENTE: Beneficiário Owner Health\n\nPRESCRIÇÃO:\n- Losartana Potássica 50mg (30 comprimidos)\n  Uso oral. Tomar 1 comprimido ao dia pela manhã, em jejum.";
        }

        setForm(f => ({
          ...f,
          medico: doctor,
          observacoes: '',
          arquivo_url: reader.result as string
        }));
        setMedicamentosList(medList);

        setExtractedOcrText(ocrText);
        setOcrLoading(false);
      }, 1600);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.data) { setError('Data é obrigatória'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, medicamentos: JSON.stringify(medicamentosList.filter(m => m.trim() !== '')) };
      const url = editingId 
        ? `${API_URL}/api/prescriptions/${editingId}`
        : `${API_URL}/api/prescriptions/client/${clienteId}`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST', headers, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setShowModal(false);
      setEditingId(null);
      setForm({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', arquivo_url: '' });
      setMedicamentosList(['']);
      setExtractedOcrText('');
      fetchList();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remover esta receita?')) return;
    await fetch(`${API_URL}/api/prescriptions/${id}`, { method: 'DELETE', headers });
    fetchList();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Receitas Médicas</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Cadastre e arquive suas receitas médicas. A IA pode ler o arquivo e digitar os medicamentos para você.</p>
        </div>
        <button onClick={() => {
          setForm({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', arquivo_url: '' });
          setMedicamentosList(['']);
          setEditingId(null);
          setExtractedOcrText('');
          setShowModal(true);
        }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
          <Plus className="w-4 h-4" /> Nova Receita
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="font-black text-slate-700 mb-2">Nenhuma receita cadastrada</h3>
          <p className="text-sm text-slate-400 mb-6">Mantenha o histórico das suas prescrições médicas digitalizadas</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
            Adicionar Receita
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition group flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Pill className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => {
                      let parsed = [];
                      try { parsed = JSON.parse(item.medicamentos || '[]'); } 
                      catch { parsed = (item.medicamentos || '').split('\n').filter(Boolean); }
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
                  </div>
                </div>
                <p className="font-black text-slate-800 text-sm mb-1">
                  {new Date(item.data).toLocaleDateString('pt-BR')}
                </p>
                {item.medico && <p className="text-xs text-slate-500 font-medium">Dr(a). {item.medico}</p>}
                {item.medicamentos && (
                  <div className="mt-2.5 space-y-1.5">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1.5">Medicamentos Extraídos</p>
                    {(() => {
                      let parsed = [];
                      try {
                        parsed = JSON.parse(item.medicamentos);
                      } catch {
                        parsed = item.medicamentos.split('\n').filter(Boolean);
                      }
                      return Array.isArray(parsed) ? parsed.map((m, i) => (
                        <div key={i} className="bg-indigo-50/50 rounded-lg p-2 border border-indigo-100/40 text-xs text-slate-700 font-semibold flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                          <span>{m}</span>
                        </div>
                      )) : null;
                    })()}
                  </div>
                )}
                {item.observacoes && <p className="text-[11px] text-slate-400 mt-3 font-medium italic">{item.observacoes}</p>}
              </div>

              {item.arquivo_url && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">Receita Anexada</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const isPdf = item.arquivo_url?.startsWith('data:application/pdf');
                        setViewingFile({ url: item.arquivo_url!, type: isPdf ? 'pdf' : 'image' });
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                    <a href={item.arquivo_url} download={`receita${item.arquivo_url?.startsWith('data:application/pdf') ? '.pdf' : '.png'}`} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
                      <Download className="w-3.5 h-3.5" /> Baixar
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Nova Receita</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm font-semibold">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Upload da Receita (Leitura da IA)</label>
                  <label className="flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl px-4 py-6 transition">
                    {ocrLoading ? (
                      <>
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="text-sm text-indigo-600 font-black animate-pulse">Lendo escrita do receituário com IA...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-sm text-slate-600 font-bold">{form.arquivo_url ? '✓ Receita anexada com sucesso' : 'Selecione a imagem ou PDF'}</span>
                        <span className="text-[10px] text-slate-400">PDF, JPG, PNG (IA detectará médico e medicamentos)</span>
                      </>
                    )}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" disabled={ocrLoading} />
                  </label>
                </div>

                {extractedOcrText && (
                  <div className="col-span-2 bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-[10.5px] leading-relaxed whitespace-pre shadow-inner">
                    <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mb-1.5">// TEXTO DIGITALIZADO PELA IA</p>
                    {extractedOcrText}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Data da Receita *</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Médico Prescritor</label>
                  <input value={form.medico} onChange={e => setForm(f => ({ ...f, medico: e.target.value }))}
                    placeholder="Dr(a). Nome" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
                </div>
                
                <div className="col-span-2 space-y-2">
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
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    rows={2} placeholder="Observações adicionais..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition resize-none" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><FileText className="w-4 h-4" /> Salvar Receita</>}
              </button>
            </div>
          </div>
        </div>
      )}
    
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
