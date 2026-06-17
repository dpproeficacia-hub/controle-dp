import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

export default function Perfil() {
  const { usuario } = useAuth();
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function salvar(e) {
    e.preventDefault();
    setErro(''); setSucesso(false);

    if (form.novaSenha !== form.confirmarSenha) {
      setErro('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (form.novaSenha.length < 6) {
      setErro('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setSalvando(true);
    try {
      await api.put('/auth/alterar-senha', {
        senhaAtual: form.senhaAtual,
        novaSenha: form.novaSenha
      });
      setSucesso(true);
      setForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-5">
        <h2 className="font-display font-bold text-lg text-ink">Meu Perfil</h2>
        <p className="text-sm text-muted mt-0.5">Gerencie suas informações de acesso</p>
      </div>

      <div className="card p-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center text-white font-bold text-lg">
            {usuario?.nome?.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{usuario?.nome}</p>
            <p className="text-xs text-faint">{usuario?.email}</p>
            <span className="pill pill-blue text-[10px] mt-1">{usuario?.nivel}</span>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-ink mb-4">Alterar senha</p>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="label">Senha atual</label>
            <input type="password" className="input" required
              value={form.senhaAtual}
              onChange={e => set('senhaAtual', e.target.value)}
              placeholder="Digite sua senha atual" />
          </div>
          <div>
            <label className="label">Nova senha</label>
            <input type="password" className="input" required
              value={form.novaSenha}
              onChange={e => set('novaSenha', e.target.value)}
              placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="label">Confirmar nova senha</label>
            <input type="password" className="input" required
              value={form.confirmarSenha}
              onChange={e => set('confirmarSenha', e.target.value)}
              placeholder="Repita a nova senha" />
          </div>

          {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{erro}</div>}
          {sucesso && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">✓ Senha alterada com sucesso!</div>}

          <button type="submit" disabled={salvando} className="btn btn-primary">
            {salvando
              ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
              : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
