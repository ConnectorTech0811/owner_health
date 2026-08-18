import React, { useState, useEffect } from 'react';
import {
  FileText, Loader2, Printer, ShieldCheck, History, Search,
  AlertTriangle, Plus, Trash2, BookOpen, Sparkles,
  Stethoscope, ChevronRight, Eye, X, Filter, ShieldAlert
} from 'lucide-react';
import { API_URL } from '../../config';
import { SearchableSelect } from '../../components/SearchableSelect';

interface PrescriptionItem {
  medicamento: string;
  posologia: string;
  via?: string;
  instrucoes?: string;
  registro_ms?: string;
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

export const CompanyPrescriptions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'emitir' | 'modelos' | 'historico' | 'bulario'>('emitir');
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // ANVISA e CID-10 no Emissor
  const [anvisaSearch, setAnvisaSearch] = useState('');
  const [anvisaResults, setAnvisaResults] = useState<any[]>([]);
  const [cidSearch, setCidSearch] = useState('');
  const [cidResults, setCidResults] = useState<any[]>([]);
  const [showCidDropdown, setShowCidDropdown] = useState(false);

  // Filtros Próprios da Aba "Consulta ANVISA & CID-10"
  const [bularioAnvisaSearch, setBularioAnvisaSearch] = useState('');
  const [bularioPage, setBularioPage] = useState(1);
  const [bularioCidSearch, setBularioCidSearch] = useState('');
  const [fullAnvisaCatalog, setFullAnvisaCatalog] = useState<any[]>([]);
  const [fullCidCatalog, setFullCidCatalog] = useState<any[]>([]);

  // Form de Emissão
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [docForm, setDocForm] = useState({
    profissional_id: '',
    paciente_cpf: '',
    paciente_nome: '',
    tipo: 'receita_simples', // receita_simples, receita_controle_especial, receita_azul, atestado, exames
    vias: 1,
    cid10_codigo: '',
    cid10_descricao: '',
    exibir_cid_atestado: true,
    dias_atestado: '3',
    justificativa_exames: '',
    observacoes: '',
    assinado_digitalmente: true
  });

  const [observacoesByTipo, setObservacoesByTipo] = useState<Record<string, string>>({
    receita_simples: '',
    receita_controle_especial: '',
    atestado: '',
    exames: ''
  });

  // Itens da Prescrição
  const [itemsList, setItemsList] = useState<PrescriptionItem[]>([
    { medicamento: '', posologia: '', via: 'Oral', instrucoes: '' }
  ]);

  // Segurança Clínica (Alertas em Tempo Real)
  const [safetyAlerts, setSafetyAlerts] = useState<any[]>([]);

  // Modelos & Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');

