import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
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

        <div className="card p-6">
          <h2 className="font-display font-bold text-lg text-ink mb-1">Entrar no sistema</h2>
          <p className="text-sm text-muted mb-5">Acesso restrito a usuários autorizados</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus />
            </div>
            <div>
              <label className="label">Senha</label>
              <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{erro}</div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
              {loading ? (
                <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-faint mt-4">
          DPSmart v1.0 · Gestão de Departamento Pessoal
        </p>
      </div>
    </div>
  );
}
