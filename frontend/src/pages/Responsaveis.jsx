import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const SETORES_PADRAO = ['Pessoal', 'Fiscal', 'Contábil', 'Societário', 'Outros'];

export function Responsaveis() {
  const [usuarios, setUsuarios] = useState([]);
  const [setores, setSetores] = useState([]);
  const [loadingU, setLoadingU] = useState(true);
  const [loadingS, setLoadingS] = useState(true);
  const [formU, setFormU] = useState({ nome:'', email:'', senha:'', nivel:'OPERADOR' });
  const [formS, setFormS] = useState({ setor:'Pessoal', responsavel:'' });
  const [mostraFormU, setMostraFormU] = useState(false);
  const [mostraFormS, setMostraFormS] = useState(false);
  const [salvandoU, setSalvandoU] = useState(false);
  const [salvandoS, setSalvandoS] = useState(false);
  const [aba, setAba] = useState('usuarios');
  const { isAdmin, isGestor } = useAuth();

  useEffect(() => {
    api.get('/responsaveis').then(r => setUsuarios(r.data)).finally(() => setLoadingU(false));
    const s = localStorage.getItem('dp_setores');
    if (s) setSetores(JSON.parse(s));
    setLoadingS(false);
  }, []);

  function salvarSetoresLocal(novos) {
    setSetores(novos);
    localStorage.setItem('dp_setores', JSON.stringify(novos));
  }

  async function salvarUsuario(e) {
    e.preventDefault();
    setSalvandoU(true);
    try {
      const { data } = await api.post('/responsaveis', formU);
      setUsuarios(u => [...u, data]);
      setFormU({ nome:'', email:'', senha:'', nivel:'OPERADOR' });
      setMostraFormU(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setSalvandoU(false);
    }
  }

  function salvarSetor(e) {
    e.preventDefault();
    if (!formS.responsavel.trim()) return;
    const existente = setores.findIndex(s => s.setor === formS.setor);
    let novos;
    if (existente >= 0) {
      novos = setores.map((s, i) => i === existente ? formS : s);
    } else {
      novos = [...setores, formS];
    }
    salvarSetoresLocal(novos);
    setFormS({ setor:'Pessoal', responsavel:'' });
    setMostraFormS(false);
  }

  function removerSetor(setor) {
    salvarSetoresLocal(setores.filter(s => s.setor !== setor));
  }

  const NIVEL_PILL = { ADMIN:'pill-purple', GESTOR:'pill-blue', OPERADOR:'pill-gray' };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-bold text-lg text-ink">Responsáveis</h2>
      </div>

      <div className="flex gap-2 mb-5">
        {[['usuarios','Usuários do sistema'],['setores','Responsáveis por setor']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${aba===id?'bg-ink text-bg border-ink':'bg-surface text-muted border-border hover:border-border2'}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'usuarios' && (
        <div>
          <div className="flex justify-end mb-4">
            {isAdmin && (
              <button onClick={() => setMostraFormU(!mostraFormU)} className="btn btn-primary">
                {mostraFormU ? 'Cancelar' : '+ Novo usuário'}
              </button>
            )}
          </div>

          {mostraFormU && (
            <form onSubmit={salvarUsuario} className="card p-5 mb-4 grid grid-cols-2 gap-4 max-w-xl">
              <div><label className="label">Nome</label><input className="input" required value={formU.nome} onChange={e => setFormU(f=>({...f,nome:e.target.value}))} /></div>
              <div><label className="label">Email</label><input className="input" type="email" required value={formU.email} onChange={e => setFormU(f=>({...f,email:e.target.value}))} /></div>
              <div><label className="label">Senha inicial</label><input className="input" type="password" required value={formU.senha} onChange={e => setFormU(f=>({...f,senha:e.target.value}))} /></div>
              <div>
                <label className="label">Nível de acesso</label>
                <select className="select" value={formU.nivel} onChange={e => setFormU(f=>({...f,nivel:e.target.value}))}>
                  <option value="OPERADOR">Operador DP</option>
                  <option value="GESTOR">Gestor do setor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={salvandoU} className="btn btn-primary">
                  {salvandoU ? <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : 'Criar usuário'}
                </button>
                <button type="button" onClick={() => setMostraFormU(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          )}

          {loadingU ? (
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
      )}

      {aba === 'setores' && (
        <div>
          <div className="flex justify-end mb-4">
            {isGestor && (
              <button onClick={() => setMostraFormS(!mostraFormS)} className="btn btn-primary">
                {mostraFormS ? 'Cancelar' : '+ Definir responsável'}
              </button>
            )}
          </div>

          {mostraFormS && (
            <form onSubmit={salvarSetor} className="card p-5 mb-4 max-w-md">
              <p className="text-sm font-semibold text-ink mb-4">Definir responsável por setor</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Setor</label>
                  <select className="select" value={formS.setor} onChange={e => setFormS(f=>({...f,setor:e.target.value}))}>
                    {SETORES_PADRAO.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Nome do responsável</label>
                  <input className="input" required value={formS.responsavel} onChange={e => setFormS(f=>({...f,responsavel:e.target.value}))} placeholder="Ex: Marcos Vinícius" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={salvandoS} className="btn btn-primary">Salvar</button>
                  <button type="button" onClick={() => setMostraFormS(false)} className="btn btn-secondary">Cancelar</button>
                </div>
              </div>
            </form>
          )}

          <div className="grid grid-cols-3 gap-4">
            {SETORES_PADRAO.map(setor => {
              const encontrado = setores.find(s => s.setor === setor);
              return (
                <div key={setor} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-faint">{setor}</span>
                    {encontrado && isGestor && (
                      <button onClick={() => removerSetor(setor)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                    )}
                  </div>
                  {encontrado ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-700 flex-shrink-0">
                        {encontrado.responsavel.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{encontrado.responsavel}</p>
                        <p className="text-xs text-faint">Responsável {setor}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 opacity-40">
                      <div className="w-10 h-10 rounded-full bg-surface2 border-2 border-dashed border-border2 flex items-center justify-center text-faint">?</div>
                      <p className="text-sm text-faint">Não definido</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {setores.length > 0 && (
            <div className="card mt-6">
              <div className="card-header"><span className="card-title">Equipe do escritório</span></div>
              <div className="p-5">
                <div className="flex flex-wrap gap-3">
                  {setores.map(s => (
                    <div key={s.setor} className="flex items-center gap-2 px-3 py-2 bg-surface2 rounded-lg border border-border">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-semibold text-purple-700">
                        {s.responsavel.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-ink">{s.responsavel}</span>
                      <span className="text-xs text-faint">· {s.setor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Responsaveis;