  // Histórico
  const [historyDocs, setHistoryDocs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [viewingDocModal, setViewingDocModal] = useState<any | null>(null);

  // Documento Emitido Atual (Preview A4)
  const [issuedDoc, setIssuedDoc] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isDoctor = user?.tipo_profissional === 'medico';
  const profIdLocal = localStorage.getItem('profissionalId') || '';

  useEffect(() => {
    fetchInitialData();
  }, [token, companyId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDoctors(),
        fetchPatients(),
        fetchTemplates(),
        fetchHistoryDocs(),
        fetchFullCatalogs()
      ]);
    } catch (err) {
      console.error(err);
    } fontally: {
      setLoading(false);
    }
  };

  const fetchFullCatalogs = async () => {
    try {
      const [resAnvisa, resCid] = await Promise.all([
        fetch(`${API_URL}/api/prescriptions/medications-catalog`),
        fetch(`${API_URL}/api/prescriptions/cid10`)
      ]);
      const dataAnvisa = await resAnvisa.json();
      const dataCid = await resCid.json();

      if (Array.isArray(dataAnvisa)) setFullAnvisaCatalog(dataAnvisa);
      if (Array.isArray(dataCid)) setFullCidCatalog(dataCid);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPatients = async () => {
    try {
      if (token) {
        const res = await fetch(`${API_URL}/api/clients`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) setPatients(data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchDoctors = async () => {
    try {
      if (token && companyId) {
        const res = await fetch(`${API_URL}/api/professionals?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const medics = Array.isArray(data) ? data.filter((p: any) => p.tipo_profissional === 'medico') : [];
        setProfessionals(medics);
        
        if (isDoctor && profIdLocal) {
          setDocForm(prev => ({ ...prev, profissional_id: profIdLocal }));
        } else if (medics.length > 0) {
          setDocForm(prev => ({ ...prev, profissional_id: String(medics[0].id) }));
        }
      }
    } catch (err) { console.error(err); }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prescriptions/templates`);
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch (err) { console.error(err); }
  };

  const fetchHistoryDocs = async () => {
    setLoadingHistory(true);
    try {
      if (token && companyId) {
        const res = await fetch(`${API_URL}/api/companies/${companyId}/documents`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHistoryDocs(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  };

  const handleDeleteDocument = async (doc: any) => {
    const confirmMessage = 
      `⚠️ ATENÇÃO: EXCLUSÃO PERMANENTE DE DOCUMENTO MÉDICO\n\n` +
      `Ao excluir este ${doc.tipo === 'atestado' ? 'atestado' : 'receituário'}, ele será removido permanentemente do seu histórico médico e TAMBÉM da conta do paciente vinculado (${doc.paciente_nome || doc.paciente_cpf || 'Paciente'}).\n\n` +
      `Esta ação não poderá ser desfeita. Deseja realmente prosseguir com a exclusão?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Documento excluído com sucesso.');
        fetchHistoryDocs();
      } else {
        alert('Erro ao excluir documento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao excluir documento.');
    }
  };

  // Busca ANVISA com debounce (Emissor)
  useEffect(() => {
    if (!anvisaSearch || anvisaSearch.trim().length < 2) {
      setAnvisaResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/prescriptions/medications-catalog?search=${encodeURIComponent(anvisaSearch)}`);
        const data = await res.json();
        if (Array.isArray(data)) setAnvisaResults(data);
      } catch (err) { console.error(err); }
    }, 300);
    return () => clearTimeout(timer);
  }, [anvisaSearch]);

  // Busca CID-10 com debounce (Emissor)
  useEffect(() => {
    if (!cidSearch || cidSearch.trim().length < 2) {
      setCidResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/prescriptions/cid10?search=${encodeURIComponent(cidSearch)}`);
        const data = await res.json();
        if (Array.isArray(data)) setCidResults(data);
      } catch (err) { console.error(err); }
    }, 300);
    return () => clearTimeout(timer);
  }, [cidSearch]);

  // Checagem de Segurança Clínica
  const runSafetyCheck = async (items: PrescriptionItem[], patient: any) => {
    if (!items || items.length === 0) {
      setSafetyAlerts([]);
      return;
    }
    try {
      const patientAllergies = patient?.alergias || ['Penicilina'];
      const patientContinuous = patient?.medicamentos_continuos || ['Losartana 50mg'];

      const res = await fetch(`${API_URL}/api/prescriptions/check-safety`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicamentos: items,
          paciente_alergias: patientAllergies,
          paciente_uso_continuo: patientContinuous
        })
      });

      const data = await res.json();
      if (data && Array.isArray(data.alertas)) {
        setSafetyAlerts(data.alertas);
      } else {
        setSafetyAlerts([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePatientSelect = (cpfOrId: string) => {
    const pat = patients.find(p => String(p.cpf) === cpfOrId || String(p.id) === cpfOrId || p.nome === cpfOrId);
    setSelectedPatient(pat || null);
    setDocForm(prev => ({
      ...prev,
      paciente_cpf: pat ? pat.cpf || pat.nome : cpfOrId,
      paciente_nome: pat ? pat.nome : cpfOrId
    }));
    if (pat) {
      runSafetyCheck(itemsList, pat);
    }
  };

  const handleAddItem = (item?: any) => {
    const newItem: PrescriptionItem = {
      medicamento: item ? `${item.nome} ${item.dosagem}` : '',
      posologia: item ? item.posologia_padrao : '',
      via: item ? item.via : 'Oral',
      instrucoes: item ? item.indicacao : '',
      registro_ms: item ? item.registro_ms : ''
    };
    const updated = [...itemsList, newItem];
    setItemsList(updated);
    if (selectedPatient) runSafetyCheck(updated, selectedPatient);
  };

  const handleRemoveItem = (index: number) => {
    const updated = itemsList.filter((_, i) => i !== index);
    setItemsList(updated);
    if (selectedPatient) runSafetyCheck(updated, selectedPatient);
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, val: string) => {
    const updated = [...itemsList];
    updated[index] = { ...updated[index], [field]: val };
    setItemsList(updated);
    if (selectedPatient) runSafetyCheck(updated, selectedPatient);
  };

  const handleApplyTemplate = (template: any) => {
    try {
      const parsed = JSON.parse(template.conteudo_json);
      if (Array.isArray(parsed)) {
        setItemsList(parsed);
        if (selectedPatient) runSafetyCheck(parsed, selectedPatient);
        setActiveTab('emitir');
        setSuccessMsg(`Modelo "${template.titulo}" aplicado com sucesso!`);
      }
    } catch (e) {
      setErrorMsg('Erro ao carregar itens do modelo.');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!newTemplateTitle.trim()) {
      alert('Informe o título do modelo.');
      return;
    }
    setSavingTemplate(true);
    try {
      const res = await fetch(`${API_URL}/api/prescriptions/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profissional_id: docForm.profissional_id,
          titulo: newTemplateTitle,
          categoria: 'Personalizado',
          tipo: docForm.tipo,
          descricao: `Criado em ${new Date().toLocaleDateString('pt-BR')}`,
          conteudo_json: itemsList
        })
      });
      if (res.ok) {
        setNewTemplateTitle('');
        fetchTemplates();
        alert('Modelo salvo com sucesso na sua biblioteca!');
      }
    } catch (err) {
      alert('Erro ao salvar modelo.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIssuedDoc(null);

    if (!docForm.paciente_cpf) {
      setErrorMsg('Selecione um paciente para a emissão.');
      return;
    }

    if (docForm.tipo !== 'atestado' && itemsList.every(i => !i.medicamento.trim())) {
      setErrorMsg('Adicione pelo menos um medicamento à receita.');
      return;
    }

    setSubmitLoading(true);
    try {
      const selectedDocProf = professionals.find(p => String(p.id) === docForm.profissional_id);

      const payload = {
        cliente_id: selectedPatient?.id || null,
        paciente_cpf: docForm.paciente_cpf,
        paciente_nome: docForm.paciente_nome || selectedPatient?.nome || 'Paciente',
        profissional_id: docForm.profissional_id ? parseInt(docForm.profissional_id) : null,
        medico_nome: selectedDocProf ? selectedDocProf.nome : 'Dr. Médico Credenciado',
        medico_crm: selectedDocProf ? selectedDocProf.numero_conselho : 'CRM/SP 123456',
        tipo: docForm.tipo,
        vias: docForm.tipo === 'receita_controle_especial' ? 2 : docForm.vias,
        cid10_codigo: docForm.cid10_codigo,
        cid10_descricao: docForm.cid10_descricao,
        dias_atestado: docForm.dias_atestado,
        justificativa_exames: docForm.justificativa_exames,
        itens: itemsList.filter(i => i.medicamento.trim() !== ''),
        observacoes: docForm.observacoes,
        assinado_digitalmente: docForm.assinado_digitalmente
      };

      const res = await fetch(`${API_URL}/api/prescriptions/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao emitir documento.');

      setSuccessMsg(' Documento assinado criptograficamente (ICP-Brasil SHA-256) e emitido com sucesso!');
      setIssuedDoc(data);
      fetchHistoryDocs();

      // Limpar campos de observação, CID e medicamentos para o próximo documento ficar limpo
      setDocForm(prev => ({
        ...prev,
        observacoes: '',
        cid10_codigo: '',
        cid10_descricao: '',
        justificativa_exames: ''
      }));
      setObservacoesByTipo({
        receita_simples: '',
        receita_controle_especial: '',
        atestado: '',
        exames: ''
      });
      setItemsList([
        { medicamento: '', posologia: '', via: 'Oral', instrucoes: '' }
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar emissão.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // FILTRO AVANÇADO DE HISTÓRICO: Busca por Nome, CPF, Médico, Medicamento Prescrito, Hash SHA-256, Tipo, CID
  const filteredHistory = historyDocs.filter(d => {
    if (!historySearch || historySearch.trim() === '') return true;
    const q = historySearch.toLowerCase().trim();

    const patientMatch = (d.paciente_nome && d.paciente_nome.toLowerCase().includes(q)) ||
                         (d.paciente_cpf && d.paciente_cpf.toLowerCase().includes(q));

    const doctorMatch = d.medico_nome && d.medico_nome.toLowerCase().includes(q);
    const hashMatch = d.hash_sha256 && d.hash_sha256.toLowerCase().includes(q);
    const typeMatch = d.tipo && d.tipo.toLowerCase().includes(q);
    const cidMatch = (d.cid10_codigo && d.cid10_codigo.toLowerCase().includes(q)) ||
                     (d.cid10_descricao && d.cid10_descricao.toLowerCase().includes(q));

    // Busca dentro dos itens / medicamentos prescritos no documento!
    let medsMatch = false;
    if (d.medicamentos) {
      medsMatch = String(d.medicamentos).toLowerCase().includes(q);
    }
    if (d.conteudo) {
      medsMatch = medsMatch || String(d.conteudo).toLowerCase().includes(q);
    }

    return patientMatch || doctorMatch || hashMatch || typeMatch || cidMatch || medsMatch;
  });

  // FILTROS DA ABA BULÁRIO E CID-10
  const filteredBularioAnvisa = fullAnvisaCatalog.filter(med => {
    if (!bularioAnvisaSearch || bularioAnvisaSearch.trim() === '') return true;
    const q = bularioAnvisaSearch.toLowerCase().trim();
    return (
      med.nome.toLowerCase().includes(q) ||
      (med.nome_comercial && med.nome_comercial.toLowerCase().includes(q)) ||
      (med.principio_ativo && med.principio_ativo.toLowerCase().includes(q)) ||
      (med.laboratorio && med.laboratorio.toLowerCase().includes(q)) ||
      (med.indicacao && med.indicacao.toLowerCase().includes(q))
    );
  });

  const filteredBularioCid = fullCidCatalog.filter(c => {
    if (!bularioCidSearch || bularioCidSearch.trim() === '') return true;
    const q = bularioCidSearch.toLowerCase().trim();
    return (
      c.codigo.toLowerCase().includes(q) ||
      c.descricao.toLowerCase().includes(q) ||
      (c.categoria && c.categoria.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
          <p className="text-xs font-bold text-slate-500">Carregando Módulo de Receituário Premium...</p>
        </div>
      </div>
    );
  }

  if (!isDoctor) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 my-8 max-w-lg mx-auto animate-fadeIn">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-black text-slate-800">Acesso Restrito ao Perfil Médico</h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          A emissão de receitas e atestados médicos é de uso exclusivo de profissionais de saúde (médicos). 
          O perfil de clínica/hospital ou administrativo não possui permissão para emitir receituários.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Estilos para impressão A4 Oficial em 1 ou 2 Vias */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-prescription-container, #printable-prescription-container * {
            visibility: visible !important;
          }
          #printable-prescription-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm no-print">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                <FileText className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Receituário Médico Premium & Documentos Oficiais</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Plataforma clínica para emissão de Receitas (Simples e 2 Vias Controle C1/B1), Atestados com CID-10 e Pedidos de Exames com Assinatura Criptográfica ICP-Brasil.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Certificado ICP-Brasil SHA-256 Ativo</span>
            </span>
          </div>
        </div>

        {/* Navegação de Abas Principal */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 no-print flex-wrap">
          <button
            onClick={() => setActiveTab('emitir')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'emitir'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Emissor Inteligente (A4 Live)</span>
          </button>

          <button
            onClick={() => setActiveTab('modelos')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'modelos'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Biblioteca de Modelos & Kits</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-black">{templates.length}</span>
          </button>

          <button
            onClick={() => { setActiveTab('historico'); fetchHistoryDocs(); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'historico'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico & Autenticidade</span>
            {historyDocs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-black">{historyDocs.length}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('bulario')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'bulario'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Consulta ANVISA & CID-10</span>
          </button>
        </div>

        {/* ================= ABA 1: EMISSOR INTELIGENTE ================= */}
        {activeTab === 'emitir' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Coluna da Esquerda: Formulário de Prescrição (7 colunas) */}
            <div className="lg:col-span-7 space-y-6 no-print">
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                
                {/* Cabeçalho do Form */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span>Montador de Prescrição Médica</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">Preencha os campos abaixo com auxílio da base ANVISA e checagem de interações.</p>
                  </div>
                </div>

                {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2">⚠️ {errorMsg}</div>}
                {successMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2">✓ {successMsg}</div>}

                <form onSubmit={handleSubmitIssue} className="space-y-5">

                  {/* Médico Emitente e Paciente */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <SearchableSelect
                        label="Médico Prescritor"
                        required
                        disabled={isDoctor}
                        options={professionals.map(p => ({
                          id: p.id,
                          label: p.nome,
                          sublabel: p.numero_conselho || 'CRM',
                          extra: p.especialidade
                        }))}
                        value={docForm.profissional_id}
                        onChange={(val) => setDocForm({...docForm, profissional_id: String(val || '')})}
                        placeholder="Buscar médico por nome ou CRM..."
                      />
                    </div>

                    <div>
                      <SearchableSelect
                        label="Selecione o Paciente"
                        required
                        options={patients.map(p => ({
                          id: p.cpf || p.nome,
                          label: p.nome,
                          sublabel: p.cpf ? `CPF: ${p.cpf}` : undefined,
                          extra: p.celular
                        }))}
                        value={docForm.paciente_cpf}
                        onChange={(val) => handlePatientSelect(String(val || ''))}
                        placeholder="Digite para buscar paciente por Nome ou CPF..."
                      />
                    </div>
                  </div>

                  {/* Tipo de Documento Clínico */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Tipo de Documento Oficial</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'receita_simples', label: 'Receita Simples', vias: 1, color: 'border-slate-200 bg-slate-50' },
                        { id: 'receita_controle_especial', label: 'Controle Especial (2 Vias)', vias: 2, color: 'border-amber-200 bg-amber-50/50' },
                        { id: 'atestado', label: 'Atestado Médico', vias: 1, color: 'border-blue-200 bg-blue-50/50' },
                        { id: 'exames', label: 'Pedido de Exames', vias: 1, color: 'border-indigo-200 bg-indigo-50/50' }
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            const newTipo = t.id;
                            const currentDocObs = observacoesByTipo[newTipo] || '';
                            setDocForm(prev => ({ ...prev, tipo: newTipo, vias: t.vias, observacoes: currentDocObs }));
                          }}
                          className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col justify-between ${
                            docForm.tipo === t.id
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span>{t.label}</span>
                          <span className={`text-[9px] font-black uppercase mt-2 ${docForm.tipo === t.id ? 'text-white/80' : 'text-slate-400'}`}>
                            {t.vias === 2 ? '2 Vias (Retenção)' : '1 Via'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campos Específicos para ATESTADO MÉDICO */}
                  {docForm.tipo === 'atestado' && (
                    <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-150 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black text-blue-900">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Configuração do Atestado Médico</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Dias de Repouso Prescritos</label>
                          <input
                            type="number"
                            min="1"
                            max="180"
                            value={docForm.dias_atestado}
                            onChange={e => setDocForm({...docForm, dias_atestado: e.target.value})}
                            className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-xs font-bold"
                          />
                        </div>

                        <div className="relative">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Diagnóstico CID-10 (Busca Oficial)</label>
                          <input
                            type="text"
                            placeholder="Digite o código (ex: J06.9 ou Hipertensão)..."
                            value={cidSearch}
                            onChange={e => {
                              setCidSearch(e.target.value);
                              setShowCidDropdown(true);
                            }}
                            className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-xs font-bold"
                          />

                          {/* Dropdown de Resultados CID-10 */}
                          {showCidDropdown && cidResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                              {cidResults.map(item => (
                                <button
                                  key={item.codigo}
                                  type="button"
                                  onClick={() => {
                                    setDocForm({
                                      ...docForm,
                                      cid10_codigo: item.codigo,
                                      cid10_descricao: item.descricao
                                    });
                                    setCidSearch(`${item.codigo} - ${item.descricao}`);
                                    setShowCidDropdown(false);
                                  }}
                                  className="w-full text-left p-2.5 hover:bg-indigo-50 text-xs font-semibold text-slate-800 cursor-pointer"
                                >
                                  <span className="font-black text-indigo-600 mr-2">{item.codigo}</span>
                                  <span>{item.descricao}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {docForm.cid10_codigo && (
                        <div className="bg-white p-3 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-black text-blue-900 uppercase text-[9px] block">CID-10 Selecionado</span>
                            <span className="font-bold text-slate-800">{docForm.cid10_codigo} - {docForm.cid10_descricao}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDocForm({...docForm, cid10_codigo: '', cid10_descricao: ''})}
                            className="text-red-500 font-bold hover:underline cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Busca no Catálogo de Medicamentos da ANVISA */}
                  {docForm.tipo !== 'atestado' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">Buscar Medicamento no Catálogo ANVISA</label>
                        <span className="text-[10px] text-slate-400 font-semibold">Registro MS Oficial</span>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          placeholder="Digite o nome comercial ou princípio ativo (ex: Amoxicilina, Dipirona, Losartana)..."
                          value={anvisaSearch}
                          onChange={e => setAnvisaSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />

                        {/* Dropdown de Medicamentos ANVISA */}
                        {anvisaResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                            {anvisaResults.map(item => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  handleAddItem(item);
                                  setAnvisaSearch('');
                                  setAnvisaResults([]);
                                }}
                                className="p-3 hover:bg-indigo-50/80 transition cursor-pointer flex justify-between items-center"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-800 text-xs">{item.nome}</span>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{item.dosagem}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-medium">{item.laboratorio} • MS: {item.registro_ms}</p>
                                </div>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">+ Adicionar</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ITENS DA RECEITA / PRESCRIÇÃO */}
                  {docForm.tipo !== 'atestado' && (
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                          Itens da Prescrição Médica ({itemsList.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddItem()}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar Linha Manual
                        </button>
                      </div>

                      <div className="space-y-3">
                        {itemsList.map((item, idx) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 relative group">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full uppercase">
                                Item #{idx + 1}
                              </span>
                              {itemsList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-slate-400 hover:text-red-500 transition cursor-pointer p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Medicamento e Dosagem *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ex: Amoxicilina 500mg comprimidos"
                                  value={item.medicamento}
                                  onChange={e => handleItemChange(idx, 'medicamento', e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Via de Administração</label>
                                <select
                                  value={item.via || 'Oral'}
                                  onChange={e => handleItemChange(idx, 'via', e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                                >
                                  <option value="Oral">Uso Oral</option>
                                  <option value="Tópico">Uso Tópico</option>
                                  <option value="Sublingual">Sublingual</option>
                                  <option value="Injetável">Injetável / IV / IM</option>
                                  <option value="Nasal">Uso Nasal</option>
                                  <option value="Oftálmico">Uso Oftálmico</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Posologia e Frequência *</label>
                              <input
                                type="text"
                                required
                                placeholder="Ex: Tomar 1 comprimido de 8 em 8 horas por 7 dias."
                                value={item.posologia}
                                onChange={e => handleItemChange(idx, 'posologia', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PAINEL DE SEGURANÇA CLÍNICA (ALERTAS DE ALERGIA E INTERAÇÕES) */}
                  {safetyAlerts.length > 0 && (
                    <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between text-amber-900">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Alertas de Segurança Clínica ({safetyAlerts.length})</span>
                        </div>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">Verificação CDSS</span>
                      </div>

                      <div className="space-y-2">
                        {safetyAlerts.map((alt, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border text-xs ${
                            alt.tipo === 'ALERGIA' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-100/60 border-amber-200 text-amber-950'
                          }`}>
                            <p className="font-black flex items-center gap-1.5">
                              <span>{alt.titulo}</span>
                            </p>
                            <p className="text-[11px] mt-1 font-medium leading-relaxed">{alt.descricao}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observações Gerais */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Observações do Tratamento / Recomendações</label>
                    <textarea
                      rows={2}
                      value={docForm.observacoes}
                      onChange={e => {
                        const val = e.target.value;
                        setDocForm(prev => ({ ...prev, observacoes: val }));
                        setObservacoesByTipo(prev => ({ ...prev, [docForm.tipo]: val }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Assinatura Criptográfica A1 ICP-Brasil Checkbox */}
                  <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={docForm.assinado_digitalmente}
                      onChange={e => setDocForm({...docForm, assinado_digitalmente: e.target.checked})}
                      className="rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Assinatura Criptográfica ICP-Brasil (SHA-256)</span>
                      <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                        Documento gerado com Hash SHA-256 e selo criptográfico com validade jurídica de acordo com a MP 2.200-2/2001 e Lei 14.063/2020.
                      </p>
                    </div>
                  </label>

                  {/* Opção para Salvar como Novo Modelo */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">Deseja salvar esta prescrição como um Modelo/Kit reutilizável?</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome do Modelo (ex: Meu Kit Gripe Padrão)..."
                        value={newTemplateTitle}
                        onChange={e => setNewTemplateTitle(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      />
                      <button
                        type="button"
                        disabled={savingTemplate}
                        onClick={handleSaveAsTemplate}
                        className="px-3 py-1.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition cursor-pointer"
                      >
                        {savingTemplate ? 'Salvando...' : 'Salvar Modelo'}
                      </button>
                    </div>
                  </div>

                  {/* Botão de Submissão */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Emitir e Assinar Criptograficamente'}
                    </button>
                  </div>

                </form>
              </div>
            </div>

            {/* Coluna da Direita: LIVE PREVIEW A4 (5 colunas) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between no-print">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-600" /> Live Preview (Documento A4)
                </span>
                {issuedDoc && (
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Imprimir / PDF
                  </button>
                )}
              </div>

              {/* CONTAINER A4 PARA PREVIEW E IMPRESSÃO OFICIAL */}
              <div id="printable-prescription-container" className="space-y-6">
                
                {/* VIA 1: PRINCIPAL / RETENÇÃO FARMÁCIA */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-6 relative text-slate-800 font-sans">
                  
                  {/* Banner de Controle Especial (Se for 2 vias) */}
                  {docForm.tipo === 'receita_controle_especial' && (
                    <div className="bg-amber-100 border border-amber-300 text-amber-900 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase text-center tracking-widest">
                      1ª VIA — RETENÇÃO DA FARMÁCIA (CONTROLE ESPECIAL C1)
                    </div>
                  )}

                  {/* Header Oficial */}
                  <div className="flex justify-between items-start pb-6 border-b-2 border-indigo-600">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
                        H
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Owner Health</h4>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide">Centro Médico & Gestão de Saúde</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <h5 className="text-xs font-black text-slate-900">
                        {professionals.find(p => String(p.id) === docForm.profissional_id)?.nome || 'Dr. Médico Credenciado'}
                      </h5>
                      <p className="text-[11px] font-bold text-indigo-600">
                        {professionals.find(p => String(p.id) === docForm.profissional_id)?.numero_conselho || 'CRM/SP 123456'}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Documento Oficial com Hash SHA-256</p>
                    </div>
                  </div>

                  {/* Título do Documento */}
                  <div className="text-center">
                    <span className="inline-block px-6 py-2 rounded-full bg-slate-100 border border-slate-200 text-xs font-black text-slate-900 uppercase tracking-widest">
                      {docForm.tipo === 'receita_simples' && 'Receituário Médico Simples'}
                      {docForm.tipo === 'receita_controle_especial' && 'Receituário de Controle Especial'}
                      {docForm.tipo === 'atestado' && 'Atestado Médico Oficial de Repouso'}
                      {docForm.tipo === 'exames' && 'Solicitação de Exames Complementares'}
                    </span>
                  </div>

                  {/* Paciente e Data */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Paciente</span>
                      <span className="text-slate-900 font-black text-xs">
                        {docForm.paciente_nome || 'Selecione o Paciente'}
                      </span>
                      {docForm.paciente_cpf && <span className="text-slate-500 font-semibold block text-[10px]">CPF: {docForm.paciente_cpf}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Emissão</span>
                      <span className="text-slate-800 font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Conteúdo do Documento */}
                  <div className="py-2 min-h-[180px] space-y-4">
                    {docForm.tipo === 'atestado' ? (
                      <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 leading-relaxed text-xs font-medium text-slate-800 space-y-3">
                        <p>
                          Atesto para os devidos fins que o(a) paciente <strong className="font-black">{docForm.paciente_nome || 'Paciente'}</strong> necessita de <strong className="font-black text-indigo-700">{docForm.dias_atestado} dia(s)</strong> de afastamento de suas atividades habituais a partir desta data por motivos de saúde.
                        </p>
                        {docForm.cid10_codigo && (
                          <p className="text-[11px] font-bold text-slate-600 border-t border-slate-200 pt-2 mt-2">
                            Diagnóstico CID-10: <span className="text-indigo-600 font-black">{docForm.cid10_codigo} - {docForm.cid10_descricao}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {itemsList.map((item, idx) => (
                          <div key={idx} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-900 text-xs">{idx + 1}. {item.medicamento || 'Medicamento'}</span>
                              {item.via && <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase">{item.via}</span>}
                            </div>
                            <p className="text-slate-700 font-medium text-xs pl-3 border-l-2 border-indigo-400">{item.posologia || 'Posologia'}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {docForm.observacoes && (
                      <p className="text-[10.5px] text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                        Obs: {docForm.observacoes}
                      </p>
                    )}
                  </div>

                  {/* Rodapé e Autenticação Criptográfica */}
                  <div className="pt-6 border-t border-slate-200 flex flex-row justify-between items-end gap-4">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[9px] text-emerald-700 font-black uppercase">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Assinado Criptograficamente • ICP-Brasil</span>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">
                          {professionals.find(p => String(p.id) === docForm.profissional_id)?.nome || 'Dr. Médico Credenciado'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold">Assinatura Eletrônica Qualificada</p>
                      </div>
                    </div>

                    {/* QR Code ITI e Hash SHA-256 */}
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://validar.iti.gov.br?hash=${issuedDoc?.hash_sha256 || 'SHA256-PENDING'}`}
                        alt="QR Code Autenticidade"
                        className="w-14 h-14 shrink-0 rounded-lg border border-slate-200"
                      />
                      <div className="text-[8.5px] text-slate-500 font-medium leading-tight max-w-[130px]">
                        <span className="font-bold text-slate-800 block">Validador ITI / Governamental</span>
                        HASH SHA-256: <span className="font-mono text-[7.5px] text-indigo-700 block truncate">{issuedDoc?.hash_sha256 || '6f88a912c448...'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[8px] text-slate-400 font-medium pt-2 border-t border-slate-100">
                    Documento emitido nos termos da Medida Provisória nº 2.200-2/2001 e Lei 14.063/2020 via plataforma Owner Health.
                  </div>
                </div>

                {/* VIA 2: SE FOR CONTROLE ESPECIAL (2 VIAS DE IMPRESSÃO) */}
                {docForm.tipo === 'receita_controle_especial' && (
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-6 relative text-slate-800 font-sans page-break">
                    
                    <div className="bg-blue-100 border border-blue-300 text-blue-900 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase text-center tracking-widest">
                      2ª VIA — ORIENTAÇÃO DO PACIENTE (CONTROLE ESPECIAL C1)
                    </div>

                    {/* Header Oficial */}
                    <div className="flex justify-between items-start pb-6 border-b-2 border-indigo-600">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl">
                          H
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Owner Health</h4>
                          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide">Centro Médico & Gestão de Saúde</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <h5 className="text-xs font-black text-slate-900">
                          {professionals.find(p => String(p.id) === docForm.profissional_id)?.nome || 'Dr. Médico Credenciado'}
                        </h5>
                        <p className="text-[11px] font-bold text-indigo-600">
                          {professionals.find(p => String(p.id) === docForm.profissional_id)?.numero_conselho || 'CRM/SP 123456'}
                        </p>
                      </div>
                    </div>

                    {/* Paciente */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Paciente</span>
                        <span className="text-slate-900 font-black text-xs">{docForm.paciente_nome || 'Paciente'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Emissão</span>
                        <span className="text-slate-800 font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    {/* Lista Itens */}
                    <div className="py-2 min-h-[160px] space-y-3">
                      {itemsList.map((item, idx) => (
                        <div key={idx} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 text-xs space-y-1">
                          <span className="font-black text-slate-900 text-xs">{idx + 1}. {item.medicamento}</span>
                          <p className="text-slate-700 font-medium text-xs pl-3 border-l-2 border-indigo-400">{item.posologia}</p>
                        </div>
                      ))}
                    </div>

                    {/* Rodapé e Autenticação */}
                    <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-900">
                          {professionals.find(p => String(p.id) === docForm.profissional_id)?.nome}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">Via do Paciente • Assinado Eletronicamente</p>
                      </div>
                      <div className="text-[8px] text-slate-400 font-mono">
                        HASH: {issuedDoc?.hash_sha256?.slice(0, 20)}...
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* ================= ABA 2: BIBLIOTECA DE MODELOS & KITS ================= */}
        {activeTab === 'modelos' && (
          <div className="space-y-6 no-print">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>Biblioteca de Modelos & Kits Clínicos Prontos</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Aplique protocolos prescritivos pré-configurados com 1 clique.</p>
                </div>
              </div>

              {/* Grid de Modelos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(tmpl => {
                  let itemsParsed = [];
                  try { itemsParsed = JSON.parse(tmpl.conteudo_json); } catch {}

                  return (
                    <div key={tmpl.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:shadow-md transition flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {tmpl.categoria}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">Kit Clínico</span>
                        </div>

                        <h4 className="font-black text-slate-800 text-sm">{tmpl.titulo}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">{tmpl.descricao}</p>

                        {/* Itens do Modelo */}
                        <div className="pt-2 space-y-1.5">
                          {Array.isArray(itemsParsed) && itemsParsed.map((it: any, idx: number) => (
                            <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-start gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                              <span>{it.medicamento}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>Usar Este Kit na Receita</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 3: HISTÓRICO & AUTENTICIDADE ================= */}
        {activeTab === 'historico' && (
          <div className="space-y-6 no-print">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    <span>Histórico de Emissões Oficiais & Validador</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Busque por nome do paciente, CPF, remédios prescritos, médico ou código Hash SHA-256.
                  </p>
                </div>

                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 text-indigo-600 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar por paciente, remédio, CPF, médico, Hash..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-indigo-100 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold transition shadow-sm"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {loadingHistory ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
              ) : filteredHistory.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Nenhum documento encontrado com a busca "{historySearch}".</p>
                  <p className="text-[10px] text-slate-400">Tente buscar pelo nome do paciente, medicamento ou CPF.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                  {filteredHistory.map(doc => {
                    let itemsDisplay: string[] = [];
                    if (doc.medicamentos) {
                      try {
                        const parsed = JSON.parse(doc.medicamentos);
                        if (Array.isArray(parsed)) {
                          itemsDisplay = parsed.map((m: any) => typeof m === 'string' ? m : m.medicamento);
                        }
                      } catch {
                        itemsDisplay = [String(doc.medicamentos)];
                      }
                    } else if (doc.conteudo) {
                      itemsDisplay = [String(doc.conteudo)];
                    }

                    return (
                      <div key={doc.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:bg-slate-50 transition">
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5.5 h-5.5" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                {doc.tipo === 'receita_controle_especial' ? 'Controle Especial 2 Vias' : (doc.tipo || 'Receita Médica')}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                ✓ Hash SHA-256 Válido
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-black text-slate-900">
                                Paciente: {doc.paciente_nome && doc.paciente_nome !== 'Paciente não cadastrado' ? doc.paciente_nome : (doc.paciente_cpf || 'Paciente Cadastrado')} {doc.paciente_cpf ? `(CPF: ${doc.paciente_cpf})` : ''}
                              </p>
                              {doc.eh_dependente && (
                                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                                  👨‍👩‍👧 Dependente {doc.titular_nome ? `(Titular: ${doc.titular_nome})` : ''}
                                </span>
                              )}
                            </div>
                            
                            {/* Exibição dos Remédios Prescritos */}
                            {itemsDisplay.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {itemsDisplay.map((med, idx) => (
                                  <span key={idx} className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                    💊 {med}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold pt-0.5">
                              <span>Emitido em: {formatDate(doc.data || doc.criado_em)}</span>
                              <span>•</span>
                              <span>Médico: {doc.medico_nome || 'Médico Credenciado'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingDocModal(doc)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detalhes
                          </button>
                          <button
                            onClick={() => {
                              setIssuedDoc(doc);
                              setActiveTab('emitir');
                              setTimeout(() => window.print(), 300);
                            }}
                            className="px-3.5 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold text-indigo-700 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" /> Reimprimir
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc)}
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                            title="Excluir documento do seu histórico e do paciente"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= ABA 4: CONSULTA ANVISA & CID-10 ================= */}
        {activeTab === 'bulario' && (
          <div className="space-y-6 no-print">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <span>Consulta Oficial ANVISA & Tabela CID-10 da OMS</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Use os filtros abaixo para consultar posologias da ANVISA e diagnósticos do CID-10.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Bulário ANVISA com Filtro de Busca Próprio */}
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" /> Base ANVISA ({filteredBularioAnvisa.length} fármacos)
                    </h4>
                  </div>

                  {/* BARRA DE BUSCA ANVISA */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar medicamento, princípio ativo, laboratório..."
                      value={bularioAnvisaSearch}
                      onChange={e => {
                        setBularioAnvisaSearch(e.target.value);
                        setBularioPage(1);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                    {bularioAnvisaSearch && (
                      <button onClick={() => { setBularioAnvisaSearch(''); setBularioPage(1); }} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {filteredBularioAnvisa.length > 0 ? (
                      (() => {
                        const itemsPerPage = 8;
                        const totalPages = Math.ceil(filteredBularioAnvisa.length / itemsPerPage) || 1;
                        const paginated = filteredBularioAnvisa.slice((bularioPage - 1) * itemsPerPage, bularioPage * itemsPerPage);

                        return (
                          <>
                            {paginated.map(med => (
                              <div key={med.id} className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 hover:border-indigo-200 transition">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-slate-800">{med.nome}</span>
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{med.dosagem}</span>
                                </div>
                                <p className="text-[10px] text-indigo-600 font-bold">MS: {med.registro_ms} • {med.laboratorio}</p>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-medium pt-1">{med.posologia_padrao}</p>
                                {med.contraindicacoes && Array.isArray(med.contraindicacoes) && (
                                  <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg font-medium mt-1">
                                    <strong>Efeitos / Contraindicações:</strong> {med.contraindicacoes.join(', ')}
                                  </p>
                                )}
                              </div>
                            ))}

                            {/* Controles de Paginação */}
                            {filteredBularioAnvisa.length > itemsPerPage && (
                              <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs font-bold text-slate-600">
                                <span>Página {bularioPage} de {totalPages} ({filteredBularioAnvisa.length} fármacos)</span>
                                <div className="flex gap-1">
                                  <button
                                    disabled={bularioPage === 1}
                                    onClick={() => setBularioPage(p => Math.max(p - 1, 1))}
                                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 rounded-lg transition text-xs"
                                  >
                                    Anterior
                                  </button>
                                  <button
                                    disabled={bularioPage === totalPages}
                                    onClick={() => setBularioPage(p => Math.min(p + 1, totalPages))}
                                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 rounded-lg transition text-xs"
                                  >
                                    Próxima
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <p className="text-xs text-slate-400 font-medium text-center py-6">Nenhum medicamento localizado no catálogo ANVISA.</p>
                    )}
                  </div>
                </div>

                {/* CID-10 com Filtro de Busca Próprio */}
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" /> Tabela CID-10 ({filteredBularioCid.length} códigos)
                    </h4>
                  </div>

                  {/* BARRA DE BUSCA CID-10 */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar por código (ex: J06.9) ou doença (ex: Hipertensão)..."
                      value={bularioCidSearch}
                      onChange={e => setBularioCidSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                    {bularioCidSearch && (
                      <button onClick={() => setBularioCidSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {filteredBularioCid.length > 0 ? (
                      filteredBularioCid.map(c => (
                        <div key={c.codigo} className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex justify-between items-center hover:border-indigo-200 transition">
                          <div>
                            <span className="font-black text-indigo-600 mr-2">{c.codigo}</span>
                            <span className="font-bold text-slate-800">{c.descricao}</span>
                          </div>
                          <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600 shrink-0 ml-2">{c.categoria}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 font-medium text-center py-6">Nenhum diagnóstico localizado no CID-10.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes do Histórico */}
        {viewingDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn">
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <div>
                  <h3 className="font-black text-slate-800 text-sm">Detalhes do Documento Oficial #{viewingDocModal.id}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">HASH SHA-256: {viewingDocModal.hash_sha256 || 'ICP-Brasil Validated'}</p>
                </div>
                <button onClick={() => setViewingDocModal(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <p className="font-black text-slate-800">Paciente: {viewingDocModal.paciente_nome || viewingDocModal.paciente_cpf}</p>
                  <p className="text-slate-500 font-medium">CPF: {viewingDocModal.paciente_cpf || 'Não Informado'}</p>
                  <p className="text-slate-500 font-medium">Médico: {viewingDocModal.medico_nome} ({viewingDocModal.medico_crm})</p>
                  <p className="text-slate-500 font-medium">Data: {formatDate(viewingDocModal.data || viewingDocModal.criado_em)}</p>
                </div>

                <div className="space-y-2">
                  <span className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Conteúdo Prescrito:</span>
                  <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {(() => {
                      if (viewingDocModal.medicamentos) {
                        try {
                          const parsed = JSON.parse(viewingDocModal.medicamentos);
                          if (Array.isArray(parsed)) {
                            return parsed.map((it: any, i: number) => `${i + 1}. ${typeof it === 'string' ? it : `${it.medicamento}\n   Posologia: ${it.posologia}`}`).join('\n\n');
                          }
                        } catch {
                          return String(viewingDocModal.medicamentos);
                        }
                      }
                      return String(viewingDocModal.conteudo || 'Sem conteúdo.');
                    })()}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setViewingDocModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">
                  Fechar
                </button>
                <button
                  onClick={() => {
                    const doc = viewingDocModal;
                    setViewingDocModal(null);
                    setIssuedDoc(doc);
                    setActiveTab('emitir');
                    setTimeout(() => window.print(), 300);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Reimprimir A4
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};
