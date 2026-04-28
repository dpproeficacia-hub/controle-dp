import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function Sindical() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isGestor } = useAuth();
  const anoAtual = new Date().getFullYear();

  const [form, setForm] = useState({
    empresaId:'', sindicato:'', dataBase:'', ultimaCct: anoAtual, reajusteAplicado: false
  });
  const [empresas, setEmpresas] = useState([]);
  const [mostraForm, setMostraForm] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
    api.get('/empresas').then(r => setEmpresas(r.data));
  }, []);

  function carregar() {
    setLoading(true);
    api.get('/sindical').then(r => setRegistros(r.data)).finally(() => setLoading(false));
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.put(`/sindical/${form.empresaId}`, {
        sindicato: form.sindicato,
        dataBase: form.dataBase,
        ultimaCct: Number(form.ultimaCct),
        reajusteAplicado: form.reajusteAplicado
      });
      setMostraForm(false);
      setForm({ empresaId:'', sindicato:'', dataBase:'', ultimaCct: anoAtual, reajusteAplicado: false });
      carregar();
    } catch(err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  function editar(r) {
    setForm({
      empresaId: r.empresaId,
      sindicato: r.sindicato,
      dataBase: r.dataBase,
      ultimaCct: r.ultimaCct,
      reajusteAplicado: r.reajusteAplicado
    });
    setMostraForm(true);
    window.scrollTo(0,0);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Controle Sindical / CCT</h2>
          <p className="text-sm text-muted mt-0.5">Monitoramento de convenções coletivas e datas-base</p>
        </div>
        {isGestor && (
          <button onClick={() => { setMostraForm(!mostraForm); setForm({ empresaId:'', sindicato:'', dataBase:'', ultimaCct: anoAtual, reajusteAplicado: false }); }}
            className="btn btn-primary">
            {mostraForm ? 'Cancelar' : '+ Vincular sindicato'}
          </button>
        )}
      </div>

      {mostraForm && (
        <form onSubmit={salvar} className="card p-5 mb-4 max-w-2xl">
          <p className="text-sm font-semibold text-ink mb-4">Vincular sindicato a uma empresa</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Empresa</label>
              <select className="select" required value={form.empresaId} onChange={e => setForm(f=>({...f,empresaId:e.target.value}))}>
                <option value="">Selecionar empresa...</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.razaoSocial}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Nome do sindicato</label>
              <input className="input" required value={form.sindicato} onChange={e => setForm(f=>({...f,sindicato:e.target.value}))} placeholder="Ex: Sindicato dos Comerciários MG" />
            </div>
            <div>
              <label className="label">Data-base (dia/mês)</label>
              <input className="input" required value={form.dataBase} onChange={e => setForm(f=>({...f,dataBase:e.target.value}))} placeholder="Ex: 01/03" />
            </div>
            <div>
              <label className="label">Última CCT (ano)</label>
              <input className="input" type="number" required value={form.ultimaCct} onChange={e => setForm(f=>({...f,ultimaCct:e.target.value}))} />
            </div>
            <div className="col-span-2">
              <div onClick={() => setForm(f=>({...f,reajusteAplicado:!f.reajusteAplicado}))}
                className="flex items-center justify-between p-3 bg-surface2 rounded-lg cursor-pointer select-none hover:bg-border transition-colors">
                <span className="text-sm font-medium text-ink">Reajuste já aplicado?</span>
                <div className={`w-9 h-5 rounded-full relative transition-colors ${form.reajusteAplicado?'bg-ink':'bg-border2'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${form.reajusteAplicado?'translate-x-4':'translate-x-0.5'}`} style={{boxShadow:'0 1px 3px rgba(0,0,0,.2)'}} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={salvando} className="btn btn-primary">
              {salvando ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Salvar'}
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
                {['Empresa','Sindicato','Data-base','Última CCT','Reajuste','Status',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map(r => {
                const ok = r.ultimaCct >= anoAtual;
                return (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                    <td className="px-4 py-3 text-sm font-semibold text-ink">{r.empresa?.razaoSocial}</td>
                    <td className="px-4 py-3 text-sm text-muted">{r.sindicato}</td>
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
                    <td className="px-4 py-3 text-right">
                      {isGestor && (
                        <button onClick={() => editar(r)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!registros.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-faint">Nenhum sindicato cadastrado ainda. Clique em "Vincular sindicato" para começar.</td></tr>
              )}
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
          <div>
            <label className="label">Nível de acesso</label>
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
