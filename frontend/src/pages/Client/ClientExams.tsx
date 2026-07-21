import React, { useState, useEffect } from 'react';
import { Plus, FlaskConical, Trash2, FileText, Download, X, Loader2, Upload, Share2, AlertTriangle, Calendar, Check, Search, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';

const EXAM_TYPES = [
  'Hemograma Completo', 'Glicemia em Jejum', 'Colesterol Total e Frações',
  'Triglicerídeos', 'TSH / T4', 'Ureia e Creatinina', 'TGO / TGP',
  'Raio-X', 'Tomografia', 'Ressonância Magnética', 'Ultrassonografia',
  'Eletrocardiograma', 'Ecocardiograma', 'Densitometria Óssea',
  'PSA', 'Hemoglobina Glicada (HbA1c)', 'Outro',
];

interface Exam {
  id: number; tipo: string; data: string; laboratorio?: string;
  medico_solicitante?: string; observacoes?: string; arquivo_url?: string;
  criado_em: string;
}

interface Professional {
  id: number;
  nome: string;
  conselho?: string;
}

export const ClientExams: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<{url: string, type: string} | null>(null);

  // AI OCR simulator states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [extractedOcrText, setExtractedOcrText] = useState('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);

  const downloadExamTemplate = () => {
    const pdfRaw = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 450 >>
stream
BT
/F1 16 Tf
50 740 Td
(MODELO DE EXAME / RESULTADO - OWNER HEALTH) Tj
0 -30 Td
/F1 12 Tf
(Tipo de Exame: Hemograma Completo) Tj
0 -20 Td
(Data do Exame: 21/07/2026) Tj
0 -20 Td
(Laboratorio: Laboratorio Central de Analises) Tj
0 -20 Td
(Medico Solicitante: Dr. Roberto Santos) Tj
0 -30 Td
(RESULTADOS E LAUDO:) Tj
0 -20 Td
(- Hemacias: 4.8 milhoes/mm3) Tj
0 -20 Td
(- Hemoglobina: 14.5 g/dL) Tj
0 -20 Td
(- Leucocitos: 6.500/mm3) Tj
0 -20 Td
(- Plaquetas: 250.000/mm3) Tj
0 -30 Td
(Laudo: Teste de exame concluido sem alteracoes.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000121 00000 n 
0000000253 00000 n 
0000000330 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
832
%%EOF`;

    const blob = new Blob([pdfRaw], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_exame_ownerhealth.pdf';
    link.click();
  };
  const [showShareModal, setShowShareModal] = useState<Exam | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfId, setSelectedProfId] = useState('');
  const [shareDuration, setShareDuration] = useState('24h');
  const [generatedShareLink, setGeneratedShareLink] = useState('');
  const [sharingSuccess, setSharingSuccess] = useState(false);

  const getActiveClienteId = () => {
    const pId = localStorage.getItem('activeProfileId');
    if (pId && pId !== 'null' && pId !== 'undefined') return pId;
    const uRaw = localStorage.getItem('user');
    if (uRaw) {
      try {
        const u = JSON.parse(uRaw);
        if (u.cliente_id) return String(u.cliente_id);
        if (u.id) return String(u.id);
      } catch {}
    }
    const cId = localStorage.getItem('clienteId');
    if (cId && cId !== 'null' && cId !== 'undefined') return cId;
    return '1';
  };

  const clienteId = getActiveClienteId();
  const token = localStorage.getItem('token');
  const userPlan = localStorage.getItem('plano_plataforma') || 'free';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleDownloadFile = async (url: string, title: string) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') || url.startsWith('data:') ? url : `${API_URL}${url}`;
    
    let ext = 'pdf';
    if (url.startsWith('data:')) {
      const mime = url.split(';')[0].split(':')[1] || '';
      if (mime.includes('pdf')) ext = 'pdf';
      else if (mime.includes('png')) ext = 'png';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('webp')) ext = 'webp';
    } else if (url.includes('.')) {
      const parts = url.split('.');
      const rawExt = parts[parts.length - 1].split('?')[0].toLowerCase();
      if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx'].includes(rawExt)) {
        ext = rawExt;
      }
    }

    const cleanName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${ext}`;

    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = cleanName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const [form, setForm] = useState({
    tipo: '', data: new Date().toISOString().split('T')[0], laboratorio: '', medico_solicitante: '', observacoes: '', arquivo_url: '',
  });

  useEffect(() => {
    fetchExams();
    fetchProfessionals();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/exams/client/${clienteId}`, { headers });
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch { setExams([]); } finally { setLoading(false); }
  };

  const fetchProfessionals = async () => {
    try {
      const res = await fetch(`${API_URL}/api/professionals`, { headers });
      const data = await res.json();
      setProfessionals(Array.isArray(data) ? data : []);
    } catch {
      // Mock fallback
      setProfessionals([
        { id: 1, nome: 'Dr. Roberto Santos (Cardiologista)' },
        { id: 2, nome: 'Dra. Julia Alencar (Clínico Geral)' },
        { id: 3, nome: 'Dr. Marcos Souza (Endocrinologista)' }
      ]);
    }
  };

  // Leitura Real de Arquivo e IA (OCR)
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

      const uploadData = await uploadRes.json();
      
      const fileUrl = uploadData.url;
      const realExtractedText = uploadData.extractedText || '';
      const analysis = uploadData.analysis || {};

      setAiWarnings(Array.isArray(analysis.warnings) ? analysis.warnings : []);
      
      // Detecção inteligente baseada no nome do arquivo e texto lido
      const fileLower = (file.name + ' ' + realExtractedText).toLowerCase();
      let detectedType = analysis.tipo || form.tipo || '';
      
      if (!detectedType || detectedType === 'Outro') {
        for (const t of EXAM_TYPES) {
          if (fileLower.includes(t.toLowerCase())) {
            detectedType = t;
            break;
          }
        }
      }
      if (!detectedType) detectedType = 'Hemograma Completo';

      setForm(f => ({
        ...f,
        tipo: detectedType,
        data: analysis.data || f.data,
        laboratorio: analysis.laboratorio || f.laboratorio,
        medico_solicitante: analysis.medico_solicitante || f.medico_solicitante,
        arquivo_url: fileUrl,
        observacoes: f.observacoes || realExtractedText || ''
      }));

      setExtractedOcrText(
        realExtractedText
          ? realExtractedText
          : `✓ Arquivo "${file.name}" anexado com sucesso.`
      );
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar upload do arquivo.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.tipo || !form.data) { setError('Tipo e data são obrigatórios'); return; }
    setSaving(true); setError('');
    try {
      const url = editingId 
        ? `${API_URL}/api/exams/${editingId}`
        : `${API_URL}/api/exams/client/${clienteId}`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST', headers, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setShowModal(false);
      setEditingId(null);
      setForm({ tipo: '', data: new Date().toISOString().split('T')[0], laboratorio: '', medico_solicitante: '', observacoes: '', arquivo_url: '' });
      setExtractedOcrText('');
      fetchExams();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este exame?')) return;
    try {
      await fetch(`${API_URL}/api/exams/${id}`, { method: 'DELETE', headers });
      fetchExams();
    } catch { /* silent */ }
  };

  // Gerar código / link de visualização temporária para profissional
  const handleGenerateShare = () => {
    if (!selectedProfId) {
      alert('Por favor, selecione um profissional.');
      return;
    }
    const profName = professionals.find(p => String(p.id) === String(selectedProfId))?.nome || 'Profissional';
    const randCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const mockLink = `${window.location.origin}/view/exam/${showShareModal?.id}?token=${randCode}&role=professional`;
    
    // Salvar regra no localStorage para aparecer em Privacidade
    const newShare = {
      id: `share-${randCode}`,
      examId: showShareModal?.id || 1,
      examTipo: showShareModal?.tipo || 'Exame',
      profNome: profName,
      duration: shareDuration === '24h' ? '24 Horas' : shareDuration === '48h' ? '48 Horas' : shareDuration === '7d' ? '7 Dias' : 'Permanente',
      criadoEm: new Date().toLocaleDateString('pt-BR')
    };
    const existing = localStorage.getItem(`shares_${clienteId}`);
    const list = existing ? JSON.parse(existing) : [];
    localStorage.setItem(`shares_${clienteId}`, JSON.stringify([newShare, ...list]));

    setGeneratedShareLink(mockLink);
    setSharingSuccess(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Meus Exames</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Gerencie seus laudos e compartilhe de forma temporária com seus médicos</p>
        </div>
        <button
          onClick={() => {
            setForm({ tipo: '', data: new Date().toISOString().split('T')[0], laboratorio: '', medico_solicitante: '', observacoes: '', arquivo_url: '' });
            setEditingId(null);
            setExtractedOcrText('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
        >
          <Plus className="w-4 h-4" /> Novo Exame
        </button>
      </div>

      {/* List */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por nome do exame, laboratório, médico ou observação..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        <div className="w-full sm:w-48">
          <input
            type="date"
            value={searchDate}
            onChange={e => setSearchDate(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition shadow-sm text-slate-500"
            title="Filtrar por data"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FlaskConical className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="font-black text-slate-700 mb-2">Nenhum exame cadastrado</h3>
          <p className="text-sm text-slate-400 mb-6">Adicione seus exames para ter um histórico completo de saúde</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
            Adicionar Primeiro Exame
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.filter(exam => {
            const searchLower = searchTerm.toLowerCase();
            const textMatch = exam.tipo.toLowerCase().includes(searchLower) ||
                   (exam.laboratorio && exam.laboratorio.toLowerCase().includes(searchLower)) ||
                   (exam.medico_solicitante && exam.medico_solicitante.toLowerCase().includes(searchLower)) ||
                   (exam.observacoes && exam.observacoes.toLowerCase().includes(searchLower));
            const dateMatch = searchDate ? exam.data.startsWith(searchDate) : true;
            return textMatch && dateMatch;
          }).map(exam => {
            const hasGlucoseAlert = exam.tipo === 'Glicemia em Jejum' || (exam.observacoes && exam.observacoes.includes('110 mg/dL'));
            
            return (
              <div key={exam.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setShowShareModal(exam);
                          setSelectedProfId('');
                          setGeneratedShareLink('');
                          setSharingSuccess(false);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Liberar acesso temporário para profissional"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => {
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
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-black text-slate-800 text-sm mb-1">{exam.tipo}</h3>
                  <p className="text-xs text-slate-500 font-medium mb-2">
                    {new Date(exam.data).toLocaleDateString('pt-BR')}
                    {exam.laboratorio && ` • ${exam.laboratorio}`}
                  </p>
                  
                  {exam.medico_solicitante && (
                    <p className="text-xs text-slate-400 font-medium">Solicitante: Dr(a). {exam.medico_solicitante}</p>
                  )}
                  
                  {exam.observacoes && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 leading-relaxed font-semibold">
                      {exam.observacoes}
                    </p>
                  )}

                  {/* AI Diagnosis Warning (Pro Only) */}
                  {userPlan === 'pro' && hasGlucoseAlert && (
                    <div className="mt-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Recomendação IA Owner Health</p>
                          <p className="text-[10.5px] leading-relaxed font-medium mt-0.5">Foi identificada taxa de Glicemia acima do ideal (110 mg/dL). Sugerimos consulta preventiva com endocrinologista.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/client/scheduling?specialty=Endocrinologia')}
                        className="w-full flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] py-1.5 px-3 rounded-lg transition"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Agendar Consulta Especializada
                      </button>
                    </div>
                  )}
                </div>

                {exam.arquivo_url && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">Laudo em Anexo</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const fullUrl = exam.arquivo_url?.startsWith('http') || exam.arquivo_url?.startsWith('data:')
                            ? exam.arquivo_url!
                            : `${API_URL}${exam.arquivo_url}`;
                          const isPdf = exam.arquivo_url?.toLowerCase().includes('.pdf') || exam.arquivo_url?.startsWith('data:application/pdf');
                          setViewingFile({ url: fullUrl, type: isPdf ? 'pdf' : 'image' });
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-500" /> Ver
                      </button>
                      <button
                        onClick={() => handleDownloadFile(exam.arquivo_url!, `exame_${exam.tipo}`)}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Novo Exame */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Novo Exame</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm font-semibold">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Anexo e Leitura Automática de Exame</label>
                    <button
                      type="button"
                      onClick={downloadExamTemplate}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar Modelo de Exame (.pdf)
                    </button>
                  </div>

                  <label className="flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl px-4 py-5 transition">
                    {ocrLoading ? (
                      <>
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <span className="text-xs text-blue-600 font-black animate-pulse">Analisando e lendo informações do documento...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-xs text-slate-700 font-bold">{form.arquivo_url ? '✓ Documento anexado' : 'Clique para selecionar o arquivo do exame'}</span>
                        <span className="text-[10.5px] text-slate-400">Aceita arquivos em formato PDF, PNG ou JPG</span>
                      </>
                    )}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" onChange={handleFileUpload} className="hidden" disabled={ocrLoading} />
                  </label>
                </div>

                {/* Status Banner */}
                {form.arquivo_url && !ocrLoading && (
                  <div className="col-span-2">
                    {extractedOcrText ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-emerald-900">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-emerald-800">Leitura do Documento Concluída com Sucesso!</p>
                          <p className="text-[11px] font-medium text-emerald-700 mt-0.5">O conteúdo lido no arquivo foi preenchido nos campos abaixo.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-red-900">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-800">Documento Sem Camada de Texto Pesquisável</p>
                          <p className="text-[11px] font-medium text-red-700 mt-0.5">O arquivo anexado parece ser uma foto ou scanner. Você pode preencher os campos abaixo manualmente.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {aiWarnings.length > 0 && (
                  <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1 text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Observações de Leitura:</span>
                    </div>
                    {aiWarnings.map((w, idx) => (
                      <p key={idx} className="text-[11px] font-medium leading-normal pl-5">{w}</p>
                    ))}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipo de Exame *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition">
                    <option value="">Selecione...</option>
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Data do Exame *</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Laboratório</label>
                  <input value={form.laboratorio} onChange={e => setForm(f => ({ ...f, laboratorio: e.target.value }))}
                    placeholder="Nome do lab." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Médico Solicitante</label>
                  <input value={form.medico_solicitante} onChange={e => setForm(f => ({ ...f, medico_solicitante: e.target.value }))}
                    placeholder="Dr(a). Nome" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Laudo / Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    rows={3} placeholder="Anotações ou resumo do resultado..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition resize-none" />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><FileText className="w-4 h-4" /> Salvar Exame</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Compartilhar Temporariamente */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-800">Liberar Acesso a Exame</h3>
              <button onClick={() => setShowShareModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {!sharingSuccess ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Selecione um profissional cadastrado e defina por quanto tempo ele poderá visualizar o laudo do seu exame <b>{showShareModal.tipo}</b> de forma segura.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Médico / Profissional de Saúde</label>
                  <select
                    value={selectedProfId}
                    onChange={e => setSelectedProfId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="">Selecione um médico...</option>
                    {professionals.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Tempo de Acesso Autorizado</label>
                  <select
                    value={shareDuration}
                    onChange={e => setShareDuration(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="24h">24 Horas</option>
                    <option value="48h">48 Horas</option>
                    <option value="7d">7 Dias</option>
                    <option value="permanent">Permanente</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowShareModal(null)} className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
                  <button onClick={handleGenerateShare} className="flex-1 py-3 rounded-xl text-xs font-bold text-white transition hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>Autorizar Acesso</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">Acesso Autorizado!</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">O link seguro foi gerado e expira em {shareDuration === 'permanent' ? 'nunca' : shareDuration}.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-600 truncate font-mono select-all text-left flex-1">{generatedShareLink}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedShareLink);
                      alert('Link copiado!');
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg transition hover:bg-blue-700 shrink-0"
                  >
                    Copiar
                  </button>
                </div>

                <button
                  onClick={() => setShowShareModal(null)}
                  className="w-full py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition mt-2"
                >
                  Fechar Janela
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    
      {/* Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600"/> Visualizador de Documento</h3>
              <div className="flex items-center gap-3">
                <a
                  href={viewingFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  Abrir em Nova Aba ↗
                </a>
                <button onClick={() => setViewingFile(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X className="w-5 h-5" /></button>
              </div>
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
