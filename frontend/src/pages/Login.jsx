import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

function Logo() {
  return (
    <div className="flex items-center gap-3 justify-center mb-8">
      <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="#F4F3EF">
          <rect x="1" y="1" width="6" height="6" rx="1.5"/>
          <rect x="9" y="1" width="6" height="6" rx="1.5"/>
          <rect x="1" y="9" width="6" height="6" rx="1.5"/>
          <rect x="9" y="9" width="6" height="6" rx="1.5"/>
        </svg>
      </div>
      <div>
        <p className="font-display font-bold text-xl text-ink">DPSmart</p>
        <p className="text-xs text-faint">Departamento Pessoal</p>
      </div>
    </div>
  );
}

function TelaLogin({ onEsqueceu, onCadastrar }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(''); setLoading(true);
    try {
      await login(email, senha);
      navigate('/dashboard');
    } catch {
      setErro('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-display font-bold text-lg text-ink mb-1">Entrar no sistema</h2>
      <p className="text-sm text-muted mb-5">Acesso restrito a usuários autorizados</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus />
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" value={senha}
            onChange={e => setSenha(e.target.value)} placeholder="••••••••" required />
        </div>
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{erro}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
          {loading ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Entrar'}
        </button>
      </form>
      <div className="mt-4 text-center">
        <button onClick={() => onEsqueceu(email)} className="text-xs text-muted hover:text-ink underline">
          Esqueci minha senha
        </button>
      </div>
      <div className="mt-4 pt-4 border-t border-border text-center">
        <p className="text-xs text-faint mb-2">Ainda não tem uma conta?</p>
        <button onClick={onCadastrar} className="btn btn-secondary text-xs w-full justify-center">
          Cadastrar meu escritório
        </button>
      </div>
    </div>
  );
}

function TelaCadastro({ onVoltar }) {
  const [form, setForm] = useState({ nomeEscritorio: '', nome: '', email: '', senha: '', confirmar: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const { cadastrar } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.senha !== form.confirmar) { setErro('As senhas não coincidem'); return; }
    if (form.senha.length < 6) { setErro('A senha deve ter no mínimo 6 caracteres'); return; }
    setErro(''); setLoading(true);
    try {
      await cadastrar(form.nomeEscritorio, form.nome, form.email, form.senha);
      navigate('/dashboard');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="card p-6">
      <button onClick={onVoltar} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-4">← Voltar</button>
      <h2 className="font-display font-bold text-lg text-ink mb-1">Criar conta gratuita</h2>
      <p className="text-sm text-muted mb-5">Configure seu escritório e comece a usar agora</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Nome do escritório / contabilidade</label>
          <input className="input" required value={form.nomeEscritorio}
            onChange={e => set('nomeEscritorio', e.target.value)}
            placeholder="Ex: Pro Eficácia Contabilidade" autoFocus />
        </div>
        <div className="h-px bg-border my-1" />
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Seu acesso (administrador)</p>
        <div>
          <label className="label">Seu nome</label>
          <input className="input" required value={form.nome}
            onChange={e => set('nome', e.target.value)} placeholder="Nome completo" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email}
            onChange={e => set('email', e.target.value)} placeholder="seu@email.com" />
        </div>
        <div>
          <label className="label">Senha</label>
          <div className="relative">
            <input className="input pr-16" type={mostrarSenha ? 'text' : 'password'} required
              value={form.senha} onChange={e => set('senha', e.target.value)}
              placeholder="Mínimo 6 caracteres" />
            <button type="button" onClick={() => setMostrarSenha(s => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-muted text-xs">
              {mostrarSenha ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Confirmar senha</label>
          <input className="input" type={mostrarSenha ? 'text' : 'password'} required
            value={form.confirmar} onChange={e => set('confirmar', e.target.value)}
            placeholder="Repita a senha" />
          {form.confirmar && form.senha !== form.confirmar && (
            <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
          )}
        </div>
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{erro}</div>}
        <button type="submit" disabled={loading || form.senha !== form.confirmar}
          className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50 mt-2">
          {loading
            ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
            : 'Criar conta e entrar'}
        </button>
      </form>
    </div>
  );
}

function TelaSolicitarCodigo({ emailInicial, onCodigo, onVoltar }) {
  const [email, setEmail] = useState(emailInicial || '');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);

  async function solicitar(e) {
    e.preventDefault();
    setErro(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/recuperar', { email });
      setResultado(data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao solicitar código');
    } finally {
      setLoading(false);
    }
  }

  if (resultado) return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="font-display font-bold text-lg text-ink">Código gerado</h2>
      </div>
      <p className="text-sm text-muted mb-4">Olá, <strong className="text-ink">{resultado.nome}</strong>. Seu código:</p>
      <div className="bg-surface2 border border-border rounded-xl p-4 text-center mb-4">
        <p className="text-3xl font-mono font-bold text-ink tracking-[0.3em]">{resultado.codigo}</p>
        <p className="text-xs text-faint mt-2">Válido por 15 minutos</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
        <p className="text-xs text-amber-700"><strong>Atenção:</strong> guarde este código antes de continuar.</p>
      </div>
      <button onClick={() => onCodigo(email, resultado.codigo)} className="btn btn-primary w-full justify-center py-2.5">
        Continuar para redefinir senha
      </button>
    </div>
  );

  return (
    <div className="card p-6">
      <button onClick={onVoltar} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-4">← Voltar</button>
      <h2 className="font-display font-bold text-lg text-ink mb-1">Recuperar acesso</h2>
      <p className="text-sm text-muted mb-5">Informe seu email para receber o código de verificação.</p>
      <form onSubmit={solicitar} className="space-y-4">
        <div>
          <label className="label">Email cadastrado</label>
          <input className="input" type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus />
        </div>
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{erro}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
          {loading ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Gerar código'}
        </button>
      </form>
    </div>
  );
}

function TelaNovaSenha({ email, codigoInicial, onVoltar }) {
  const [codigo, setCodigo] = useState(codigoInicial || '');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const navigate = useNavigate();

  async function redefinir(e) {
    e.preventDefault();
    if (novaSenha !== confirmar) { setErro('As senhas não coincidem'); return; }
    if (novaSenha.length < 6) { setErro('A senha deve ter no mínimo 6 caracteres'); return; }
    setErro(''); setLoading(true);
    try {
      await api.post('/auth/nova-senha', { email, codigo, novaSenha });
      setSucesso(true);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  if (sucesso) return (
    <div className="card p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L19 7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 className="font-display font-bold text-lg text-ink mb-2">Senha redefinida!</h2>
      <p className="text-sm text-muted mb-6">Sua senha foi alterada com sucesso.</p>
      <button onClick={() => navigate('/login')} className="btn btn-primary w-full justify-center py-2.5">
        Ir para o login
      </button>
    </div>
  );

  return (
    <div className="card p-6">
      <button onClick={onVoltar} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-4">← Voltar</button>
      <h2 className="font-display font-bold text-lg text-ink mb-1">Redefinir senha</h2>
      <p className="text-sm text-muted mb-5">Digite o código e escolha uma nova senha para <strong className="text-ink">{email}</strong>.</p>
      <form onSubmit={redefinir} className="space-y-4">
        <div>
          <label className="label">Código de verificação</label>
          <input className="input text-center font-mono tracking-widest text-lg"
            value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g,'').slice(0,6))}
            placeholder="000000" maxLength={6} required autoFocus />
        </div>
        <div>
          <label className="label">Nova senha</label>
          <div className="relative">
            <input className="input pr-16" type={mostrarSenha ? 'text' : 'password'}
              value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres" required />
            <button type="button" onClick={() => setMostrarSenha(s => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-muted text-xs">
              {mostrarSenha ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Confirmar nova senha</label>
          <input className="input" type={mostrarSenha ? 'text' : 'password'}
            value={confirmar} onChange={e => setConfirmar(e.target.value)}
            placeholder="Repita a senha" required />
          {confirmar && novaSenha !== confirmar && <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>}
        </div>
        {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{erro}</div>}
        <button type="submit" disabled={loading || novaSenha !== confirmar}
          className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50">
          {loading ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Redefinir senha'}
        </button>
      </form>
    </div>
  );
}

export default function Login() {
  const [etapa, setEtapa] = useState('login');
  const [emailRecupera, setEmailRecupera] = useState('');
  const [codigoGerado, setCodigoGerado] = useState('');

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Logo />
        {etapa === 'login' && (
          <TelaLogin
            onEsqueceu={emailPre => { setEmailRecupera(emailPre || ''); setEtapa('solicitar'); }}
            onCadastrar={() => setEtapa('cadastro')}
          />
        )}
        {etapa === 'cadastro' && (
          <TelaCadastro onVoltar={() => setEtapa('login')} />
        )}
        {etapa === 'solicitar' && (
          <TelaSolicitarCodigo
            emailInicial={emailRecupera}
            onCodigo={(email, codigo) => { setEmailRecupera(email); setCodigoGerado(codigo); setEtapa('nova-senha'); }}
            onVoltar={() => setEtapa('login')}
          />
        )}
        {etapa === 'nova-senha' && (
          <TelaNovaSenha
            email={emailRecupera}
            codigoInicial={codigoGerado}
            onVoltar={() => setEtapa('solicitar')}
          />
        )}
        <p className="text-center text-xs text-faint mt-4">DPSmart · Gestão de Departamento Pessoal</p>
      </div>
    </div>
  );
}
