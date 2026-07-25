import React, { useState } from 'react';
import { isValidCPF, formatCPF, formatCelular } from '../utils/validators';
import { User, Mail, MapPin, Phone, CreditCard, Loader2, Shield, ArrowRight, ArrowLeft, CheckSquare } from 'lucide-react';
import { API_URL } from '../config';

interface PatientRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  companyId: string | number;
}

const STEPS = ['Dados Pessoais & Endereço', 'Plano de Saúde', 'Acesso & Segurança'];

export const PatientRegistrationModal: React.FC<PatientRegistrationModalProps> = ({ onClose, onSuccess, companyId }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  const [form, setForm] = useState({
    nome: '', cpf: '', data_nascimento: '', email: '', celular: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    plano_empresa: '', plano_nome: '', plano_produto: '', plano_numero_carteirinha: '',
    senha: '', confirmar_senha: '', acceptLGPD: false, empresa_id: companyId.toString(),
  });

  const sf = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const fetchCep = async (cepValue?: string) => {
    const cep = (cepValue || form.cep).replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    setError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setError('CEP não encontrado. Por favor, verifique o número.');
      } else {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch {
      setError('Erro ao buscar o CEP. Verifique sua conexão ou digite manualmente.');
    } finally { setCepLoading(false); }
  };

  const handleCepChange = (val: string) => {
    const formatted = val.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
    sf('cep', formatted);
    const cleanCep = formatted.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      fetchCep(cleanCep);
    }
  };

  const handleNext = () => {
    setError('');
    if (step === 0) {
      if (!form.nome || !form.cpf || !form.data_nascimento || !form.email || !form.celular) {
        setError('Preencha todos os campos obrigatórios'); return;
      }
      if (!isValidCPF(form.cpf)) { setError('CPF inválido'); return; }
      if (form.celular.length < 14) { setError('Celular inválido'); return; }
      const birth = new Date(form.data_nascimento);
      if (birth.getFullYear() < 1940) {
        setError('A data de nascimento não pode ter um ano anterior a 1940.');
        return;
      }
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 18) { setError('O titular deve ter mais de 18 anos'); return; }

      if (!form.cep || !form.logradouro || !form.numero) {
        setError('Preencha CEP, logradouro e número'); return;
      }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.acceptLGPD) { setError('Você deve aceitar os termos de LGPD'); return; }
    if (form.senha !== form.confirmar_senha) { setError('As senhas não coincidem'); return; }
    if (form.senha.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/clients/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar cadastro');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally { setLoading(false); }
  };

  // Helper Field component
  const F = ({ label, id, value, onChange, type = "text", placeholder = "", icon = null, colSpan = false, isValid = null }: any) => (
    <div className={colSpan ? "md:col-span-2" : ""}>
      <label htmlFor={id} className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input id={id} type={type}
          min={type === 'date' ? '1940-01-01' : undefined}
          max={type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full border ${isValid === false ? 'border-red-500 bg-red-50 focus:border-red-500' : isValid === true ? 'border-emerald-500 bg-emerald-50 focus:border-emerald-500 text-emerald-900' : 'border-slate-200 bg-slate-50 focus:border-blue-500 text-slate-700'} rounded-xl ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 text-base md:text-sm font-medium focus:outline-none transition`} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-fadeIn relative">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-black text-slate-800">Novo Paciente</h3>
            <p className="text-sm text-slate-500">Cadastro completo de paciente</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 font-bold p-2">
            FECHAR
          </button>
        </div>

        {/* Steps */}
        <div className="px-8 py-4 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                  style={{
                    background: i <= step ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : '#f1f5f9',
                    color: i <= step ? 'white' : '#94a3b8',
                  }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 min-w-[2rem] h-0.5 rounded-full ${i < step ? 'bg-blue-400' : 'bg-slate-100'}`} />}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={step === STEPS.length - 1 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold flex gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* ── Step 0: Dados Pessoais & Endereço ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="Nome Completo *" id="nome" value={form.nome} onChange={(v: string) => sf('nome', v)}
                  icon={<User className="w-4 h-4" />} placeholder="Seu nome completo" colSpan />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="CPF *" id="cpf" value={form.cpf} isValid={form.cpf ? isValidCPF(form.cpf) : null} onChange={(v: string) => sf('cpf', formatCPF(v))}
                  icon={<User className="w-4 h-4" />} placeholder="000.000.000-00" />
                <F label="Data de Nascimento *" id="data_nascimento" type="date" value={form.data_nascimento}
                  onChange={(v: string) => sf('data_nascimento', v)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">CEP *</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    </div>
                    <input value={form.cep}
                      onChange={e => handleCepChange(e.target.value)}
                      onBlur={() => fetchCep()} placeholder="00000-000" maxLength={9}
                      className={`w-full border ${form.cep ? (form.logradouro ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : error.includes('CEP') ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50') : 'border-slate-200 bg-slate-50'} rounded-xl pl-11 pr-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:border-blue-500 transition`} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <F label="Logradouro *" id="logradouro" value={form.logradouro} onChange={(v: string) => sf('logradouro', v)}
                    icon={<MapPin className="w-4 h-4" />} placeholder="Rua, Avenida..." />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <F label="Número *" id="numero" value={form.numero} onChange={(v: string) => sf('numero', v)} placeholder="123" />
                <F label="Complemento" id="complemento" value={form.complemento} onChange={(v: string) => sf('complemento', v)} placeholder="Apto..." />
                <F label="Bairro" id="bairro" value={form.bairro} onChange={(v: string) => sf('bairro', v)} placeholder="Bairro" />
                <F label="Cidade" id="cidade" value={form.cidade} onChange={(v: string) => sf('cidade', v)} placeholder="Cidade" />
                <F label="UF" id="estado" value={form.estado} onChange={(v: string) => sf('estado', v.toUpperCase().slice(0, 2))} placeholder="SP" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="E-mail *" id="email" type="email" value={form.email} onChange={(v: string) => sf('email', v)}
                  icon={<Mail className="w-4 h-4" />} placeholder="seu@email.com" />
                <F label="Celular *" id="celular" value={form.celular} isValid={form.celular ? form.celular.length >= 14 : null} onChange={(v: string) => sf('celular', formatCelular(v))}
                  icon={<Phone className="w-4 h-4" />} placeholder="(00) 00000-0000" />
              </div>
            </div>
          )}

          {/* ── Step 1: Plano de Saúde ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 mb-1">💳 Plano de Saúde (opcional)</p>
                <p className="text-xs text-blue-600">Preencha apenas se possuir plano de saúde</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="Operadora" id="plano_empresa" value={form.plano_empresa}
                  onChange={(v: string) => sf('plano_empresa', v)} icon={<CreditCard className="w-4 h-4" />} placeholder="Ex: Bradesco" />
                <F label="Nome do Plano" id="plano_nome" value={form.plano_nome}
                  onChange={(v: string) => sf('plano_nome', v)} placeholder="Ex: Nacional Flex" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="Produto" id="plano_produto" value={form.plano_produto}
                  onChange={(v: string) => sf('plano_produto', v)} placeholder="Ex: Enfermaria" />
                <F label="Nº Carteirinha" id="plano_numero_carteirinha" value={form.plano_numero_carteirinha}
                  onChange={(v: string) => sf('plano_numero_carteirinha', v)} placeholder="0000000000" />
              </div>
            </div>
          )}

          {/* ── Step 2: Acesso & Segurança ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  Os dados de acesso abaixo serão usados pelo paciente para entrar no sistema e acessar seu prontuário e agendamentos.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="Senha de Acesso *" id="senha" type="password" value={form.senha} onChange={(v: string) => sf('senha', v)}
                  icon={<Shield className="w-4 h-4" />} placeholder="Mínimo 6 caracteres" />
                <F label="Confirme a Senha *" id="confirmar_senha" type="password" value={form.confirmar_senha} onChange={(v: string) => sf('confirmar_senha', v)}
                  icon={<Shield className="w-4 h-4" />} placeholder="Repita a senha" />
              </div>
              
              <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition mt-6">
                <div className="relative flex items-start mt-0.5">
                  <input type="checkbox" checked={form.acceptLGPD} onChange={e => sf('acceptLGPD', e.target.checked)} className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition flex items-center justify-center">
                    <CheckSquare className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" />
                  </div>
                </div>
                <div className="text-xs text-slate-600 font-medium leading-relaxed">
                  Confirmo que o paciente autorizou o registro destes dados e estou ciente do tratamento de dados sensíveis conforme a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.
                </div>
              </label>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-6 border-t border-slate-100 mt-8">
            {step > 0 && (
              <button type="button" onClick={() => { setStep(s => s - 1); setError(''); }}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={handleNext}
                className="flex-[2] py-3.5 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={loading}
                className="flex-[2] py-3.5 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalizar Cadastro'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
