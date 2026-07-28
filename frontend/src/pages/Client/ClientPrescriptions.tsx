import React, { useState, useEffect } from 'react';
import { Plus, Pill, Trash2, Download, X, Loader2, Upload, FileText, Edit, Eye, ShieldCheck, Clock } from 'lucide-react';
import { API_URL } from '../../config';

interface Prescription {
  id: number; medico?: string; data: string;
  observacoes?: string; medicamentos?: string; arquivo_url?: string; criado_em: string;
  hash_sha256?: string; tipo?: string;
}

export const ClientPrescriptions: React.FC = () => {
  const [list, setList] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<{url: string, type: string} | null>(null);

  // AI OCR scanner states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [extractedOcrText, setExtractedOcrText] = useState('');

  const clienteId = localStorage.getItem('activeProfileId') || '1';
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

  // Upload & Leitura de Arquivos de Receita com IA OCR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setOcrLoading(true);
    setExtractedOcrText('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!uploadRes.ok) throw new Error('Falha no upload do arquivo');
      const uploadData = await uploadRes.json();
      
      const fileUrl = uploadData.url;
      const realExtractedText = uploadData.extractedText || '';
      
      setForm(f => ({
        ...f,
        arquivo_url: fileUrl,
        observacoes: f.observacoes || (realExtractedText ? `[Digitalização por IA]: ${realExtractedText.slice(0, 200)}...` : `[Anexo]: ${file.name}`)
      }));

      setExtractedOcrText(
        `📄 LEITURA COMPUTACIONAL PROCESSADA (${file.name})\n----------------------------------------\n${realExtractedText}\n----------------------------------------\nURL: ${fileUrl}`
      );
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar upload do arquivo.');
    } finally {
      setOcrLoading(false);
    }
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
      if (!res.ok) throw new Error('Erro ao salvar receita');
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
    if (!confirm('Remover esta receita do seu histórico?')) return;
    await fetch(`${API_URL}/api/prescriptions/${id}`, { method: 'DELETE', headers });
    fetchList();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Minhas Receitas & Documentos Médicos</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Consulte suas prescrições ativas, horários de tomada, receituários assinados com ICP-Brasil e digitalizações por IA.</p>
        </div>
        <button onClick={() => {
          setForm({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', arquivo_url: '' });
          setMedicamentosList(['']);
          setEditingId(null);
          setExtractedOcrText('');
          setShowModal(true);
        }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
          <Plus className="w-4 h-4" /> Adicionar / Escanear Receita
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="font-black text-slate-700 mb-2">Nenhuma receita registrada</h3>
          <p className="text-sm text-slate-400 mb-6">Mantenha seu histórico de tratamentos organizado e digitalizado no seu aplicativo.</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
            Cadastrar Minha Primeira Receita
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
                      
                      setForm({ medico: item.medico || '', data: item.data ? item.data.split('T')[0] : '', observacoes: item.observacoes || '', arquivo_url: item.arquivo_url || '' });
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

                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-slate-800 text-sm">
                    {new Date(item.data || item.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                  {item.hash_sha256 && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Assinada ICP
                    </span>
                  )}
                </div>

                {item.medico && <p className="text-xs text-slate-500 font-semibold">Dr(a). {item.medico}</p>}

                {item.medicamentos && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">Medicamentos Prescritos</p>
                    {(() => {
                      let parsed: any[] = [];
                      try {
                        parsed = JSON.parse(item.medicamentos);
                      } catch {
                        parsed = item.medicamentos.split('\n').filter(Boolean);
                      }
                      return Array.isArray(parsed) ? parsed.map((m, i) => (
                        <div key={i} className="bg-indigo-50/60 rounded-xl p-2.5 border border-indigo-100/50 text-xs text-slate-800 font-semibold flex items-start gap-2">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                          <span>{typeof m === 'string' ? m : `${m.medicamento} - ${m.posologia}`}</span>
                        </div>
                      )) : null;
                    })()}
                  </div>
                )}

                {item.observacoes && <p className="text-[11px] text-slate-400 mt-3 font-medium italic">{item.observacoes}</p>}
              </div>

              {item.arquivo_url && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">Anexo Digitalizado</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const fullUrl = item.arquivo_url?.startsWith('http') || item.arquivo_url?.startsWith('data:')
                          ? item.arquivo_url!
                          : `${API_URL}${item.arquivo_url}`;
                        const isPdf = item.arquivo_url?.toLowerCase().includes('.pdf') || item.arquivo_url?.startsWith('data:application/pdf');
                        setViewingFile({ url: fullUrl, type: isPdf ? 'pdf' : 'image' });
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-500" /> Visualizar
                    </button>
                    <button
                      onClick={() => {
                        const fullUrl = item.arquivo_url?.startsWith('http') || item.arquivo_url?.startsWith('data:')
                          ? item.arquivo_url!
                          : `${API_URL}${item.arquivo_url}`;
                        window.open(fullUrl, '_blank');
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Adição/Edição de Receita */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Cadastrar Receita Médica</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm font-semibold">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Anexo da Receita (Leitura da IA)</label>
                  <label className="flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl px-4 py-6 transition">
                    {ocrLoading ? (
                      <>
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="text-sm text-indigo-600 font-black animate-pulse">Escaneando imagem/PDF com IA...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-sm text-slate-600 font-bold">{form.arquivo_url ? '✓ Arquivo anexado com sucesso' : 'Selecione a imagem ou PDF da receita'}</span>
                        <span className="text-[10px] text-slate-400">A IA extrairá os medicamentos automaticamente</span>
                      </>
                    )}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" disabled={ocrLoading} />
                  </label>
                </div>

                {extractedOcrText && (
                  <div className="col-span-2 bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-[10.5px] leading-relaxed whitespace-pre shadow-inner">
                    <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mb-1.5">// LEITURA EXTRAÍDA DA RECEITA</p>
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

      {/* Visualizador de Arquivo Anexo */}
      {viewingFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-600"/> Visualizador de Documento Anexo</h3>
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
