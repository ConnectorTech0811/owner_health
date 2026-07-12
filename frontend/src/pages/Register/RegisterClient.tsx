import { isValidCPF, formatCPF, formatCelular } from '../../utils/validators';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Lock, Eye, EyeOff, MapPin, Phone, CreditCard,
  Loader2, CheckSquare, ArrowLeft, Shield, HeartPulse
} from 'lucide-react';
import { API_URL } from '../../config';

const STEPS = ['Dados Pessoais & Endereço', 'Plano de Saúde', 'Acesso & Segurança'];

export const RegisterClient: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [form, setForm] = useState({
    nome: '', cpf: '', data_nascimento: '', email: '', celular: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    plano_empresa: '', plano_nome: '', plano_produto: '', plano_numero_carteirinha: '',
    senha: '', confirmar_senha: '', acceptLGPD: false,
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
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckSquare className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">Cadastro Realizado!</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Sua conta foi criada com sucesso. Acesse o sistema com seu e-mail e senha.
          </p>
          <button onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
            Ir para o Login
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
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Cadastro de Cliente</h1>
              <p className="text-sm text-slate-500 font-medium">Plano Free • Gratuito, sem cobranças</p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                    style={{
                      background: i <= step ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : '#f1f5f9',
                      color: i <= step ? 'white' : '#94a3b8',
                    }}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${i < step ? 'bg-blue-400' : 'bg-slate-100'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold flex gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* ── Step 0: Dados Pessoais & Endereço ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="Nome Completo *" id="nome" value={form.nome} onChange={v => sf('nome', v)}
                  icon={<User className="w-4 h-4" />} placeholder="Seu nome completo" colSpan />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="CPF *" id="cpf" value={form.cpf} isValid={form.cpf ? isValidCPF(form.cpf) : null} onChange={v => sf('cpf', formatCPF(v))}
                  icon={<User className="w-4 h-4" />} placeholder="000.000.000-00" />
                <F label="Data de Nascimento *" id="data_nascimento" type="date" value={form.data_nascimento}
                  onChange={v => sf('data_nascimento', v)} />
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
                  <F label="Logradouro *" id="logradouro" value={form.logradouro} onChange={v => sf('logradouro', v)}
                    icon={<MapPin className="w-4 h-4" />} placeholder="Rua, Avenida..." />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <F label="Número *" id="numero" value={form.numero} onChange={v => sf('numero', v)} placeholder="123" />
                <F label="Complemento" id="complemento" value={form.complemento} onChange={v => sf('complemento', v)} placeholder="Apto..." />
                <F label="Bairro" id="bairro" value={form.bairro} onChange={v => sf('bairro', v)} placeholder="Bairro" />
                <F label="Cidade" id="cidade" value={form.cidade} onChange={v => sf('cidade', v)} placeholder="Cidade" />
                <F label="UF" id="estado" value={form.estado} onChange={v => sf('estado', v.toUpperCase().slice(0, 2))} placeholder="SP" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="E-mail *" id="email" type="email" value={form.email} onChange={v => sf('email', v)}
                  icon={<Mail className="w-4 h-4" />} placeholder="seu@email.com" />
                <F label="Celular *" id="celular" value={form.celular} isValid={form.celular ? form.celular.length >= 14 : null} onChange={v => sf('celular', formatCelular(v))}
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
                  onChange={v => sf('plano_empresa', v)} icon={<CreditCard className="w-4 h-4" />} placeholder="Ex: Bradesco" />
                <F label="Nome do Plano" id="plano_nome" value={form.plano_nome}
                  onChange={v => sf('plano_nome', v)} placeholder="Ex: Nacional Flex" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <F label="Produto" id="plano_produto" value={form.plano_produto}
                  onChange={v => sf('plano_produto', v)} placeholder="Ex: Enfermaria" />
                <F label="Nº Carteirinha" id="plano_numero_carteirinha" value={form.plano_numero_carteirinha}
                  onChange={v => sf('plano_numero_carteirinha', v)} placeholder="0000000000" />
              </div>
            </div>
          )}

          {/* ── Step 2: Acesso & Segurança ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  Seu login será o e-mail informado anteriormente: <strong>{form.email}</strong>. Defina uma senha segura abaixo.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Senha *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={showPassword ? 'text' : 'password'} value={form.senha}
                      onChange={e => sf('senha', e.target.value)} placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-12 py-3 text-base md:text-sm font-medium focus:outline-none focus:border-blue-500 transition" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Confirmar Senha *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="password" value={form.confirmar_senha}
                      onChange={e => sf('confirmar_senha', e.target.value)} placeholder="Repita a senha"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:border-blue-500 transition" />
                  </div>
                </div>
              </div>

              {/* LGPD */}
              <div className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all"
                style={{ borderColor: form.acceptLGPD ? '#2563eb' : '#e2e8f0', background: form.acceptLGPD ? '#eff6ff' : '#f8fafc' }}
                onClick={() => sf('acceptLGPD', !form.acceptLGPD)}>
                <div className="w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 mt-0.5 transition-all"
                  style={{ background: form.acceptLGPD ? '#2563eb' : 'white', borderColor: form.acceptLGPD ? '#2563eb' : '#cbd5e1' }}>
                  {form.acceptLGPD && <span className="text-white text-[10px] font-black">✓</span>}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Li e aceito os <span className="font-bold text-blue-600">Termos de Uso</span> e a{' '}
                  <span className="font-bold text-blue-600">Política de Privacidade (LGPD)</span> da plataforma Owner Health.
                  Autorizo o tratamento dos meus dados pessoais conforme descrito.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
                Voltar
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={handleNext}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                Próximo →
              </button>
            ) : (
              <button type="submit" disabled={loading}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</> : 'Finalizar Cadastro'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Campo auxiliar ────────────────────────────────────────────────────────────
interface FProps {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ReactNode; colSpan?: boolean;
  isValid?: boolean | null;
}
const F: React.FC<FProps> = ({ label, id, value, onChange, placeholder, type = 'text', icon, colSpan , isValid = null}) => {
  const borderColor = isValid === true ? 'border-emerald-500 bg-emerald-50 text-emerald-900 focus:ring-emerald-500/20 focus:border-emerald-500' : isValid === false ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-500/10';
  return (
    <div className={colSpan ? 'md:col-span-2' : ''}>
      <label htmlFor={id} className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full border ${borderColor} rounded-xl ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 text-base md:text-sm font-medium focus:outline-none focus:ring-2 transition`} />
      </div>
    </div>
  );
};
