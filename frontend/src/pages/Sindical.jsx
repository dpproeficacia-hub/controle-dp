import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function Sindical() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isGestor } = useAuth();

  useEffect(() => {
    api.get('/sindical').then(r => setRegistros(r.data)).finally(() => setLoading(false));
  }, []);

  const anoAtual = new Date().getFullYear();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Controle Sindical / CCT</h2>
          <p className="text-sm text-muted mt-0.5">Monitoramento de convenções coletivas e datas-base</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {['Sindicato','Empresa','Data-base','Última CCT','Reajuste','Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map(r => {
                const ok = r.ultimaCct >= anoAtual;
                return (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                    <td className="px-4 py-3 text-sm font-semibold text-ink">{r.sindicato}</td>
                    <td className="px-4 py-3 text-sm text-muted">{r.empresa?.razaoSocial}</td>
                    <td className="px-4 py-3 text-sm text-muted">{r.dataBase}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${ok?'text-green-700':'text-red-700'}`}>{r.ultimaCct}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill ${r.reajusteAplicado?'pill-green':'pill-red'}`}>
                        {r.reajusteAplicado?'Aplicado':'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`pill ${ok?'pill-green':'pill-red'}`}>
                        {ok?'CCT Atualizada':'CCT Desatualizada'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!registros.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-faint">Nenhum registro sindical encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Responsaveis() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome:'', email:'', senha:'', nivel:'OPERADOR' });
  const [mostraForm, setMostraForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    api.get('/responsaveis').then(r => setUsuarios(r.data)).finally(() => setLoading(false));
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const { data } = await api.post('/responsaveis', form);
      setUsuarios(u => [...u, data]);
      setForm({ nome:'', email:'', senha:'', nivel:'OPERADOR' });
      setMostraForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setSalvando(false);
    }
  }

  const NIVEL_PILL = { ADMIN:'pill-purple', GESTOR:'pill-blue', OPERADOR:'pill-gray' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-ink">Responsáveis / Usuários</h2>
        {isAdmin && <button onClick={() => setMostraForm(!mostraForm)} className="btn btn-primary">+ Novo usuário</button>}
      </div>

      {mostraForm && (
        <form onSubmit={salvar} className="card p-5 mb-4 grid grid-cols-2 gap-4 max-w-xl">
          <div><label className="label">Nome</label><input className="input" required value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} /></div>
          <div><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
          <div><label className="label">Senha inicial</label><input className="input" type="password" required value={form.senha} onChange={e => setForm(f=>({...f,senha:e.target.value}))} /></div>
          <div><label className="label">Nível de acesso</label>
            <select className="select" value={form.nivel} onChange={e => setForm(f=>({...f,nivel:e.target.value}))}>
              <option value="OPERADOR">Operador DP</option>
              <option value="GESTOR">Gestor do setor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={salvando} className="btn btn-primary">
              {salvando ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Criar usuário'}
            </button>
            <button type="button" onClick={() => setMostraForm(false)} className="btn btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">Carregando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface2">
              <tr>
                {['Usuário','Email','Nível de acesso','Criado em'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-semibold text-purple-700">
                        {u.nome.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-ink">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{u.email}</td>
                  <td className="px-4 py-3"><span className={`pill ${NIVEL_PILL[u.nivel]}`}>{u.nivel}</span></td>
                  <td className="px-4 py-3 text-sm text-muted">{new Date(u.criadoEm).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Sindical;
