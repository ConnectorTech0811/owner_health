import React, { useState, useEffect } from 'react';
import { Plus, Pill, Trash2, X, Loader2, Bell, BellOff, Check, AlertCircle, Clock, Calendar, Search, MapPin, History, Minus } from 'lucide-react';
import { API_URL } from '../../config';

interface Medication {
  id: number; nome: string; posologia?: string; horarios?: string;
  data_inicio?: string; data_fim?: string; observacoes?: string;
  email_lembrete?: string; ativo: boolean;
}

interface MedLog { id: number; medicamento_id: number; data: string; tomou: boolean; efeitos?: string; }

interface PriceSimulation {
  farmacia: string;
  preco: number;
  desconto: string;
  cupom: string;
  distancia: string;
  link: string;
}

export const ClientMedications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'meds' | 'prices' | 'effects'>('meds');
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<Record<number, MedLog[]>>({});
  
  // States para aba Efeitos
  const [selectedMedForEffect, setSelectedMedForEffect] = useState<string>('');
  const [newEffectText, setNewEffectText] = useState('');
  const [medEffectsHistory, setMedEffectsHistory] = useState<any[]>([]);
  const [loadingEffects, setLoadingEffects] = useState(false);
  const [savingEffect, setSavingEffect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reminderSending, setReminderSending] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [showEfeitos, setShowEfeitos] = useState<number | null>(null);
  const [efeitosText, setEfeitosText] = useState('');
  const [customEfeitosLog, setCustomEfeitosLog] = useState<{ medId: number; tomou: boolean } | null>(null);
  const [selectedMedForHistory, setSelectedMedForHistory] = useState<Medication | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingHistoryLog, setEditingHistoryLog] = useState<MedLog | null>(null);

  // States para busca de preço
  const [searchTerm, setSearchTerm] = useState('');
  const [cepTerm, setCepTerm] = useState('');
  const [searchingPrices, setSearchingPrices] = useState(false);
  const [searchedPrices, setSearchedPrices] = useState<PriceSimulation[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);

  const clienteId = localStorage.getItem('activeProfileId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    nome: '', posologia: '', data_inicio: today,
    data_fim: '', observacoes: '', email_lembrete: '',
  });
  const [horariosList, setHorariosList] = useState<string[]>(['08:00']);

  useEffect(() => {
    fetchMeds();
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  const fetchMeds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/medications/client/${clienteId}`, { headers });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setMeds(list);
      
      const logsMap: Record<number, MedLog[]> = {};
      await Promise.all(list.map(async (m: Medication) => {
        try {
          const lr = await fetch(`${API_URL}/api/medications/${m.id}/logs`, { headers });
          const ld = await lr.json();
          logsMap[m.id] = Array.isArray(ld) ? ld : [];
        } catch { logsMap[m.id] = []; }
      }));
      setLogs(logsMap);
    } catch { setMeds([]); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.nome) { setError('Nome é obrigatório'); return; }
    if (form.data_fim && form.data_fim < form.data_inicio) { setError('A data de término não pode ser anterior à data de início.'); return; }
    if (form.email_lembrete && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email_lembrete)) { setError('E-mail inválido.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, horarios: horariosList.filter(h => h.trim() !== '') };
      const res = await fetch(`${API_URL}/api/medications/client/${clienteId}`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setShowModal(false);
      setForm({ nome: '', posologia: '', data_inicio: today, data_fim: '', observacoes: '', email_lembrete: '' });
      setHorariosList(['08:00']);
      fetchMeds();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally { setSaving(false); }
  };
  const handleLog = async (medId: number, tomou: boolean, efeitos?: string, customDate?: string) => {
    const dateToLog = customDate || today;
    await fetch(`${API_URL}/api/medications/${medId}/logs`, {
      method: 'POST', headers,
      body: JSON.stringify({ data: dateToLog, tomou, efeitos }),
    });
    setShowEfeitos(null);
    setCustomEfeitosLog(null);
    setEfeitosText('');
    setEditingHistoryLog(null);
    fetchMeds();
  };

  const fetchEffects = async (medId: string) => {
    if (!medId) { setMedEffectsHistory([]); return; }
    setLoadingEffects(true);
    try {
      const res = await fetch(`${API_URL}/api/medications/${medId}/effects`, { headers });
      const data = await res.json();
      setMedEffectsHistory(Array.isArray(data) ? data : []);
    } catch {
      setMedEffectsHistory([]);
    } finally {
      setLoadingEffects(false);
    }
  };

  useEffect(() => {
    fetchEffects(selectedMedForEffect);
  }, [selectedMedForEffect]);

  const handleSaveEffect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedForEffect || !newEffectText.trim()) return;
    setSavingEffect(true);
    try {
      await fetch(`${API_URL}/api/medications/${selectedMedForEffect}/effects`, {
        method: 'POST', headers,
        body: JSON.stringify({ efeito: newEffectText.trim() })
      });
      setNewEffectText('');
      fetchEffects(selectedMedForEffect);
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar efeito');
    } finally {
      setSavingEffect(false);
    }
  };
  const sendReminder = async (med: Medication) => {
    setReminderSending(med.id);
    try {
      await fetch(`${API_URL}/api/medications/send-reminder`, {
        method: 'POST', headers,
        body: JSON.stringify({ email: med.email_lembrete, nome: med.nome, horarios: med.horarios }),
      });
      alert('Lembrete enviado por e-mail!');
    } catch { alert('Erro ao enviar lembrete'); }
    setReminderSending(null);
  };

  const getTodayLog = (medId: number) =>
    (logs[medId] || []).find(l => l.data?.startsWith(today));

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este medicamento?')) return;
    await fetch(`${API_URL}/api/medications/${id}`, { method: 'DELETE', headers });
    fetchMeds();
  };

  // Solicitar Notificação Push
  const handleTogglePush = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações push de desktop.');
      return;
    }
    
    if (Notification.permission === 'granted') {
      alert('Os alarmes via notificação push do navegador já estão ativados!');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      new Notification("Owner Health", {
        body: "Notificações ativadas! Você receberá alertas dos seus medicamentos.",
        icon: "/favicon.ico"
      });
    } else {
      alert('Permissão de notificações negada pelo navegador.');
    }
  };

  // Exportar Lembrete para Calendário (.ics)
  const downloadICS = (med: Medication) => {
    const cleanName = med.nome.replace(/[^a-zA-Z0-9 ]/g, "");
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Owner Health//Medication Reminder//PT',
      'BEGIN:VEVENT',
      `UID:${med.id}@ownerhealth.com.br`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${new Date().toISOString().split('T')[0].replace(/-/g, "")}T080000`,
      'RRULE:FREQ=DAILY;INTERVAL=1',
      `SUMMARY:Tomar ${cleanName}`,
      `DESCRIPTION:Posologia: ${med.posologia || 'Não especificada'}. Horários: ${med.horarios || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lembrete_${cleanName.toLowerCase().replace(/\s+/g, "_")}.ics`;
    link.click();
  };

  // Simular busca de preços de medicamentos
  const handleSearchPrices = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    setSearchingPrices(true);
    
    setTimeout(() => {
      // Gerar simulações baseadas no termo de busca
      const basePrice = Math.floor(Math.random() * 50) + 15;
      const results: PriceSimulation[] = [
        {
          farmacia: 'Drogasil',
          preco: basePrice,
          desconto: '25% de desconto com cupom OwnerHealth',
          cupom: 'OWNER25',
          distancia: '0.8 km de você',
          link: 'https://www.drogasil.com.br'
        },
        {
          farmacia: 'Drogaria São Paulo',
          preco: basePrice - 2.5 > 10 ? basePrice - 2.5 : basePrice,
          desconto: 'Melhor preço à vista no convênio',
          cupom: 'DSPCONV',
          distancia: '1.2 km de você',
          link: 'https://www.drogariasaopaulo.com.br'
        },
        {
          farmacia: 'Pague Menos',
          preco: basePrice + 3.1,
          desconto: 'Ganhe 15% na segunda unidade',
          cupom: 'PAGUEM15',
          distancia: '2.5 km de você',
          link: 'https://www.paguemenos.com.br'
        },
        {
          farmacia: 'Ultrafarma',
          preco: basePrice - 4 > 8 ? basePrice - 4 : basePrice,
          desconto: 'Desconto exclusivo online',
          cupom: 'ULTRAOWNER',
          distancia: 'Entrega rápida por CEP',
          link: 'https://www.ultrafarma.com.br'
        }
      ].sort((a, b) => a.preco - b.preco);

      setSearchedPrices(results);
      setSearchingPrices(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tab Selector & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Medicamentos</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Controle suas doses e compare preços de medicamentos em farmácias parceiras</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-center">
          <button
            onClick={() => setActiveTab('meds')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'meds' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Meus Medicamentos
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'prices' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Buscar Preços de Remédios
          </button>
          <button
            onClick={() => setActiveTab('effects')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'effects' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Efeitos de Medicamentos
          </button>
        </div>
      </div>

      {activeTab === 'meds' && (
        <>
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePush}
                className={`flex items-center gap-2 px-4.5 py-2 rounded-xl text-xs font-bold border transition ${pushEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                <Bell className="w-4 h-4" />
                {pushEnabled ? 'Lembretes Push Ativos ✓' : 'Ativar Alarmes Push no Navegador'}
              </button>
            </div>
            
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              <Plus className="w-4 h-4" /> Adicionar Medicamento
            </button>
          </div>

          {/* List or Empty State */}
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
          ) : meds.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Pill className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="font-black text-slate-700 mb-2">Nenhum medicamento cadastrado</h3>
              <p className="text-sm text-slate-400 mb-6">Registre os medicamentos que está tomando para ter controle e receber lembretes</p>
              <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                Adicionar Medicamento
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meds.map(med => {
                const todayLog = getTodayLog(med.id);
                const horarios = typeof med.horarios === 'string' && med.horarios.startsWith('[')
                  ? JSON.parse(med.horarios) : [med.horarios].filter(Boolean);

                return (
                  <div key={med.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <Pill className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 text-sm">{med.nome}</h3>
                            {med.posologia && <p className="text-xs text-slate-500 font-medium">{med.posologia}</p>}
                            {med.observacoes && <p className="text-[10px] text-slate-400 font-medium mt-1 italic leading-tight">{med.observacoes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => downloadICS(med)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition"
                            title="Exportar para o Calendário (.ics)"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          {med.email_lembrete && (
                            <button
                              onClick={() => sendReminder(med)}
                              disabled={reminderSending === med.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition"
                              title="Enviar lembrete por e-mail"
                            >
                              {reminderSending === med.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                            </button>
                          )}
                          <button onClick={() => handleDelete(med.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {horarios.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {horarios.map((h: string, i: number) => (
                            <span key={i} className="flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                              <Clock className="w-3 h-3" /> {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Controle diário */}
                    <div className="border-t border-slate-100 pt-3 mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hoje — {new Date().toLocaleDateString('pt-BR')}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setSelectedMedForHistory(med); setShowHistoryModal(true); }}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-blue-600 transition cursor-pointer"
                            title="Ver histórico de tomadas e efeitos"
                          >
                            <History className="w-3 h-3 text-slate-500" /> Histórico ({logs[med.id]?.length || 0})
                          </button>
                          {todayLog && (
                            <button
                              onClick={() => { setCustomEfeitosLog({ medId: med.id, tomou: todayLog.tomou }); setEfeitosText(todayLog.efeitos || ''); }}
                              className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              • Anotar Efeitos
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {todayLog ? (
                        <div className={`flex flex-col gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${todayLog.tomou ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          <div className="flex items-center gap-2">
                            {todayLog.tomou ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            <span>{todayLog.tomou ? 'Tomado hoje ✓' : 'Não tomado hoje'}</span>
                          </div>
                          {todayLog.efeitos && (
                            <p className="text-[10px] text-slate-500 bg-white/60 px-2 py-1 rounded mt-1 border border-slate-100 italic">
                              Efeito observado: {todayLog.efeitos}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleLog(med.id, true)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Tomei
                          </button>
                          <button
                            onClick={() => { setShowEfeitos(med.id); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"
                          >
                            <BellOff className="w-3.5 h-3.5" /> Não tomei
                          </button>
                        </div>
                      )}
                    </div>                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'prices' && (
        /* Aba de Comparação de Preços */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-black text-slate-800 mb-2">API de Preços de Medicamentos</h3>
            <p className="text-xs text-slate-500 mb-5">Pesquise por substâncias ou marcas comerciais para comparar preços nas redes de farmácias com cupom Owner Health.</p>
            
            <form onSubmit={handleSearchPrices} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <input
                  type="text"
                  required
                  placeholder="Nome do remédio (ex: Losartana, Dipirona, Dorflex...)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold focus:outline-none focus:border-blue-500 transition"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <div className="md:col-span-3 relative">
                <input
                  type="text"
                  placeholder="Localidade / CEP"
                  value={cepTerm}
                  onChange={e => setCepTerm(e.target.value.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm font-semibold focus:outline-none focus:border-blue-500 transition"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="submit"
                disabled={searchingPrices}
                className="md:col-span-3 text-white font-bold py-3 rounded-xl shadow-md transition hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
              >
                {searchingPrices ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</> : 'Pesquisar Preços'}
              </button>
            </form>
          </div>

          {searchedPrices.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Melhores Preços Encontrados para "{searchTerm}"</h4>
                {cepTerm && <span className="text-xs text-blue-600 font-bold">Filtrado pelo CEP {cepTerm}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchedPrices.map((price, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-extrabold text-slate-800">{price.farmacia}</span>
                        {idx === 0 && <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">Melhor Preço ✓</span>}
                      </div>
                      
                      <div className="flex items-baseline gap-1 mt-1 mb-2">
                        <span className="text-xs font-bold text-slate-400">R$</span>
                        <span className="text-2xl font-black text-slate-900">{price.preco.toFixed(2).replace('.', ',')}</span>
                      </div>

                      <p className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg inline-block border border-emerald-100/50 mb-3">{price.desconto}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-3 mt-2">
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {price.distancia}
                      </div>
                      <button
                        onClick={() => alert(`Cupom ${price.cupom} copiado! Você será redirecionado para o site parceiro.`)}
                        className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 text-[10px] font-black rounded-lg transition"
                      >
                        Pegar Cupom ({price.cupom})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'effects' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-black text-slate-800 mb-2">Registrar Efeitos Colaterais</h3>
            <p className="text-xs text-slate-500 mb-5">Anote qualquer efeito colateral, sintoma ou observação que você teve após o uso de algum dos seus medicamentos. Isso ajuda a construir um histórico preciso para o seu médico.</p>
            
            <form onSubmit={handleSaveEffect} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <select
                  required
                  value={selectedMedForEffect}
                  onChange={e => setSelectedMedForEffect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-blue-500 transition appearance-none"
                >
                  <option value="" disabled>Selecione o medicamento...</option>
                  {meds.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-5 relative">
                <input
                  type="text"
                  required
                  list="common-effects"
                  placeholder="Ex: Enjoo, Tontura, Dor de cabeça..."
                  value={newEffectText}
                  onChange={e => setNewEffectText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-blue-500 transition"
                />
                <datalist id="common-effects">
                  <option value="Enjoo ou Náusea" />
                  <option value="Tontura" />
                  <option value="Dor de cabeça" />
                  <option value="Sonolência" />
                  <option value="Boca seca" />
                  <option value="Palpitações" />
                  <option value="Fadiga" />
                  <option value="Azia / Queimação" />
                  <option value="Manchas na pele" />
                </datalist>
              </div>
              <button
                type="submit"
                disabled={savingEffect || !selectedMedForEffect}
                className="md:col-span-3 text-white font-bold py-3 rounded-xl shadow-md transition hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
              >
                {savingEffect ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Registrar Efeito'}
              </button>
            </form>
          </div>

          {selectedMedForEffect && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                Histórico de Efeitos Reportados
              </h4>
              
              {loadingEffects ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
              ) : medEffectsHistory.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                  <p className="text-sm font-semibold text-slate-500">Nenhum efeito colateral registrado para este medicamento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medEffectsHistory
                    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
                    .map(effect => (
                    <div key={effect.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 mb-1">
                          {new Date(effect.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        <p className="text-sm font-bold text-slate-700">{effect.efeito}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de efeitos ao não tomar */}
      {showEfeitos !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeIn">
            <h3 className="font-black text-slate-800 mb-3">Registrar Não Tomada</h3>
            <p className="text-sm text-slate-500 mb-4">Deseja anotar o motivo ou algum efeito observado?</p>
            <textarea
              value={efeitosText}
              onChange={e => setEfeitosText(e.target.value)}
              rows={3}
              placeholder="Ex: Esqueci, efeito colateral..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowEfeitos(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={() => handleLog(showEfeitos, false, efeitosText)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition"
                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Customizado de Efeitos a Qualquer Momento */}
      {customEfeitosLog !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeIn">
            <h3 className="font-black text-slate-800 mb-1">Efeitos Colaterais</h3>
            <p className="text-xs text-slate-500 mb-4">Descreva efeitos colaterais, reações ou como se sentiu após tomar.</p>
            <textarea
              value={efeitosText}
              onChange={e => setEfeitosText(e.target.value)}
              rows={3}
              placeholder="Ex: Enjoo leve, tontura, dor de cabeça..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setCustomEfeitosLog(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={() => handleLog(customEfeitosLog.medId, customEfeitosLog.tomou, efeitosText)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>Salvar Relato</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Medicamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Novo Medicamento</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm font-semibold">{error}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome do Medicamento *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Metformina 500mg" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Posologia</label>
                <input value={form.posologia} onChange={e => setForm(f => ({ ...f, posologia: e.target.value }))}
                  placeholder="Ex: 1 comprimido após as refeições" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div className="space-y-2">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Início</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Término (opcional)</label>
                  <input type="date" min={form.data_inicio} value={form.data_fim} onChange={e => {
                    if (e.target.value && e.target.value < form.data_inicio) {
                      alert('A data de término não pode ser anterior à data de início.');
                      setForm(f => ({ ...f, data_fim: '' }));
                    } else {
                      setForm(f => ({ ...f, data_fim: e.target.value }));
                    }
                  }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Observações Adicionais (Livre)</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Informações, efeitos observados ou detalhes abertos para escrever..." rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">E-mail para Lembretes (opcional)</label>
                <input type="email" value={form.email_lembrete} onChange={e => setForm(f => ({ ...f, email_lembrete: e.target.value }))}
                  placeholder="seu@email.com — receberá alertas por e-mail" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Uso e Efeitos */}
      {showHistoryModal && selectedMedForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn border border-slate-100">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{selectedMedForHistory.nome}</h3>
                  <p className="text-xs text-slate-500 font-semibold">Histórico de Tomadas e Efeitos</p>
                </div>
              </div>
              <button onClick={() => { setShowHistoryModal(false); setSelectedMedForHistory(null); }} className="p-1.5 hover:bg-slate-200 rounded-lg transition">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {(!logs[selectedMedForHistory.id] || logs[selectedMedForHistory.id].length === 0) ? (
                <div className="text-center py-10">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">Nenhum registro encontrado para este medicamento.</p>
                  <p className="text-xs text-slate-400 mt-1">Registre se tomou ou não hoje para começar a construir o histórico.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...logs[selectedMedForHistory.id]]
                    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                    .map((log) => {
                      const logDate = new Date(log.data + 'T12:00:00');
                      const formattedDate = logDate.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      });

                      const isEditingThis = editingHistoryLog?.id === log.id;

                      return (
                        <div key={log.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-black text-slate-655">{formattedDate}</span>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${log.tomou ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {log.tomou ? (
                                  <><Check className="w-3 h-3" /> Tomou</>
                                ) : (
                                  <><AlertCircle className="w-3 h-3" /> Não Tomou</>
                                )}
                              </span>
                              {!isEditingThis && (
                                <button
                                  onClick={() => {
                                    setEditingHistoryLog(log);
                                    setEfeitosText(log.efeitos || '');
                                  }}
                                  className="text-[10px] font-bold text-blue-600 hover:underline transition cursor-pointer"
                                >
                                  {log.efeitos ? 'Editar Relato' : '+ Anotar Efeito'}
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditingThis ? (
                            <div className="mt-3 space-y-2">
                              <textarea
                                value={efeitosText}
                                onChange={(e) => setEfeitosText(e.target.value)}
                                rows={2}
                                placeholder="Descreva efeitos observados ou o motivo de não tomar..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingHistoryLog(null)}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleLog(selectedMedForHistory.id, log.tomou, efeitosText, log.data)}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition"
                                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            log.efeitos && (
                              <div className="mt-2 text-xs text-slate-600 bg-white border border-slate-100 p-2.5 rounded-lg italic">
                                <span className="font-bold text-[10px] text-slate-400 not-italic block mb-0.5">Efeito/Observação:</span>
                                "{log.efeitos}"
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => { setShowHistoryModal(false); setSelectedMedForHistory(null); }}
                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
