import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Settings,
  Save, Copy, Check, Send, Sparkles, Eye, ClipboardList, Users,
  Type, AlignLeft, Circle, CheckSquare, List, BarChart3, Calendar,
  Loader2, AlertCircle, Edit3, ChevronRight, Stethoscope, ShieldAlert
} from 'lucide-react';
import { API_URL } from '../../config';
import { CompanyAnamnesisPreviewModal } from './CompanyAnamnesisPreviewModal';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { TemplateEditorModal } from './TemplateEditorModal';
import { QuestionModal } from '../../components/QuestionModal';
import { SearchableSelect } from '../../components/SearchableSelect';

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'scale' | 'date';

export interface Option { id?: number; texto: string; ordem: number; }
export interface Question {
  id?: number | string; section_id?: number | string; texto: string; tipo: QuestionType;
  obrigatoria: boolean; ordem: number; placeholder: string; descricao: string;
  escala_min?: number; escala_max?: number; escala_label_min?: string; escala_label_max?: string;
  parent_option_id?: number | string;
  options?: Option[]; _loading?: boolean;
}
export interface Section {
  id?: number | string; empresa_id?: number; titulo: string; descricao: string;
  ordem: number; ativo: boolean; questions?: Question[]; _open?: boolean;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'text',     label: 'Resposta curta',    icon: <Type className="w-4 h-4" />,         desc: 'Texto de uma linha' },
  { value: 'textarea', label: 'Parágrafo',         icon: <AlignLeft className="w-4 h-4" />,    desc: 'Texto longo' },
  { value: 'radio',    label: 'Múltipla escolha',  icon: <Circle className="w-4 h-4" />,       desc: 'Escolha única' },
  { value: 'checkbox', label: 'Caixas de seleção', icon: <CheckSquare className="w-4 h-4" />,  desc: 'Múltipla seleção' },
  { value: 'select',   label: 'Lista suspensa',    icon: <List className="w-4 h-4" />,         desc: 'Dropdown' },
  { value: 'scale',    label: 'Escala linear',     icon: <BarChart3 className="w-4 h-4" />,    desc: 'Ex: 1 a 10' },
  { value: 'date',     label: 'Data',              icon: <Calendar className="w-4 h-4" />,     desc: 'Seletor de data' },
];

