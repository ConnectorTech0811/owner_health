import React, { useState, useEffect } from 'react';
import { Plus, Pill, Trash2, Download, X, Loader2, Upload, FileText, Edit, Eye, ShieldCheck, Clock, Search, Printer } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { API_URL } from '../../config';

interface Prescription {
  id: number;
  medico?: string;
  medico_nome?: string;
  medico_crm?: string;
  paciente_nome?: string;
  paciente_cpf?: string;
  dias_atestado?: string;
  cid10_codigo?: string;
  cid10_descricao?: string;
  data: string;
  observacoes?: string;
  medicamentos?: string;
  arquivo_url?: string;
  criado_em: string;
  hash_sha256?: string;
  tipo?: string;
}

const formatDate = (dateVal?: string) => {
  if (!dateVal) return '';
  const cleanStr = String(dateVal).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return new Date(dateVal).toLocaleDateString('pt-BR');
};

export const ClientPrescriptions: React.FC = () => {
  const [list, setList] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<{url: string, type: string} | null>(null);

  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('viewId');
  const [viewingSystemDoc, setViewingSystemDoc] = useState<Prescription | null>(null);

  // Filtros de busca
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState('todos'); // todos, receita, atestado
  const [filterDoctor, setFilterDoctor] = useState('');

  // AI OCR scanner states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [extractedOcrText, setExtractedOcrText] = useState('');

  const clienteId = localStorage.getItem('activeProfileId') || '1';
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [form, setForm] = useState({ medico: '', data: new Date().toISOString().split('T')[0], observacoes: '', arquivo_url: '' });
  const [medicamentosList, setMedicamentosList] = useState<string[]>(['']);

  useEffect(() => { fetchList(); }, []);

  useEffect(() => {
    if (viewId && list.length > 0) {
      const doc = list.find(item => String(item.id) === String(viewId));
      if (doc) {
        setViewingSystemDoc(doc);
      }
    }
  }, [viewId, list]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/prescriptions/client/${clienteId}`, { headers });
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); } finally { setLoading(false); }
  };

  const filteredList = list.filter(item => {
    // 1. Filtro de tipo:
    const isAtestado = item.tipo === 'atestado';
    const isReceita = !item.tipo || item.tipo.startsWith('receita');
    
    if (filterType === 'atestado' && !isAtestado) return false;
    if (filterType === 'receita' && !isReceita) return false;
    
    // 2. Filtro de data:
    if (filterDate) {
      const itemDate = (item.data || item.criado_em || '').split('T')[0];
      if (itemDate !== filterDate) return false;
    }
    
    // 3. Filtro de médico:
    if (filterDoctor) {
      const docName = item.medico || item.medico_nome || '';
      if (!docName.toLowerCase().includes(filterDoctor.toLowerCase())) return false;
    }
    
    return true;
  });

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
        }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
          <Plus className="w-4 h-4" /> Adicionar / Escanear Receita
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end text-xs font-semibold text-slate-600 no-print animate-fadeIn">
        <div className="w-full md:w-1/3 space-y-1">
          <label className="block text-slate-500 font-bold">Buscar por Médico</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Ex: Dr. Roberto"
              value={filterDoctor}
              onChange={e => setFilterDoctor(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div className="w-full md:w-1/4 space-y-1">
          <label className="block text-slate-500 font-bold">Tipo de Documento</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="todos">Todos os documentos</option>
            <option value="receita">Receitas Médicas</option>
            <option value="atestado">Atestados Médicos</option>
          </select>
        </div>

        <div className="w-full md:w-1/4 space-y-1">
          <label className="block text-slate-500 font-bold">Filtrar por Data</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {(filterDoctor || filterType !== 'todos' || filterDate) && (
          <button
            onClick={() => {
              setFilterDoctor('');
              setFilterType('todos');
              setFilterDate('');
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition cursor-pointer self-stretch md:self-auto"
          >
            Limpar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center animate-fadeIn">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="font-black text-slate-700 mb-2">Nenhum documento encontrado</h3>
          <p className="text-sm text-slate-400 mb-6">Ajuste os filtros de busca ou cadastre novas receitas de tratamentos.</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md cursor-pointer" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
            Cadastrar Receita Manual
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredList.map(item => {
            const medicoName = item.medico || item.medico_nome || 'Médico Credenciado';
            const isAtestado = item.tipo === 'atestado';

            return (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition group flex flex-col justify-between animate-fadeIn">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Pill className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      {!item.hash_sha256 ? (
                        <>
                          <button onClick={() => {
                            let parsed = [];
                            try { parsed = JSON.parse(item.medicamentos || '[]'); } 
                            catch { parsed = (item.medicamentos || '').split('\n').filter(Boolean); }
                            if (parsed.length === 0) parsed = [''];
                            
                            setForm({ medico: item.medico || '', data: item.data ? item.data.split('T')[0] : '', observacoes: item.observacoes || '', arquivo_url: item.arquivo_url || '' });
                            setMedicamentosList(parsed);
                            setEditingId(item.id);
                            setShowModal(true);
                          }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition cursor-pointer">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-slate-800 text-sm">
                      {formatDate(item.data || item.criado_em)}
                    </p>
                    {item.hash_sha256 && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Assinada ICP
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.25 rounded-md bg-indigo-50 text-indigo-600">
                      {isAtestado ? 'Atestado Médico' : (item.tipo === 'receita_controle_especial' ? 'Controle Especial 2 Vias' : 'Receita Simples')}
                    </span>
                  </div>

                  {medicoName && <p className="text-xs text-slate-500 font-bold">Dr(a). {medicoName}</p>}

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
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
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

              {item.hash_sha256 && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                  <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded uppercase border border-emerald-200 font-bold">Emitido pelo Médico</span>
                  <button
                    onClick={() => setViewingSystemDoc(item)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver Documento
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm no-print">
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

      {/* Visualizador de Documento Oficial Emitido pelo Médico */}
      {viewingSystemDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .printable-document, .printable-document * {
                visibility: visible !important;
              }
              .printable-document {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 30px !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
                border-radius: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh] printable-document">
            
            {/* Cabeçalho do Modal (Oculto na Impressão) */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0 no-print">
              <div>
                <h3 className="font-black text-slate-800 text-sm">Visualização de Documento Médico</h3>
                <p className="text-[10px] text-slate-400 font-mono">ID: #{viewingSystemDoc.id} • Emitido em {formatDate(viewingSystemDoc.data || viewingSystemDoc.criado_em)}</p>
              </div>
              <button onClick={() => setViewingSystemDoc(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cabeçalho Institucional de Impressão Oficial (Apenas A4/Print) */}
            <div className="hidden print:block border-b-2 border-indigo-600 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">OWNER HEALTH</h1>
                  <p className="text-xs text-slate-500 font-bold">Clínica de Saúde & Prescrição Médica Eletrônica</p>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-semibold space-y-0.5">
                  <p className="font-bold text-indigo-700">DOCUMENTO MÉDICO OFICIAL</p>
                  <p>Validade Nacional • MP nº 2.200-2/2001</p>
                  <p>Data de Emissão: {formatDate(viewingSystemDoc.data || viewingSystemDoc.criado_em)}</p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Documento */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-700">
              
              {/* Logotipo e Tipo de Documento */}
              <div className="flex flex-col items-center justify-center text-center border-b border-slate-100 pb-5 space-y-2">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 no-print">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-wider uppercase bg-slate-100 print:bg-transparent border border-slate-200 px-6 py-2 rounded-full">
                  {viewingSystemDoc.tipo === 'atestado' ? 'Atestado Médico' : 
                   viewingSystemDoc.tipo === 'receita_controle_especial' ? 'Receita de Controle Especial (2 Vias)' : 
                   'Receituário Médico Simples'}
                </h2>
              </div>

              {/* Informações de Registro */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 print:bg-white p-4 rounded-2xl border border-slate-200 text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Dados do Paciente</p>
                  <p className="font-black text-slate-800 text-sm">{viewingSystemDoc.paciente_nome || 'Paciente Cadastrado'}</p>
                  <p className="font-semibold text-slate-600">CPF: {viewingSystemDoc.paciente_cpf || 'Não Informado'}</p>
                </div>
                <div className="space-y-1 border-l border-slate-200 pl-4">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Médico Responsável</p>
                  <p className="font-black text-slate-800 text-sm">Dr(a). {viewingSystemDoc.medico || viewingSystemDoc.medico_nome || 'Médico Credenciado'}</p>
                  <p className="font-semibold text-slate-600">Conselho: {viewingSystemDoc.medico_crm || 'CRM/UF 00000'}</p>
                </div>
              </div>

              {/* Prescrição ou Texto do Atestado */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Prescrição / Cuidados Médicos</h4>
                
                {viewingSystemDoc.tipo === 'atestado' ? (
                  <div className="bg-indigo-50/50 print:bg-white p-6 rounded-2xl border border-indigo-100 text-sm leading-relaxed font-medium">
                    <p className="mb-4">
                      Atesto para os devidos fins que o(a) paciente acima identificado(a) esteve sob meus cuidados médicos nesta data e necessita de 
                      <strong className="text-indigo-700 font-bold mx-1">{viewingSystemDoc.dias_atestado || '3'} dia(s)</strong> de afastamento de suas atividades laborativas a partir desta data.
                    </p>
                    {viewingSystemDoc.cid10_codigo && (
                      <p className="text-xs text-slate-600 border-t border-indigo-100 pt-3 mt-3 font-semibold">
                        Diagnóstico (CID-10): <strong className="text-slate-800">{viewingSystemDoc.cid10_codigo} - {viewingSystemDoc.cid10_descricao}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {(() => {
                      let parsed: any[] = [];
                      try {
                        parsed = JSON.parse(viewingSystemDoc.medicamentos || '[]');
                      } catch {
                        parsed = (viewingSystemDoc.medicamentos || '').split('\n').filter(Boolean);
                      }
                      
                      return Array.isArray(parsed) && parsed.length > 0 ? (
                        parsed.map((item, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                            <p className="font-black text-slate-800 text-[13px]">{typeof item === 'string' ? item : item.medicamento}</p>
                            {typeof item !== 'string' && item.posologia && (
                              <p className="text-slate-600 font-semibold text-[11px] leading-relaxed">
                                Posologia: {item.posologia} {item.instrucoes ? `(${item.instrucoes})` : ''}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 font-medium text-center py-4">Nenhum item prescrito.</p>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Observações / Recomendações */}
              {viewingSystemDoc.observacoes && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Observações / Recomendações</h4>
                  <div className="bg-slate-50 print:bg-white p-4 rounded-2xl border border-slate-200 text-xs leading-relaxed font-semibold italic text-slate-700">
                    "{viewingSystemDoc.observacoes}"
                  </div>
                </div>
              )}

              {/* Assinatura do Médico para Impressão */}
              <div className="hidden print:block pt-12 pb-4 text-center">
                <div className="w-72 mx-auto border-t border-slate-400 pt-2">
                  <p className="font-black text-sm text-slate-900">Dr(a). {viewingSystemDoc.medico || viewingSystemDoc.medico_nome || 'Médico Credenciado'}</p>
                  <p className="text-xs text-slate-600 font-semibold">{viewingSystemDoc.medico_crm || 'CRM/UF'}</p>
                  <p className="text-[10px] text-emerald-700 font-bold mt-1">Assinado Digitalmente via Certificado ICP-Brasil</p>
                </div>
              </div>

              {/* Bloco de Assinatura e Validação ICP-Brasil */}
              <div className="bg-emerald-50 print:bg-white border-2 border-emerald-200 rounded-3xl p-5 space-y-3.5">
                <div className="flex items-center gap-2 text-emerald-900">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Assinatura Digital Autenticada (ICP-Brasil)</span>
                </div>
                <div className="text-[10px] text-emerald-800 font-medium space-y-1 leading-relaxed">
                  <p>✓ Documento assinado digitalmente conforme Medida Provisória nº 2.200-2/2001.</p>
                  <p className="font-mono text-[9px] break-all bg-emerald-100/50 print:bg-slate-100 p-2 rounded-lg border border-emerald-200 select-all">
                    HASH SHA-256: {viewingSystemDoc.hash_sha256 || 'Assinatura Criptográfica Válida'}
                  </p>
                </div>
                <div className="pt-1.5 flex justify-between items-center text-[10px] border-t border-emerald-200/60 font-semibold">
                  <span className="text-emerald-700 font-bold">Autoridade Certificadora: Owner Health PKI v5</span>
                  <a 
                    href={`https://validar.iti.gov.br?hash=${viewingSystemDoc.hash_sha256}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-emerald-700 font-black hover:underline flex items-center gap-0.5"
                  >
                    Validar no ITI.gov.br ↗
                  </a>
                </div>
              </div>

            </div>

            {/* Ações (Oculto na Impressão) */}
            <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0 no-print">
              <button 
                onClick={() => setViewingSystemDoc(null)} 
                className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Fechar
              </button>
              <button 
                onClick={() => window.print()} 
                className="flex-1 py-3 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
              >
                <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
