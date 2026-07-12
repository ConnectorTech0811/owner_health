import { isValidCPF, formatCelular } from '../../utils/validators';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope, MapPin, Mail, Phone, Lock, Eye, EyeOff, CheckSquare, Loader2, ArrowLeft, Shield } from 'lucide-react';
import { API_URL } from '../../config';

const ESPECIALIDADES = [
  'Clínico Geral', 'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Fisioterapia',
  'Fonoaudiologia', 'Gastroenterologia', 'Geriatria', 'Ginecologia', 'Neurologia',
  'Nutrição', 'Oftalmologia', 'Oncologia', 'Ortopedia', 'Pediatria', 'Psicologia',
  'Psiquiatria', 'Reumatologia', 'Terapia Ocupacional', 'Urologia',
];

const CONSELHOS = ['CRM', 'CRP', 'CREFITO', 'CRN', 'CRFA', 'CRESS', 'CRO', 'CFM'];

const STEPS = ['Dados Pessoais', 'Dados Profissionais', 'Acesso & Segurança'];

export const RegisterProfessional: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [form, setForm] = useState({
    nome: '', cpf: '', data_nascimento: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    email: '', celular: '',
    especialidade: '', numero_conselho: '', tipo_conselho: 'CRM',
    bio: '',
    senha: '', confirmar_senha: '',
    aceite_lgpd: false,
  });

  const setField = (field: string, value: string | boolean) =>
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
    setField('cep', formatted);
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
    }
    if (step === 1) {
      if (!form.especialidade || !form.numero_conselho) {
        setError('Preencha especialidade e número do conselho'); return;
      }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.aceite_lgpd) { setError('Você deve aceitar os termos de uso e LGPD'); return; }
    if (form.senha !== form.confirmar_senha) { setError('As senhas não coincidem'); return; }
    if (form.senha.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return; }

    setLoading(true);
    setError('');
    try {
      const payload = { ...form };
      const res = await fetch(`${API_URL}/api/professionals/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Erro ao cadastrar');
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6">
            <CheckSquare className="w-10 h-10 text-teal-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">Cadastro Enviado!</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Seu cadastro foi enviado com sucesso. Após a validação pelo administrador, você receberá um e-mail com suas credenciais de acesso.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition mb-5">
            <ArrowLeft className="w-4 h-4" /> Voltar ao login
          </button>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Cadastro de Profissional</h1>
              <p className="text-sm text-slate-500 font-medium">Médico, fisioterapeuta, nutricionista e mais</p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                    style={{
                      background: i <= step ? 'linear-gradient(135deg, #0d9488, #14b8a6)' : '#f1f5f9',
                      color: i <= step ? 'white' : '#94a3b8',
                    }}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-teal-600' : 'text-slate-400'}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${i < step ? 'bg-teal-400' : 'bg-slate-100'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold flex items-start gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* ── Step 0: Dados Pessoais ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nome Completo *" id="nome" value={form.nome} onChange={v => setField('nome', v)} icon={<User className="w-4 h-4" />} placeholder="Dr. João Silva" colSpan />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="CPF *" id="cpf" value={form.cpf} onChange={v => setField('cpf', v)} placeholder="000.000.000-00" />
                <InputField label="Data de Nascimento *" id="data_nascimento" type="date" value={form.data_nascimento} onChange={v => setField('data_nascimento', v)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">CEP</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    </div>
                    <input
                      value={form.cep}
                      onChange={e => handleCepChange(e.target.value)}
                      onBlur={() => fetchCep()}
                      placeholder="00000-000"
                      maxLength={9}
                      className={`w-full border ${form.cep ? (form.logradouro ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : error.includes('CEP') ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50') : 'border-slate-200 bg-slate-50'} rounded-xl pl-11 pr-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition`}
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <InputField label="Logradouro" id="logradouro" value={form.logradouro} onChange={v => setField('logradouro', v)} icon={<MapPin className="w-4 h-4" />} placeholder="Rua, Avenida..." />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField label="Número" id="numero" value={form.numero} onChange={v => setField('numero', v)} placeholder="123" />
                <InputField label="Complemento" id="complemento" value={form.complemento} onChange={v => setField('complemento', v)} placeholder="Apto, Sala" />
                <InputField label="Bairro" id="bairro" value={form.bairro} onChange={v => setField('bairro', v)} placeholder="Bairro" />
                <InputField label="Cidade" id="cidade" value={form.cidade} onChange={v => setField('cidade', v)} placeholder="Cidade" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="E-mail *" id="email" type="email" value={form.email} onChange={v => setField('email', v)} icon={<Mail className="w-4 h-4" />} placeholder="dr@email.com" />
                <InputField label="Celular *" id="celular" value={form.celular} onChange={v => setField('celular', formatCelular(v))} icon={<Phone className="w-4 h-4" />} placeholder="(00) 00000-0000" isValid={form.celular ? form.celular.length >= 14 : null} />
              </div>
            </div>
          )}

          {/* ── Step 1: Dados Profissionais ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Especialidade *</label>
                  <select
                    value={form.especialidade}
                    onChange={e => setField('especialidade', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-teal-500 transition"
                  >
                    <option value="">Selecione...</option>
                    {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="w-28">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Conselho</label>
                    <select
                      value={form.tipo_conselho}
                      onChange={e => setField('tipo_conselho', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:border-teal-500 transition"
                    >
                      {CONSELHOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <InputField label="Nº do Conselho *" id="numero_conselho" value={form.numero_conselho} onChange={v => setField('numero_conselho', v)} placeholder="000000/UF" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Mini Bio / Apresentação</label>
                <textarea
                  value={form.bio}
                  onChange={e => setField('bio', e.target.value)}
                  rows={4}
                  placeholder="Descreva brevemente sua experiência, formação e área de atuação..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-teal-500 transition resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Acesso & Segurança ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                <p className="text-xs text-teal-700 font-medium leading-relaxed">
                  Seu login será o e-mail informado anteriormente: <strong>{form.email}</strong>. Defina uma senha segura abaixo.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Senha *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.senha}
                      onChange={e => setField('senha', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-12 py-3 text-base md:text-sm font-medium focus:outline-none focus:border-teal-500 transition"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Confirmar Senha *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={form.confirmar_senha}
                      onChange={e => setField('confirmar_senha', e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* LGPD */}
              <div
                className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all"
                style={{
                  borderColor: form.aceite_lgpd ? '#0d9488' : '#e2e8f0',
                  background: form.aceite_lgpd ? '#f0fdfa' : '#f8fafc',
                }}
                onClick={() => setField('aceite_lgpd', !form.aceite_lgpd)}
              >
                <div
                  className="w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 mt-0.5 transition-all"
                  style={{
                    background: form.aceite_lgpd ? '#0d9488' : 'white',
                    borderColor: form.aceite_lgpd ? '#0d9488' : '#cbd5e1',
                  }}
                >
                  {form.aceite_lgpd && <span className="text-white text-[10px] font-black">✓</span>}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Li e aceito os <span className="font-bold text-teal-600">Termos de Uso</span> e a{' '}
                  <span className="font-bold text-teal-600">Política de Privacidade (LGPD)</span> da plataforma Owner Health.
                  Autorizo o tratamento dos meus dados pessoais conforme descrito.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Voltar
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition"
                style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}
              >
                Próximo →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Finalizar Cadastro'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Componente auxiliar de input ──────────────────────────────────────────────
interface InputFieldProps {
  label: string; id: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  type?: string; icon?: React.ReactNode; colSpan?: boolean;
  isValid?: boolean | null;
}

const InputField: React.FC<InputFieldProps> = ({ label, id, value, onChange, placeholder, type = 'text', icon, colSpan , isValid = null}) => {
  const borderColor = isValid === true ? 'border-emerald-500 bg-emerald-50 text-emerald-900 focus:ring-emerald-500/20 focus:border-emerald-500' : isValid === false ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 bg-slate-50 focus:border-teal-500 focus:ring-teal-500/20';
  return (
    <div className={colSpan ? 'md:col-span-2' : ''}>
      <label htmlFor={id} className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`w-full border ${borderColor} rounded-xl ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:ring-2 transition`} />
      </div>
    </div>
  );
};