export const QUESTION_TYPE_MAP: Record<QuestionType, { label: string; icon: React.ReactNode }> = {
  text:     { label: 'Resposta curta',    icon: <Type className="w-3.5 h-3.5" /> },
  textarea: { label: 'Parágrafo',         icon: <AlignLeft className="w-3.5 h-3.5" /> },
  radio:    { label: 'Múltipla escolha',  icon: <Circle className="w-3.5 h-3.5" /> },
  checkbox: { label: 'Caixas de seleção', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  select:   { label: 'Lista suspensa',    icon: <List className="w-3.5 h-3.5" /> },
  scale:    { label: 'Escala linear',     icon: <BarChart3 className="w-3.5 h-3.5" /> },
  date:     { label: 'Data',              icon: <Calendar className="w-3.5 h-3.5" /> },
};

export const needsOptions = (tipo: QuestionType) => ['radio', 'checkbox', 'select'].includes(tipo);

// ─── Componente principal ─────────────────────────────────────────────────────

export const CompanyAnamnesisConfig: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const companyId = localStorage.getItem('companyId') || '1';

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'builder' | 'responses' | 'templates' | 'doctorHistory'>('builder');
  
  // ── Modals / States ──
  const [modalQuestion, setModalQuestion] = useState<{ question: Question | null; sectionIdx: number; parentOptionId?: number | string; isCustom?: boolean } | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSectionIdx, setAddingSectionIdx] = useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<any | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Modal de Personalização por Paciente
  const [showCustomPatientModal, setShowCustomPatientModal] = useState(false);
  const [patientsList, setPatientsList] = useState<{ id: number; nome: string; cpf?: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | string>('');
  const [customSections, setCustomSections] = useState<Section[]>([]);
  const [customFormTitle, setCustomFormTitle] = useState('');
  const [sendingCustomForm, setSendingCustomForm] = useState(false);

  // Histórico de formulários personalizados do médico
  const [doctorCustomForms, setDoctorCustomForms] = useState<any[]>([]);
  const [loadingDoctorCustomForms, setLoadingDoctorCustomForms] = useState(false);
  const [viewingCustomFormModal, setViewingCustomFormModal] = useState<any | null>(null);

  // Controle de Alterações Não Salvas e Modais de Confirmação
  const [isDirty, setIsDirty] = useState(false);
  const [hasExistingFormInDb, setHasExistingFormInDb] = useState(false);
  const [showUnsavedExitModal, setShowUnsavedExitModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<'builder' | 'responses' | 'templates' | 'doctorHistory' | null>(null);
  const [pendingTargetUrl, setPendingTargetUrl] = useState<string | null>(null);

  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [suppressOverwriteCheckbox, setSuppressOverwriteCheckbox] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<{ id: number; titulo?: string; nome?: string; criado_em: string; conteudo?: any; sections_data?: any }[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const nextId = useRef(1000);
  const genId = () => nextId.current++;

  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = userObj.id || userObj.email || 'usuario';

  // Verificar se o aviso de sobrescrita foi suprimido por 2 meses
  const isOverwriteNoticeSuppressed = () => {
    const key = `anamnesis_suppress_overwrite_notice_${userId}`;
    const val = localStorage.getItem(key);
    if (!val) return false;
    const exp = parseInt(val, 10);
    return !isNaN(exp) && Date.now() < exp;
  };

  // Guard de Navegação: Registra no window para interceptar clique na sidebar/menu, popstate (voltar/avançar) e unload
  useEffect(() => {
    (window as any).__anamnesisIsDirty = isDirty;
    (window as any).__onUnsavedExitAttempt = (targetPath: string) => {
      setPendingTargetUrl(targetPath);
      setShowUnsavedExitModal(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handlePopState = () => {
      if (isDirty) {
        window.history.pushState(null, '', window.location.href);
        setShowUnsavedExitModal(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      (window as any).__anamnesisIsDirty = false;
      (window as any).__onUnsavedExitAttempt = undefined;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty]);

  // Carrega seções + perguntas + opções
  useEffect(() => { loadForm(); }, []);

  const loadForm = async () => {
    setLoading(true);
    await loadFormSilent();
    setLoading(false);
  };

  const loadFormSilent = async () => {
    try {
      const res = await fetch(`${API_URL}/api/anamnesis/form/${companyId}`, { headers });
      if (!res.ok) throw new Error('Falha');
      const data: Section[] = await res.json();
      setSections(data.map(s => ({ ...s, _open: true, questions: s.questions || [] })));
      setHasExistingFormInDb(Array.isArray(data) && data.length > 0);
      setIsDirty(false);
    } catch {
      setSections([]);
      setHasExistingFormInDb(false);
      setIsDirty(false);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${API_URL}/api/anamnesis-templates/${companyId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const doctorId = userObj.id || userObj.usuario_id || 1;
  const isDoctor = userObj.tipo_profissional === 'medico' || userObj.role === 'medico' || userObj.eh_profissional;

  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedCustomDoctorId, setSelectedCustomDoctorId] = useState<string | number>('');
  const [sharePatientId, setSharePatientId] = useState<string | number>('');
  const [shareDoctorId, setShareDoctorId] = useState<string | number>('');

  const fetchDoctorsList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/professionals`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const docOnly = data.filter((p: any) => p.tipo_profissional === 'medico');
          setDoctorsList(docOnly);
          if (docOnly.length > 0) setSelectedCustomDoctorId(docOnly[0].id);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar médicos:', e);
    }
  };

  const loadPatientsList = async () => {
    try {
      const url = isDoctor && doctorId 
        ? `${API_URL}/api/clients?medico_id=${doctorId}` 
        : `${API_URL}/api/clients`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setPatientsList(list);
        if (list.length > 0) {
          setSelectedPatientId(list[0].id);
          setCustomFormTitle(`Anamnese Personalizada - ${list[0].nome}`);
        } else {
          setSelectedPatientId('');
          setCustomFormTitle('Anamnese Personalizada');
        }
      }
    } catch (e) {
      console.error('Erro ao buscar pacientes:', e);
    }
  };

  const loadDoctorCustomForms = async () => {
    setLoadingDoctorCustomForms(true);
    try {
      const url = isDoctor 
        ? `${API_URL}/api/doctor-custom-anamnesis/doctor/${doctorId}` 
        : `${API_URL}/api/doctor-custom-anamnesis/all`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setDoctorCustomForms(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao buscar formulários personalizados do médico:', e);
    } finally {
      setLoadingDoctorCustomForms(false);
    }
  };

  useEffect(() => {
    loadPatientsList();
    fetchDoctorsList();
  }, []);

  useEffect(() => {
    if (tab === 'templates') {
      loadTemplates();
    } else if (tab === 'doctorHistory') {
      loadDoctorCustomForms();
    }
  }, [tab]);

  const handleOpenCustomModal = () => {
    loadPatientsList();
    if (!isDoctor) fetchDoctorsList();
    const initialPatient = patientsList[0];
    if (initialPatient) {
      setSelectedPatientId(initialPatient.id);
      setCustomFormTitle(`Anamnese Personalizada - ${initialPatient.nome}`);
    } else {
      setSelectedPatientId('');
      setCustomFormTitle('Anamnese Personalizada');
    }
    // Iniciar do zero (exclusivo para o paciente sem afetar o construtor)
    setCustomSections([{
      id: `s_${Date.now()}`,
      titulo: 'Informações Gerais da Anamnese',
      descricao: 'Perguntas criadas especificamente para este paciente',
      ordem: 0,
      ativo: true,
      questions: []
    }]);
    setShowCustomPatientModal(true);
  };

  const handleRemoveCustomQuestion = (secIdx: number, qIdx: number) => {
    setCustomSections(prev => prev.map((s, si) => si !== secIdx ? s : {
      ...s,
      questions: s.questions?.filter((_, qi) => qi !== qIdx)
    }));
  };

  const handleRemoveCustomSection = (secIdx: number) => {
    setCustomSections(prev => prev.filter((_, si) => si !== secIdx));
  };

  const handleSendCustomForm = async () => {
    if (!selectedPatientId) return;
    setSendingCustomForm(true);
    try {
      const patientObj = patientsList.find(p => String(p.id) === String(selectedPatientId));
      const patientName = patientObj ? patientObj.nome : `Paciente #${selectedPatientId}`;
      const targetDocId = isDoctor ? doctorId : (selectedCustomDoctorId || doctorId);

      const res = await fetch(`${API_URL}/api/doctor-custom-anamnesis`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          medico_id: targetDocId,
          cliente_id: selectedPatientId,
          empresa_id: companyId,
          nome_paciente: patientName,
          titulo: customFormTitle || `Anamnese Personalizada - ${patientName}`,
          sections_data: customSections
        })
      });
      if (!res.ok) throw new Error('Falha ao enviar formulário');

      alert(`Formulário personalizado criado e enviado para ${patientName} com sucesso!`);
      setShowCustomPatientModal(false);
      if (tab === 'doctorHistory') {
        loadDoctorCustomForms();
      }
    } catch (e: any) {
      alert(e.message || 'Erro ao enviar formulário personalizado');
    } finally {
      setSendingCustomForm(false);
    }
  };

  const handleSaveTemplate = async () => {
    const title = window.prompt('Digite um nome para este modelo de formulário:', 'Meu Modelo de Anamnese');
    if (!title) return;
    
    setSavingTemplate(true);
    try {
      const cleanSections = sections.map(s => ({
        titulo: s.titulo,
        descricao: s.descricao,
        ordem: s.ordem,
        questions: (s.questions || []).map(q => ({
          texto: q.texto,
          tipo: q.tipo,
          obrigatoria: q.obrigatoria,
          ordem: q.ordem,
          placeholder: q.placeholder,
          descricao: q.descricao,
          escala_min: q.escala_min,
          escala_max: q.escala_max,
          escala_label_min: q.escala_label_min,
          escala_label_max: q.escala_label_max,
          _temp_id: q.id, 
          parent_option_id: q.parent_option_id,
          options: (q.options || []).map(o => ({
            texto: o.texto,
            ordem: o.ordem,
            _temp_id: o.id
          }))
        }))
      }));

      const autorNome = userObj.nome || userObj.name || userObj.nome_fantasia || userObj.razao_social || (userObj.email ? userObj.email.split('@')[0] : 'Clínica de Teste');
      const userTipo = userObj.tipo_profissional || userObj.tipo || '';
      const perfilMap: Record<string, string> = {
        medico: 'Médico',
        secretario: 'Secretário(a)',
        secretaria: 'Secretário(a)',
        administrativo: 'Administrativo',
        admin: 'Administrativo',
        empresa: 'Clínica/Hospital'
      };
      const autorPerfil = perfilMap[userTipo] || (userObj.eh_empresa ? 'Clínica/Hospital' : 'Administrativo');

      const res = await fetch(`${API_URL}/api/anamnesis-templates`, {
        method: 'POST', headers,
        body: JSON.stringify({
          empresa_id: companyId,
          titulo: title,
          conteudo: cleanSections,
          criado_por_nome: autorNome,
          criado_por_perfil: autorPerfil
        })
      });
      if (res.ok) {
        alert('Modelo salvo com sucesso!');
        loadTemplates();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (e) {
      alert('Erro ao salvar modelo.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadTemplate = async (templateId: number) => {
    if (!window.confirm('Carregar este modelo irá SOBRESCREVER o formulário atual inteiro. Deseja continuar?')) return;
    
    setLoading(true);
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;
      
      const conteudo = template.conteudo;
      setSections((conteudo || []).map((s: any) => ({ ...s, _open: true })));
      setIsDirty(true);
      alert('Modelo carregado com sucesso! Clique em Salvar para gravar as alterações.');
      setTab('builder');
    } catch (e) {
      alert('Erro ao carregar modelo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!window.confirm('Deseja realmente excluir este modelo?')) return;
    try {
      await fetch(`${API_URL}/api/anamnesis-templates/${templateId}`, { method: 'DELETE', headers });
      loadTemplates();
    } catch (e) {
      alert('Erro ao excluir modelo.');
    }
  };

  // ── Seções ──────────────────────────────────────────────────────────────────

  const handleAddSection = () => {
    const titulo = newSectionTitle.trim() || 'Nova Seção';
    const newS: Section = { id: genId(), empresa_id: Number(companyId), titulo, descricao: '', ordem: sections.length, ativo: true, _open: true, questions: [] };
    setSections(prev => [...prev, newS]);
    setNewSectionTitle('');
    setAddingSectionIdx(null);
    setIsDirty(true);
  };

  const handleDeleteSection = (sIdx: number) => {
    setSections(prev => prev.filter((_, i) => i !== sIdx));
    setIsDirty(true);
  };

  const handleToggleSection = (sIdx: number) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, _open: !s._open } : s));
  };

  const handleSectionTitleChange = (sIdx: number, val: string) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, titulo: val } : s));
    setIsDirty(true);
  };

  const handleSectionDescChange = (sIdx: number, val: string) => {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, descricao: val } : s));
    setIsDirty(true);
  };

  // ── Perguntas ────────────────────────────────────────────────────────────────

  const handleAddQuestion = (sIdx: number, parentOptionId?: number) => {
    setModalQuestion({ question: null, sectionIdx: sIdx, parentOptionId });
  };

  const handleEditQuestion = (sIdx: number, qIdx: number) => {
    setModalQuestion({ question: sections[sIdx].questions![qIdx], sectionIdx: sIdx });
  };

  const handleDeleteQuestion = (sIdx: number, qIdx: number) => {
    setSections(prev => prev.map((s, i) => i === sIdx
      ? { ...s, questions: s.questions!.filter((_, qi) => qi !== qIdx) }
      : s
    ));
    setIsDirty(true);
  };

  const handleModalSave = (q: Question) => {
    if (!modalQuestion) return;
    const { sectionIdx, parentOptionId, isCustom } = modalQuestion;
    const isEdit = !!q.id;
    const localQ = { 
      ...q, 
      id: q.id || genId(), 
      parent_option_id: parentOptionId !== undefined ? parentOptionId : q.parent_option_id 
    };

    if (isCustom) {
      setCustomSections(prev => prev.map((s, si) => si !== sectionIdx ? s : {
        ...s, questions: isEdit
          ? (s.questions || []).map(ex => String(ex.id) === String(q.id) ? localQ : ex)
          : [...(s.questions || []), localQ]
      }));
    } else {
      setSections(prev => prev.map((s, si) => si !== sectionIdx ? s : {
        ...s, questions: isEdit
          ? (s.questions || []).map(ex => String(ex.id) === String(q.id) ? localQ : ex)
          : [...(s.questions || []), localQ]
      }));
      setIsDirty(true);
    }

    setModalQuestion(null);
  };

  // ── Salvar e Sincronizar Tudo no Banco de Dados ─────────────────────────────

  const executeSaveBulk = async () => {
    // Se o construtor está vazio E não existe formulário no banco para ser excluído/limpo
    if ((!sections || sections.length === 0) && !hasExistingFormInDb) {
      setError('Você não tem nenhum formulário criado ou construído para salvar.');
      setTimeout(() => setError(''), 4000);
      return;
    }
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`${API_URL}/api/anamnesis/form/${companyId}/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sections: sections || [] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar o formulário.');

      setIsDirty(false);
      (window as any).__anamnesisIsDirty = false;
      setSaved(true);
      setShowOverwriteModal(false);
      setTimeout(() => setSaved(false), 4000);
      await loadFormSilent();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar as configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    // Se o construtor está vazio E não existe formulário no banco para ser excluído/limpo
    if ((!sections || sections.length === 0) && !hasExistingFormInDb) {
      setError('Você não tem nenhum formulário criado ou construído para salvar.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    // Se AINDA NÃO EXISTE um formulário no banco, salva direto sem pedir confirmação de sobrescrita
    if (!hasExistingFormInDb) {
      executeSaveBulk();
      return;
    }

    // Se JÁ EXISTE um formulário no banco, verifica se o aviso foi suprimido por 2 meses
    if (isOverwriteNoticeSuppressed()) {
      executeSaveBulk();
    } else {
      setShowOverwriteModal(true);
    }
  };

  const handleConfirmOverwriteSave = async () => {
    if (suppressOverwriteCheckbox) {
      const twoMonthsMs = 60 * 24 * 60 * 60 * 1000;
      localStorage.setItem(`anamnesis_suppress_overwrite_notice_${userId}`, String(Date.now() + twoMonthsMs));
    }
    await executeSaveBulk();
    (window as any).__anamnesisIsDirty = false;
    if (pendingTargetUrl) {
      const url = pendingTargetUrl;
      setPendingTargetUrl(null);
      navigate(url);
    } else if (pendingTab) {
      setTab(pendingTab as any);
      setPendingTab(null);
    }
  };

  const handleTabClick = (targetTab: 'builder' | 'responses' | 'templates') => {
    if (tab === 'builder' && isDirty && targetTab !== 'builder') {
      setPendingTab(targetTab);
      setShowUnsavedExitModal(true);
    } else {
      setTab(targetTab);
    }
  };

  const getShareableLink = () => {
    const baseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'https://owner-health-ktsf.vercel.app'
      : window.location.origin;
    const params = new URLSearchParams();
    if (sharePatientId) params.set('paciente_id', String(sharePatientId));
    if (shareDoctorId) params.set('medico_id', String(shareDoctorId));
    const qs = params.toString();
    return `${baseUrl}/client/anamnesis${qs ? '?' + qs : ''}`;
  };

  const handleCopyLink = () => {
    const link = getShareableLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-3">
        <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#6366f1' }} />
        <p className="text-sm text-slate-400 font-medium">Carregando formulário...</p>
      </div>
    </div>
  );

  if (userObj.tipo_profissional === 'administrativo') {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 my-8 max-w-lg mx-auto animate-fadeIn">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-black text-slate-800">Acesso Restrito ao Perfil Administrativo</h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          A tela de configuração de Anamnese não está disponível para o perfil administrativo.
        </p>
      </div>
    );
  }

  return (
    <>
      {modalQuestion !== null && (
        <QuestionModal
          question={modalQuestion.question}
          sectionId={sections[modalQuestion.sectionIdx]?.id || 0}
          onSave={handleModalSave}
          onClose={() => setModalQuestion(null)}
        />
      )}

      <div className="space-y-6 animate-fadeIn">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Formulário de Anamnese</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Crie e organize as perguntas que seus pacientes responderão antes das consultas
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                <Check className="w-3.5 h-3.5" /> Seu formulário foi salvo com sucesso!
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </span>
            )}
            <button
              onClick={handleOpenCustomModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-violet-700 bg-violet-100 hover:bg-violet-200 transition shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-violet-600" />
              Personalizar para Paciente
            </button>
            <button onClick={handleSaveClick} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:-translate-y-0.5 shadow-md disabled:opacity-60 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
          {[
            { key: 'builder', label: 'Construtor', icon: <Edit3 className="w-3.5 h-3.5" /> },
            { key: 'templates', label: 'Modelos Salvos', icon: <ClipboardList className="w-3.5 h-3.5" /> },
            { key: 'responses', label: 'Compartilhar', icon: <Send className="w-3.5 h-3.5" /> },
            { key: 'doctorHistory', label: isDoctor ? 'Meus Envios (Por Paciente)' : 'Envios dos Médicos (Por Paciente)', icon: <Users className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button key={t.key} onClick={() => handleTabClick(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Main Content ── */}
          <div className="lg:col-span-2 space-y-4">
            {tab === 'builder' ? (
              <>
                {/* Seções */}
                {sections.length === 0 && (
                  <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                      <ClipboardList className="w-8 h-8 text-violet-500" />
                    </div>
                    <h3 className="font-black text-slate-700 text-base mb-1">Formulário em branco</h3>
                    <p className="text-sm text-slate-400 mb-6">Adicione seções e perguntas para montar seu formulário de anamnese</p>
                    <button onClick={() => setAddingSectionIdx(-1)}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      + Criar primeira seção
                    </button>
                  </div>
                )}

                {sections.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <button onClick={handleSaveTemplate} disabled={savingTemplate}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 transition shadow-sm border border-violet-100 disabled:opacity-60">
                      {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar como Modelo
                    </button>
                  </div>
                )}

                {sections.map((section, sIdx) => (
                  <div key={sIdx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Cabeçalho da seção */}
                    <div className="p-5 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #f8f7ff, #f5f3ff)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center cursor-grab" style={{ background: '#ede9fe' }}>
                          <GripVertical className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="flex-1">
                          <input
                            value={section.titulo}
                            onChange={e => handleSectionTitleChange(sIdx, e.target.value)}
                            className="w-full font-black text-slate-800 text-sm bg-transparent border-b-2 border-transparent focus:border-violet-400 focus:outline-none pb-0.5 transition"
                            placeholder="Título da seção"
                          />
                          <input
                            value={section.descricao}
                            onChange={e => handleSectionDescChange(sIdx, e.target.value)}
                            className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none mt-1 transition"
                            placeholder="Descrição da seção (opcional)"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-violet-500 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                            Seção {sIdx + 1} · {section.questions?.length || 0} perguntas
                          </span>
                          <button onClick={() => handleToggleSection(sIdx)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center transition hover:bg-slate-50">
                            {section._open ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                          </button>
                          <button onClick={() => handleDeleteSection(sIdx)} className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center transition hover:bg-red-100">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Perguntas */}
                    {section._open && (
                      <div className="p-4 space-y-3">
                        {(() => {
                          const topLevel = (section.questions || []).filter(q => !q.parent_option_id);
                          const renderConfigQuestion = (q: Question, qIdx: number, level: number = 0, qNumPrefix: string = '') => {
                            return (
                              <div key={qIdx} className="w-full min-w-0 mt-2">
                                <div className={`flex items-start gap-2 max-w-full overflow-hidden transition group ${
                                  level > 0 
                                    ? 'p-2.5 sm:p-3 rounded-xl border border-violet-200/90 bg-white shadow-2xs' 
                                    : 'p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-violet-300 shadow-2xs'
                                }`}>
                                  <div className="w-4 h-4 mt-1 flex-shrink-0 cursor-grab opacity-40 group-hover:opacity-70 transition">
                                    <GripVertical className="w-full h-full text-slate-400" />
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-2.5 overflow-hidden">
                                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-slate-100/80 pb-2">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <p className="text-xs sm:text-sm font-black text-slate-800 tracking-tight whitespace-normal">{q.texto}</p>
                                        {q.descricao && <p className="text-[11px] text-slate-400 truncate hidden sm:block">({q.descricao})</p>}
                                      </div>
                                      
                                      <div className="flex items-center gap-1 flex-wrap shrink-0">
                                        {q.obrigatoria && (
                                          <span className="text-[8px] sm:text-[9px] font-black uppercase text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">obrig.</span>
                                        )}
                                        {level > 0 && (
                                          <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            ↳ Step ({qNumPrefix})
                                          </span>
                                        )}
                                        <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                          {QUESTION_TYPE_MAP[q.tipo]?.icon}
                                          {QUESTION_TYPE_MAP[q.tipo]?.label}
                                        </span>
                                        <button onClick={() => handleEditQuestion(sIdx, section.questions!.indexOf(q))}
                                          className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:border-violet-400 transition cursor-pointer shrink-0">
                                          <Edit3 className="w-3 h-3 text-slate-500" />
                                        </button>
                                        <button onClick={() => handleDeleteQuestion(sIdx, section.questions!.indexOf(q))}
                                          className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition cursor-pointer shrink-0">
                                          <Trash2 className="w-3 h-3 text-slate-400" />
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Mostrar opções e sub-perguntas condicionais vinculadas a cada opção */}
                                    {needsOptions(q.tipo) && q.options && q.options.length > 0 && (
                                      <div className="mt-2 space-y-2 bg-slate-50/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 max-w-full overflow-hidden">
                                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                                          {qNumPrefix || '1'} - Alternativas do formulário
                                        </p>
                                        {q.options.map((o, oIdx) => {
                                          const childQuestions = (section.questions || []).filter(c => c.parent_option_id != null && String(c.parent_option_id) === String(o.id));
                                          const stepNum = `${qNumPrefix || '1'}.${oIdx + 1}`;

                                          return (
                                            <div key={o.id} className="space-y-2 border border-slate-200/60 rounded-xl p-2 sm:p-2.5 bg-white max-w-full overflow-hidden">
                                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                  <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0"></span>
                                                  <span className="text-xs font-bold text-slate-700 truncate">{o.texto}</span>
                                                </div>
                                                <button onClick={() => handleAddQuestion(sIdx, Number(o.id))} className="text-[9px] font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0">
                                                  <Plus className="w-3 h-3 text-violet-600" /> + {stepNum} Pergunta seguinte
                                                </button>
                                              </div>

                                              {/* Sub-perguntas filhas desta alternativa especificamente */}
                                              {childQuestions.length > 0 && (
                                                <div className="mt-1.5 space-y-1.5 pl-2 sm:pl-3 border-l-2 border-violet-400 max-w-full overflow-hidden">
                                                  <p className="text-[8px] sm:text-[9px] font-black text-violet-700 uppercase tracking-wider flex items-center gap-1">
                                                    <span>↳ SE ESCOLHER "{o.texto.toUpperCase()}", RESPONDER TAMBÉM:</span>
                                                  </p>
                                                  {childQuestions.map(child => renderConfigQuestion(child, section.questions!.indexOf(child), level + 1, stepNum))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {q.tipo === 'scale' && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] text-slate-400">{q.escala_label_min || 'Mín'}</span>
                                        <div className="flex gap-1">
                                          {Array.from({ length: Math.min((q.escala_max || 10) - (q.escala_min || 1) + 1, 10) }, (_, i) => (
                                            <div key={i} className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500">
                                              {(q.escala_min || 1) + i}
                                            </div>
                                          ))}
                                        </div>
                                        <span className="text-[10px] text-slate-400">{q.escala_label_max || 'Máx'}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          };
                          return topLevel.map((q, tIdx) => renderConfigQuestion(q, section.questions!.indexOf(q), 0, String(tIdx + 1)));
                        })()}
                        <button onClick={() => handleAddQuestion(sIdx)}
                          className="w-full py-3 rounded-2xl border-2 border-dashed border-violet-200 text-sm font-bold text-violet-500 hover:border-violet-400 hover:bg-violet-50 transition flex items-center justify-center gap-2">
                          <Plus className="w-4 h-4" /> Adicionar pergunta principal
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Adicionar seção */}
                {addingSectionIdx !== null ? (
                  <div className="bg-white rounded-3xl border border-violet-200 p-5 shadow-sm">
                    <p className="text-xs font-bold text-slate-600 mb-2">Nome da nova seção</p>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newSectionTitle}
                        onChange={e => setNewSectionTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') { setAddingSectionIdx(null); setNewSectionTitle(''); } }}
                        placeholder="Ex: Histórico de Saúde"
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition"
                      />
                      <button onClick={handleAddSection}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        Criar
                      </button>
                      <button onClick={() => { setAddingSectionIdx(null); setNewSectionTitle(''); }}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingSectionIdx(sections.length)}
                    className="w-full py-4 rounded-3xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/50 transition flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Adicionar nova seção
                  </button>
                )}
              </>
            ) : tab === 'responses' ? (
              /* Aba de Compartilhamento */
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-800 mb-1">Enviar para pacientes</h3>
                  <p className="text-sm text-slate-500">Selecione o paciente e o médico para gerar o link personalizado e enviar o formulário de anamnese.</p>
                </div>

                {/* Filtros de seleção dinâmica por digitação automática para Paciente e Médico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div>
                    <SearchableSelect
                      label="1. Selecione o Paciente"
                      options={patientsList.map(p => ({
                        id: p.id,
                        label: p.nome,
                        sublabel: p.cpf ? `CPF: ${p.cpf}` : undefined,
                        extra: (p as any).celular
                      }))}
                      value={sharePatientId}
                      onChange={(val) => setSharePatientId(val ? String(val) : '')}
                      placeholder="Digite para buscar paciente por Nome ou CPF..."
                    />
                  </div>

                  <div>
                    <SearchableSelect
                      label="2. Selecione o Médico da Consulta/Atendimento"
                      options={doctorsList.map(d => ({
                        id: d.id,
                        label: `Dr(a). ${d.nome}`,
                        sublabel: d.especialidade || 'Médico',
                        extra: d.numero_conselho || 'CRM'
                      }))}
                      value={shareDoctorId}
                      onChange={(val) => setShareDoctorId(val ? String(val) : '')}
                      placeholder="Digite para buscar médico por Nome, CRM ou Especialidade..."
                    />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Link do formulário de anamnese</p>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-600 break-all select-all">
                    {getShareableLink()}
                  </div>
                </div>
                <button onClick={handleCopyLink}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {copied ? <><Check className="w-4 h-4 text-emerald-300" /> Link copiado!</> : <><Copy className="w-4 h-4" /> Copiar link</>}
                </button>
                <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                  <Sparkles className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-violet-800">Anamnese Inteligente</p>
                    <p className="text-[11px] text-violet-700 mt-0.5 leading-relaxed">
                      O preenchimento prévio reduz em até 40% o tempo gasto na consulta. As respostas ficam disponíveis imediatamente no prontuário do paciente.
                    </p>
                  </div>
                </div>
              </div>
            ) : tab === 'templates' ? (
              /* Aba de Modelos Salvos */
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-800 mb-1">Modelos de Formulário Salvos</h3>
                  <p className="text-sm text-slate-500">Recupere estruturas de formulário prontas. Atenção: ao carregar um modelo, o formulário atual será substituído.</p>
                </div>
                {loadingTemplates ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
                ) : templates.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-sm text-slate-500">Nenhum modelo salvo ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-violet-300 transition group bg-slate-50">
                        <div>
                          <p className="font-bold text-sm text-slate-800">{t.nome || t.titulo || 'Modelo de Anamnese'}</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Criado por: <span className="font-bold text-slate-700">{(t as any).criado_por_nome && (t as any).criado_por_nome !== 'Usuário' ? (t as any).criado_por_nome : (userObj.nome || userObj.nome_fantasia || userObj.razao_social || 'Clínica de Teste')}</span> <span className="text-violet-600 font-semibold">({(t as any).criado_por_perfil || 'Administrativo'})</span> em {new Date(t.criado_em).toLocaleDateString('pt-BR')} às {new Date(t.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setPreviewingTemplate(t)}
                            className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition"
                            title="Visualizar"
                          >
                            👁️
                          </button>
                          <button onClick={() => setEditingTemplate(t)}
                            className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-amber-400 hover:text-amber-600 transition"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button onClick={() => handleLoadTemplate(t.id)}
                            className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-violet-400 hover:text-violet-600 transition">
                            Carregar no Construtor
                          </button>
                          <button onClick={() => handleDeleteTemplate(t.id)}
                            className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition">
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Aba Meus Envios (Por Paciente) - PRIVADO DO MÉDICO */
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-base font-black text-slate-800 mb-1">
                      {isDoctor ? 'Formulários Personalizados por Paciente' : 'Envios de Formulários dos Médicos por Paciente'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {isDoctor 
                        ? 'Histórico de anamneses criadas e enviadas por você especificamente para seus pacientes.' 
                        : 'Histórico de formulários personalizados criados e enviados pelos médicos aos pacientes.'}
                    </p>
                  </div>
                  <button
                    onClick={handleOpenCustomModal}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-md cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    <Sparkles className="w-4 h-4" /> Personalizar Novo Formulário
                  </button>
                </div>

                {loadingDoctorCustomForms ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
                ) : doctorCustomForms.length === 0 ? (
                  <div className="text-center p-12 border border-dashed border-slate-200 rounded-3xl space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Nenhum formulário personalizado enviado ainda.</p>
                    <p className="text-xs text-slate-400">Clique em "Personalizar para Paciente" para montar uma anamnese sob medida para um paciente específico.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {doctorCustomForms.map(item => (
                      <div key={item.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-violet-300 transition space-y-3 shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-800">{item.nome_paciente}</h4>
                            <p className="text-xs font-semibold text-indigo-600 mt-0.5 flex items-center gap-1">
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Enviado por: <strong>{item.nome_medico || 'Dr(a). Médico'}</strong></span>
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{item.titulo}</p>
                          </div>
                          <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                            {item.status || 'Enviado'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 border-t border-slate-200/60 pt-2 flex items-center justify-between">
                          <span>Enviado em: {new Date(item.criado_em).toLocaleDateString('pt-BR')} às {new Date(item.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setViewingCustomFormModal(item)}
                            className="flex-1 py-2 bg-white border border-slate-200 hover:border-violet-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-violet-500" /> Ver Formulário
                          </button>
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/client/anamnesis?custom_id=${item.id}`;
                              navigator.clipboard.writeText(link);
                              alert('Link do paciente copiado para a área de transferência!');
                            }}
                            className="p-2 bg-white border border-slate-200 hover:border-violet-300 text-slate-600 rounded-xl transition cursor-pointer"
                            title="Copiar Link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Excluir este formulário personalizado?')) return;
                              try {
                                await fetch(`${API_URL}/api/doctor-custom-anamnesis/${item.id}`, { method: 'DELETE', headers });
                                loadDoctorCustomForms();
                              } catch {}
                            }}
                            className="p-2 bg-white border border-slate-200 hover:border-red-300 text-slate-400 hover:text-red-500 rounded-xl transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {/* Estatísticas */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-500" /> Resumo do Formulário
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Seções', value: sections.length, color: 'violet' },
                  { label: 'Perguntas', value: sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0), color: 'indigo' },
                  {
                    label: 'Obrigatórias',
                    value: sections.reduce((acc, s) => acc + (s.questions?.filter(q => q.obrigatoria).length || 0), 0),
                    color: 'red'
                  },
                ].map(stat => (
                  <div key={stat.label} className={`flex items-center justify-between p-3 rounded-xl bg-${stat.color}-50 border border-${stat.color}-100`}>
                    <span className={`text-xs font-bold text-${stat.color}-700`}>{stat.label}</span>
                    <span className={`text-lg font-black text-${stat.color}-600`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipos disponíveis */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-4">Tipos de pergunta</h3>
              <div className="space-y-2">
                {QUESTION_TYPES.map(t => (
                  <div key={t.value} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50">
                    <span className="text-violet-500">{t.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{t.label}</p>
                      <p className="text-[10px] text-slate-400">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview link */}
            <button onClick={() => setShowPreviewModal(true)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition group shadow-sm text-left">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-slate-700">Visualizar formulário</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition" />
            </button>
          </div>
        </div>
      </div>
      {showPreviewModal && <CompanyAnamnesisPreviewModal sections={sections as any} onClose={() => setShowPreviewModal(false)} />}
      {previewingTemplate && (
        <TemplatePreviewModal
          template={previewingTemplate}
          onClose={() => setPreviewingTemplate(null)}
        />
      )}
      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={() => {
            setEditingTemplate(null);
            loadTemplates();
          }}
        />
      )}

      {/* Modal 1: Aviso de Alterações Não Salvas ao Tentar Sair / Mudar de Aba */}
      {showUnsavedExitModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-fadeIn space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Alterações Não Salvas</h3>
                <p className="text-xs text-slate-500 font-medium">Atenção ao sair da tela de edição</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-900 text-xs leading-relaxed font-semibold">
              Se você sair agora sem salvar, perderá o formulário, as sessões e todas as perguntas criadas ou modificadas.
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowUnsavedExitModal(false);
                  setPendingTargetUrl(null);
                  setPendingTab(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Continuar Editando Formulário
              </button>
              <button
                onClick={() => {
                  setIsDirty(false);
                  (window as any).__anamnesisIsDirty = false;
                  setShowUnsavedExitModal(false);
                  if (pendingTargetUrl) {
                    const url = pendingTargetUrl;
                    setPendingTargetUrl(null);
                    navigate(url);
                  } else if (pendingTab) {
                    setTab(pendingTab as any);
                    setPendingTab(null);
                  }
                  loadFormSilent();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Sair Assim Mesmo
              </button>
              <button
                onClick={async () => {
                  setShowUnsavedExitModal(false);
                  if (!hasExistingFormInDb || isOverwriteNoticeSuppressed()) {
                    await executeSaveBulk();
                    (window as any).__anamnesisIsDirty = false;
                    if (pendingTargetUrl) {
                      const url = pendingTargetUrl;
                      setPendingTargetUrl(null);
                      navigate(url);
                    } else if (pendingTab) {
                      setTab(pendingTab as any);
                      setPendingTab(null);
                    }
                  } else {
                    setShowOverwriteModal(true);
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Formulário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Aviso de Confirmação de Sobrescrita com Opção "Não mostrar por 2 meses" */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-fadeIn space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl">
                <Save className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Sobrescrever Formulário</h3>
                <p className="text-xs text-slate-500 font-medium">Confirmação de salvamento</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-700 text-xs leading-relaxed space-y-3">
              <p className="font-bold text-slate-800">
                Atenção: Salvar este formulário irá sobrescrever a versão anterior gravada no banco de dados.
              </p>
              
              <label className="flex items-start gap-2 pt-2 cursor-pointer border-t border-slate-200">
                <input
                  type="checkbox"
                  checked={suppressOverwriteCheckbox}
                  onChange={e => setSuppressOverwriteCheckbox(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-600">
                  Eu entendi e não quero que este aviso apareça por 2 meses.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowOverwriteModal(false)}
                disabled={saving}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmOverwriteSave}
                disabled={saving}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Sobrescrevendo...' : 'Sobrescrever e Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Personalizar Anamnese para o Paciente */}
      {showCustomPatientModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-fadeIn">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-black text-slate-800">Personalizar Anamnese para o Paciente</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Crie um formulário exclusivo do zero ou use a estrutura da clínica como base.
                </p>
              </div>
              <button
                onClick={() => setShowCustomPatientModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Alternar Modo de Criação */}
            <div className="flex gap-2 mb-4 bg-slate-100 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => {
                  setCustomSections([{
                    id: `s_${Date.now()}`,
                    titulo: 'Perguntas Personalizadas',
                    descricao: '',
                    ordem: 0,
                    ativo: true,
                    questions: []
                  }]);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-white text-slate-800 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-violet-600" /> Criar do Zero (Exclusivo)
              </button>
              <button
                onClick={() => {
                  setCustomSections(JSON.parse(JSON.stringify(sections)));
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Usar Modelo da Clínica como Base
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {patientsList.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs font-semibold">
                  Atenção: Nenhum paciente ativo com acesso liberado ao seu perfil foi encontrado. O acesso ao prontuário do paciente precisa ser liberado pela clínica ou pelo próprio paciente.
                </div>
              ) : (
                /* Paciente, Médico e Título */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Selecionar Paciente ({isDoctor ? 'Apenas com Acesso Liberado' : 'Ativos'})</label>
                    <select
                      value={selectedPatientId}
                      onChange={e => {
                        const pId = e.target.value;
                        setSelectedPatientId(pId);
                        const pObj = patientsList.find(p => String(p.id) === String(pId));
                        if (pObj) {
                          setCustomFormTitle(`Anamnese Personalizada - ${pObj.nome}`);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-violet-500"
                    >
                      {patientsList.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} {p.cpf ? `(CPF: ${p.cpf})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isDoctor && doctorsList.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Médico Responsável</label>
                      <select
                        value={selectedCustomDoctorId}
                        onChange={e => setSelectedCustomDoctorId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-violet-500"
                      >
                        {doctorsList.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            {doc.nome} {doc.numero_conselho ? `(${doc.numero_conselho})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={!isDoctor ? '' : 'sm:col-span-1'}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Título do Formulário</label>
                    <input
                      type="text"
                      value={customFormTitle}
                      onChange={e => setCustomFormTitle(e.target.value)}
                      placeholder="Ex: Anamnese Cardiologia Especial"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              )}

              {/* Lista de Seções & Perguntas Personalizáveis */}
              {customSections.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-500 mb-3">Nenhuma seção ou pergunta criada.</p>
                  <button
                    onClick={() => {
                      setCustomSections([{
                        id: `s_${Date.now()}`,
                        titulo: 'Seção Inicial',
                        descricao: '',
                        ordem: 0,
                        ativo: true,
                        questions: []
                      }]);
                    }}
                    className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition"
                  >
                    + Criar Primeira Seção
                  </button>
                </div>
              ) : (
                customSections.map((sec, secIdx) => (
                  <div key={secIdx} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <input
                        type="text"
                        value={sec.titulo}
                        onChange={e => {
                          const val = e.target.value;
                          setCustomSections(prev => prev.map((s, i) => i === secIdx ? { ...s, titulo: val } : s));
                        }}
                        placeholder="Título da Seção..."
                        className="font-black text-sm text-slate-800 border-b border-transparent focus:border-violet-400 focus:outline-none bg-transparent px-1 py-0.5"
                      />
                      <button
                        onClick={() => handleRemoveCustomSection(secIdx)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition cursor-pointer"
                        title="Remover Seção Inteira"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(sec.questions || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-1">Nenhuma pergunta nesta seção ainda.</p>
                      ) : (
                        (() => {
                          const topLevel = (sec.questions || []).filter(q => !q.parent_option_id);
                          const renderCustomConfigQ = (q: Question, qIdx: number, level: number = 0, qNumPrefix: string = '') => {
                            return (
                              <div key={q.id || qIdx} className="w-full min-w-0 mt-2">
                                <div className={`flex flex-col space-y-2.5 max-w-full overflow-hidden transition ${
                                  level > 0 
                                    ? 'p-2.5 sm:p-3 rounded-xl border border-violet-200/90 bg-white shadow-2xs' 
                                    : 'p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-violet-300 shadow-2xs'
                                }`}>
                                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-slate-100/80 pb-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <p className="text-xs sm:text-sm font-black text-slate-800 tracking-tight whitespace-normal">{q.texto}</p>
                                      {q.obrigatoria && <span className="text-[8px] sm:text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">* Obrigatória</span>}
                                      {level > 0 && <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">↳ Step ({qNumPrefix})</span>}
                                    </div>
                                    
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="inline-block text-[9px] sm:text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {QUESTION_TYPE_MAP[q.tipo]?.label || q.tipo}
                                      </span>
                                      <button
                                        onClick={() => setModalQuestion({ sectionIdx: secIdx, question: q, isCustom: true })}
                                        className="p-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 transition cursor-pointer shrink-0"
                                        title="Editar Pergunta"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveCustomQuestion(secIdx, sec.questions!.indexOf(q))}
                                        className="p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition cursor-pointer shrink-0"
                                        title="Remover Pergunta"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Opções & Botão de + Step (Lógica por alternativa) */}
                                  {needsOptions(q.tipo) && q.options && q.options.length > 0 && (
                                    <div className="mt-2 space-y-2 bg-slate-50/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 max-w-full overflow-hidden">
                                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                                        {qNumPrefix || '1'} - Alternativas do formulário
                                      </p>
                                      {q.options.map((o, oIdx) => {
                                        const childQuestions = (sec.questions || []).filter(c => c.parent_option_id != null && String(c.parent_option_id) === String(o.id));
                                        const stepNum = `${qNumPrefix || '1'}.${oIdx + 1}`;

                                        return (
                                          <div key={o.id || oIdx} className="space-y-2 border border-slate-200/60 rounded-xl p-2 sm:p-2.5 bg-white max-w-full overflow-hidden">
                                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0"></span>
                                                <span className="text-xs font-bold text-slate-700 truncate">{o.texto}</span>
                                              </div>
                                              <button
                                                onClick={() => setModalQuestion({ sectionIdx: secIdx, question: null, parentOptionId: o.id, isCustom: true })}
                                                className="text-[9px] font-bold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0"
                                              >
                                                <Plus className="w-3 h-3 text-violet-600" /> + {stepNum} Pergunta seguinte
                                              </button>
                                            </div>

                                            {/* Sub-perguntas filhas desta alternativa especificamente */}
                                            {childQuestions.length > 0 && (
                                              <div className="mt-1.5 space-y-1.5 pl-2 sm:pl-3 border-l-2 border-violet-400 max-w-full overflow-hidden">
                                                <p className="text-[8px] sm:text-[9px] font-black text-violet-700 uppercase tracking-wider flex items-center gap-1">
                                                  <span>↳ SE ESCOLHER "{o.texto.toUpperCase()}", RESPONDER TAMBÉM:</span>
                                                </p>
                                                {childQuestions.map(child => renderCustomConfigQ(child, sec.questions!.indexOf(child), level + 1, stepNum))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          };
                          return topLevel.map((q, tIdx) => renderCustomConfigQ(q, sec.questions!.indexOf(q), 0, String(tIdx + 1)));
                        })()
                      )}
                    </div>

                    {/* Botão de adicionar pergunta principal nesta seção */}
                    <button
                      onClick={() => setModalQuestion({ sectionIdx: secIdx, question: null, isCustom: true })}
                      className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Pergunta nesta Seção
                    </button>
                  </div>
                ))
              )}

              {/* Botão para criar nova seção no modal */}
              {customSections.length > 0 && (
                <button
                  onClick={() => {
                    const title = window.prompt('Digite o título da nova seção:', `Seção ${customSections.length + 1}`);
                    if (title && title.trim()) {
                      setCustomSections(prev => [
                        ...prev,
                        { id: `s_${Date.now()}`, titulo: title.trim(), descricao: '', ordem: prev.length, ativo: true, questions: [] }
                      ]);
                    }
                  }}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/50 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Adicionar Nova Seção
                </button>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
              <button
                onClick={() => setShowCustomPatientModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendCustomForm}
                disabled={sendingCustomForm || !selectedPatientId || customSections.length === 0 || customSections.every(s => (s.questions || []).length === 0)}
                className="px-6 py-2.5 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {sendingCustomForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingCustomForm ? 'Enviando...' : 'Enviar para o Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Visualizar Formulário Personalizado Enviado */}
      {viewingCustomFormModal && (
        <CompanyAnamnesisPreviewModal
          sections={(typeof viewingCustomFormModal.sections_data === 'string'
            ? JSON.parse(viewingCustomFormModal.sections_data || '[]')
            : viewingCustomFormModal.sections_data) || []}
          onClose={() => setViewingCustomFormModal(null)}
        />
      )}
    </>
  );
};
